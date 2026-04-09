import { Bell, LogOut, Menu } from 'lucide-react'
import { toast } from '../ui/Toast'
import { useAuth } from '../../context/AuthContext'
import { formatLongDateInAppTZ } from '../../utils/dateTime'

export default function Header({ onMenuClick, title }) {
  const hoje = formatLongDateInAppTZ(new Date())
  const { user, signOut } = useAuth()
  const nomeExibicao = user?.email || 'Usuário'
  const inicial = nomeExibicao.charAt(0).toUpperCase()

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success('Sessão encerrada.')
    } catch (err) {
      toast.error(err.message || 'Erro ao sair da conta.')
    }
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10 shadow-sm">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
        >
          <Menu size={20} />
        </button>
        <div>
          <h1 className="font-semibold text-gray-800 text-base leading-tight">{title}</h1>
          <p className="text-xs text-gray-400 capitalize hidden sm:block">{hoje}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 relative">
          <Bell size={18} />
        </button>
        <div className="hidden sm:flex flex-col items-end leading-tight mr-1">
          <p className="text-xs font-medium text-gray-700 max-w-[180px] truncate">{nomeExibicao}</p>
          <p className="text-[10px] text-gray-400">Autenticado</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm font-bold">
          {inicial}
        </div>
        <button
          onClick={handleSignOut}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
          title="Sair"
          aria-label="Sair"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}
