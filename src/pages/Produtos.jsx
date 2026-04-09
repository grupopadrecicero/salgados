import { useState, useEffect } from 'react'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'
import { getProdutos, createProduto, updateProduto, deleteProduto } from '../services/produtosService'
import Card, { CardHeader, CardBody } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Badge from '../components/ui/Badge'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { toast } from '../components/ui/Toast'

const FORM_VAZIO = { nome: '', recheio: '', tipo: 'frito', ativo: true, observacao: '' }

function badgeTipo(tipo) {
  return tipo === 'frito'
    ? <Badge color="orange">Frito</Badge>
    : <Badge color="blue">Assado</Badge>
}

export default function Produtos() {
  const [produtos,  setProdutos]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [busca,     setBusca]     = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form,      setForm]      = useState(FORM_VAZIO)
  const [editId,    setEditId]    = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [errors,    setErrors]    = useState({})
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteId,    setDeleteId]    = useState(null)
  const [deleting,    setDeleting]    = useState(false)

  const carregar = () => {
    setLoading(true)
    getProdutos()
      .then(setProdutos)
      .catch(() => toast.error('Erro ao carregar produtos'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { carregar() }, [])

  const abrir = (produto = null) => {
    setEditId(produto?.id || null)
    setForm(produto
      ? { nome: produto.nome, recheio: produto.recheio || '', tipo: produto.tipo,
          ativo: produto.ativo, observacao: produto.observacao || '' }
      : FORM_VAZIO
    )
    setErrors({})
    setModalOpen(true)
  }

  const validar = () => {
    const e = {}
    if (!form.nome.trim()) e.nome = 'Nome obrigatório'
    if (!form.tipo)         e.tipo = 'Tipo obrigatório'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const salvar = async () => {
    if (!validar()) return
    setSaving(true)
    try {
      const dados = { ...form, nome: form.nome.trim() }
      if (editId) {
        await updateProduto(editId, dados)
        toast.success('Produto atualizado!')
      } else {
        await createProduto(dados)
        toast.success('Produto criado!')
      }
      setModalOpen(false)
      carregar()
    } catch (err) {
      toast.error(err.message || 'Erro ao salvar produto')
    } finally {
      setSaving(false)
    }
  }

  const confirmarExcluir = (id) => { setDeleteId(id); setConfirmOpen(true) }

  const excluir = async () => {
    setDeleting(true)
    try {
      await deleteProduto(deleteId)
      toast.success('Produto excluído!')
      setConfirmOpen(false)
      carregar()
    } catch {
      toast.error('Erro ao excluir produto. Verifique se ele não está em uso.')
    } finally {
      setDeleting(false)
    }
  }

  const filtrados = produtos.filter(p =>
    p.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (p.recheio || '').toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome ou recheio..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>
        <Button onClick={() => abrir()}>
          <Plus size={16} /> Novo Produto
        </Button>
      </div>

      {/* Tabela */}
      <Card>
        {loading ? <LoadingSpinner /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Recheio</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Observação</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtrados.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-gray-400">
                      {busca ? 'Nenhum produto encontrado.' : 'Nenhum produto cadastrado.'}
                    </td>
                  </tr>
                ) : filtrados.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{p.nome}</td>
                    <td className="px-4 py-3 text-gray-600">{p.recheio || '—'}</td>
                    <td className="px-4 py-3">{badgeTipo(p.tipo)}</td>
                    <td className="px-4 py-3">
                      <Badge color={p.ativo ? 'green' : 'gray'}>{p.ativo ? 'Ativo' : 'Inativo'}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{p.observacao || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => abrir(p)} className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => confirmarExcluir(p.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400">
              {filtrados.length} de {produtos.length} produto(s)
            </div>
          </div>
        )}
      </Card>

      {/* Modal Criar/Editar */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? 'Editar Produto' : 'Novo Produto'}
      >
        <div className="space-y-4">
          <Input
            label="Nome *"
            value={form.nome}
            onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
            error={errors.nome}
            placeholder="Ex: Coxinha de frango"
          />
          <Input
            label="Recheio"
            value={form.recheio}
            onChange={e => setForm(f => ({ ...f, recheio: e.target.value }))}
            placeholder="Ex: Frango com catupiry"
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Tipo *"
              value={form.tipo}
              onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
              error={errors.tipo}
            >
              <option value="frito">Frito</option>
              <option value="assado">Assado</option>
            </Select>
            <Select
              label="Status"
              value={form.ativo ? '1' : '0'}
              onChange={e => setForm(f => ({ ...f, ativo: e.target.value === '1' }))}
            >
              <option value="1">Ativo</option>
              <option value="0">Inativo</option>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="block text-sm font-medium text-gray-700">Observação</label>
            <textarea
              rows={3}
              value={form.observacao}
              onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
              placeholder="Informações adicionais..."
            />
          </div>
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
        title="Excluir Produto"
        message="Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita."
      />
    </div>
  )
}
