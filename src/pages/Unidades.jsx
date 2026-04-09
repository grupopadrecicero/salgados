import { useState, useEffect } from 'react'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'
import { getUnidades, createUnidade, updateUnidade, deleteUnidade } from '../services/unidadesService'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Badge from '../components/ui/Badge'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { toast } from '../components/ui/Toast'

const FORM_VAZIO = { nome: '', cidade: '', ativo: true }

export default function Unidades() {
  const [unidades,    setUnidades]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [busca,       setBusca]       = useState('')
  const [modalOpen,   setModalOpen]   = useState(false)
  const [form,        setForm]        = useState(FORM_VAZIO)
  const [editId,      setEditId]      = useState(null)
  const [saving,      setSaving]      = useState(false)
  const [errors,      setErrors]      = useState({})
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteId,    setDeleteId]    = useState(null)
  const [deleting,    setDeleting]    = useState(false)

  const carregar = () => {
    setLoading(true)
    getUnidades()
      .then(setUnidades)
      .catch(() => toast.error('Erro ao carregar unidades'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { carregar() }, [])

  const abrir = (unidade = null) => {
    setEditId(unidade?.id || null)
    setForm(unidade
      ? { nome: unidade.nome, cidade: unidade.cidade, ativo: unidade.ativo }
      : FORM_VAZIO
    )
    setErrors({})
    setModalOpen(true)
  }

  const validar = () => {
    const e = {}
    if (!form.nome.trim())   e.nome   = 'Nome obrigatório'
    if (!form.cidade.trim()) e.cidade = 'Cidade obrigatória'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const salvar = async () => {
    if (!validar()) return
    setSaving(true)
    try {
      const dados = { ...form, nome: form.nome.trim(), cidade: form.cidade.trim() }
      if (editId) {
        await updateUnidade(editId, dados)
        toast.success('Unidade atualizada!')
      } else {
        await createUnidade(dados)
        toast.success('Unidade criada!')
      }
      setModalOpen(false)
      carregar()
    } catch (err) {
      toast.error(err.message || 'Erro ao salvar unidade')
    } finally {
      setSaving(false)
    }
  }

  const confirmarExcluir = (id) => { setDeleteId(id); setConfirmOpen(true) }

  const excluir = async () => {
    setDeleting(true)
    try {
      await deleteUnidade(deleteId)
      toast.success('Unidade excluída!')
      setConfirmOpen(false)
      carregar()
    } catch {
      toast.error('Erro ao excluir unidade. Verifique se ela não está em uso.')
    } finally {
      setDeleting(false)
    }
  }

  const filtradas = unidades.filter(u =>
    u.nome.toLowerCase().includes(busca.toLowerCase()) ||
    u.cidade.toLowerCase().includes(busca.toLowerCase())
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
            placeholder="Buscar por nome ou cidade..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>
        <Button onClick={() => abrir()}>
          <Plus size={16} /> Nova Unidade
        </Button>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        {loading ? <LoadingSpinner /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Cidade</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtradas.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-gray-400">
                      {busca ? 'Nenhuma unidade encontrada.' : 'Nenhuma unidade cadastrada.'}
                    </td>
                  </tr>
                ) : filtradas.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{u.nome}</td>
                    <td className="px-4 py-3 text-gray-600">{u.cidade}</td>
                    <td className="px-4 py-3">
                      <Badge color={u.ativo ? 'green' : 'gray'}>{u.ativo ? 'Ativa' : 'Inativa'}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => abrir(u)} className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => confirmarExcluir(u.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400">
              {filtradas.length} de {unidades.length} unidade(s)
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? 'Editar Unidade' : 'Nova Unidade'}
      >
        <div className="space-y-4">
          <Input
            label="Nome *"
            value={form.nome}
            onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
            error={errors.nome}
            placeholder="Ex: Unidade Centro"
          />
          <Input
            label="Cidade *"
            value={form.cidade}
            onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))}
            error={errors.cidade}
            placeholder="Ex: São Paulo"
          />
          <Select
            label="Status"
            value={form.ativo ? '1' : '0'}
            onChange={e => setForm(f => ({ ...f, ativo: e.target.value === '1' }))}
          >
            <option value="1">Ativa</option>
            <option value="0">Inativa</option>
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
        title="Excluir Unidade"
        message="Tem certeza que deseja excluir esta unidade? Esta ação não pode ser desfeita."
      />
    </div>
  )
}
