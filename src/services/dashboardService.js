import { supabase } from '../lib/supabase'
import { startOfWeek, endOfWeek, format } from 'date-fns'

export const getDashboardData = async () => {
  const hoje        = new Date()
  const inicioSemana = format(startOfWeek(hoje, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const fimSemana    = format(endOfWeek(hoje,   { weekStartsOn: 1 }), 'yyyy-MM-dd')

  // Produção da semana
  const { data: producoesSemana } = await supabase
    .from('producoes')
    .select('data, quantidade_produzida, produto_id, produtos(nome)')
    .gte('data', inicioSemana)
    .lte('data', fimSemana)
    .order('data')

  // Distribuição da semana
  const { data: distribuicoesSemana } = await supabase
    .from('distribuicoes')
    .select('data, quantidade, unidade_id, unidades(nome)')
    .gte('data', inicioSemana)
    .lte('data', fimSemana)
    .order('data')

  // Estoque atual
  const { data: estoque } = await supabase
    .from('estoque_salgados')
    .select('quantidade, produtos(nome)')
    .order('quantidade', { ascending: false })

  return {
    producoesSemana:    producoesSemana    || [],
    distribuicoesSemana: distribuicoesSemana || [],
    estoque:            estoque            || [],
    inicioSemana,
    fimSemana,
  }
}
