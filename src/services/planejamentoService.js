import { supabase } from '../lib/supabase'

export const getPlanejamentos = async (dataInicio, dataFim) => {
  let query = supabase
    .from('planejamento_producao')
    .select('*, produtos(nome, tipo, recheio)')
    .order('data')
  if (dataInicio) query = query.gte('data', dataInicio)
  if (dataFim)    query = query.lte('data', dataFim)
  const { data, error } = await query
  if (error) throw error
  return data
}

export const createPlanejamento = async (planejamento) => {
  const { data, error } = await supabase
    .from('planejamento_producao')
    .insert([planejamento])
    .select('*, produtos(nome, tipo, recheio)')
    .single()
  if (error) throw error
  return data
}

export const updatePlanejamento = async (id, planejamento) => {
  const { data, error } = await supabase
    .from('planejamento_producao')
    .update(planejamento)
    .eq('id', id)
    .select('*, produtos(nome, tipo, recheio)')
    .single()
  if (error) throw error
  return data
}

export const deletePlanejamento = async (id) => {
  const { error } = await supabase
    .from('planejamento_producao')
    .delete()
    .eq('id', id)
  if (error) throw error
}
