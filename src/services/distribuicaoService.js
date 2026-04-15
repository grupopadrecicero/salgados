import { supabase } from '../lib/supabase'
import { regenerarAgrupamentosDistribuicoes } from './distribuicaoAgrupadadaService'

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

const getEstoqueProduto = async (produtoId) => {
  const { data, error } = await supabase
    .from('estoque_salgados')
    .select('quantidade')
    .eq('produto_id', produtoId)
    .maybeSingle()
  if (error) throw error
  return data
}

const ajustarEstoqueProduto = async (produtoId, variacao) => {
  if (!variacao) return

  const estoqueAtual = await getEstoqueProduto(produtoId)
  const quantidadeAtual = Number(estoqueAtual?.quantidade || 0)
  const novaQuantidade = quantidadeAtual + variacao

  if (novaQuantidade < 0) {
    throw new Error(
      `Estoque insuficiente. Disponível: ${quantidadeAtual} unidade(s).`
    )
  }

  if (estoqueAtual) {
    const { data: atualizado, error: updateError } = await supabase
      .from('estoque_salgados')
      .update({
        quantidade: novaQuantidade,
        updated_at: new Date().toISOString(),
      })
      .eq('produto_id', produtoId)
      .eq('quantidade', quantidadeAtual)
      .select('produto_id')
      .maybeSingle()

    if (updateError) throw updateError
    if (!atualizado) {
      throw new Error('Estoque alterado por outra operação. Atualize a tela e tente novamente.')
    }
    return
  }

  const { error: insertError } = await supabase
    .from('estoque_salgados')
    .insert([{
      produto_id: produtoId,
      quantidade: novaQuantidade,
    }])

  if (insertError) throw insertError
}

const rollbackAjustes = async (ajustesAplicados) => {
  const ajustesReversos = [...ajustesAplicados].reverse()
  for (const ajuste of ajustesReversos) {
    try {
      await ajustarEstoqueProduto(ajuste.produtoId, -ajuste.variacao)
    } catch (error) {
      console.error('[distribuicao] Erro ao reverter ajuste de estoque:', error)
    }
  }
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

  // 6. Regenerar agrupamentos
  try {
    await regenerarAgrupamentosDistribuicoes()
  } catch (err) {
    console.error('[agrupamento] Erro ao regenerar agrupamentos:', err)
  }

  return distribData || { id: distribuicaoId, ...distribuicao }
}

export const updateDistribuicao = async (id, distribuicao) => {
  const quantidadeNova = Number(distribuicao.quantidade) || 0
  if (quantidadeNova < 1) {
    throw new Error('Quantidade deve ser maior que zero.')
  }

  const { data: distribuicaoAtual, error: distribReadError } = await supabase
    .from('distribuicoes')
    .select('id, data, unidade_id, produto_id, quantidade')
    .eq('id', id)
    .single()
  if (distribReadError) throw distribReadError

  const quantidadeAtual = Number(distribuicaoAtual.quantidade) || 0
  const produtoAtualId = distribuicaoAtual.produto_id
  const produtoNovoId = distribuicao.produto_id

  const ajustesAplicados = []
  const aplicarAjuste = async (produtoId, variacao) => {
    if (!variacao) return
    await ajustarEstoqueProduto(produtoId, variacao)
    ajustesAplicados.push({ produtoId, variacao })
  }

  try {
    if (produtoAtualId === produtoNovoId) {
      await aplicarAjuste(produtoAtualId, quantidadeAtual - quantidadeNova)
    } else {
      await aplicarAjuste(produtoAtualId, quantidadeAtual)
      await aplicarAjuste(produtoNovoId, -quantidadeNova)
    }

    const payload = {
      data: distribuicao.data,
      unidade_id: distribuicao.unidade_id,
      produto_id: produtoNovoId,
      quantidade: quantidadeNova,
    }

    const { error: updateDistribError } = await supabase
      .from('distribuicoes')
      .update(payload)
      .eq('id', id)
    if (updateDistribError) throw updateDistribError

    const { data: movExistente, error: movReadError } = await supabase
      .from('movimentacoes_estoque')
      .select('id')
      .eq('referencia_id', id)
      .eq('tipo', 'distribuicao')
      .maybeSingle()
    if (movReadError) throw movReadError

    if (movExistente?.id) {
      const { error: movUpdateError } = await supabase
        .from('movimentacoes_estoque')
        .update({
          produto_id: produtoNovoId,
          quantidade: quantidadeNova,
        })
        .eq('id', movExistente.id)
      if (movUpdateError) throw movUpdateError
    } else {
      const { error: movInsertError } = await supabase
        .from('movimentacoes_estoque')
        .insert([{
          produto_id: produtoNovoId,
          tipo: 'distribuicao',
          quantidade: quantidadeNova,
          referencia_id: id,
        }])
      if (movInsertError) throw movInsertError
    }
  } catch (error) {
    await rollbackAjustes(ajustesAplicados)

    try {
      await supabase
        .from('distribuicoes')
        .update({
          data: distribuicaoAtual.data,
          unidade_id: distribuicaoAtual.unidade_id,
          produto_id: distribuicaoAtual.produto_id,
          quantidade: quantidadeAtual,
        })
        .eq('id', id)
    } catch (rollbackError) {
      console.error('[distribuicao] Erro ao reverter distribuição:', rollbackError)
    }

    throw error
  }

  // Regenerar agrupamentos
  try {
    await regenerarAgrupamentosDistribuicoes()
  } catch (err) {
    console.error('[agrupamento] Erro ao regenerar agrupamentos:', err)
  }
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

  // Regenerar agrupamentos
  try {
    await regenerarAgrupamentosDistribuicoes()
  } catch (err) {
    console.error('[agrupamento] Erro ao regenerar agrupamentos:', err)
  }
}
