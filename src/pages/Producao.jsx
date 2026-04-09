import { useState, useEffect } from 'react'
import { Plus, Trash2, ChefHat } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getProducoes, createProducao, deleteProducao } from '../services/producaoService'
import { getProdutos } from '../services/produtosService'
import { getTodayDateInAppTZ } from '../utils/dateTime'
import Card, { CardHeader, CardBody } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Badge from '../components/ui/Badge'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { toast } from '../components/ui/Toast'

const FORM_VAZIO = {
  data:                getTodayDateInAppTZ(),
  produto_id:          '',
  quantidade_produzida: '',
  observacao:           '',
}

export default function Producao() {
  const [producoes,   setProducoes]   = useState([])
  const [produtos,    setProdutos]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [modalOpen,   setModalOpen]   = useState(false)
  const [form,        setForm]        = useState(FORM_VAZIO)
  const [saving,      setSaving]      = useState(false)
  const [errors,      setErrors]      = useState({})
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteId,    setDeleteId]    = useState(null)
  const [deleting,    setDeleting]    = useState(false)
  const [filtroData,  setFiltroData]  = useState('')

  const carregar = () => {
    setLoading(true)
    getProducoes(filtroData || undefined, filtroData || undefined)
      .then(setProducoes)
      .catch(() => toast.error('Erro ao carregar produções'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { carregar() },     [filtroData])
  useEffect(() => { getProdutos(true).then(setProdutos) }, [])

  const validar = () => {
    const e = {}
    if (!form.data)                              e.data                = 'Data obrigatória'
    if (!form.produto_id)                        e.produto_id          = 'Produto obrigatório'
    if (!form.quantidade_produzida || Number(form.quantidade_produzida) < 1)
                                                 e.quantidade_produzida = 'Quantidade deve ser ≥ 1'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const salvar = async () => {
    if (!validar()) return
    setSaving(true)
    try {
      const dados = {
        ...form,
        quantidade_produzida: Number(form.quantidade_produzida),
        observacao: form.observacao.trim() || null,
      }
      const resultado = await createProducao(dados)
      toast.success('Produção registrada! Estoque atualizado.')
      if (resultado?.planejamentoAlerta) {
        toast.error(resultado.planejamentoAlerta)
      }
      setModalOpen(false)
      setForm(FORM_VAZIO)
      carregar()
    } catch (err) {
      toast.error(err.message || 'Erro ao registrar produção')
    } finally {
      setSaving(false)
    }
  }

  const excluir = async () => {
    setDeleting(true)
    try {
      await deleteProducao(deleteId)
      toast.success('Registro excluído! Estoque ajustado.')
      setConfirmOpen(false)
      carregar()
    } catch (err) {
      toast.error(err.message || 'Erro ao excluir registro.')
    } finally {
      setDeleting(false)
    }
  }

  const totalSemana = producoes.reduce((a, p) => a + p.quantidade_produzida, 0)

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Total no período</p>
          <p className="text-2xl font-bold text-gray-800">{totalSemana.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-gray-400">unidades produzidas</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Registros</p>
          <p className="text-2xl font-bold text-gray-800">{producoes.length}</p>
          <p className="text-xs text-gray-400">lotes registrados</p>
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
          <Plus size={16} /> Registrar Produção
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
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Produto</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Qtd. Produzida</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Observação</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {producoes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400">
                      <ChefHat size={32} className="mx-auto mb-2 opacity-30" />
                      Nenhuma produção registrada.
                    </td>
                  </tr>
                ) : producoes.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {format(parseISO(p.data), "dd/MM/yyyy (EEE)", { locale: ptBR })}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">{p.produtos?.nome}</td>
                    <td className="px-4 py-3">
                      <Badge color={p.produtos?.tipo === 'frito' ? 'orange' : 'blue'}>
                        {p.produtos?.tipo === 'frito' ? 'Frito' : 'Assado'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">
                      {p.quantidade_produzida.toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{p.observacao || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <button
                          onClick={() => { setDeleteId(p.id); setConfirmOpen(true) }}
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
              {producoes.length} registro(s)
            </div>
          </div>
        )}
      </Card>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Registrar Produção">
        <div className="space-y-4">
          <div className="bg-primary-50 border border-primary-100 rounded-lg p-3 text-xs text-primary-700">
            Ao registrar a produção, a quantidade será automaticamente adicionada ao estoque da câmara fria.
          </div>
          <Input
            type="date"
            label="Data *"
            value={form.data}
            onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
            error={errors.data}
          />
          <Select
            label="Produto *"
            value={form.produto_id}
            onChange={e => setForm(f => ({ ...f, produto_id: e.target.value }))}
            error={errors.produto_id}
          >
            <option value="">Selecione o produto...</option>
            {produtos.map(p => (
              <option key={p.id} value={p.id}>{p.nome} ({p.tipo})</option>
            ))}
          </Select>
          <Input
            type="number"
            label="Quantidade Produzida *"
            value={form.quantidade_produzida}
            onChange={e => setForm(f => ({ ...f, quantidade_produzida: e.target.value }))}
            error={errors.quantidade_produzida}
            min={1}
            placeholder="0"
          />
          <div className="flex flex-col gap-1">
            <label className="block text-sm font-medium text-gray-700">Observação</label>
            <textarea
              rows={2}
              value={form.observacao}
              onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
              placeholder="Informações adicionais..."
            />
          </div>
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
