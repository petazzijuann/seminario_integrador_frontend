import PageHeader from '../components/PageHeader.jsx'
import { obtenerSesion } from '../services/auth.js'

export default function LandingPage() {
  const sesion = obtenerSesion()
  const nombre = sesion?.usuario.nombre || sesion?.usuario.email || 'tu campo'

  return (
    <PageHeader
      lineas={['Bienvenido', nombre]}
      bajada="Gestioná tus campañas, lotes e insumos y consultá la información clave de tu producción."
      dato={{
        logo: '/logo-empresa.png',
      }}
    />
  )
}