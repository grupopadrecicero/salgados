import { supabase } from '../lib/supabase'

const isTabelaAgrupadaAusente = (error) => {
  if (!error) return false
  if (error.code === 'PGRST205') return true
  if (error.message?.includes('Could not find the table')) return true
  if (error.message?.includes('relation') && error.message?.includes('does not exist')) return true
  return false
}

const aplicarFiltroData = (query, dataInicio, dataFim) => {
  let filteredQuery = query
  if (dataInicio) filteredQuery = filteredQuery.gte('data', dataInicio)
  if (dataFim) filteredQuery = filteredQuery.lte('data', dataFim)
  return filteredQuery
}

const agruparProducoesLocais = (producoes = []) => {
  const porData = new Map()

  producoes.forEach((producao) => {
    const data = producao.data
    if (!data) return

    if (!porData.has(data)) {
      porData.set(data, {
        id: `fallback-${data}`,
        data,
        quantidade_total: 0,
        numero_registros: 0,
        created_at: null,
        producoes_agrupadas_detalhes: [],
      })
    }

    const agrupada = porData.get(data)
    const quantidade = Number(producao.quantidade_produzida) || 0
    agrupada.quantidade_total += quantidade
    agrupada.numero_registros += 1

    let detalhe = agrupada.producoes_agrupadas_detalhes.find((item) => item.produto_id === producao.produto_id)
    if (!detalhe) {
      detalhe = {
        id: `fallback-${data}-${producao.produto_id}`,
        produto_id: producao.produto_id,
        quantidade_total: 0,
        numero_registros: 0,
        produtos: producao.produtos || null,
      }
      agrupada.producoes_agrupadas_detalhes.push(detalhe)
    }

    detalhe.quantidade_total += quantidade
    detalhe.numero_registros += 1
  })

  return Array.from(porData.values()).sort((a, b) => b.data.localeCompare(a.data))
}

const getProducoesAgrupadasFallback = async (dataInicio, dataFim) => {
  const baseQuery = supabase
    .from('producoes')
    .select('id, data, produto_id, quantidade_produzida, produtos(id, nome, tipo)')
    .order('data', { ascending: false })

  const { data, error } = await aplicarFiltroData(baseQuery, dataInicio, dataFim)

  if (error) {
    throw new Error(`Erro ao buscar produções para agrupamento local: ${error.message}`)
  }

  return agruparProducoesLocais(data || [])
}

/**
 * Busca produções agrupadas por dia com seus detalhes
 */
export async function getProducoesAgrupadas(dataInicio, dataFim) {
  const baseQuery = supabase
    .from('producoes_agrupadas')
    .select(`
      id,
      data,
      quantidade_total,
      numero_registros,
      created_at,
      producoes_agrupadas_detalhes(
        id,
        produto_id,
        quantidade_total,
        numero_registros,
        produtos(id, nome, tipo)
      )
    `)
    .order('data', { ascending: false })

  const { data, error } = await aplicarFiltroData(baseQuery, dataInicio, dataFim)

  if (error) {
    if (isTabelaAgrupadaAusente(error)) {
      return getProducoesAgrupadasFallback(dataInicio, dataFim)
    }
    throw new Error(`Erro ao buscar produções agrupadas: ${error.message}`)
  }

  return data || []
}

/**
 * Busca uma produção agrupada específica com seus detalhes
 */
export async function getProducaoAgrupada(id) {
  const { data, error } = await supabase
    .from('producoes_agrupadas')
    .select(`
      id,
      data,
      quantidade_total,
      numero_registros,
      created_at,
      updated_at,
      producoes_agrupadas_detalhes(
        id,
        produto_id,
        quantidade_total,
        numero_registros,
        produtos(id, nome, tipo)
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw new Error(`Erro ao buscar produção agrupada: ${error.message}`)

  return data
}

/**
 * Cria ou atualiza uma produção agrupada para um dia específico
 * @param {string} data - Data em formato YYYY-MM-DD
 * @param {Array} detalhes - Array de { produto_id, quantidade_total, numero_registros }
 */
export async function createOrUpdateProducaoAgrupada(data, detalhes) {
  const quantidade_total = detalhes.reduce((acc, d) => acc + d.quantidade_total, 0)
  const numero_registros = detalhes.reduce((acc, d) => acc + d.numero_registros, 0)

  // Busca se já existe agrupamento para essa data
  const { data: existente } = await supabase
    .from('producoes_agrupadas')
    .select('id')
    .eq('data', data)
    .single()

  let agrupada_id

  if (existente) {
    // Atualiza o existente
    const { error } = await supabase
      .from('producoes_agrupadas')
      .update({
        quantidade_total,
        numero_registros,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existente.id)

    if (error) throw new Error(`Erro ao atualizar produção agrupada: ${error.message}`)
    agrupada_id = existente.id
  } else {
    // Cria novo
    const { data: novo, error } = await supabase
      .from('producoes_agrupadas')
      .insert({ data, quantidade_total, numero_registros })
      .select('id')
      .single()

    if (error) throw new Error(`Erro ao criar produção agrupada: ${error.message}`)
    agrupada_id = novo.id
  }

  // Remove detalhes antigos
  await supabase
    .from('producoes_agrupadas_detalhes')
    .delete()
    .eq('producao_agrupada_id', agrupada_id)

  // Insere novos detalhes
  const detalhesComId = detalhes.map(d => ({
    producao_agrupada_id: agrupada_id,
    ...d,
  }))

  if (detalhesComId.length > 0) {
    const { error } = await supabase
      .from('producoes_agrupadas_detalhes')
      .insert(detalhesComId)

    if (error) throw new Error(`Erro ao inserir detalhes: ${error.message}`)
  }

  return agrupada_id
}

/**
 * Deleta uma produção agrupada e seus detalhes
 */
export async function deleteProducaoAgrupada(id) {
  const { error } = await supabase
    .from('producoes_agrupadas')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`Erro ao deletar produção agrupada: ${error.message}`)
}

/**
 * Regenera todos os agrupamentos calculando a partir da tabela de produções
 */
export async function regenerarAgrupamentosProducoes() {
  // Busca todas as produções
  const { data: producoes, error: errorProducoes } = await supabase
    .from('producoes')
    .select('id, data, produto_id, quantidade_produzida')
    .order('data', { ascending: false })

  if (errorProducoes) {
    throw new Error(`Erro ao buscar produções: ${errorProducoes.message}`)
  }

  // Agrupa por data
  const agrupamentosPorData = {}

  producoes.forEach(p => {
    if (!agrupamentosPorData[p.data]) {
      agrupamentosPorData[p.data] = {}
    }

    if (!agrupamentosPorData[p.data][p.produto_id]) {
      agrupamentosPorData[p.data][p.produto_id] = {
        quantidade_total: 0,
        numero_registros: 0,
      }
    }

    agrupamentosPorData[p.data][p.produto_id].quantidade_total += p.quantidade_produzida
    agrupamentosPorData[p.data][p.produto_id].numero_registros += 1
  })

  // Limpa os agrupamentos existentes
  await supabase.from('producoes_agrupadas_detalhes').delete().gte('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('producoes_agrupadas').delete().gte('id', '00000000-0000-0000-0000-000000000000')

  // Cria novos agrupamentos
  for (const [data, produtosPorData] of Object.entries(agrupamentosPorData)) {
    const detalhes = Object.entries(produtosPorData).map(([produto_id, dados]) => ({
      produto_id,
      ...dados,
    }))

    await createOrUpdateProducaoAgrupada(data, detalhes)
  }
}
