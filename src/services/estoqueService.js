import { supabase } from '../lib/supabase'

export const getEstoque = async () => {
  const { data, error } = await supabase
    .from('estoque_salgados')
    .select('*, produtos(nome, tipo, recheio)')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data
}

export const getMovimentacoes = async (limit = 50) => {
  const { data, error } = await supabase
    .from('movimentacoes_estoque')
    .select('*, produtos(nome)')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

/**
 * Exclui uma movimentação e reverte seu efeito no estoque.
 * - entrada_producao: subtrai do estoque
 * - distribuicao: soma de volta ao estoque
 */
export const deleteMovimentacao = async (movimentacaoId) => {
  const { data: mov, error: movReadError } = await supabase
    .from('movimentacoes_estoque')
    .select('id, produto_id, tipo, quantidade')
    .eq('id', movimentacaoId)
    .single()
  if (movReadError) throw movReadError

  const { data: estoqueAtual, error: estoqueReadError } = await supabase
    .from('estoque_salgados')
    .select('quantidade')
    .eq('produto_id', mov.produto_id)
    .maybeSingle()
  if (estoqueReadError) throw estoqueReadError

  if (mov.tipo === 'entrada_producao') {
    const quantidadeAtual = estoqueAtual?.quantidade || 0
    if (!estoqueAtual || quantidadeAtual < mov.quantidade) {
      throw new Error(
        `Não é possível excluir esta movimentação: estoque atual (${quantidadeAtual}) menor que a entrada (${mov.quantidade}).`
      )
    }

    const { error: estoqueUpdateError } = await supabase
      .from('estoque_salgados')
      .update({
        quantidade: quantidadeAtual - mov.quantidade,
        updated_at: new Date().toISOString(),
      })
      .eq('produto_id', mov.produto_id)
    if (estoqueUpdateError) throw estoqueUpdateError
  } else {
    // distribuicao: ao excluir, devolve quantidade ao estoque
    if (estoqueAtual) {
      const { error: estoqueUpdateError } = await supabase
        .from('estoque_salgados')
        .update({
          quantidade: estoqueAtual.quantidade + mov.quantidade,
          updated_at: new Date().toISOString(),
        })
        .eq('produto_id', mov.produto_id)
      if (estoqueUpdateError) throw estoqueUpdateError
    } else {
      const { error: estoqueInsertError } = await supabase
        .from('estoque_salgados')
        .insert([{
          produto_id: mov.produto_id,
          quantidade: mov.quantidade,
        }])
      if (estoqueInsertError) throw estoqueInsertError
    }
  }

  const { error: movDeleteError } = await supabase
    .from('movimentacoes_estoque')
    .delete()
    .eq('id', movimentacaoId)
  if (movDeleteError) throw movDeleteError
}
