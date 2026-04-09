import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Printer } from 'lucide-react'
import { format, startOfWeek, addDays, addWeeks, subWeeks, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  getPlanejamentos, createPlanejamento, updatePlanejamento, deletePlanejamento
} from '../services/planejamentoService'
import { getProdutos } from '../services/produtosService'
import Card, { CardHeader, CardBody } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Badge from '../components/ui/Badge'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { toast } from '../components/ui/Toast'
import { getTodayDateInAppTZ } from '../utils/dateTime'

const STATUS_COLOR = {
  planejado: 'blue',
  produzindo: 'yellow',
  finalizado: 'green',
  parcial: 'orange',
}
const STATUS_LABEL = {
  planejado: 'Planejado',
  produzindo: 'Produzindo',
  finalizado: 'Finalizado',
  parcial: 'Finalizado Parcial',
}
const FORM_VAZIO   = { data: getTodayDateInAppTZ(), produto_id: '', quantidade_planejada: '', status: 'planejado' }

const escapeHtml = (text = '') =>
  String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

export default function Planejamento() {
  const [semana,      setSemana]      = useState(new Date())
  const [itens,       setItens]       = useState([])
  const [produtos,    setProdutos]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [modalOpen,   setModalOpen]   = useState(false)
  const [form,        setForm]        = useState(FORM_VAZIO)
  const [editId,      setEditId]      = useState(null)
  const [saving,      setSaving]      = useState(false)
  const [errors,      setErrors]      = useState({})
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteId,    setDeleteId]    = useState(null)
  const [deleting,    setDeleting]    = useState(false)

  const inicioSemana = startOfWeek(semana, { weekStartsOn: 4 })
  const fimSemana    = addDays(inicioSemana, 6)

  const carregar = () => {
    setLoading(true)
    getPlanejamentos(
      format(inicioSemana, 'yyyy-MM-dd'),
      format(fimSemana,    'yyyy-MM-dd')
    )
      .then(setItens)
      .catch(() => toast.error('Erro ao carregar planejamento'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { carregar() },     [semana])
  useEffect(() => { getProdutos(true).then(setProdutos) }, [])

  const abrir = (item = null) => {
    setEditId(item?.id || null)
    setForm(item
      ? { data: item.data, produto_id: item.produto_id, quantidade_planejada: item.quantidade_planejada, status: item.status }
      : FORM_VAZIO
    )
    setErrors({})
    setModalOpen(true)
  }

  const validar = () => {
    const e = {}
    if (!form.data)                            e.data               = 'Data obrigatória'
    if (!form.produto_id)                      e.produto_id         = 'Produto obrigatório'
    if (!form.quantidade_planejada || form.quantidade_planejada < 1)
                                               e.quantidade_planejada = 'Quantidade deve ser ≥ 1'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const salvar = async () => {
    if (!validar()) return
    setSaving(true)
    try {
      const dados = { ...form, quantidade_planejada: Number(form.quantidade_planejada) }
      if (editId) {
        await updatePlanejamento(editId, dados)
        toast.success('Planejamento atualizado!')
      } else {
        await createPlanejamento(dados)
        toast.success('Planejamento criado!')
      }
      setModalOpen(false)
      carregar()
    } catch (err) {
      toast.error(err.message || 'Erro ao salvar planejamento')
    } finally {
      setSaving(false)
    }
  }

  const excluir = async () => {
    setDeleting(true)
    try {
      await deletePlanejamento(deleteId)
      toast.success('Item excluído!')
      setConfirmOpen(false)
      carregar()
    } catch {
      toast.error('Erro ao excluir item.')
    } finally {
      setDeleting(false)
    }
  }

  // Agrupar por dia
  const diasSemana = Array.from({ length: 7 }, (_, i) => addDays(inicioSemana, i))
  const porDia = (dia) =>
    itens.filter(item => item.data === format(dia, 'yyyy-MM-dd'))
  const totalPorDia = (dia) =>
    porDia(dia).reduce((acc, item) => acc + Number(item.quantidade_planejada || 0), 0)

  const imprimirSemana = () => {
    const janela = window.open('', '_blank', 'width=980,height=720')
    if (!janela) {
      toast.error('Não foi possível abrir a janela de impressão.')
      return
    }

    const periodo = `${format(inicioSemana, "dd/MM/yyyy")} a ${format(fimSemana, "dd/MM/yyyy")}`
    const hoje = getTodayDateInAppTZ()

    const conteudoPorDia = diasSemana
      .map((dia) => {
        const diaTexto = format(dia, 'EEE dd/MM', { locale: ptBR })
        const itensDia = porDia(dia)
        const totalDia = totalPorDia(dia)
        const isHoje = format(dia, 'yyyy-MM-dd') === hoje

        const lista = itensDia.length === 0
          ? '<p class="vazio">-</p>'
          : itensDia.map((item) => `
              <div class="item-planejamento">
                <p class="item-nome">${escapeHtml(item.produtos?.nome || 'Produto')}</p>
                <p class="item-recheio">Recheio: ${escapeHtml(item.produtos?.recheio || 'Nao informado')}</p>
                <p class="item-quantidade-destaque">${item.quantidade_planejada} un.</p>
              </div>
            `).join('')

        return `
          <section class="dia-coluna ${isHoje ? 'dia-hoje' : ''}">
            <h3 class="dia-titulo">
              ${escapeHtml(diaTexto)}
            </h3>
            <div class="dia-lista">${lista}</div>
            <p class="dia-total">Total: ${totalDia} un.</p>
          </section>
        `
      })
      .join('')

    janela.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />
          <title>Planejamento Semanal</title>
          <style>
            * {
              box-sizing: border-box;
            }
            body {
              font-family: Arial, sans-serif;
              margin: 24px;
              color: #111827;
              background: #f8fafc;
            }
            h1 {
              margin: 0 0 4px;
              font-size: 20px;
            }
            .meta {
              margin-bottom: 20px;
              color: #4b5563;
              font-size: 13px;
            }
            .grid-semana {
              display: grid;
              grid-template-columns: repeat(7, minmax(0, 1fr));
              gap: 10px;
            }
            .dia-coluna {
              background: #ffffff;
              border: 1px solid #e5e7eb;
              border-radius: 12px;
              padding: 10px;
              min-height: 140px;
              break-inside: avoid;
            }
            .dia-hoje {
              border-color: #fb923c;
              box-shadow: inset 0 0 0 1px #fdba74;
            }
            .dia-titulo {
              margin: 0 0 8px;
              font-size: 11px;
              text-transform: capitalize;
              color: #6b7280;
            }
            .dia-hoje .dia-titulo {
              color: #ea580c;
            }
            .dia-total {
              margin: 8px 0 0;
              padding-top: 6px;
              border-top: 1px solid #f1f5f9;
              font-size: 10px;
              font-weight: 700;
              color: #4b5563;
            }
            .dia-lista {
              display: grid;
              gap: 6px;
            }
            .vazio {
              margin: 0;
              color: #cbd5e1;
              font-size: 12px;
            }
            .item-planejamento {
              background: #f9fafb;
              border: 1px solid #f3f4f6;
              border-radius: 8px;
              padding: 8px;
            }
            .item-nome {
              margin: 0 0 2px;
              font-size: 12px;
              font-weight: 700;
              color: #374151;
            }
            .item-quantidade-destaque {
              margin: 6px 0 0;
              display: inline-block;
              padding: 2px 8px;
              border-radius: 999px;
              background: #fef3c7;
              color: #92400e;
              font-size: 12px;
              font-weight: 800;
            }
            .item-recheio,
            .item-quantidade {
              margin: 0;
              font-size: 11px;
              color: #6b7280;
            }
            @media print {
              body {
                margin: 10mm;
              }
              .grid-semana {
                gap: 8px;
              }
            }
          </style>
        </head>
        <body>
          <h1>Planejamento Semanal de Produção</h1>
          <div class="meta">Período: ${periodo}</div>
          <div class="grid-semana">${conteudoPorDia}</div>
        </body>
      </html>
    `)
    janela.document.close()
    janela.focus()
    janela.print()
  }

  return (
    <div className="space-y-4">
      {/* Navegação de semana */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSemana(w => subWeeks(w, 1))}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-medium text-gray-700">
            {format(inicioSemana, "dd 'de' MMM", { locale: ptBR })} –{' '}
            {format(fimSemana,    "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
          </span>
          <button
            onClick={() => setSemana(w => addWeeks(w, 1))}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={imprimirSemana}>
            <Printer size={16} /> Imprimir Semana
          </Button>
          <Button onClick={() => abrir()}>
            <Plus size={16} /> Novo Planejamento
          </Button>
        </div>
      </div>

      {/* Grade semanal */}
      {loading ? <LoadingSpinner /> : (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {diasSemana.map(dia => {
            const itensDia = porDia(dia)
            const totalDia = totalPorDia(dia)
            const isHoje   = format(dia, 'yyyy-MM-dd') === getTodayDateInAppTZ()
            return (
              <div
                key={dia.toString()}
                className={`bg-white rounded-xl border shadow-sm p-3 min-h-[120px] flex flex-col
                  ${isHoje ? 'border-primary-400 ring-1 ring-primary-200' : 'border-gray-200'}`}
              >
                <p className={`text-xs font-semibold mb-2 capitalize ${isHoje ? 'text-primary-600' : 'text-gray-500'}`}>
                  {format(dia, 'EEE dd/MM', { locale: ptBR })}
                </p>
                <div className="space-y-2 flex-1">
                  {itensDia.length === 0 ? (
                    <p className="text-xs text-gray-300">—</p>
                  ) : itensDia.map(item => (
                    <div key={item.id} className="bg-gray-50 rounded-lg p-2 text-xs border border-gray-100">
                      <p className="font-medium text-gray-700 truncate">{item.produtos?.nome}</p>
                      <p className="text-gray-500 truncate">Recheio: {item.produtos?.recheio || 'Nao informado'}</p>
                      <p className="text-gray-500">{item.quantidade_planejada} un.</p>
                      <div className="flex items-center justify-between mt-1">
                        <Badge color={STATUS_COLOR[item.status]}>{STATUS_LABEL[item.status]}</Badge>
                        <div className="flex gap-1">
                          <button onClick={() => abrir(item)} className="text-gray-400 hover:text-primary-500">
                            <Pencil size={11} />
                          </button>
                          <button onClick={() => { setDeleteId(item.id); setConfirmOpen(true) }} className="text-gray-400 hover:text-red-500">
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] font-semibold text-gray-600 mt-3 pt-2 border-t border-gray-100">Total: {totalDia} un.</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Tabela lista (mobile-friendly) */}
      {!loading && itens.length > 0 && (
        <Card>
          <CardHeader><h2 className="font-semibold text-gray-700 text-sm">Lista da Semana</h2></CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Data</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Produto</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Qtd. Planejada</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {itens.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">
                      {format(parseISO(item.data), "EEE, dd/MM", { locale: ptBR })}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">{item.produtos?.nome}</td>
                    <td className="px-4 py-3 text-gray-600">{item.quantidade_planejada} un.</td>
                    <td className="px-4 py-3">
                      <Badge color={STATUS_COLOR[item.status]}>{STATUS_LABEL[item.status]}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => abrir(item)} className="p-1.5 text-gray-400 hover:text-primary-500 rounded">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => { setDeleteId(item.id); setConfirmOpen(true) }} className="p-1.5 text-gray-400 hover:text-red-500 rounded">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? 'Editar Planejamento' : 'Novo Planejamento'}
      >
        <div className="space-y-4">
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
            <option value="">Selecione...</option>
            {produtos.map(p => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </Select>
          <Input
            type="number"
            label="Quantidade Planejada *"
            value={form.quantidade_planejada}
            onChange={e => setForm(f => ({ ...f, quantidade_planejada: e.target.value }))}
            error={errors.quantidade_planejada}
            min={1}
            placeholder="0"
          />
          <Select
            label="Status"
            value={form.status}
            onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
          >
            <option value="planejado">Planejado</option>
            <option value="produzindo">Produzindo</option>
            <option value="finalizado">Finalizado</option>
            <option value="parcial">Finalizado Parcial</option>
          </Select>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={salvar} loading={saving}>Salvar</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={excluir}
        loading={deleting}
        title="Excluir Planejamento"
        message="Deseja excluir este item do planejamento?"
      />
    </div>
  )
}
