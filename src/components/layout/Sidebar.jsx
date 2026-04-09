import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarDays,
  ChefHat,
  Snowflake,
  Truck,
  Package,
  Building2,
  BarChart3,
  X,
} from 'lucide-react'

const navItems = [
  { to: '/',             label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/planejamento', label: 'Planejamento', icon: CalendarDays    },
  { to: '/producao',     label: 'Produção',     icon: ChefHat         },
  { to: '/camera-fria',  label: 'Câmara Fria',  icon: Snowflake       },
  { to: '/distribuicao', label: 'Distribuição', icon: Truck           },
  { to: '/produtos',     label: 'Produtos',     icon: Package         },
  { to: '/unidades',     label: 'Unidades',     icon: Building2       },
  { to: '/relatorios',   label: 'Relatórios',   icon: BarChart3       },
]

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-gray-900 text-white z-30
          flex flex-col shadow-xl
          transition-transform duration-300
          ${open ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-500 rounded-lg flex items-center justify-center">
              <ChefHat size={20} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-sm leading-tight">Salgados</p>
              <p className="text-xs text-gray-400">Controle de Produção</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                 transition-colors ${
                   isActive
                     ? 'bg-primary-500 text-white'
                     : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                 }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-700">
          <p className="text-xs text-gray-500">v0.1.0 — Cozinha Central</p>
        </div>
      </aside>
    </>
  )
}
