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

const ordenarAgrupadas = (items = []) => {
  return [...items].sort((a, b) => {
    const dataCompare = b.data.localeCompare(a.data)
    if (dataCompare !== 0) return dataCompare

    const nomeA = a.unidades?.nome || ''
    const nomeB = b.unidades?.nome || ''
    return nomeA.localeCompare(nomeB, 'pt-BR')
  })
}

const agruparDistribuicoesLocais = (distribuicoes = []) => {
  const porDataUnidade = new Map()

  distribuicoes.forEach((dist) => {
    if (!dist?.data || !dist?.unidade_id) return

    const chave = `${dist.data}|${dist.unidade_id}`

    if (!porDataUnidade.has(chave)) {
      porDataUnidade.set(chave, {
        id: `fallback-${chave}`,
        data: dist.data,
        unidade_id: dist.unidade_id,
        quantidade_total: 0,
        numero_registros: 0,
        created_at: null,
        unidades: dist.unidades
          ? {
              id: dist.unidades.id || dist.unidade_id,
              nome: dist.unidades.nome,
              cidade: dist.unidades.cidade,
            }
          : null,
        distribuicoes_agrupadas_detalhes: [],
      })
    }

    const agrupada = porDataUnidade.get(chave)
    const quantidade = Number(dist.quantidade) || 0
    agrupada.quantidade_total += quantidade
    agrupada.numero_registros += 1

    let detalhe = agrupada.distribuicoes_agrupadas_detalhes.find((item) => item.produto_id === dist.produto_id)
    if (!detalhe) {
      detalhe = {
        id: `fallback-${chave}-${dist.produto_id}`,
        produto_id: dist.produto_id,
        quantidade_total: 0,
        numero_registros: 0,
        produtos: dist.produtos
          ? {
              id: dist.produtos.id || dist.produto_id,
              nome: dist.produtos.nome,
              tipo: dist.produtos.tipo,
            }
          : null,
      }
      agrupada.distribuicoes_agrupadas_detalhes.push(detalhe)
    }

    detalhe.quantidade_total += quantidade
    detalhe.numero_registros += 1
  })

  return ordenarAgrupadas(Array.from(porDataUnidade.values()))
}

const getDistribuicoesAgrupadasFallback = async (dataInicio, dataFim) => {
  const baseQuery = supabase
    .from('distribuicoes')
    .select('id, data, unidade_id, produto_id, quantidade, unidades(id, nome, cidade), produtos(id, nome, tipo)')
    .order('data', { ascending: false })

  const { data, error } = await aplicarFiltroData(baseQuery, dataInicio, dataFim)

  if (error) {
    throw new Error(`Erro ao buscar distribuições para agrupamento local: ${error.message}`)
  }

  return agruparDistribuicoesLocais(data || [])
}

const getDistribuicoesAgrupadasPorUnidadeFallback = async (unidadeId, dataInicio, dataFim) => {
  const baseQuery = supabase
    .from('distribuicoes')
    .select('id, data, unidade_id, produto_id, quantidade, unidades(id, nome, cidade), produtos(id, nome, tipo)')
    .eq('unidade_id', unidadeId)
    .order('data', { ascending: false })

  const { data, error } = await aplicarFiltroData(baseQuery, dataInicio, dataFim)

  if (error) {
    throw new Error(`Erro ao buscar distribuições da unidade para agrupamento local: ${error.message}`)
  }

  return agruparDistribuicoesLocais(data || [])
}

/**
 * Busca distribuições agrupadas por unidade com seus detalhes
 */
export async function getDistribuicoesAgrupadas(dataInicio, dataFim) {
  const baseQuery = supabase
    .from('distribuicoes_agrupadas')
    .select(`
      id,
      data,
      unidade_id,
      quantidade_total,
      numero_registros,
      created_at,
      unidades(id, nome, cidade),
      distribuicoes_agrupadas_detalhes(
        id,
        produto_id,
        quantidade_total,
        numero_registros,
        produtos(id, nome, tipo)
      )
    `)
    .order('data', { ascending: false })
    .order('unidades(nome)', { ascending: true })

  const { data, error } = await aplicarFiltroData(baseQuery, dataInicio, dataFim)

  if (error) {
    if (isTabelaAgrupadaAusente(error)) {
      return getDistribuicoesAgrupadasFallback(dataInicio, dataFim)
    }
    throw new Error(`Erro ao buscar distribuições agrupadas: ${error.message}`)
  }

  return data || []
}

/**
 * Busca distribuições agrupadas de uma unidade específica
 */
export async function getDistribuicoesAgrupadasPorUnidade(unidadeId, dataInicio, dataFim) {
  const baseQuery = supabase
    .from('distribuicoes_agrupadas')
    .select(`
      id,
      data,
      unidade_id,
      quantidade_total,
      numero_registros,
      created_at,
      unidades(id, nome, cidade),
      distribuicoes_agrupadas_detalhes(
        id,
        produto_id,
        quantidade_total,
        numero_registros,
        produtos(id, nome, tipo)
      )
    `)
    .eq('unidade_id', unidadeId)
    .order('data', { ascending: false })

  const { data, error } = await aplicarFiltroData(baseQuery, dataInicio, dataFim)

  if (error) {
    if (isTabelaAgrupadaAusente(error)) {
      return getDistribuicoesAgrupadasPorUnidadeFallback(unidadeId, dataInicio, dataFim)
    }
    throw new Error(`Erro ao buscar distribuições agrupadas da unidade: ${error.message}`)
  }

  return data || []
}

/**
 * Busca uma distribuição agrupada específica com seus detalhes
 */
export async function getDistribuicaoAgrupada(id) {
  const { data, error } = await supabase
    .from('distribuicoes_agrupadas')
    .select(`
      id,
      data,
      unidade_id,
      quantidade_total,
      numero_registros,
      created_at,
      updated_at,
      unidades(id, nome, cidade),
      distribuicoes_agrupadas_detalhes(
        id,
        produto_id,
        quantidade_total,
        numero_registros,
        produtos(id, nome, tipo)
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw new Error(`Erro ao buscar distribuição agrupada: ${error.message}`)

  return data
}

/**
 * Cria ou atualiza uma distribuição agrupada para um dia e unidade específicos
 * @param {string} data - Data em formato YYYY-MM-DD
 * @param {string} unidade_id - UUID da unidade
 * @param {Array} detalhes - Array de { produto_id, quantidade_total, numero_registros }
 */
export async function createOrUpdateDistribuicaoAgrupada(data, unidade_id, detalhes) {
  const quantidade_total = detalhes.reduce((acc, d) => acc + d.quantidade_total, 0)
  const numero_registros = detalhes.reduce((acc, d) => acc + d.numero_registros, 0)

  // Busca se já existe agrupamento para essa data e unidade
  const { data: existente } = await supabase
    .from('distribuicoes_agrupadas')
    .select('id')
    .eq('data', data)
    .eq('unidade_id', unidade_id)
    .single()

  let agrupada_id

  if (existente) {
    // Atualiza o existente
    const { error } = await supabase
      .from('distribuicoes_agrupadas')
      .update({
        quantidade_total,
        numero_registros,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existente.id)

    if (error) throw new Error(`Erro ao atualizar distribuição agrupada: ${error.message}`)
    agrupada_id = existente.id
  } else {
    // Cria novo
    const { data: novo, error } = await supabase
      .from('distribuicoes_agrupadas')
      .insert({ data, unidade_id, quantidade_total, numero_registros })
      .select('id')
      .single()

    if (error) throw new Error(`Erro ao criar distribuição agrupada: ${error.message}`)
    agrupada_id = novo.id
  }

  // Remove detalhes antigos
  await supabase
    .from('distribuicoes_agrupadas_detalhes')
    .delete()
    .eq('distribuicao_agrupada_id', agrupada_id)

  // Insere novos detalhes
  const detalhesComId = detalhes.map(d => ({
    distribuicao_agrupada_id: agrupada_id,
    ...d,
  }))

  if (detalhesComId.length > 0) {
    const { error } = await supabase
      .from('distribuicoes_agrupadas_detalhes')
      .insert(detalhesComId)

    if (error) throw new Error(`Erro ao inserir detalhes: ${error.message}`)
  }

  return agrupada_id
}

/**
 * Deleta uma distribuição agrupada e seus detalhes
 */
export async function deleteDistribuicaoAgrupada(id) {
  const { error } = await supabase
    .from('distribuicoes_agrupadas')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`Erro ao deletar distribuição agrupada: ${error.message}`)
}

/**
 * Regenera todos os agrupamentos calculando a partir da tabela de distribuições
 */
export async function regenerarAgrupamentosDistribuicoes() {
  // Busca todas as distribuições
  const { data: distribuicoes, error: errorDistribuicoes } = await supabase
    .from('distribuicoes')
    .select('id, data, unidade_id, produto_id, quantidade')
    .order('data', { ascending: false })

  if (errorDistribuicoes) {
    throw new Error(`Erro ao buscar distribuições: ${errorDistribuicoes.message}`)
  }

  // Agrupa por data e unidade
  const agrupamentoPorDataUnidade = {}

  distribuicoes.forEach(d => {
    const chave = `${d.data}|${d.unidade_id}`

    if (!agrupamentoPorDataUnidade[chave]) {
      agrupamentoPorDataUnidade[chave] = {
        data: d.data,
        unidade_id: d.unidade_id,
        produtos: {},
      }
    }

    if (!agrupamentoPorDataUnidade[chave].produtos[d.produto_id]) {
      agrupamentoPorDataUnidade[chave].produtos[d.produto_id] = {
        quantidade_total: 0,
        numero_registros: 0,
      }
    }

    agrupamentoPorDataUnidade[chave].produtos[d.produto_id].quantidade_total += d.quantidade
    agrupamentoPorDataUnidade[chave].produtos[d.produto_id].numero_registros += 1
  })

  // Limpa os agrupamentos existentes
  await supabase
    .from('distribuicoes_agrupadas_detalhes')
    .delete()
    .gte('id', '00000000-0000-0000-0000-000000000000')
  await supabase
    .from('distribuicoes_agrupadas')
    .delete()
    .gte('id', '00000000-0000-0000-0000-000000000000')

  // Cria novos agrupamentos
  for (const agrupamento of Object.values(agrupamentoPorDataUnidade)) {
    const detalhes = Object.entries(agrupamento.produtos).map(([produto_id, dados]) => ({
      produto_id,
      ...dados,
    }))

    await createOrUpdateDistribuicaoAgrupada(agrupamento.data, agrupamento.unidade_id, detalhes)
  }
}
