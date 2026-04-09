import { Menu, Bell } from 'lucide-react'
import { formatLongDateInAppTZ } from '../../utils/dateTime'

export default function Header({ onMenuClick, title }) {
  const hoje = formatLongDateInAppTZ(new Date())

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
        <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm font-bold">
          C
        </div>
      </div>
    </header>
  )
}
