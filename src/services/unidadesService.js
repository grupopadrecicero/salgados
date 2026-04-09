import { supabase } from '../lib/supabase'

export const getUnidades = async (apenasAtivas = false) => {
  let query = supabase.from('unidades').select('*').order('nome')
  if (apenasAtivas) query = query.eq('ativo', true)
  const { data, error } = await query
  if (error) throw error
  return data
}

export const createUnidade = async (unidade) => {
  const { data, error } = await supabase
    .from('unidades')
    .insert([unidade])
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateUnidade = async (id, unidade) => {
  const { data, error } = await supabase
    .from('unidades')
    .update(unidade)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteUnidade = async (id) => {
  const { error } = await supabase.from('unidades').delete().eq('id', id)
  if (error) throw error
}
