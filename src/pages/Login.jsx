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
    <div className="relative min-h-screen overflow-hidden bg-[#f7f2e7] px-4 py-6 sm:py-10">
      <div className="pointer-events-none absolute -top-24 -left-16 h-72 w-72 rounded-full bg-orange-200/70 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 -right-20 h-72 w-72 rounded-full bg-amber-200/70 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(251,146,60,0.12),transparent_42%),radial-gradient(circle_at_80%_10%,rgba(245,158,11,0.12),transparent_35%),radial-gradient(circle_at_50%_80%,rgba(249,115,22,0.08),transparent_35%)]" />

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-5xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-3xl border border-orange-100/70 bg-white/80 shadow-[0_30px_80px_-40px_rgba(146,64,14,0.55)] backdrop-blur-sm lg:grid-cols-[1.05fr_1fr]">
          <section className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-[#a33b12] via-[#b45309] to-[#f97316] p-8 text-white">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-wide">
              <ChefHat size={14} />
              Produção e distribuição
            </div>

            <div className="space-y-5">
              <h2 className="text-4xl font-black leading-tight tracking-tight">
                Central de salgados Padre Cicero
              </h2>
              <p className="max-w-md text-sm text-orange-50/95">
                Organize o planejamento semanal, acompanhe a produção e mantenha o estoque sempre atualizado em um só lugar.
              </p>
            </div>

            <div className="rounded-2xl border border-white/20 bg-black/10 p-4 text-xs text-orange-50">
              Acesso restrito para equipe autorizada.
            </div>
          </section>

          <section className="p-6 sm:p-8 lg:p-10">
            <div className="mb-8 space-y-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-500 text-white shadow-lg shadow-orange-200">
                <ChefHat size={22} />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-700">
                  Bem-vindo
                </p>
                <h1 className="mt-1 text-2xl font-black leading-tight text-gray-900 sm:text-3xl">
                  Central de salgados Padre Cicero
                </h1>
                <p className="mt-2 text-sm text-gray-500">Entre para acessar o painel de gestão.</p>
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

            <p className="mt-5 text-center text-xs text-gray-400">
              Sistema interno de operação da cozinha.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
