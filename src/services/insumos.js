import { api } from './api.js'

export const insumosService = {
  listarActivos: () => api.get('/insumos'),
  listarTodas: () => api.get('/insumos?todas=true'),
  crear: ({ nombre, stock, precioUnitario }) => api.post('/insumos', { nombre, stock, precioUnitario }),
  actualizar: (id, { nombre, stock, precioUnitario }) =>
    api.put(`/insumos/${id}`, { nombre, stock, precioUnitario }),
  darDeBaja: (id) => api.delete(`/insumos/${id}`),
  reactivar: (id) => api.put(`/insumos/${id}`, { estado: 'Activa' }),
}
