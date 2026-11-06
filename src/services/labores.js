import { api } from './api.js'

// /api/labores — catálogo de labores de mantenimiento (descripción, costo base y estado).

export const laboresService = {
  listar: () => api.get('/labores'),
  listarTodas: () => api.get('/labores?todas=true'),
  crear: ({ descripcion, costeBase }) => api.post('/labores', { descripcion, costeBase }),
  actualizar: (id, { descripcion, costeBase }) => api.put(`/labores/${id}`, { descripcion, costeBase }),
  darDeBaja: (id) => api.delete(`/labores/${id}`),
  reactivar: (id) => api.put(`/labores/${id}`, { estado: 'Activa' }),
}
