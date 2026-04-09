import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

const pageTitles = {
  '/':             'Dashboard',
  '/planejamento': 'Planejamento de Produção',
  '/producao':     'Registro de Produção',
  '/camera-fria':  'Câmara Fria – Estoque',
  '/distribuicao': 'Distribuição para Unidades',
  '/produtos':     'Cadastro de Produtos',
  '/unidades':     'Cadastro de Unidades',
  '/relatorios':   'Relatórios',
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const title = pageTitles[location.pathname] || 'Sistema de Salgados'

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          title={title}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
