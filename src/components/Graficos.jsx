import { useState } from 'react'

// Ficha: components/Graficos.md
// Gráficos de columnas hechos con HTML/CSS (no SVG) para que el texto no se achique en el celular.
// Van siempre dentro de una tarjeta crema. Cada columna es un botón: hover/foco muestra el tooltip
// y el clic elige esa fila (ej.: la campaña). La elegida va en tinta; el resto en steel-soft.

// Techo "redondo" del eje: 1, 2, 2,5 o 5 × 10^n.
function techo(maximo) {
  if (!(maximo > 0)) return 1
  const base = 10 ** Math.floor(Math.log10(maximo))
  const paso = [1, 2, 2.5, 5, 10].find((m) => m * base >= maximo)
  return paso * base
}

function Grilla({ maximo, formatoEje }) {
  return (
    <div className="ac-grafico__grilla" aria-hidden="true">
      {[1, 0.5, 0].map((f) => (
        <div key={f} className="ac-grafico__linea" style={{ bottom: `${f * 100}%` }}>
          <span>{formatoEje(maximo * f)}</span>
        </div>
      ))}
    </div>
  )
}

// La posición del tooltip depende de la columna para que no se salga de la tarjeta por los costados.
function lado(i, total) {
  if (i === 0) return 'izq'
  if (i === total - 1) return 'der'
  return ''
}

// datos: [{ id, etiqueta, valor, nota }] — un valor null se muestra como "sin dato".
export function GraficoColumnas({ datos, formato, formatoEje = formato, seleccionadoId, onSeleccionar, descripcion }) {
  const [activo, setActivo] = useState(null)
  const maximo = techo(Math.max(0, ...datos.map((d) => Number(d.valor) || 0)))

  return (
    <div className="ac-grafico" role="group" aria-label={descripcion}>
      <div className="ac-grafico__area">
        <Grilla maximo={maximo} formatoEje={formatoEje} />
        <div className="ac-grafico__cols">
          {datos.map((d, i) => {
            const elegida = d.id === seleccionadoId
            const sinDato = d.valor === null || d.valor === undefined
            const alto = sinDato ? 0 : Math.max(1, (Number(d.valor) / maximo) * 100)
            return (
              <button
                key={d.id}
                type="button"
                className="ac-grafico__col"
                aria-pressed={elegida}
                aria-label={`${d.etiqueta}: ${sinDato ? 'sin dato' : formato(d.valor)}`}
                onClick={() => onSeleccionar?.(d.id)}
                onPointerEnter={() => setActivo(d.id)}
                onPointerLeave={() => setActivo(null)}
                onFocus={() => setActivo(d.id)}
                onBlur={() => setActivo(null)}
              >
                {elegida && !sinDato && (
                  <span className="ac-grafico__valor" style={{ bottom: `${alto}%` }}>
                    {formato(d.valor)}
                  </span>
                )}
                {sinDato ? (
                  <span className="ac-grafico__sin-dato">s/d</span>
                ) : (
                  <span className={`ac-grafico__barra${elegida ? ' ac-grafico__barra--elegida' : ''}`} style={{ height: `${alto}%` }} />
                )}
                {activo === d.id && (
                  <span className={`ac-tooltip ac-tooltip--${lado(i, datos.length)}`} role="tooltip">
                    <b>{sinDato ? 'Sin dato' : formato(d.valor)}</b>
                    <span>{d.etiqueta}</span>
                    {d.nota && <span>{d.nota}</span>}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
      <EjeX datos={datos} seleccionadoId={seleccionadoId} />
    </div>
  )
}

// series: [{ clave, etiqueta, color }] en orden fijo (el color sigue al rubro, nunca al orden).
// datos: [{ id, etiqueta, partes: { [clave]: valor } }]
export function GraficoApilado({ datos, series, formato, formatoEje = formato, seleccionadoId, onSeleccionar, descripcion }) {
  const [activo, setActivo] = useState(null)
  const total = (d) => series.reduce((t, s) => t + (Number(d.partes[s.clave]) || 0), 0)
  const maximo = techo(Math.max(0, ...datos.map(total)))

  return (
    <div className="ac-grafico" role="group" aria-label={descripcion}>
      <Leyenda series={series} />
      <div className="ac-grafico__area">
        <Grilla maximo={maximo} formatoEje={formatoEje} />
        <div className="ac-grafico__cols">
          {datos.map((d, i) => {
            const elegida = d.id === seleccionadoId
            const suma = total(d)
            return (
              <button
                key={d.id}
                type="button"
                className={`ac-grafico__col${elegida ? ' ac-grafico__col--elegida' : ''}`}
                aria-pressed={elegida}
                aria-label={`${d.etiqueta}: ${formato(suma)}`}
                onClick={() => onSeleccionar?.(d.id)}
                onPointerEnter={() => setActivo(d.id)}
                onPointerLeave={() => setActivo(null)}
                onFocus={() => setActivo(d.id)}
                onBlur={() => setActivo(null)}
              >
                {elegida && (
                  <span className="ac-grafico__valor" style={{ bottom: `${(suma / maximo) * 100}%` }}>
                    {formato(suma)}
                  </span>
                )}
                <span className="ac-grafico__pila" style={{ height: `${(suma / maximo) * 100}%` }}>
                  {series.map((s) => {
                    const v = Number(d.partes[s.clave]) || 0
                    if (v <= 0) return null
                    return <span key={s.clave} className="ac-grafico__tramo" style={{ flexGrow: v, background: s.color }} />
                  })}
                </span>
                {activo === d.id && (
                  <span className={`ac-tooltip ac-tooltip--${lado(i, datos.length)}`} role="tooltip">
                    <b>{formato(suma)}</b>
                    <span>{d.etiqueta}</span>
                    {series.map((s) => (
                      <span key={s.clave} className="ac-tooltip__fila">
                        <i style={{ background: s.color }} />
                        {s.etiqueta}
                        <b>{formato(d.partes[s.clave] ?? 0)}</b>
                      </span>
                    ))}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
      <EjeX datos={datos} seleccionadoId={seleccionadoId} />
    </div>
  )
}

// Barra horizontal 100 %: cómo se reparte un total entre rubros (con leyenda que lleva $ y %).
export function BarraReparto({ partes, series, formato }) {
  const total = series.reduce((t, s) => t + (Number(partes[s.clave]) || 0), 0)
  return (
    <div className="ac-reparto">
      <div className="ac-reparto__barra" role="img" aria-label="Reparto del gasto por rubro">
        {series.map((s) => {
          const v = Number(partes[s.clave]) || 0
          if (v <= 0) return null
          return <span key={s.clave} style={{ flexGrow: v, background: s.color }} title={`${s.etiqueta}: ${formato(v)}`} />
        })}
      </div>
      <ul className="ac-reparto__leyenda">
        {series.map((s) => {
          const v = Number(partes[s.clave]) || 0
          return (
            <li key={s.clave}>
              <i style={{ background: s.color }} aria-hidden="true" />
              <span>{s.etiqueta}</span>
              <b className="ac-num">{formato(v)}</b>
              <span className="ac-num ac-reparto__pct">{total > 0 ? `${Math.round((v / total) * 100)} %` : '—'}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Leyenda({ series }) {
  return (
    <ul className="ac-leyenda">
      {series.map((s) => (
        <li key={s.clave}>
          <i style={{ background: s.color }} aria-hidden="true" />
          {s.etiqueta}
        </li>
      ))}
    </ul>
  )
}

function EjeX({ datos, seleccionadoId }) {
  return (
    <div className="ac-grafico__eje-x" aria-hidden="true">
      {datos.map((d) => (
        <span key={d.id} className={d.id === seleccionadoId ? 'elegida' : undefined}>
          {d.etiqueta}
        </span>
      ))}
    </div>
  )
}
