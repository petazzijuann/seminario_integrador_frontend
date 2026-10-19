import { nombreCampania } from './format.js'

// Cuentas del tablero de Rinde. El back devuelve una fila por lote; acá se agrupa por campaña
// y se sacan los indicadores. Todo sale de las mismas filas, así los números siempre cierran.

// Rubros del gasto en orden fijo: el color sigue al rubro (tokens --serie-1..4 en tokens.css).
export const RUBROS = [
  { clave: 'semilla', etiqueta: 'Semilla', color: 'var(--serie-1)' },
  { clave: 'labores', etiqueta: 'Labores', color: 'var(--serie-2)' },
  { clave: 'insumos', etiqueta: 'Insumos', color: 'var(--serie-3)' },
  { clave: 'percances', etiqueta: 'Percances', color: 'var(--serie-4)' },
]

const dividir = (a, b) => (b > 0 ? a / b : null)

// Totales e indicadores de un conjunto de lotes (una campaña, o una campaña filtrada por cultivo).
export function resumir(lotes) {
  const costos = { semilla: 0, labores: 0, insumos: 0, percances: 0, total: 0 }
  let superficie = 0
  let superficieCosechada = 0
  let produccionKg = 0
  let sembradoT = 0
  let humedadPorKg = 0
  let labores = 0

  for (const l of lotes) {
    superficie += l.lote.superficie
    sembradoT += l.cantidadSembrada
    produccionKg += l.produccionKg
    labores += l.cantidadLabores
    if (l.kilosHectarea !== null) superficieCosechada += l.lote.superficie
    if (l.porcentajeHumedad !== null) humedadPorKg += l.porcentajeHumedad * l.produccionKg
    for (const clave of Object.keys(costos)) costos[clave] += l.costos[clave]
  }

  const produccionT = produccionKg / 1000
  return {
    superficie,
    produccionKg,
    produccionT,
    sembradoT,
    labores,
    costos,
    // Rinde promedio ponderado por superficie (kg totales / ha cosechadas).
    kilosHectarea: dividir(produccionKg, superficieCosechada),
    humedad: dividir(humedadPorKg, produccionKg),
    costoPorHa: dividir(costos.total, superficie),
    // Lo que costó producir cada tonelada.
    costoPorTonelada: dividir(costos.total, produccionT),
    // Toneladas cosechadas por cada tonelada de semilla sembrada.
    multiplicacion: dividir(produccionT, sembradoT),
    // Kilos producidos por cada $1.000 invertidos.
    kilosPorMil: dividir(produccionKg, costos.total / 1000),
  }
}

// Agrupa las filas por campaña, en orden cronológico (la más vieja primero).
export function agruparCampanias(filas) {
  const grupos = new Map()
  for (const f of filas) {
    const id = f.campania.id
    if (!grupos.has(id)) grupos.set(id, { id, campania: f.campania, lotes: [] })
    grupos.get(id).lotes.push(f)
  }

  return [...grupos.values()]
    .sort((a, b) => String(a.campania.fecha).localeCompare(String(b.campania.fecha)) || a.id - b.id)
    .map((g) => ({
      ...g,
      corta: `C${g.id}`,
      nombre: `C${g.id} · ${nombreCampania(g.campania.fecha)} ${g.campania.temporada}`,
      cultivos: [...new Set(g.lotes.map((l) => l.semilla.nombre))],
      resumen: resumir(g.lotes),
    }))
}

// Promedio de un indicador entre campañas (ignora las que no lo tienen).
export function promedio(campanias, clave) {
  const valores = campanias.map((c) => c.resumen[clave]).filter((v) => v !== null && v !== undefined)
  return valores.length ? valores.reduce((t, v) => t + v, 0) / valores.length : null
}
