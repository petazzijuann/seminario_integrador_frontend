import { api } from './api.js'

// /api/stock — { semillas, insumos }, cada ítem con estado, stock, precioUnitario y su consumo histórico:
// usos (siembras o labores que lo usaron) y consumido (total usado).

export const stockService = {
  obtener: () => api.get('/stock'),
}
