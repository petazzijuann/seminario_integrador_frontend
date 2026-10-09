import Button from './Button.jsx'
import EstadoCarga from './EstadoCarga.jsx'
import EstadoVacio from './EstadoVacio.jsx'
import Mensaje from './Mensaje.jsx'
import Tilde from './Tilde.jsx'

// Ficha: components/DataTable.md
// Tarjeta crema grande con título, herramientas (Filtrar/Ordenar), tabla y acciones abajo a la derecha.
// columnas: [{ clave, titulo, num (alinea a la derecha en mono), render(fila) }]
// Si se pasa onSeleccionar, las filas llevan checkbox y la elegida se pinta lime.
// Maneja sola los estados: cargando, error (con Reintentar) y vacío.
// En celular cada fila se apila como tarjeta: data-label lleva el título de la columna (ver responsive.css).
export default function DataTable({
  titulo,
  columnas,
  filas = [],
  getId = (fila) => fila.id,
  seleccionadaId,
  onSeleccionar,
  herramientas,
  acciones,
  cargando = false,
  error = null,
  onReintentar,
  vacio = { titulo: 'No hay datos para mostrar' },
  pie,
  children,
}) {
  const seleccionable = Boolean(onSeleccionar)

  let contenido
  if (cargando) {
    contenido = <EstadoCarga />
  } else if (error) {
    contenido = (
      <Mensaje tipo="error" titulo="No se pudieron cargar los datos">
        <p style={{ margin: 0 }}>{error.message}</p>
        {onReintentar && (
          <div style={{ marginTop: 'var(--space-3)' }}>
            <Button variante="outline" chico onClick={onReintentar}>
              Reintentar
            </Button>
          </div>
        )}
      </Mensaje>
    )
  } else if (filas.length === 0) {
    contenido = <EstadoVacio {...vacio} />
  } else {
    contenido = (
      <table className={`ac-table ac-table--apilable${seleccionable ? '' : ' ac-table--lista'}`}>
        <thead>
          <tr>
            {columnas.map((c) => (
              <th key={c.clave} className={c.num ? 'num' : undefined}>
                {c.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => {
            const id = getId(fila)
            const elegida = seleccionable && id === seleccionadaId
            const elegir = seleccionable ? () => onSeleccionar(fila) : undefined
            return (
              <tr
                key={id}
                aria-selected={seleccionable ? elegida : undefined}
                tabIndex={seleccionable ? 0 : undefined}
                onClick={elegir}
                onKeyDown={(e) => {
                  if (elegir && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault()
                    elegir()
                  }
                }}
              >
                {columnas.map((c, i) => (
                  <td
                    key={c.clave}
                    className={c.num ? 'num' : c.clave === 'acciones' ? 'acciones' : undefined}
                    data-label={c.titulo}
                  >
                    {i === 0 && seleccionable && <span className="ac-check">{elegida && <Tilde />}</span>}
                    {c.render ? c.render(fila) : fila[c.clave]}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
        {pie && <tfoot>{pie}</tfoot>}
      </table>
    )
  }

  return (
    <section className="ac-cream ac-cream--big">
      <div className="ac-toolbar">
        <h2 className="ac-display display-m">{titulo}</h2>
        {herramientas && <div className="ac-toolbar__tools">{herramientas}</div>}
      </div>
      {children}
      {contenido}
      {acciones && <div className="ac-actions">{acciones}</div>}
    </section>
  )
}
