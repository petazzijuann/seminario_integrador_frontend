import { useEffect, useState } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import AppNav from './components/AppNav.jsx'
import Button from './components/Button.jsx'
import EstadoVacio from './components/EstadoVacio.jsx'
import AsignarLotePage from './pages/AsignarLotePage.jsx'
import CerrarCampaniaPage from './pages/CerrarCampaniaPage.jsx'
import InsumosPage from './pages/InsumosPage.jsx'
import LaboresCatalogoPage from './pages/LaboresCatalogoPage.jsx'
import LotesPage from './pages/LotesPage.jsx'
import RegistrarCosechaPage from './pages/RegistrarCosechaPage.jsx'
import RegistrarLaborPage from './pages/RegistrarLaborPage.jsx'
import RegistrarSiembraPage from './pages/RegistrarSiembraPage.jsx'
import RindePage from './pages/RindePage.jsx'
import SemillasPage from './pages/SemillasPage.jsx'
import StockPage from './pages/StockPage.jsx'
import LandingPage from './pages/LandingPage.jsx'
import PercanceGeneralPage from './pages/PercanceGeneralPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import UsuariosPage from './pages/UsuariosPage.jsx'
import { cerrarSesion, escucharSesionInvalida, obtenerSesion } from './services/auth.js'

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <div className="ac ac-app">
            <LoginPage />
          </div>
        }
      />
      <Route element={<AppLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/lotes" element={<LotesPage />} />
        <Route path="/lotes/asignar" element={<AsignarLotePage />} />
        <Route path="/siembras" element={<RegistrarSiembraPage />} />
        <Route path="/labores" element={<RegistrarLaborPage />} />
        <Route path="/cosechas" element={<RegistrarCosechaPage />} />
        <Route path="/campanias" element={<CerrarCampaniaPage />} />
        <Route path="/insumos" element={<StockPage />} />
        <Route path="/rinde" element={<RindePage />} />
        <Route path="/catalogos/semillas" element={<SemillasPage />} />
        <Route path="/catalogos/insumos" element={<InsumosPage />} />
        <Route path="/catalogos/labores" element={<LaboresCatalogoPage />} />
        <Route path="/usuarios" element={<SoloAdmin><UsuariosPage /></SoloAdmin>} />
        <Route path="*" element={<NoEncontrada />} />
      </Route>
    </Routes>
  )
}

function AppLayout() {
  const [autenticado, setAutenticado] = useState(() => Boolean(obtenerSesion()))
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => escucharSesionInvalida(() => setAutenticado(false)), [])

  if (!autenticado) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  const sesion = obtenerSesion()
  const email = sesion?.usuario.email ?? ''
  const nombre = sesion?.usuario.nombre || email
  const rolId = sesion?.usuario.rolId
  const soloLectura = rolId !== 1 && rolId !== 2
  const iniciales = nombre.trim().split(/\s+/).slice(0, 2).map((parte) => parte[0]).join('').toUpperCase() || 'U'

  function salir() {
    cerrarSesion()
    setAutenticado(false)
    navigate('/login', { replace: true })
  }

  return (
    <div className={`ac ac-app${soloLectura ? ' ac-app--solo-consulta' : ''}`}>
      <div className="ac-page">
        <AppNav usuario={nombre} iniciales={iniciales} rolId={rolId} onLogout={salir} />
        <main>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/lotes" element={<LotesPage />} />
            <Route path="/lotes/asignar" element={<AsignarLotePage />} />
            <Route path="/siembras" element={<RegistrarSiembraPage />} />
            <Route path="/siembras/percance" element={<PercanceGeneralPage />} />
            <Route path="/labores" element={<RegistrarLaborPage />} />
            <Route path="/cosechas" element={<RegistrarCosechaPage />} />
            <Route path="/campanias" element={<CerrarCampaniaPage />} />
            <Route path="/insumos" element={<StockPage />} />
            <Route path="/rinde" element={<RindePage />} />
            <Route path="/catalogos/semillas" element={<SemillasPage />} />
            <Route path="/catalogos/insumos" element={<InsumosPage />} />
            <Route path="/catalogos/labores" element={<LaboresCatalogoPage />} />
            <Route path="*" element={<NoEncontrada />} />
          </Routes>
          {soloLectura ? (
            <>
              <p className="ac-solo-lectura" role="status">Modo consulta: tu rol no permite modificar información.</p>
              <div className="ac-solo-lectura__contenido">
                <Outlet />
              </div>
            </>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  )
}

function SoloAdmin({ children }) {
  return obtenerSesion()?.usuario.rolId === 1 ? children : <Navigate to="/" replace />
}

function NoEncontrada() {
  return (
    <section className="ac-cream ac-cream--big" style={{ marginTop: 'var(--space-7)' }}>
      <EstadoVacio
        titulo="Esta página no existe"
        texto="Revisá la dirección o volvé a la lista de lotes."
        accion={
          <Button variante="lime" to="/lotes">
            Ir a Lotes
          </Button>
        }
      />
    </section>
  )
}
