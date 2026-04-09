import { useState, useEffect } from 'react'
import { Snowflake, ArrowUpCircle, ArrowDownCircle, Search, Trash2 } from 'lucide-react'
import { getEstoque, getMovimentacoes, deleteMovimentacao } from '../services/estoqueService'
import Card, { CardHeader, CardBody } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { toast } from '../components/ui/Toast'
import { formatDateTimeInAppTZ } from '../utils/dateTime'

export default function CameraFria() {
  const [estoque,        setEstoque]        = useState([])
  const [movimentacoes,  setMovimentacoes]  = useState([])
  const [loading,        setLoading]        = useState(true)
  const [loadingMov,     setLoadingMov]     = useState(true)
  const [busca,          setBusca]          = useState('')
  const [aba,            setAba]            = useState('estoque')
  const [confirmOpen,    setConfirmOpen]    = useState(false)
  const [movToDelete,    setMovToDelete]    = useState(null)
  const [deleting,       setDeleting]       = useState(false)

  const carregarEstoque = () => {
    setLoading(true)
    getEstoque()
      .then(setEstoque)
      .catch(() => toast.error('Erro ao carregar estoque'))
      .finally(() => setLoading(false))
  }

  const carregarMovimentacoes = () => {
    setLoadingMov(true)
    getMovimentacoes(100)
      .then(setMovimentacoes)
      .catch(() => toast.error('Erro ao carregar movimentações'))
      .finally(() => setLoadingMov(false))
  }

  useEffect(() => {
    carregarEstoque()
    carregarMovimentacoes()
  }, [])

  const confirmarExcluirMov = (mov) => {
    setMovToDelete(mov)
    setConfirmOpen(true)
  }

  const excluirMovimentacao = async () => {
    if (!movToDelete) return
    setDeleting(true)
    try {
      await deleteMovimentacao(movToDelete.id)
      toast.success('Movimentação excluída e estoque ajustado!')
      setConfirmOpen(false)
      setMovToDelete(null)
      carregarEstoque()
      carregarMovimentacoes()
    } catch (err) {
      toast.error(err.message || 'Erro ao excluir movimentação')
    } finally {
      setDeleting(false)
    }
  }

  const totalEstoque    = estoque.reduce((a, e) => a + (e.quantidade || 0), 0)
  const produtosZerados = estoque.filter(e => e.quantidade === 0).length

  const filtradoEstoque = estoque.filter(e =>
    (e.produtos?.nome || '').toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div className="space-y-4">
      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500 flex items-center justify-center">
            <Snowflake size={20} className="text-white" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total em estoque</p>
            <p className="text-2xl font-bold text-gray-800">{totalEstoque.toLocaleString('pt-BR')}</p>
            <p className="text-xs text-gray-400">unidades congeladas</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Produtos cadastrados</p>
          <p className="text-2xl font-bold text-gray-800">{estoque.length}</p>
          <p className="text-xs text-gray-400">tipos de salgado</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Produtos zerados</p>
          <p className={`text-2xl font-bold ${produtosZerados > 0 ? 'text-red-600' : 'text-gray-800'}`}>
            {produtosZerados}
          </p>
          <p className="text-xs text-gray-400">necessitam reposição</p>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setAba('estoque')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            aba === 'estoque'
              ? 'bg-white shadow-sm text-gray-800'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Estoque Atual
        </button>
        <button
          onClick={() => setAba('historico')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            aba === 'historico'
              ? 'bg-white shadow-sm text-gray-800'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Histórico de Movimentações
        </button>
      </div>

      {/* Conteúdo da aba */}
      {aba === 'estoque' ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-700 text-sm">Salgados em Câmara Fria</h2>
              <div className="relative w-64">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  placeholder="Buscar produto..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>
            </div>
          </CardHeader>
          {loading ? <LoadingSpinner /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Produto</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Recheio</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Quantidade</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Atualizado</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtradoEstoque.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-gray-400">
                        <Snowflake size={32} className="mx-auto mb-2 opacity-30" />
                        Nenhum produto em estoque.
                      </td>
                    </tr>
                  ) : filtradoEstoque.map(e => (
                    <tr key={e.produto_id || e.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{e.produtos?.nome}</td>
                      <td className="px-4 py-3">
                        <Badge color={e.produtos?.tipo === 'frito' ? 'orange' : 'blue'}>
                          {e.produtos?.tipo === 'frito' ? 'Frito' : 'Assado'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{e.produtos?.recheio || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-lg font-bold ${e.quantidade === 0 ? 'text-red-500' : 'text-gray-800'}`}>
                          {e.quantidade.toLocaleString('pt-BR')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {formatDateTimeInAppTZ(e.updated_at)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge color={e.quantidade === 0 ? 'red' : e.quantidade < 50 ? 'yellow' : 'green'}>
                          {e.quantidade === 0 ? 'Esgotado' : e.quantidade < 50 ? 'Baixo' : 'OK'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-700 text-sm">Histórico de Movimentações</h2>
          </CardHeader>
          {loadingMov ? <LoadingSpinner /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Data/Hora</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Produto</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Quantidade</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {movimentacoes.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-gray-400">
                        Nenhuma movimentação registrada.
                      </td>
                    </tr>
                  ) : movimentacoes.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {formatDateTimeInAppTZ(m.created_at)}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">{m.produtos?.nome}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {m.tipo === 'entrada_producao'
                            ? <ArrowUpCircle size={15} className="text-green-500" />
                            : <ArrowDownCircle size={15} className="text-red-500" />
                          }
                          <Badge color={m.tipo === 'entrada_producao' ? 'green' : 'red'}>
                            {m.tipo === 'entrada_producao' ? 'Entrada (Produção)' : 'Saída (Distribuição)'}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold ${m.tipo === 'entrada_producao' ? 'text-green-600' : 'text-red-600'}`}>
                          {m.tipo === 'entrada_producao' ? '+' : '-'}{m.quantidade.toLocaleString('pt-BR')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <button
                            onClick={() => confirmarExcluirMov(m)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                            title="Excluir movimentação"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => { setConfirmOpen(false); setMovToDelete(null) }}
        onConfirm={excluirMovimentacao}
        loading={deleting}
        title="Excluir Movimentação"
        message="Esta ação vai remover a movimentação do histórico e ajustar o estoque automaticamente. Deseja continuar?"
      />
    </div>
  )
}
