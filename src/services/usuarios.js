import { api } from './api.js'

export const usuariosService = {
  listar: () => api.get('/usuario'),
  listarRoles: () => api.get('/rol'),
  crear: ({ nombre, email, password, rolId }) =>
    api.post('/usuario', { nombre, email, password, rolId }),
  restablecerContrasena: (id, password) =>
    api.post(`/usuario/${id}/reset-password`, { password }),
}
