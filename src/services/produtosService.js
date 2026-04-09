import { supabase } from '../lib/supabase'

export const getProdutos = async (apenasAtivos = false) => {
  let query = supabase.from('produtos').select('*').order('nome')
  if (apenasAtivos) query = query.eq('ativo', true)
  const { data, error } = await query
  if (error) throw error
  return data
}

export const getProdutoById = async (id) => {
  const { data, error } = await supabase
    .from('produtos')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export const createProduto = async (produto) => {
  const { data, error } = await supabase
    .from('produtos')
    .insert([produto])
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateProduto = async (id, produto) => {
  const { data, error } = await supabase
    .from('produtos')
    .update(produto)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteProduto = async (id) => {
  const { error } = await supabase.from('produtos').delete().eq('id', id)
  if (error) throw error
}
