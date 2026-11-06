// Cliente HTTP común. Todos los servicios pasan por acá, así el manejo de errores es uno solo.
// Las URLs van sin host: Vite reenvía /api al backend (ver vite.config.js).
import { notificarSesionInvalida, obtenerToken, puedeModificar } from './auth.js'

export class ApiError extends Error {
  constructor(status, message, data) {
    super(message)
    this.name = 'ApiError'
    this.status = status // 0 = sin conexión, 400 = validación, 409 = regla de negocio, 404, 500
    this.data = data // cuerpo completo de la respuesta (ej.: la lista de lotes del 409 de cerrar campaña)
  }
}

const SIN_CONEXION = 'No se pudo conectar con el servidor. Revisá que el backend esté corriendo en el puerto 3000.'

async function request(method, url, body) {
  if (method !== 'GET' && url !== '/usuario/login' && !puedeModificar()) {
    throw new ApiError(403, 'Tu rol solo permite consultar información.', null)
  }

  let respuesta
  const token = obtenerToken()
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  try {
    respuesta = await fetch(`/api${url}`, {
      method,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, SIN_CONEXION, null)
  }

  if (respuesta.status === 401 && token) notificarSesionInvalida()

  const texto = await respuesta.text()
  let data = null
  if (texto) {
    try {
      data = JSON.parse(texto)
    } catch {
      data = texto
    }
  }

  if (!respuesta.ok) {
    // Si el backend está apagado, el proxy de Vite responde 500 sin cuerpo JSON.
    const mensaje = data?.message ?? (respuesta.status >= 500 ? SIN_CONEXION : `Error ${respuesta.status}`)
    throw new ApiError(respuesta.status, mensaje, data)
  }

  return data
}

export const api = {
  get: (url) => request('GET', url),
  post: (url, body) => request('POST', url, body),
  put: (url, body) => request('PUT', url, body),
  patch: (url, body) => request('PATCH', url, body),
  delete: (url) => request('DELETE', url),
}
