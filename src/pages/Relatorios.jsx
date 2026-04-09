import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from 'recharts'
import { format, parseISO, startOfWeek, endOfWeek, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getProducoes } from '../services/producaoService'
import { getDistribuicoes } from '../services/distribuicaoService'
import { getEstoque, getMovimentacoes } from '../services/estoqueService'
import Card, { CardHeader, CardBody } from '../components/ui/Card'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { toast } from '../components/ui/Toast'
import { toDateInputInAppTZ, formatDateTimeInAppTZ } from '../utils/dateTime'

const PIE_COLORS = ['#f97316','#3b82f6','#10b981','#8b5cf6','#f43f5e','#eab308','#06b6d4','#ec4899']

const ABAS = [
  { id: 'producao',     label: 'Produção'      },
  { id: 'distribuicao', label: 'Distribuição'  },
  { id: 'estoque',      label: 'Estoque'       },
]

const toNumber = (value) => Number(value) || 0

const normalizeDateKey = (value) => {
  if (!value) return null
  // Se já vier no formato DATE (yyyy-MM-dd), usa diretamente.
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return toDateInputInAppTZ(date)
}

export default function Relatorios() {
  const [aba,           setAba]           = useState('producao')
  const [producoes,     setProducoes]     = useState([])
  const [distribuicoes, setDistribuicoes] = useState([])
  const [estoque,       setEstoque]       = useState([])
  const [movimentacoes, setMovimentacoes] = useState([])
  const [loading,       setLoading]       = useState(false)

  // Filtros por período
  const [dataInicio, setDataInicio] = useState(
    toDateInputInAppTZ(startOfWeek(new Date(), { weekStartsOn: 4 }))
  )
  const [dataFim,    setDataFim]    = useState(
    toDateInputInAppTZ(endOfWeek(new Date(), { weekStartsOn: 4 }))
  )

  const buscar = async (inicio = dataInicio, fim = dataFim) => {
    setLoading(true)
    try {
      const [p, d, e, m] = await Promise.all([
        getProducoes(inicio, fim),
        getDistribuicoes(inicio, fim),
        getEstoque(),
        getMovimentacoes(200),
      ])
      setProducoes(p)
      setDistribuicoes(d)
      setEstoque(e)
      setMovimentacoes(m)
    } catch {
      toast.error('Erro ao carregar relatórios.')
    } finally {
      setLoading(false)
    }
  }

  const moverSemana = (dias) => {
    const inicioAtual = parseISO(dataInicio)
    const fimAtual = parseISO(dataFim)
    if (Number.isNaN(inicioAtual.getTime()) || Number.isNaN(fimAtual.getTime())) {
      toast.error('Período inválido para navegação semanal.')
      return
    }

    const novoInicio = toDateInputInAppTZ(addDays(inicioAtual, dias))
    const novoFim = toDateInputInAppTZ(addDays(fimAtual, dias))

    setDataInicio(novoInicio)
    setDataFim(novoFim)
    buscar(novoInicio, novoFim)
  }

  useEffect(() => { buscar() }, [])

  // --- Dados processados: Produção ---
  const producaoPorDia = (() => {
    const mapa = {}
    producoes.forEach(p => {
      const chaveData = normalizeDateKey(p.data)
      if (!chaveData) return
      mapa[chaveData] = (mapa[chaveData] || 0) + toNumber(p.quantidade_produzida)
    })
    return Object.entries(mapa).sort().map(([data, qtd]) => ({
      data: format(parseISO(data), 'dd/MM', { locale: ptBR }),
      Produção: qtd,
    }))
  })()

  const producaoPorProduto = (() => {
    const mapa = {}
    producoes.forEach(p => {
      const nome = p.produtos?.nome || p.produto_id || '?'
      mapa[nome] = (mapa[nome] || 0) + toNumber(p.quantidade_produzida)
    })
    return Object.entries(mapa)
      .sort((a, b) => b[1] - a[1])
      .map(([produto, Produção]) => ({ produto, Produção }))
  })()

  // --- Dados processados: Distribuição ---
  const distribuicaoPorUnidade = (() => {
    const mapa = {}
    distribuicoes.forEach(d => {
      const nome = d.unidades?.nome || '?'
      mapa[nome] = (mapa[nome] || 0) + d.quantidade
    })
    return Object.entries(mapa).map(([name, value]) => ({ name, value }))
  })()

  const distribuicaoPorProduto = (() => {
    const mapa = {}
    distribuicoes.forEach(d => {
      const nome = d.produtos?.nome || '?'
      mapa[nome] = (mapa[nome] || 0) + d.quantidade
    })
    return Object.entries(mapa)
      .sort((a, b) => b[1] - a[1])
      .map(([produto, Distribuição]) => ({ produto, Distribuição }))
  })()

  // --- Dados processados: Estoque ---
  const estoquePorProduto = estoque
    .filter(e => e.quantidade > 0)
    .sort((a, b) => b.quantidade - a.quantidade)
    .map(e => ({ produto: e.produtos?.nome || '?', Estoque: e.quantidade }))

  // Total
  const totalProd  = producoes.reduce((a, p) => a + toNumber(p.quantidade_produzida), 0)
  const totalDist  = distribuicoes.reduce((a, d) => a + toNumber(d.quantidade), 0)
  const totalEstq  = estoque.reduce((a, e) => a + toNumber(e.quantidade), 0)

  const emptyMsg = (msg) => (
    <p className="text-center text-gray-400 text-sm py-10">{msg}</p>
  )

  const imprimir = () => {
    window.print()
  }

  return (
    <div className="space-y-4">
      <div className="print-only">
        <h1 className="text-xl font-bold text-gray-800">Relatórios</h1>
        <p className="text-sm text-gray-500">Período: {dataInicio} até {dataFim}</p>
      </div>

      {/* Filtro de período */}
      <Card className="no-print">
        <CardBody>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-600">Data Início</label>
              <input
                type="date"
                value={dataInicio}
                onChange={e => setDataInicio(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-600">Data Fim</label>
              <input
                type="date"
                value={dataFim}
                onChange={e => setDataFim(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
            <button
              onClick={() => moverSemana(-7)}
              disabled={loading}
              className="px-4 py-1.5 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-300 disabled:opacity-50"
            >
              Semana Anterior
            </button>
            <button
              onClick={() => moverSemana(7)}
              disabled={loading}
              className="px-4 py-1.5 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-300 disabled:opacity-50"
            >
              Semana Seguinte
            </button>
            <button
              onClick={buscar}
              disabled={loading}
              className="px-4 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg disabled:opacity-50"
            >
              {loading ? 'Filtrando...' : 'Filtrar'}
            </button>
            <button
              onClick={imprimir}
              className="px-4 py-1.5 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-300"
            >
              Imprimir
            </button>
          </div>
        </CardBody>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Produzido', value: totalProd, color: 'text-primary-600' },
          { label: 'Total Distribuído', value: totalDist, color: 'text-blue-600' },
          { label: 'Estoque Atual', value: totalEstq, color: 'text-cyan-600' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">{k.label}</p>
            <p className={`text-3xl font-bold ${k.color}`}>{k.value.toLocaleString('pt-BR')}</p>
            <p className="text-xs text-gray-400">unidades</p>
          </div>
        ))}
      </div>

      {/* Abas */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit no-print">
        {ABAS.map(a => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={`px-5 py-1.5 rounded-md text-sm font-medium transition-colors ${
              aba === a.id ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : (
        <>
          {/* Produção */}
          {aba === 'producao' && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <h2 className="font-semibold text-gray-700 text-sm">Produção por Dia</h2>
                </CardHeader>
                <CardBody>
                  {producaoPorDia.length === 0 ? emptyMsg('Sem dados de produção no período.') : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={producaoPorDia}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="data" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="Produção" fill="#f97316" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardBody>
              </Card>
              <Card>
                <CardHeader>
                  <h2 className="font-semibold text-gray-700 text-sm">Produção por Produto</h2>
                </CardHeader>
                <CardBody>
                  {producaoPorProduto.length === 0 ? emptyMsg('Sem dados de produção no período.') : (
                    <ResponsiveContainer width="100%" height={Math.max(200, producaoPorProduto.length * 45)}>
                      <BarChart data={producaoPorProduto} layout="vertical">
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis dataKey="produto" type="category" width={150} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="Produção" fill="#f97316" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardBody>
              </Card>
            </div>
          )}

          {/* Distribuição */}
          {aba === 'distribuicao' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <h2 className="font-semibold text-gray-700 text-sm">Distribuição por Unidade</h2>
                </CardHeader>
                <CardBody>
                  {distribuicaoPorUnidade.length === 0 ? emptyMsg('Sem distribuições no período.') : (
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={distribuicaoPorUnidade}
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          dataKey="value"
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {distribuicaoPorUnidade.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardBody>
              </Card>
              <Card>
                <CardHeader>
                  <h2 className="font-semibold text-gray-700 text-sm">Distribuição por Produto</h2>
                </CardHeader>
                <CardBody>
                  {distribuicaoPorProduto.length === 0 ? emptyMsg('Sem distribuições no período.') : (
                    <ResponsiveContainer width="100%" height={Math.max(200, distribuicaoPorProduto.length * 45)}>
                      <BarChart data={distribuicaoPorProduto} layout="vertical">
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis dataKey="produto" type="category" width={150} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="Distribuição" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardBody>
              </Card>

              {/* Tabela de distribuições */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <h2 className="font-semibold text-gray-700 text-sm">Detalhamento das Distribuições</h2>
                  </CardHeader>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50">
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Data</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Unidade</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Produto</th>
                          <th className="text-right px-4 py-3 font-medium text-gray-600">Qtd.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {distribuicoes.map(d => (
                          <tr key={d.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5 text-gray-500 text-xs">
                              {format(parseISO(d.data), 'dd/MM/yyyy', { locale: ptBR })}
                            </td>
                            <td className="px-4 py-2.5 font-medium text-gray-800">{d.unidades?.nome}</td>
                            <td className="px-4 py-2.5 text-gray-600">{d.produtos?.nome}</td>
                            <td className="px-4 py-2.5 text-right font-semibold">{d.quantidade}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* Estoque */}
          {aba === 'estoque' && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <h2 className="font-semibold text-gray-700 text-sm">Estoque Atual por Produto</h2>
                </CardHeader>
                <CardBody>
                  {estoquePorProduto.length === 0 ? emptyMsg('Estoque vazio.') : (
                    <ResponsiveContainer width="100%" height={Math.max(200, estoquePorProduto.length * 45)}>
                      <BarChart data={estoquePorProduto} layout="vertical">
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis dataKey="produto" type="category" width={150} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="Estoque" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardBody>
              </Card>

              {/* Tabela estoque */}
              <Card>
                <CardHeader>
                  <h2 className="font-semibold text-gray-700 text-sm">Tabela de Estoque</h2>
                </CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Produto</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-600">Quantidade</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Última atualização</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {estoque.length === 0
                        ? <tr><td colSpan={4} className="text-center py-10 text-gray-400">Estoque vazio.</td></tr>
                        : estoque.map(e => (
                          <tr key={e.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-800">{e.produtos?.nome}</td>
                            <td className="px-4 py-3 text-gray-500 capitalize">{e.produtos?.tipo}</td>
                            <td className="px-4 py-3 text-right">
                              <span className={`font-bold text-lg ${e.quantidade === 0 ? 'text-red-500' : 'text-gray-800'}`}>
                                {e.quantidade}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-400 text-xs">
                              {formatDateTimeInAppTZ(e.updated_at)}
                            </td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Histórico de movimentações (top 100) */}
              <Card>
                <CardHeader>
                  <h2 className="font-semibold text-gray-700 text-sm">Últimas Movimentações de Estoque</h2>
                </CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Data/Hora</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Produto</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-600">Quantidade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {movimentacoes.length === 0
                        ? <tr><td colSpan={4} className="text-center py-10 text-gray-400">Nenhuma movimentação.</td></tr>
                        : movimentacoes.map(m => (
                          <tr key={m.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5 text-gray-400 text-xs whitespace-nowrap">
                              {formatDateTimeInAppTZ(m.created_at)}
                            </td>
                            <td className="px-4 py-2.5 font-medium text-gray-800">{m.produtos?.nome}</td>
                            <td className="px-4 py-2.5">
                              <span className={`text-xs font-medium ${m.tipo === 'entrada_producao' ? 'text-green-600' : 'text-red-600'}`}>
                                {m.tipo === 'entrada_producao' ? '↑ Entrada (Produção)' : '↓ Saída (Distribuição)'}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <span className={`font-semibold ${m.tipo === 'entrada_producao' ? 'text-green-600' : 'text-red-600'}`}>
                                {m.tipo === 'entrada_producao' ? '+' : '-'}{m.quantidade}
                              </span>
                            </td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  )
}
