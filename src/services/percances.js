import { api } from './api.js'


export const percancesService = {
  // Siembras con lote "Sembrado" y campaña "Abierta", con lote, semilla y campaña.
  siembrasDisponibles: () => api.get('/percances/siembras-disponibles'),
  registrar: (datos) => api.post('/percances', datos),
}
