import { useState, useEffect } from 'react'
import { Plus, Trash2, Truck } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getDistribuicoes, createDistribuicao, deleteDistribuicao } from '../services/distribuicaoService'
import { getProdutos } from '../services/produtosService'
import { getUnidades } from '../services/unidadesService'
import { getEstoque } from '../services/estoqueService'
import { getTodayDateInAppTZ } from '../utils/dateTime'
import Card, { CardHeader } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Badge from '../components/ui/Badge'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { toast } from '../components/ui/Toast'

const FORM_VAZIO = {
  data:       getTodayDateInAppTZ(),
  unidade_id: '',
  produto_id: '',
  quantidade: '',
}

export default function Distribuicao() {
  const [distribuicoes, setDistribuicoes] = useState([])
  const [produtos,      setProdutos]      = useState([])
  const [unidades,      setUnidades]      = useState([])
  const [estoque,       setEstoque]       = useState([])
  const [loading,       setLoading]       = useState(true)
  const [modalOpen,     setModalOpen]     = useState(false)
  const [form,          setForm]          = useState(FORM_VAZIO)
  const [saving,        setSaving]        = useState(false)
  const [errors,        setErrors]        = useState({})
  const [confirmOpen,   setConfirmOpen]   = useState(false)
  const [deleteId,      setDeleteId]      = useState(null)
  const [deleting,      setDeleting]      = useState(false)
  const [filtroData,    setFiltroData]    = useState('')

  const carregar = () => {
    setLoading(true)
    getDistribuicoes(filtroData || undefined, filtroData || undefined)
      .then(setDistribuicoes)
      .catch(() => toast.error('Erro ao carregar distribuições'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { carregar() }, [filtroData])
  useEffect(() => {
    getProdutos(true).then(setProdutos)
    getUnidades(true).then(setUnidades)
    getEstoque().then(setEstoque)
  }, [])

  // Estoque disponível do produto selecionado
  const estoqueDisponivel = estoque.find(e => e.produto_id === form.produto_id)?.quantidade ?? null

  const validar = () => {
    const e = {}
    if (!form.data)       e.data       = 'Data obrigatória'
    if (!form.unidade_id) e.unidade_id = 'Unidade obrigatória'
    if (!form.produto_id) e.produto_id = 'Produto obrigatório'
    const qtd = Number(form.quantidade)
    if (!form.quantidade || qtd < 1)
                          e.quantidade = 'Quantidade deve ser ≥ 1'
    else if (estoqueDisponivel !== null && qtd > estoqueDisponivel)
                          e.quantidade = `Estoque insuficiente (disponível: ${estoqueDisponivel})`
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const salvar = async () => {
    if (!validar()) return
    setSaving(true)
    try {
      const dados = { ...form, quantidade: Number(form.quantidade) }
      await createDistribuicao(dados)
      toast.success('Distribuição registrada! Estoque atualizado.')
      setModalOpen(false)
      setForm(FORM_VAZIO)
      carregar()
      // Atualizar estoque exibido
      getEstoque().then(setEstoque)
    } catch (err) {
      toast.error(err.message || 'Erro ao registrar distribuição')
    } finally {
      setSaving(false)
    }
  }

  const excluir = async () => {
    setDeleting(true)
    try {
      await deleteDistribuicao(deleteId)
      toast.success('Registro excluído! Estoque ajustado.')
      setConfirmOpen(false)
      carregar()
      getEstoque().then(setEstoque)
    } catch (err) {
      toast.error(err.message || 'Erro ao excluir registro.')
    } finally {
      setDeleting(false)
    }
  }

  const totalDistribuido = distribuicoes.reduce((a, d) => a + d.quantidade, 0)

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Total distribuído no período</p>
          <p className="text-2xl font-bold text-gray-800">{totalDistribuido.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-gray-400">unidades enviadas</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Registros</p>
          <p className="text-2xl font-bold text-gray-800">{distribuicoes.length}</p>
          <p className="text-xs text-gray-400">envios registrados</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 whitespace-nowrap">Filtrar por data:</label>
          <input
            type="date"
            value={filtroData}
            onChange={e => setFiltroData(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
          {filtroData && (
            <button onClick={() => setFiltroData('')} className="text-xs text-primary-500 hover:underline">
              Limpar
            </button>
          )}
        </div>
        <Button onClick={() => { setForm(FORM_VAZIO); setErrors({}); setModalOpen(true) }}>
          <Plus size={16} /> Nova Distribuição
        </Button>
      </div>

      {/* Tabela */}
      <Card>
        {loading ? <LoadingSpinner /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Data</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Unidade</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Cidade</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Produto</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Quantidade</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {distribuicoes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400">
                      <Truck size={32} className="mx-auto mb-2 opacity-30" />
                      Nenhuma distribuição registrada.
                    </td>
                  </tr>
                ) : distribuicoes.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {format(parseISO(d.data), "dd/MM/yyyy (EEE)", { locale: ptBR })}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">{d.unidades?.nome}</td>
                    <td className="px-4 py-3 text-gray-500">{d.unidades?.cidade}</td>
                    <td className="px-4 py-3 text-gray-700">{d.produtos?.nome}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">
                      {d.quantidade.toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <button
                          onClick={() => { setDeleteId(d.id); setConfirmOpen(true) }}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400">
              {distribuicoes.length} registro(s)
            </div>
          </div>
        )}
      </Card>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Registrar Distribuição">
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
            A quantidade será automaticamente subtraída do estoque da câmara fria. Distribuições só são permitidas se houver estoque suficiente.
          </div>
          <Input
            type="date"
            label="Data *"
            value={form.data}
            onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
            error={errors.data}
          />
          <Select
            label="Unidade Destino *"
            value={form.unidade_id}
            onChange={e => setForm(f => ({ ...f, unidade_id: e.target.value }))}
            error={errors.unidade_id}
          >
            <option value="">Selecione a unidade...</option>
            {unidades.map(u => (
              <option key={u.id} value={u.id}>{u.nome} — {u.cidade}</option>
            ))}
          </Select>
          <Select
            label="Produto *"
            value={form.produto_id}
            onChange={e => setForm(f => ({ ...f, produto_id: e.target.value }))}
            error={errors.produto_id}
          >
            <option value="">Selecione o produto...</option>
            {produtos.map(p => {
              const disponivel = estoque.find(e => e.produto_id === p.id)?.quantidade ?? 0
              return (
                <option key={p.id} value={p.id} disabled={disponivel === 0}>
                  {p.nome} (estoque: {disponivel})
                </option>
              )
            })}
          </Select>
          {form.produto_id && estoqueDisponivel !== null && (
            <div className={`text-xs rounded-lg px-3 py-2 ${estoqueDisponivel > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              Estoque disponível: <strong>{estoqueDisponivel} unidade(s)</strong>
            </div>
          )}
          <Input
            type="number"
            label="Quantidade *"
            value={form.quantidade}
            onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))}
            error={errors.quantidade}
            min={1}
            max={estoqueDisponivel ?? undefined}
            placeholder="0"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={salvar} loading={saving}>Registrar</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={excluir}
        loading={deleting}
        title="Excluir Registro"
        message="Ao excluir este registro, o estoque será ajustado automaticamente. Deseja continuar?"
      />
    </div>
  )
}
