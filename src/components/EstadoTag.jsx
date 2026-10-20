// Ficha: components/EstadoTag.md
// Etiqueta de estado de lote, semilla, campaña o situación del stock. Siempre lleva la palabra: el color solo acompaña.
const VARIANTES = {
  Libre: 'libre',
  'En uso': 'en-uso',
  Sembrado: 'sembrado',
  Cosechado: 'cosechado',
  Activa: 'activa',
  Inactiva: 'inactiva',
  Abierta: 'abierta',
  Cerrada: 'cerrada',
  'Con stock': 'activa',
  'Stock bajo': 'bajo',
  'Sin stock': 'sin-stock',
  'Sin consumo': 'cerrada',
}

export default function EstadoTag({ estado }) {
  const variante = VARIANTES[estado]
  return <span className={`ac-tag${variante ? ` ac-tag--${variante}` : ''}`}>{estado ?? 'Sin estado'}</span>
}
