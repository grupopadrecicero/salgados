import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Truck, ChevronDown } from 'lucide-react'
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getDistribuicoes, createDistribuicao, updateDistribuicao, deleteDistribuicao } from '../services/distribuicaoService'
import { getDistribuicoesAgrupadas } from '../services/distribuicaoAgrupadadaService'
import { getProdutos } from '../services/produtosService'
import { getUnidades } from '../services/unidadesService'
import { getEstoque } from '../services/estoqueService'
import { getTodayDateInAppTZ } from '../utils/dateTime'
import Card from '../components/ui/Card'
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

const getMesAtual = () => ({
  dataInicio: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
  dataFim: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
})

export default function Distribuicao() {
  const REGISTROS_POR_PAGINA = 10
  const { dataInicio: inicioPadrao, dataFim: fimPadrao } = getMesAtual()
  const [distribuicoesAgrupadas, setDistribuicoesAgrupadas] = useState([])
  const [distribuicoes,          setDistribuicoes]          = useState([])
  const [produtos,               setProdutos]               = useState([])
  const [unidades,               setUnidades]               = useState([])
  const [estoque,                setEstoque]                = useState([])
  const [loading,                setLoading]                = useState(true)
  const [modalOpen,              setModalOpen]              = useState(false)
  const [form,                   setForm]                   = useState(FORM_VAZIO)
  const [editId,                 setEditId]                 = useState(null)
  const [editOriginal,           setEditOriginal]           = useState(null)
  const [saving,                 setSaving]                 = useState(false)
  const [errors,                 setErrors]                 = useState({})
  const [confirmOpen,            setConfirmOpen]            = useState(false)
  const [deleteId,               setDeleteId]               = useState(null)
  const [deleting,               setDeleting]               = useState(false)
  const [dataInicio,             setDataInicio]             = useState(inicioPadrao)
  const [dataFim,                setDataFim]                = useState(fimPadrao)
  const [unidadeSelecionada,     setUnidadeSelecionada]     = useState('todos')
  const [expandedUnits,          setExpandedUnits]          = useState([])
  const [paginaAtual,            setPaginaAtual]            = useState(1)

  const carregar = async () => {
    setLoading(true)
    try {
      const agrupadas = await getDistribuicoesAgrupadas(dataInicio || undefined, dataFim || undefined)
      setDistribuicoesAgrupadas(agrupadas)
      const individuais = await getDistribuicoes(dataInicio || undefined, dataFim || undefined)
      setDistribuicoes(individuais)
    } catch (err) {
      toast.error('Erro ao carregar distribuições')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [dataInicio, dataFim])
  useEffect(() => {
    setPaginaAtual(1)
    setExpandedUnits([])
  }, [dataInicio, dataFim, unidadeSelecionada])
  useEffect(() => {
    getProdutos(true).then(setProdutos)
    getUnidades(true).then(setUnidades)
    getEstoque().then(setEstoque)
  }, [])

  const unidadesComDistribuicao = Array.from(
    distribuicoesAgrupadas.reduce((map, item) => {
      if (!item.unidade_id) return map
      if (map.has(item.unidade_id)) return map
      map.set(item.unidade_id, {
        id: item.unidade_id,
        nome: item.unidades?.nome || 'Unidade',
        cidade: item.unidades?.cidade || '',
      })
      return map
    }, new Map()).values()
  ).sort((a, b) => {
    const nomeCompare = a.nome.localeCompare(b.nome, 'pt-BR')
    if (nomeCompare !== 0) return nomeCompare
    return a.cidade.localeCompare(b.cidade, 'pt-BR')
  })

  useEffect(() => {
    if (unidadesComDistribuicao.length === 0) {
      if (unidadeSelecionada !== 'todos') setUnidadeSelecionada('todos')
      return
    }

    const unidadeExiste = unidadesComDistribuicao.some(u => u.id === unidadeSelecionada)
    if (unidadeSelecionada !== 'todos' && !unidadeExiste) {
      setUnidadeSelecionada('todos')
    }
  }, [unidadesComDistribuicao, unidadeSelecionada])

  // Em edição, soma a quantidade original ao saldo para não bloquear o próprio registro.
  const estoqueDisponivel = (() => {
    if (!form.produto_id) return null
    const saldoAtual = Number(estoque.find(e => e.produto_id === form.produto_id)?.quantidade || 0)
    if (editOriginal?.produto_id === form.produto_id) {
      return saldoAtual + Number(editOriginal.quantidade || 0)
    }
    return saldoAtual
  })()

  const abrirModal = (item = null) => {
    if (item) {
      setEditId(item.id)
      setEditOriginal({
        produto_id: item.produto_id,
        quantidade: Number(item.quantidade) || 0,
      })
      setForm({
        data: item.data,
        unidade_id: item.unidade_id,
        produto_id: item.produto_id,
        quantidade: String(item.quantidade),
      })
    } else {
      setEditId(null)
      setEditOriginal(null)
      setForm(FORM_VAZIO)
    }
    setErrors({})
    setModalOpen(true)
  }

  const fecharModal = () => {
    setModalOpen(false)
    setEditId(null)
    setEditOriginal(null)
    setForm(FORM_VAZIO)
    setErrors({})
  }

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
      if (editId) {
        await updateDistribuicao(editId, dados)
        toast.success('Distribuição atualizada! Estoque ajustado.')
      } else {
        await createDistribuicao(dados)
        toast.success('Distribuição registrada! Estoque atualizado.')
      }
      fecharModal()
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

  const distribuicoesFiltradas = unidadeSelecionada && unidadeSelecionada !== 'todos'
    ? distribuicoesAgrupadas.filter(d => d.unidade_id === unidadeSelecionada)
    : distribuicoesAgrupadas

  const totalSalgadosDistribuidos = distribuicoesFiltradas.reduce((a, d) => a + d.quantidade_total, 0)
  const totalUnidades = unidadesComDistribuicao.length
  const totalPaginas = Math.max(1, Math.ceil(distribuicoesFiltradas.length / REGISTROS_POR_PAGINA))
  const paginaSegura = Math.min(paginaAtual, totalPaginas)
  const inicioPagina = (paginaSegura - 1) * REGISTROS_POR_PAGINA
  const fimPagina = inicioPagina + REGISTROS_POR_PAGINA
  const distribuicoesPaginadas = distribuicoesFiltradas.slice(inicioPagina, fimPagina)

  const toggleUnit = (id) => {
    setExpandedUnits(prev => 
      prev.includes(id)
        ? prev.filter(u => u !== id)
        : [...prev, id]
    )
  }

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Total de salgados distribuídos</p>
          <p className="text-2xl font-bold text-gray-800">{totalSalgadosDistribuidos.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-gray-400">salgados no período/aba selecionada</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Unidades com distribuição</p>
          <p className="text-2xl font-bold text-gray-800">{totalUnidades}</p>
          <p className="text-xs text-gray-400">unidades agrupadas</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-gray-600 whitespace-nowrap">Filtrar por período:</label>
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
        <Button onClick={() => abrirModal()}>
          <Plus size={16} /> Nova Distribuição
        </Button>
      </div>

      {unidadesComDistribuicao.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-2 shadow-sm overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max">
            <button
              onClick={() => setUnidadeSelecionada('todos')}
              className={`px-3 py-2 rounded-lg text-sm transition-colors border ${
                unidadeSelecionada === 'todos'
                  ? 'bg-primary-500 text-white border-primary-500'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-primary-300 hover:text-primary-600'
              }`}
            >
              Todos
            </button>
            {unidadesComDistribuicao.map(unidade => {
              const ativa = unidadeSelecionada === unidade.id
              return (
                <button
                  key={unidade.id}
                  onClick={() => setUnidadeSelecionada(unidade.id)}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors border ${
                    ativa
                      ? 'bg-primary-500 text-white border-primary-500'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-primary-300 hover:text-primary-600'
                  }`}
                >
                  {unidade.nome}{unidade.cidade ? ` • ${unidade.cidade}` : ''}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Distribuições Agrupadas por Unidade */}
      <Card>
        {loading ? <LoadingSpinner /> : (
          <div className="divide-y divide-gray-200">
            {distribuicoesFiltradas.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Truck size={32} className="mx-auto mb-2 opacity-30" />
                Nenhuma distribuição registrada.
              </div>
            ) : (
              distribuicoesPaginadas.map(agrupada => {
                const isExpanded = expandedUnits.includes(agrupada.id)
                
                return (
                  <div key={agrupada.id}>
                    {/* Cabeçalho da unidade */}
                    <button
                      onClick={() => toggleUnit(agrupada.id)}
                      className="w-full px-4 py-4 hover:bg-gray-50 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4 flex-1 text-left">
                        <ChevronDown 
                          size={20} 
                          className={`text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800">
                            {agrupada.unidades?.nome} • {agrupada.unidades?.cidade}
                          </p>
                          <p className="text-xs text-gray-500">
                            {format(parseISO(agrupada.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} • {agrupada.numero_registros} distribuição(ões)
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-gray-800">{agrupada.quantidade_total.toLocaleString('pt-BR')}</p>
                          <p className="text-xs text-gray-500">unidades</p>
                        </div>
                      </div>
                    </button>

                    {/* Detalhes dos produtos distribuídos */}
                    {isExpanded && agrupada.distribuicoes_agrupadas_detalhes && agrupada.distribuicoes_agrupadas_detalhes.length > 0 && (
                      <div className="bg-gray-50 px-4 py-3 border-t border-gray-100">
                        <div className="space-y-2 mb-4">
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Produtos distribuídos</p>
                          {agrupada.distribuicoes_agrupadas_detalhes.map(detalhe => (
                            <div key={detalhe.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-100">
                              <div className="flex items-center gap-3 flex-1">
                                <Badge color={detalhe.produtos?.tipo === 'frito' ? 'orange' : 'blue'}>
                                  {detalhe.produtos?.tipo === 'frito' ? 'Frito' : 'Assado'}
                                </Badge>
                                <div>
                                  <p className="font-medium text-gray-800">{detalhe.produtos?.nome}</p>
                                  <p className="text-xs text-gray-500">{detalhe.numero_registros} envio(s)</p>
                                </div>
                              </div>
                              <p className="font-semibold text-gray-800 text-right min-w-fit">{detalhe.quantidade_total.toLocaleString('pt-BR')} un.</p>
                            </div>
                          ))}
                        </div>

                        {/* Data de distribuição */}
                        <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                          <p className="text-xs text-blue-700">
                            <span className="font-semibold">Data:</span> {format(parseISO(agrupada.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          </p>
                        </div>

                        {/* Distribuições individuais */}
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs font-medium text-gray-600 mb-2">Envios individuais:</p>
                          <div className="space-y-1 max-h-48 overflow-y-auto">
                            {distribuicoes
                              .filter(d => d.unidade_id === agrupada.unidade_id && d.data === agrupada.data)
                              .map(d => (
                                <div key={d.id} className="flex items-center justify-between text-xs bg-white rounded px-2 py-1 border border-gray-100">
                                  <span className="text-gray-700">{d.produtos?.nome}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-800">{d.quantidade.toLocaleString('pt-BR')} un.</span>
                                    <button
                                      onClick={() => abrirModal(d)}
                                      className="p-1 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded"
                                    >
                                      <Pencil size={12} />
                                    </button>
                                    <button
                                      onClick={() => { setDeleteId(d.id); setConfirmOpen(true) }}
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

      {!loading && distribuicoesFiltradas.length > REGISTROS_POR_PAGINA && (
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
          <p className="text-xs text-gray-500">
            Mostrando {inicioPagina + 1}-{Math.min(fimPagina, distribuicoesFiltradas.length)} de {distribuicoesFiltradas.length} registros
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={paginaSegura === 1}
              onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <span className="text-xs text-gray-600 min-w-[70px] text-center">
              Página {paginaSegura} de {totalPaginas}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={paginaSegura >= totalPaginas}
              onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={fecharModal}
        title={editId ? 'Editar Distribuição' : 'Registrar Distribuição'}
      >
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
              const saldoAtual = Number(estoque.find(e => e.produto_id === p.id)?.quantidade || 0)
              const disponivel = editOriginal?.produto_id === p.id
                ? saldoAtual + Number(editOriginal.quantidade || 0)
                : saldoAtual
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
            <Button variant="secondary" onClick={fecharModal}>Cancelar</Button>
            <Button onClick={salvar} loading={saving}>{editId ? 'Salvar alterações' : 'Registrar'}</Button>
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
