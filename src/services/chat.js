import { api } from './api.js'

// Servicio del chatbot: POST /api/chat. El componente Chatbot solo habla con este servicio.
// La conversación no se guarda en el servidor: se mandan los últimos mensajes para dar contexto.

/**
 * @typedef {'user' | 'bot'} ChatRole
 *
 * @typedef {Object} ChatMessage
 * @property {string} id
 * @property {ChatRole} role
 * @property {string} content
 * @property {string} createdAt  Fecha ISO 8601.
 * @property {boolean} [error]   true si es un aviso de error y no una respuesta.
 */

const MAX_HISTORIAL = 6

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
   * Envía un mensaje del usuario al asistente y devuelve su respuesta.
   * @param {string} message
   * @param {ChatMessage[]} [previos]  Conversación anterior al mensaje.
   * @returns {Promise<ChatMessage>}
   */
  sendMessage: async (message, previos = []) => {
    const history = previos
      .filter((m) => !m.error)
      .slice(-MAX_HISTORIAL)
      .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }))
    const { reply } = await api.post('/chat', { message, history })
    return crearMensaje('bot', reply)
  },
}
