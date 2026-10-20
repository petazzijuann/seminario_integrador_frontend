import { Navigate, Route, Routes } from 'react-router-dom'
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

export default function App() {
  return (
    <div className="ac ac-app">
      <div className="ac-page">
        <AppNav usuario="Agustín" iniciales="AR" />
        <main>
          <Routes>
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
            <Route path="*" element={<NoEncontrada />} />
          </Routes>
        </main>
      </div>
    </div>
  )
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
