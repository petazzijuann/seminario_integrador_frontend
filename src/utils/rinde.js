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

// Orden cronológico de campañas: por fecha de inicio y, si empatan, por id.
const compararCampanias = (a, b) => String(a.fecha).localeCompare(String(b.fecha)) || a.id - b.id

export const textoLotes = (lotes) => {
  const nros = [...new Set(lotes.map((l) => l.lote.nroLote))].sort((a, b) => a - b)
  return `${nros.length === 1 ? 'Lote' : 'Lotes'} ${nros.join(', ')}`
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
    .sort((a, b) => compararCampanias(a.campania, b.campania))
    .map((g) => ({
      ...g,
      corta: `C${g.id}`,
      periodo: `${nombreCampania(g.campania.fecha)} ${g.campania.temporada}`,
      nombre: `C${g.id} · ${nombreCampania(g.campania.fecha)} ${g.campania.temporada} · ${textoLotes(g.lotes)}`,
      textoLotes: textoLotes(g.lotes),
      cultivos: [...new Set(g.lotes.map((l) => l.semilla.nombre))],
      resumen: resumir(g.lotes),
    }))
}

// Histórico del mismo lote: para cada lote de la campaña elegida, su campaña inmediatamente
// anterior (Lote 1 2026 → Lote 1 2025). Devuelve las filas de esas campañas, solo de esos lotes.
export function anterioresDelMismoLote(filas, campania) {
  const previas = []
  for (const actual of campania.lotes) {
    const delLote = filas
      .filter((f) => f.lote.id === actual.lote.id && compararCampanias(f.campania, campania.campania) < 0)
      .sort((a, b) => compararCampanias(a.campania, b.campania))
    if (delLote.length) previas.push(delLote.at(-1))
  }
  return previas
}

// Todas las otras campañas de los mismos lotes (para el promedio del lote).
export function otrasDelMismoLote(filas, campania) {
  const lotes = new Set(campania.lotes.map((l) => l.lote.id))
  return agruparCampanias(filas.filter((f) => lotes.has(f.lote.id) && f.campania.id !== campania.id))
}

// Promedio de un indicador entre campañas (ignora las que no lo tienen).
export function promedio(campanias, clave) {
  const valores = campanias.map((c) => c.resumen[clave]).filter((v) => v !== null && v !== undefined)
  return valores.length ? valores.reduce((t, v) => t + v, 0) / valores.length : null
}
