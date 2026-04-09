import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Dashboard   from './pages/Dashboard'
import Produtos    from './pages/Produtos'
import Unidades    from './pages/Unidades'
import Planejamento from './pages/Planejamento'
import Producao    from './pages/Producao'
import CameraFria  from './pages/CameraFria'
import Distribuicao from './pages/Distribuicao'
import Relatorios  from './pages/Relatorios'
import { ToastContainer } from './components/ui/Toast'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index             element={<Dashboard   />} />
          <Route path="planejamento" element={<Planejamento />} />
          <Route path="producao"   element={<Producao    />} />
          <Route path="camera-fria" element={<CameraFria  />} />
          <Route path="distribuicao" element={<Distribuicao />} />
          <Route path="produtos"   element={<Produtos    />} />
          <Route path="unidades"   element={<Unidades    />} />
          <Route path="relatorios" element={<Relatorios  />} />
        </Route>
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  )
}
