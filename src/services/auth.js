const TOKEN_KEY = 'agrocontrol_token'
const EMAIL_KEY = 'agrocontrol_email'
const NOMBRE_KEY = 'agrocontrol_nombre'
const ROL_ID_KEY = 'agrocontrol_rol_id'
const EVENTO_SESION_INVALIDA = 'agrocontrol:sesion-invalida'

function almacenamientoConSesion() {
  if (localStorage.getItem(TOKEN_KEY)) return localStorage
  if (sessionStorage.getItem(TOKEN_KEY)) return sessionStorage
  return null
}

function obtenerRolDelToken(token) {
  const segmento = token?.split('.')[1]
  if (!segmento) return null

  try {
    const base64 = segmento.replace(/-/g, '+').replace(/_/g, '/')
    const binario = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))
    const bytes = Uint8Array.from(binario, (caracter) => caracter.charCodeAt(0))
    const payload = JSON.parse(new TextDecoder().decode(bytes))
    return typeof payload.roleId === 'number' ? payload.roleId : null
  } catch {
    return null
  }
}

export function obtenerToken() {
  return almacenamientoConSesion()?.getItem(TOKEN_KEY) ?? null
}

export function puedeModificar() {
  const rolId = obtenerSesion()?.usuario.rolId
  return rolId === 1 || rolId === 2
}

export function obtenerSesion() {
  const almacenamiento = almacenamientoConSesion()
  if (!almacenamiento) return null

  const token = almacenamiento.getItem(TOKEN_KEY)
  const rolGuardado = almacenamiento.getItem(ROL_ID_KEY)
  const rolIdGuardado = rolGuardado === null ? null : Number(rolGuardado)

  return {
    token,
    usuario: {
      nombre: almacenamiento.getItem(NOMBRE_KEY) ?? '',
      email: almacenamiento.getItem(EMAIL_KEY) ?? '',
      rolId: Number.isInteger(rolIdGuardado) ? rolIdGuardado : obtenerRolDelToken(token),
    },
  }
}

export function guardarSesion({ token, usuario }, recordar) {
  cerrarSesion()
  const almacenamiento = recordar ? localStorage : sessionStorage
  almacenamiento.setItem(TOKEN_KEY, token)
  almacenamiento.setItem(NOMBRE_KEY, usuario.nombre ?? '')
  almacenamiento.setItem(EMAIL_KEY, usuario.email)
  almacenamiento.setItem(ROL_ID_KEY, String(usuario.rolId))
}

export function cerrarSesion() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(NOMBRE_KEY)
  localStorage.removeItem(EMAIL_KEY)
  localStorage.removeItem(ROL_ID_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(NOMBRE_KEY)
  sessionStorage.removeItem(EMAIL_KEY)
  sessionStorage.removeItem(ROL_ID_KEY)
}

export function notificarSesionInvalida() {
  cerrarSesion()
  window.dispatchEvent(new Event(EVENTO_SESION_INVALIDA))
}

export function escucharSesionInvalida(callback) {
  window.addEventListener(EVENTO_SESION_INVALIDA, callback)
  return () => window.removeEventListener(EVENTO_SESION_INVALIDA, callback)
}
