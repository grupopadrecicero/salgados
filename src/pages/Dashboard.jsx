import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { ChefHat, Truck, Snowflake, TrendingUp } from 'lucide-react'
import { getDashboardData } from '../services/dashboardService'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import Card, { CardHeader, CardBody } from '../components/ui/Card'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const PIE_COLORS  = ['#f97316','#3b82f6','#10b981','#8b5cf6','#f43f5e','#eab308','#06b6d4']

function MetricCard({ icon: Icon, label, value, sublabel, color }) {
  return (
    <Card>
      <CardBody className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
          <Icon size={22} className="text-white" />
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-800">{value.toLocaleString('pt-BR')}</p>
          {sublabel && <p className="text-xs text-gray-400 mt-0.5">{sublabel}</p>}
        </div>
      </CardBody>
    </Card>
  )
}

export default function Dashboard() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDashboardData()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />

  if (!data) return (
    <div className="text-center py-16 text-gray-500">
      Erro ao carregar dados. Verifique a configuração do Supabase.
    </div>
  )

  const totalProducaoSemana = data.producoesSemana.reduce(
    (acc, p) => acc + (p.quantidade_produzida || 0), 0
  )
  const totalDistribuicaoSemana = data.distribuicoesSemana.reduce(
    (acc, d) => acc + (d.quantidade || 0), 0
  )
  const totalEstoque = data.estoque.reduce(
    (acc, e) => acc + (e.quantidade || 0), 0
  )

  // Produção agrupada por dia da semana
  const producaoPorDia = (() => {
    const mapa = {}
    data.producoesSemana.forEach(p => {
      const dia = format(parseISO(p.data), 'EEE', { locale: ptBR })
      mapa[dia] = (mapa[dia] || 0) + p.quantidade_produzida
    })
    return Object.entries(mapa).map(([dia, qtd]) => ({ dia, Produção: qtd }))
  })()

  // Distribuição agrupada por unidade
  const distribuicaoPorUnidade = (() => {
    const mapa = {}
    data.distribuicoesSemana.forEach(d => {
      const nome = d.unidades?.nome || 'Desconhecida'
      mapa[nome] = (mapa[nome] || 0) + d.quantidade
    })
    return Object.entries(mapa).map(([name, value]) => ({ name, value }))
  })()

  // Estoque por produto
  const estoquePorProduto = data.estoque
    .filter(e => e.quantidade > 0)
    .map(e => ({ produto: e.produtos?.nome || '?', Estoque: e.quantidade }))

  return (
    <div className="space-y-6">
      {/* Cards de métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          icon={ChefHat}
          label="Produção esta semana"
          value={totalProducaoSemana}
          sublabel="unidades produzidas"
          color="bg-primary-500"
        />
        <MetricCard
          icon={Truck}
          label="Distribuição esta semana"
          value={totalDistribuicaoSemana}
          sublabel="unidades distribuídas"
          color="bg-blue-500"
        />
        <MetricCard
          icon={Snowflake}
          label="Estoque na câmara"
          value={totalEstoque}
          sublabel="unidades congeladas"
          color="bg-cyan-500"
        />
        <MetricCard
          icon={TrendingUp}
          label="Produtos em estoque"
          value={data.estoque.filter(e => e.quantidade > 0).length}
          sublabel="tipos diferentes"
          color="bg-emerald-500"
        />
      </div>

      {/* Gráficos — linha 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Produção por dia */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-700 text-sm">Produção por Dia da Semana</h2>
          </CardHeader>
          <CardBody>
            {producaoPorDia.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">Nenhuma produção esta semana.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={producaoPorDia}>
                  <XAxis dataKey="dia" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="Produção" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        {/* Distribuição por unidade */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-700 text-sm">Distribuição por Unidade</h2>
          </CardHeader>
          <CardBody>
            {distribuicaoPorUnidade.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">Nenhuma distribuição esta semana.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={distribuicaoPorUnidade}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
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
      </div>

      {/* Estoque por produto */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-700 text-sm">Estoque Atual por Produto (Câmara Fria)</h2>
        </CardHeader>
        <CardBody>
          {estoquePorProduto.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">Estoque vazio.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={estoquePorProduto} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="produto" type="category" width={140} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="Estoque" fill="#06b6d4" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
