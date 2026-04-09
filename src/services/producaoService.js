import { supabase } from '../lib/supabase'

const isDuplicateKeyError = (error) =>
  error?.code === '23505'

const toNumber = (value) => Number(value) || 0

export const getProducoes = async (dataInicio, dataFim) => {
  let query = supabase
    .from('producoes')
    .select('*, produtos(nome, tipo)')
    .order('data', { ascending: false })
  if (dataInicio) query = query.gte('data', dataInicio)
  if (dataFim)    query = query.lte('data', dataFim)
  const { data, error } = await query
  if (error) throw error
  return data
}

/**
 * Registra uma produção e atualiza automaticamente o estoque e movimentações.
 */
export const createProducao = async (producao) => {
  let planejamentoAlerta = null

  // 0. Capturar estoque antes do registro para detectar atualização automática no banco
  const { data: estoqueAntesData } = await supabase
    .from('estoque_salgados')
    .select('quantidade')
    .eq('produto_id', producao.produto_id)
    .maybeSingle()
  const estoqueAntes = estoqueAntesData?.quantidade || 0

  // 1. Inserir registro de produção
  const { data: producaoData, error: producaoError } = await supabase
    .from('producoes')
    .insert([producao])
    .select()
    .single()
  if (producaoError) throw producaoError

  // 1.1 Comparar com planejamento do mesmo dia/produto e finalizar automaticamente.
  const { data: planejamentos, error: planejamentoReadError } = await supabase
    .from('planejamento_producao')
    .select('id, quantidade_planejada, status')
    .eq('produto_id', producao.produto_id)
    .eq('data', producao.data)

  if (!planejamentoReadError && planejamentos && planejamentos.length > 0) {
    const totalPlanejado = planejamentos.reduce(
      (acc, item) => acc + toNumber(item.quantidade_planejada),
      0
    )

    const quantidadeProduzida = toNumber(producao.quantidade_produzida)
    const incompleta = quantidadeProduzida < totalPlanejado
    const statusPlanejamento = incompleta ? 'parcial' : 'finalizado'

    const { data: updatedRows, error: planejamentoUpdateError } = await supabase
      .from('planejamento_producao')
      .update({ status: statusPlanejamento })
      .eq('produto_id', producao.produto_id)
      .eq('data', producao.data)
      .in('status', ['planejado', 'produzindo', 'parcial'])
      .select('id, status')

    if (planejamentoUpdateError) {
      console.error('[planejamento] Erro ao atualizar status:', planejamentoUpdateError)
    } else {
      console.info('[planejamento] Linhas atualizadas:', updatedRows)
    }

    if (!planejamentoUpdateError && incompleta) {
      const faltou = totalPlanejado - quantidadeProduzida
      planejamentoAlerta = `Produção parcial: faltaram ${faltou} un. para concluir o planejado (${totalPlanejado} un.).`
    }
  }

  // 2. Verificar se o banco já aplicou o incremento automaticamente
  const { data: estoqueDepoisData, error: estoqueDepoisError } = await supabase
    .from('estoque_salgados')
    .select('quantidade')
    .eq('produto_id', producao.produto_id)
    .maybeSingle()
  if (estoqueDepoisError) throw estoqueDepoisError

  const estoqueDepois = estoqueDepoisData?.quantidade || 0
  const incrementoJaAplicado = (estoqueDepois - estoqueAntes) >= producao.quantidade_produzida

  // 3. Se nao houve incremento automatico, aplicar no frontend
  if (!incrementoJaAplicado) {
    // 3.1 Verificar se já existe estoque para o produto
  const { data: estoqueAtual, error: estoqueReadError } = await supabase
    .from('estoque_salgados')
    .select('quantidade')
    .eq('produto_id', producao.produto_id)
    .maybeSingle()
  if (estoqueReadError) throw estoqueReadError

    if (estoqueAtual) {
      // 3.2 Incrementar estoque existente
      const { error: estoqueError } = await supabase
        .from('estoque_salgados')
        .update({
          quantidade: estoqueAtual.quantidade + producao.quantidade_produzida,
          updated_at: new Date().toISOString(),
        })
        .eq('produto_id', producao.produto_id)
      if (estoqueError) throw estoqueError
    } else {
      // 3.3 Criar novo registro de estoque
      const { error: estoqueError } = await supabase
        .from('estoque_salgados')
        .insert([{
          produto_id:  producao.produto_id,
          quantidade:  producao.quantidade_produzida,
        }])

      if (estoqueError) {
        // Se houver conflito (PK/unique), tenta buscar novamente e atualizar saldo.
        if (!isDuplicateKeyError(estoqueError)) throw estoqueError

        const { data: estoquePosConflito, error: refetchError } = await supabase
          .from('estoque_salgados')
          .select('quantidade')
          .eq('produto_id', producao.produto_id)
          .maybeSingle()
        if (refetchError) throw refetchError

        if (!estoquePosConflito) throw estoqueError

        const { error: updateAfterConflictError } = await supabase
          .from('estoque_salgados')
          .update({
            quantidade: estoquePosConflito.quantidade + producao.quantidade_produzida,
            updated_at: new Date().toISOString(),
          })
          .eq('produto_id', producao.produto_id)

        if (updateAfterConflictError) throw updateAfterConflictError
      }
    }
  }

  // 4. Registrar movimentação de entrada apenas se ainda nao existir
  const { data: movExistente } = await supabase
    .from('movimentacoes_estoque')
    .select('id')
    .eq('referencia_id', producaoData.id)
    .eq('tipo', 'entrada_producao')
    .maybeSingle()

  if (!movExistente) {
    await supabase.from('movimentacoes_estoque').insert([{
      produto_id:    producao.produto_id,
      tipo:          'entrada_producao',
      quantidade:    producao.quantidade_produzida,
      referencia_id: producaoData.id,
    }])
  }

  return { producao: producaoData, planejamentoAlerta }
}

export const deleteProducao = async (id) => {
  const { data: producao, error: producaoReadError } = await supabase
    .from('producoes')
    .select('id, produto_id, quantidade_produzida')
    .eq('id', id)
    .single()
  if (producaoReadError) throw producaoReadError

  const quantidadeRemover = Number(producao.quantidade_produzida) || 0

  const { data: estoqueAntesData, error: estoqueAntesError } = await supabase
    .from('estoque_salgados')
    .select('quantidade')
    .eq('produto_id', producao.produto_id)
    .maybeSingle()
  if (estoqueAntesError) throw estoqueAntesError

  const estoqueAntes = estoqueAntesData?.quantidade || 0
  if (estoqueAntes < quantidadeRemover) {
    throw new Error(
      `Não é possível excluir esta produção: estoque atual (${estoqueAntes}) menor que a quantidade produzida (${quantidadeRemover}).`
    )
  }

  const { error: deleteProducaoError } = await supabase
    .from('producoes')
    .delete()
    .eq('id', id)
  if (deleteProducaoError) throw deleteProducaoError

  const { error: deleteMovError } = await supabase
    .from('movimentacoes_estoque')
    .delete()
    .eq('referencia_id', id)
    .eq('tipo', 'entrada_producao')
  if (deleteMovError) throw deleteMovError

  const { data: estoqueDepoisData, error: estoqueDepoisError } = await supabase
    .from('estoque_salgados')
    .select('quantidade')
    .eq('produto_id', producao.produto_id)
    .maybeSingle()
  if (estoqueDepoisError) throw estoqueDepoisError

  const estoqueDepois = estoqueDepoisData?.quantidade || 0
  const decrementoJaAplicado = (estoqueAntes - estoqueDepois) >= quantidadeRemover

  if (!decrementoJaAplicado) {
    const { error: estoqueUpdateError } = await supabase
      .from('estoque_salgados')
      .update({
        quantidade: estoqueDepois - quantidadeRemover,
        updated_at: new Date().toISOString(),
      })
      .eq('produto_id', producao.produto_id)
      .eq('quantidade', estoqueDepois)

    if (estoqueUpdateError) throw estoqueUpdateError
  }
}
