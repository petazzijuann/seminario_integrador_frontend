import { api } from './api.js'

// /api/campanias — CUU1 (asignar lote) y CUU5 (cerrar campaña).

export const campaniasService = {
  // Devuelve asignaciones lote–semilla–campaña de las campañas Abiertas (una fila por cultivo:
  // con doble cultivo el mismo lote aparece dos veces en la misma campaña).
  listarAbiertas: () => api.get('/campanias'),
  // { campania, lotes: [{ loteSemillaCampaniaId, lote, semilla, cantidadSembrada, kilosHectarea }] } (una fila por cultivo)
  obtener: (id) => api.get(`/campanias/${id}`),
  // CUU1: crea la campaña, la asocia al lote y la semilla, y pasa el lote a "En uso".
  asignarLote: ({ loteId, semillaId, fecha, temporada }) =>
    api.post('/campanias', { lote_id: loteId, semilla_id: semillaId, fecha, temporada }),
  // CUR 6.a doble cultivo: suma un segundo cultivo a un lote Cosechado de la campaña y lo pasa a "En uso".
  // 409 si la campaña no está Abierta, el lote ya tiene 2 cultivos o no está Cosechado, o la semilla no sirve.
  agregarSegundoCultivo: (campaniaId, { loteId, semillaId }) =>
    api.post(`/campanias/${campaniaId}/segundo-cultivo`, { lote_id: loteId, semilla_id: semillaId }),
  // CUU5: 409 con { message, lotes } si hay lotes sin cosechar, o si ya estaba cerrada.
  cerrar: (id) => api.patch(`/campanias/${id}/cerrar`),
}
