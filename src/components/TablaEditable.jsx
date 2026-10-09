// Ficha: components/TablaEditable.md
// Tabla con inputs por fila (percances en CUU2, insumos en CUU3). Va dentro de una tarjeta crema.
// columnas: [{ clave, titulo, num, render(fila, indice) }]; pie: contenido del <tfoot> (totales).
export default function TablaEditable({ columnas, filas, getKey = (_, i) => i, vacio, pie }) {
  if (filas.length === 0 && vacio) {
    return <p className="small" style={{ margin: 0, color: 'var(--ink-muted)' }}>{vacio}</p>
  }

  return (
    <table className="ac-table ac-table--lista ac-table--apilable">
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
        {filas.map((fila, i) => (
          <tr key={getKey(fila, i)}>
            {columnas.map((c) => (
              <td
                key={c.clave}
                className={c.num ? 'num' : c.clave === 'acciones' ? 'acciones' : undefined}
                data-label={c.titulo}
              >
                {c.render(fila, i)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
      {pie && <tfoot>{pie}</tfoot>}
    </table>
  )
}
