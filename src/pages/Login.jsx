import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ChefHat, LogIn } from 'lucide-react'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import { toast } from '../components/ui/Toast'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, signIn, loading } = useAuth()

  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  if (!loading && user) {
    const destino = location.state?.from?.pathname || '/'
    return <Navigate to={destino} replace />
  }

  const validar = () => {
    const e = {}

    if (!form.email.trim()) e.email = 'E-mail obrigatório'
    if (!form.password) e.password = 'Senha obrigatória'

    setErrors(e)
    return Object.keys(e).length === 0
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    if (!validar()) return

    setSaving(true)
    try {
      await signIn({
        email: form.email.trim(),
        password: form.password,
      })
      toast.success('Login realizado com sucesso!')
      const destino = location.state?.from?.pathname || '/'
      navigate(destino, { replace: true })
    } catch (err) {
      const mensagem = String(err?.message || '').toLowerCase()

      if (mensagem.includes('failed to fetch')) {
        toast.error('Falha de conexão com o Supabase. Verifique VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no ambiente de deploy.')
      } else {
        toast.error(err.message || 'Não foi possível entrar. Verifique suas credenciais.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 via-amber-50 to-white flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-orange-100 p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 bg-primary-500 rounded-xl flex items-center justify-center text-white">
            <ChefHat size={22} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Salgados Controle</p>
            <h1 className="text-xl font-bold text-gray-800">Entrar no sistema</h1>
          </div>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <Input
            label="E-mail"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            error={errors.email}
            placeholder="seuemail@empresa.com"
          />

          <Input
            label="Senha"
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            error={errors.password}
            placeholder="••••••••"
          />

          <Button type="submit" className="w-full justify-center" loading={saving}>
            <LogIn size={16} />
            Entrar
          </Button>
        </form>
      </div>
    </div>
  )
}
