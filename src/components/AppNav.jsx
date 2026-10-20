import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import FilterMenu from './FilterMenu.jsx'

// Ficha: components/AppNav.md
// Las secciones fijas (los 5 casos de uso + Insumos y Rinde) + "Catálogos" (Semillas, Insumos, Labores) en un FilterMenu.
// NavLink pone aria-current="page" en la sección activa, que es lo que subraya el CSS.

const SECCIONES = [
  { a: '/lotes', etiqueta: 'Lotes' },
  { a: '/siembras', etiqueta: 'Siembras' },
  { a: '/labores', etiqueta: 'Labores' },
  { a: '/cosechas', etiqueta: 'Cosechas' },
  { a: '/campanias', etiqueta: 'Campañas' },
  { a: '/insumos', etiqueta: 'Insumos' },
  { a: '/rinde', etiqueta: 'Rinde' },
]

const CATALOGOS = [
  { valor: '/catalogos/semillas', etiqueta: 'Semillas' },
  { valor: '/catalogos/insumos', etiqueta: 'Insumos' },
  { valor: '/catalogos/labores', etiqueta: 'Labores de mantenimiento' },
]

export default function AppNav({ usuario, iniciales }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const contenedor = useRef(null)

  useEffect(() => {
    if (!menuAbierto) return
    const alClic = (e) => {
      if (contenedor.current && !contenedor.current.contains(e.target)) setMenuAbierto(false)
    }
    const alTeclear = (e) => {
      if (e.key === 'Escape') setMenuAbierto(false)
    }
    document.addEventListener('mousedown', alClic)
    document.addEventListener('keydown', alTeclear)
    return () => {
      document.removeEventListener('mousedown', alClic)
      document.removeEventListener('keydown', alTeclear)
    }
  }, [menuAbierto])

  const enCatalogos = pathname.startsWith('/catalogos')

  function irACatalogo(ruta) {
    setMenuAbierto(false)
    navigate(ruta)
  }

  return (
    <nav className="ac-nav" aria-label="Secciones">
      <Link className="ac-nav__brand" to="/">
        AgroControl
      </Link>
      <div className="ac-nav__links">
        {SECCIONES.map((s) => (
          <NavLink key={s.a} to={s.a}>
            {s.etiqueta}
          </NavLink>
        ))}
        <span className="ac-nav__menu-wrap" ref={contenedor}>
          <a
            href="/catalogos"
            role="button"
            aria-haspopup="menu"
            aria-expanded={menuAbierto}
            aria-current={enCatalogos ? 'page' : undefined}
            onClick={(e) => {
              e.preventDefault()
              setMenuAbierto((a) => !a)
            }}
          >
            Catálogos
          </a>
          {menuAbierto && (
            <FilterMenu
              className="ac-nav__menu"
              titulo="Catálogos"
              opciones={CATALOGOS}
              valor={CATALOGOS.find((c) => pathname.startsWith(c.valor))?.valor}
              onElegir={irACatalogo}
            />
          )}
        </span>
      </div>
      <div className="ac-nav__user">
        <span className="ac-avatar" aria-hidden="true">
          {iniciales}
        </span>
        {usuario}
      </div>
    </nav>
  )
}
