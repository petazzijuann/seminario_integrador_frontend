import { numero } from '../utils/format.js'

// Ficha: components/Graficos.md (sección Indicador)
// Tarjeta de un número: rótulo, valor y, opcional, la variación contra otra campaña.
// variacion: { actual, anterior, contra: 'C4', mejor: 'sube' | 'baja' }
//   mejor = 'sube' para rinde o producción; 'baja' para costos.
// El color de la variación siempre va con flecha y texto: nunca solo el color.
export default function Indicador({ rotulo, valor, variacion, nota }) {
  return (
    <div className="ac-indicador">
      <span className="ac-eyebrow ac-indicador__rotulo">{rotulo}</span>
      <span className="ac-indicador__valor">{valor}</span>
      {variacion && <Variacion {...variacion} />}
      {nota && <span className="small ac-indicador__nota">{nota}</span>}
    </div>
  )
}

function Variacion({ actual, anterior, contra, mejor }) {
  const a = Number(actual)
  const b = Number(anterior)
  if (actual === null || anterior === null || actual === undefined || anterior === undefined || !b || Number.isNaN(a)) {
    return <span className="ac-variacion">Sin dato para comparar{contra ? ` con ${contra}` : ''}</span>
  }

  const pct = ((a - b) / Math.abs(b)) * 100
  if (Math.abs(pct) < 0.5) {
    return <span className="ac-variacion">= Igual que {contra}</span>
  }

  const sube = pct > 0
  const bien = sube === (mejor === 'sube')
  return (
    <span className={`ac-variacion ac-variacion--${bien ? 'bien' : 'mal'}`}>
      {sube ? '▲' : '▼'} {Math.abs(pct) > 999 ? 'más de 999' : numero(Math.abs(pct), 1)} % vs {contra}
      <span className="ac-oculto">{bien ? ' (mejor)' : ' (peor)'}</span>
    </span>
  )
}
