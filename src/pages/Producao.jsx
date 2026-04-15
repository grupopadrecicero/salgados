import { useState, useEffect } from 'react'
import { Plus, Trash2, ChefHat, ChevronDown } from 'lucide-react'
import { format, parseISO, startOfWeek, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getProducoes, createProducao, deleteProducao } from '../services/producaoService'
import { getProducoesAgrupadas } from '../services/producaoAgrupadadaService'
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

const getSemanaAtual = () => {
  const inicioSemana = startOfWeek(new Date(), { weekStartsOn: 4 })
  const fimSemana = addDays(inicioSemana, 6)

  return {
    dataInicio: format(inicioSemana, 'yyyy-MM-dd'),
    dataFim: format(fimSemana, 'yyyy-MM-dd'),
  }
}

export default function Producao() {
  const { dataInicio: inicioPadrao, dataFim: fimPadrao } = getSemanaAtual()
  const [producoesAgrupadas, setProducoesAgrupadas] = useState([])
  const [producoes,          setProducoes]          = useState([])
  const [produtos,           setProdutos]           = useState([])
  const [loading,            setLoading]            = useState(true)
  const [modalOpen,          setModalOpen]          = useState(false)
  const [form,               setForm]               = useState(FORM_VAZIO)
  const [saving,             setSaving]             = useState(false)
  const [errors,             setErrors]             = useState({})
  const [confirmOpen,        setConfirmOpen]        = useState(false)
  const [deleteId,           setDeleteId]           = useState(null)
  const [deleting,           setDeleting]           = useState(false)
  const [dataInicio,         setDataInicio]         = useState(inicioPadrao)
  const [dataFim,            setDataFim]            = useState(fimPadrao)
  const [expandedDays,       setExpandedDays]       = useState([])

  const carregar = async () => {
    setLoading(true)
    try {
      const agrupadas = await getProducoesAgrupadas(dataInicio || undefined, dataFim || undefined)
      setProducoesAgrupadas(agrupadas)
      const individuais = await getProducoes(dataInicio || undefined, dataFim || undefined)
      setProducoes(individuais)
    } catch (err) {
      toast.error('Erro ao carregar produções')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() },     [dataInicio, dataFim])
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

  const totalProducao = producoesAgrupadas.reduce((a, p) => a + p.quantidade_total, 0)
  const totalGrupos = producoesAgrupadas.length

  const toggleDay = (data) => {
    setExpandedDays(prev => 
      prev.includes(data) 
        ? prev.filter(d => d !== data)
        : [...prev, data]
    )
  }

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Total no período</p>
          <p className="text-2xl font-bold text-gray-800">{totalProducao.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-gray-400">unidades produzidas</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Dias com produção</p>
          <p className="text-2xl font-bold text-gray-800">{totalGrupos}</p>
          <p className="text-xs text-gray-400">dias agrupados</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-gray-600 whitespace-nowrap">Filtrar por data:</label>
          <input
            type="date"
            value={dataInicio}
            onChange={e => setDataInicio(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
          <span className="text-sm text-gray-500">até</span>
          <input
            type="date"
            value={dataFim}
            onChange={e => setDataFim(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
          {(dataInicio || dataFim) && (
            <button onClick={() => { setDataInicio(''); setDataFim('') }} className="text-xs text-primary-500 hover:underline">
              Limpar
            </button>
          )}
        </div>
        <Button onClick={() => { setForm(FORM_VAZIO); setErrors({}); setModalOpen(true) }}>
          <Plus size={16} /> Registrar Produção
        </Button>
      </div>

      {/* Produções Agrupadas */}
      <Card>
        {loading ? <LoadingSpinner /> : (
          <div className="divide-y divide-gray-200">
            {producoesAgrupadas.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <ChefHat size={32} className="mx-auto mb-2 opacity-30" />
                Nenhuma produção registrada.
              </div>
            ) : (
              producoesAgrupadas.map(agrupada => {
                const isExpanded = expandedDays.includes(agrupada.data)
                const dataFormatada = format(parseISO(agrupada.data), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                
                return (
                  <div key={agrupada.id}>
                    {/* Cabeçalho do dia */}
                    <button
                      onClick={() => toggleDay(agrupada.data)}
                      className="w-full px-4 py-4 hover:bg-gray-50 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4 flex-1 text-left">
                        <ChevronDown 
                          size={20} 
                          className={`text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800 capitalize">{dataFormatada}</p>
                          <p className="text-xs text-gray-500">{agrupada.numero_registros} lote(s)</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-gray-800">{agrupada.quantidade_total.toLocaleString('pt-BR')}</p>
                          <p className="text-xs text-gray-500">unidades</p>
                        </div>
                      </div>
                    </button>

                    {/* Detalhes do dia */}
                    {isExpanded && agrupada.producoes_agrupadas_detalhes && agrupada.producoes_agrupadas_detalhes.length > 0 && (
                      <div className="bg-gray-50 px-4 py-3 border-t border-gray-100">
                        <div className="space-y-2">
                          {agrupada.producoes_agrupadas_detalhes.map(detalhe => (
                            <div key={detalhe.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2">
                              <div className="flex items-center gap-3 flex-1">
                                <Badge color={detalhe.produtos?.tipo === 'frito' ? 'orange' : 'blue'}>
                                  {detalhe.produtos?.tipo === 'frito' ? 'Frito' : 'Assado'}
                                </Badge>
                                <div>
                                  <p className="font-medium text-gray-800">{detalhe.produtos?.nome}</p>
                                  <p className="text-xs text-gray-500">{detalhe.numero_registros} registro(s)</p>
                                </div>
                              </div>
                              <p className="font-semibold text-gray-800">{detalhe.quantidade_total.toLocaleString('pt-BR')} un.</p>
                            </div>
                          ))}
                        </div>
                        
                        {/* Produções individuais do dia */}
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs font-medium text-gray-600 mb-2">Lotes individuais:</p>
                          <div className="space-y-1">
                            {producoes.filter(p => p.data === agrupada.data).map(p => (
                              <div key={p.id} className="flex items-center justify-between text-xs bg-white rounded px-2 py-1 border border-gray-100">
                                <span className="text-gray-700">{p.produtos?.nome}</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-800">{p.quantidade_produzida.toLocaleString('pt-BR')} un.</span>
                                  <button
                                    onClick={() => { setDeleteId(p.id); setConfirmOpen(true) }}
                                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
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
