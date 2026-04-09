import { supabase } from '../lib/supabase'

export const getDistribuicoes = async (dataInicio, dataFim) => {
  let query = supabase
    .from('distribuicoes')
    .select('*, produtos(nome, tipo), unidades(nome, cidade)')
    .order('data', { ascending: false })
  if (dataInicio) query = query.gte('data', dataInicio)
  if (dataFim)    query = query.lte('data', dataFim)
  const { data, error } = await query
  if (error) throw error
  return data
}

/**
 * Registra uma distribuição, valida estoque e atualiza movimentações.
 */
export const createDistribuicao = async (distribuicao) => {
  const distribuicaoId = crypto.randomUUID()

  // 1. Capturar estoque antes da criação para detectar desconto automático no banco
  const { data: estoqueAntesData, error: estoqueReadError } = await supabase
    .from('estoque_salgados')
    .select('quantidade')
    .eq('produto_id', distribuicao.produto_id)
    .maybeSingle()

  if (estoqueReadError) throw estoqueReadError

  const estoqueAntes = estoqueAntesData?.quantidade || 0

  if (!estoqueAntesData || estoqueAntes < distribuicao.quantidade) {
    const disponivel = estoqueAntesData ? estoqueAntesData.quantidade : 0
    throw new Error(
      `Estoque insuficiente. Disponível: ${disponivel} unidade(s). Solicitado: ${distribuicao.quantidade}.`
    )
  }

  // 2. Inserir distribuição (sem select para evitar erro de retorno por policy)
  const { error: distribError } = await supabase
    .from('distribuicoes')
    .insert([{ ...distribuicao, id: distribuicaoId }])
  if (distribError) throw distribError

  // 3. Verificar se o banco já descontou automaticamente o estoque
  const { data: estoqueDepoisData, error: estoqueDepoisError } = await supabase
    .from('estoque_salgados')
    .select('quantidade')
    .eq('produto_id', distribuicao.produto_id)
    .maybeSingle()
  if (estoqueDepoisError) {
    await supabase.from('distribuicoes').delete().eq('id', distribuicaoId)
    throw estoqueDepoisError
  }

  const estoqueDepois = estoqueDepoisData?.quantidade || 0
  const descontoJaAplicado = (estoqueAntes - estoqueDepois) >= distribuicao.quantidade

  // 4. Se não houve desconto automático, aplica com proteção de concorrência
  if (!descontoJaAplicado) {
    const novaQuantidade = estoqueAntes - distribuicao.quantidade
    const { data: estoqueAtualizado, error: estoqueUpdateError } = await supabase
      .from('estoque_salgados')
      .update({
        quantidade: novaQuantidade,
        updated_at: new Date().toISOString(),
      })
      .eq('produto_id', distribuicao.produto_id)
      .eq('quantidade', estoqueAntes)
      .select('produto_id')
      .maybeSingle()

    if (estoqueUpdateError) {
      // Se o update de estoque falhar, remove a distribuição criada para evitar inconsistência.
      await supabase.from('distribuicoes').delete().eq('id', distribuicaoId)
      throw estoqueUpdateError
    }

    if (!estoqueAtualizado) {
      // Revalida uma vez: pode ter sido atualizado automaticamente no intervalo.
      const { data: estoqueRecheck } = await supabase
        .from('estoque_salgados')
        .select('quantidade')
        .eq('produto_id', distribuicao.produto_id)
        .maybeSingle()

      const estoqueRecheckQtd = estoqueRecheck?.quantidade || 0
      const descontoNoRecheck = (estoqueAntes - estoqueRecheckQtd) >= distribuicao.quantidade

      if (!descontoNoRecheck) {
        await supabase.from('distribuicoes').delete().eq('id', distribuicaoId)
        throw new Error('Estoque alterado por outra operação. Atualize a tela e tente novamente.')
      }
    }
  }

  // 5. Registrar movimentação de saída apenas se ainda não existir
  const { data: movExistente } = await supabase
    .from('movimentacoes_estoque')
    .select('id')
    .eq('referencia_id', distribuicaoId)
    .eq('tipo', 'distribuicao')
    .maybeSingle()

  let movError = null
  if (!movExistente) {
    const movResult = await supabase.from('movimentacoes_estoque').insert([{
      produto_id:    distribuicao.produto_id,
      tipo:          'distribuicao',
      quantidade:    distribuicao.quantidade,
      referencia_id: distribuicaoId,
    }])
    movError = movResult.error
  }

  if (movError) {
    // Rollback defensivo: reverte estoque e remove distribuição caso a movimentação falhe.
    await supabase
      .from('estoque_salgados')
      .update({
        quantidade: estoqueAntes,
        updated_at: new Date().toISOString(),
      })
      .eq('produto_id', distribuicao.produto_id)
    await supabase.from('distribuicoes').delete().eq('id', distribuicaoId)
    throw movError
  }

  // 5. Retorno resiliente: tenta buscar o registro completo, sem falhar o fluxo caso policy bloqueie select.
  const { data: distribData } = await supabase
    .from('distribuicoes')
    .select('*')
    .eq('id', distribuicaoId)
    .maybeSingle()

  return distribData || { id: distribuicaoId, ...distribuicao }
}

export const deleteDistribuicao = async (id) => {
  const { data: distribuicao, error: distribReadError } = await supabase
    .from('distribuicoes')
    .select('id, produto_id, quantidade')
    .eq('id', id)
    .single()
  if (distribReadError) throw distribReadError

  const quantidadeDevolver = Number(distribuicao.quantidade) || 0

  const { data: estoqueAntesData, error: estoqueAntesError } = await supabase
    .from('estoque_salgados')
    .select('quantidade')
    .eq('produto_id', distribuicao.produto_id)
    .maybeSingle()
  if (estoqueAntesError) throw estoqueAntesError

  const estoqueAntes = estoqueAntesData?.quantidade || 0

  const { error: deleteDistribError } = await supabase
    .from('distribuicoes')
    .delete()
    .eq('id', id)
  if (deleteDistribError) throw deleteDistribError

  const { error: deleteMovError } = await supabase
    .from('movimentacoes_estoque')
    .delete()
    .eq('referencia_id', id)
    .eq('tipo', 'distribuicao')
  if (deleteMovError) throw deleteMovError

  const { data: estoqueDepoisData, error: estoqueDepoisError } = await supabase
    .from('estoque_salgados')
    .select('quantidade')
    .eq('produto_id', distribuicao.produto_id)
    .maybeSingle()
  if (estoqueDepoisError) throw estoqueDepoisError

  const estoqueDepois = estoqueDepoisData?.quantidade || 0
  const incrementoJaAplicado = (estoqueDepois - estoqueAntes) >= quantidadeDevolver

  if (!incrementoJaAplicado) {
    if (estoqueDepoisData) {
      const { error: estoqueUpdateError } = await supabase
        .from('estoque_salgados')
        .update({
          quantidade: estoqueDepois + quantidadeDevolver,
          updated_at: new Date().toISOString(),
        })
        .eq('produto_id', distribuicao.produto_id)
        .eq('quantidade', estoqueDepois)
      if (estoqueUpdateError) throw estoqueUpdateError
    } else {
      const { error: estoqueInsertError } = await supabase
        .from('estoque_salgados')
        .insert([{
          produto_id: distribuicao.produto_id,
          quantidade: quantidadeDevolver,
        }])
      if (estoqueInsertError) throw estoqueInsertError
    }
  }
}
