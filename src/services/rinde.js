import { api } from './api.js'

// /api/rinde — una fila por lote de las campañas Cerradas:
// { loteSemillaCampaniaId, campania, lote, semilla, cantidadSembrada, kilosHectarea, porcentajeHumedad,
//   produccionKg, cantidadLabores, costos: { semilla, labores, insumos, percances, total } }

export const rindeService = {
  listar: () => api.get('/rinde'),
}
