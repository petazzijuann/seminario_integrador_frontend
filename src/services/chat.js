// Servicio del chatbot. Por ahora es un mock: NO hace ningún request y el bot no responde.
// El componente Chatbot solo habla con este servicio, así para conectar el backend
// alcanza con cambiar la implementación de sendMessage (ver comentario más abajo).

/**
 * @typedef {'user' | 'bot'} ChatRole
 *
 * @typedef {Object} ChatMessage
 * @property {string} id
 * @property {ChatRole} role
 * @property {string} content
 * @property {string} createdAt  Fecha ISO 8601.
 *
 * @typedef {Object} ChatResponse
 * @property {string | null} conversationId  Id de la conversación (lo asignará el backend).
 * @property {ChatMessage | null} reply      Respuesta del bot. null mientras no haya backend.
 */

// URL base del chat. Las rutas de api.js ya van relativas a /api (Vite y Vercel la reenvían al backend),
// así que alcanza con la ruta. Se puede pisar con VITE_CHAT_API_URL en un .env.local.
// eslint-disable-next-line no-unused-vars
const CHAT_URL = import.meta.env.VITE_CHAT_API_URL ?? '/chat'

/** @param {ChatRole} role @param {string} content @returns {ChatMessage} */
export function crearMensaje(role, content) {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
  }
}

export const chatService = {
  /**
   * Envía un mensaje del usuario al bot.
   * @param {string} message
   * @param {string} [conversationId]
   * @returns {Promise<ChatResponse>}
   */
  // eslint-disable-next-line no-unused-vars
  sendMessage: async (message, conversationId) => {
    // Llamada real (cuando exista el endpoint en el backend):
    //
    //   import { api } from './api.js'
    //   const data = await api.post(CHAT_URL, { message, conversationId })
    //   return {
    //     conversationId: data.conversationId,
    //     reply: data.reply ? { ...crearMensaje('bot', data.reply), id: data.id ?? crypto.randomUUID() } : null,
    //   }
    //
    // Ojo: api.js bloquea los POST para roles de solo consulta (puedeModificar()).
    // Si el chat tiene que andar para todos los roles, agregar CHAT_URL a la excepción de request().
    return { conversationId: conversationId ?? null, reply: null }
  },
}
