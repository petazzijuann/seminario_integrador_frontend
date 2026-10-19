// Formato argentino de cifras y fechas, según el README del sistema de diseño:
// 16,5 ha · 25.000 kg · $845.000 · 19/07/2026 · campaña 2026/2027

export function numero(valor, decimales = 0) {
  const n = Number(valor)
  if (valor === null || valor === undefined || Number.isNaN(n)) return '—'
  return n.toLocaleString('es-AR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })
}

// Muestra decimales solo si el número los tiene (1 t, 1,5 t).
function numeroAuto(valor, maxDecimales = 2) {
  const n = Number(valor)
  if (valor === null || valor === undefined || Number.isNaN(n)) return '—'
  return n.toLocaleString('es-AR', { maximumFractionDigits: maxDecimales })
}

export const hectareas = (v) => `${numero(v, 1)} ha`
export const kilos = (v) => `${numero(v, 0)} kg`
export const kilosPorHa = (v) => `${numero(v, 0)} kg/ha`
export const toneladas = (v) => `${numeroAuto(v)} t`
export const porcentaje = (v) => `${numeroAuto(v, 1)} %`
export const pesos = (v) => (valorVacio(v) ? '—' : `$${numero(v, 0)}`)
export const cantidad = (v) => numeroAuto(v)

function valorVacio(v) {
  return v === null || v === undefined || Number.isNaN(Number(v))
}

// El back devuelve las fechas como 'yyyy-MM-dd' (o ISO). Se corta el string para no correr el día por zona horaria.
export function fecha(valor) {
  if (!valor) return '—'
  const [anio, mes, dia] = String(valor).slice(0, 10).split('-')
  if (!dia) return '—'
  return `${dia}/${mes}/${anio}`
}

export function hoyISO() {
  const d = new Date()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

// Las campañas se nombran por el año de inicio: 2026/2027.
export function nombreCampania(fechaInicio) {
  const anio = Number(String(fechaInicio ?? '').slice(0, 4))
  if (!anio) return 'Sin fecha'
  return `${anio}/${anio + 1}`
}

// Acepta "16,5" o "16.5" en los inputs de texto.
export function parsearNumero(texto) {
  if (texto === null || texto === undefined) return NaN
  const limpio = String(texto).trim().replace(',', '.')
  if (limpio === '') return NaN
  return Number(limpio)
}

export const pesosPorHa = (v) => (valorVacio(v) ? '—' : `${pesos(v)}/ha`)
export const pesosPorTonelada = (v) => (valorVacio(v) ? '—' : `${pesos(v)}/t`)

// Para ejes y tarjetas chicas: $1,2 M · $845 mil · 3,2 mil kg.
export function compacto(valor) {
  const n = Number(valor)
  if (valorVacio(valor)) return '—'
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${numeroAuto(n / 1_000_000, 1)} M`
  if (abs >= 1_000) return `${numeroAuto(n / 1_000, 1)} mil`
  return numeroAuto(n, 0)
}
