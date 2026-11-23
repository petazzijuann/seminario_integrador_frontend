import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react'
import { chatService, crearMensaje } from '../services/chat.js'

// Ficha: components/Chatbot.md
// Botón flotante + panel de chat. Se monta una vez en AppLayout (App.jsx).
// No tiene lógica de red: todo pasa por chatService (services/chat.js).

// Three.js se carga recién la primera vez que se abre el chat (chunk aparte).
const RobotAgro = lazy(() => import('./RobotAgro.jsx'))

const MAX_ALTO_INPUT = 120
const MARGEN_SCROLL = 16
const MAX_MENSAJE = 500 // mismo límite que el back (chat.controller.ts)

export default function Chatbot() {
  const [abierto, setAbierto] = useState(false)
  const [yaAbierto, setYaAbierto] = useState(false) // el robot se monta al primer open y queda montado (pausado)
  const [mensajes, setMensajes] = useState(/** @type {import('../services/chat.js').ChatMessage[]} */ ([]))
  const [texto, setTexto] = useState('')
  const [reaccion, setReaccion] = useState(0)
  const [esperando, setEsperando] = useState(false)
  const reducido = usePrefiereMenosMovimiento()
  const altoTeclado = useAltoTeclado(abierto)

  const boton = useRef(null)
  const input = useRef(null)
  const lista = useRef(null)
  const idPanel = useId()
  const idTitulo = useId()

  function alternar() {
    setAbierto((valor) => !valor)
    setYaAbierto(true)
  }

  function cerrar() {
    setAbierto(false)
    boton.current?.focus()
  }

  // Foco en el input al abrir
  useEffect(() => {
    if (!abierto) return
    const frame = requestAnimationFrame(() => input.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [abierto])

  // Escape cierra el panel. Si hay un diálogo abierto (.ac-overlay), Escape es de él.
  useEffect(() => {
    if (!abierto) return
    const alTeclear = (e) => {
      if (e.key !== 'Escape' || document.querySelector('.ac-overlay')) return
      setAbierto(false)
      boton.current?.focus()
    }
    document.addEventListener('keydown', alTeclear)
    return () => document.removeEventListener('keydown', alTeclear)
  }, [abierto])

  // Autoscroll
  useEffect(() => {
    const el = lista.current
    if (!el) return
    // Una respuesta larga se muestra desde su comienzo; lo demás baja hasta el final.
    const ultima = el.lastElementChild
    const desdeElComienzo = !esperando && mensajes.at(-1)?.role === 'bot' && ultima
    const top = desdeElComienzo ? ultima.offsetTop - el.offsetTop - MARGEN_SCROLL : el.scrollHeight
    el.scrollTo({ top, behavior: reducido ? 'auto' : 'smooth' })
  }, [mensajes, esperando, reducido])

  // El textarea crece con el texto hasta MAX_ALTO_INPUT
  useEffect(() => {
    const el = input.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_ALTO_INPUT)}px`
  }, [texto])

  async function enviar(e) {
    e?.preventDefault()
    const contenido = texto.trim()
    if (!contenido || esperando) return

    const previos = mensajes
    setMensajes((actuales) => [...actuales, crearMensaje('user', contenido)])
    setTexto('')
    setReaccion((n) => n + 1)
    setEsperando(true)
    input.current?.focus()

    try {
      const respuesta = await chatService.sendMessage(contenido, previos)
      setMensajes((actuales) => [...actuales, respuesta])
    } catch (err) {
      const aviso = err instanceof Error && err.message ? err.message : 'El asistente no pudo responder. Probá de nuevo.'
      setMensajes((actuales) => [...actuales, { ...crearMensaje('bot', aviso), error: true }])
    } finally {
      setEsperando(false)
    }
  }

  function alTeclearInput(e) {
    // Enter envía, Shift+Enter hace salto de línea (y no cortamos la composición de acentos del IME)
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) enviar(e)
  }

  const bloqueado = texto.trim() === '' || esperando

  return (
    <div className="ac-chat" style={{ '--ac-chat-teclado': `${altoTeclado}px` }}>
      <section
        id={idPanel}
        className={`ac-chat__panel${abierto ? ' ac-chat__panel--abierto' : ''}`}
        role="dialog"
        aria-labelledby={idTitulo}
        aria-hidden={!abierto}
        inert={!abierto}
      >
        <header className="ac-chat__escenario">
          {yaAbierto && (
            <Suspense fallback={<div className="ac-chat__canvas ac-chat__canvas--cargando" aria-hidden="true" />}>
              <RobotAgro activo={abierto} reaccion={reaccion} reducido={reducido} />
            </Suspense>
          )}
          <div className="ac-chat__titulo">
            <span className="ac-eyebrow">Asistente</span>
            <h2 id={idTitulo} className="ac-display">Agrobot</h2>
          </div>
          <button type="button" className="ac-chat__cerrar" aria-label="Cerrar chat" onClick={cerrar}>
            <IconoCerrar />
          </button>
        </header>

        <ol ref={lista} className="ac-chat__mensajes" aria-live="polite" aria-label="Mensajes">
          {mensajes.length === 0 && (
            <li className="ac-chat__vacio">
              Preguntame cómo usar AgroControl o consultame tus datos: lotes, campañas, stock, labores o rinde.
            </li>
          )}
          {mensajes.map((mensaje) => (
            <li
              key={mensaje.id}
              className={`ac-chat__burbuja ac-chat__burbuja--${mensaje.role}${mensaje.error ? ' ac-chat__burbuja--error' : ''}`}
            >
              {mensaje.content}
            </li>
          ))}
          {esperando && (
            <li className="ac-chat__burbuja ac-chat__burbuja--bot ac-chat__espera">
              <span className="ac-oculto">El asistente está escribiendo</span>
              <i aria-hidden="true" />
              <i aria-hidden="true" />
              <i aria-hidden="true" />
            </li>
          )}
        </ol>

        <form className="ac-chat__form" onSubmit={enviar}>
          <label className="ac-oculto" htmlFor={`${idPanel}-input`}>
            Mensaje
          </label>
          <textarea
            ref={input}
            id={`${idPanel}-input`}
            className="ac-input ac-chat__input"
            rows={1}
            maxLength={MAX_MENSAJE}
            placeholder="Escribí un mensaje…"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={alTeclearInput}
          />
          <button type="submit" className="ac-chat__enviar" aria-label="Enviar mensaje" disabled={bloqueado}>
            <IconoEnviar />
          </button>
        </form>
      </section>

      <button
        ref={boton}
        type="button"
        className={`ac-chat__fab${abierto ? ' ac-chat__fab--abierto' : ''}${yaAbierto ? '' : ' ac-chat__fab--invita'}`}
        aria-label={abierto ? 'Cerrar chat' : 'Abrir chat con el asistente'}
        aria-expanded={abierto}
        aria-controls={idPanel}
        onClick={alternar}
      >
        <span className="ac-chat__icono ac-chat__icono--chat">
          <IconoChat />
        </span>
        <span className="ac-chat__icono ac-chat__icono--cerrar">
          <IconoCerrar />
        </span>
      </button>
    </div>
  )
}

function usePrefiereMenosMovimiento() {
  const [reducido, setReducido] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  useEffect(() => {
    const consulta = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!consulta) return
    const alCambiar = () => setReducido(consulta.matches)
    consulta.addEventListener('change', alCambiar)
    return () => consulta.removeEventListener('change', alCambiar)
  }, [])
  return reducido
}

// En mobile el teclado achica el visual viewport pero no el layout (sobre todo en iOS),
// así que un position: fixed abajo queda tapado. Medimos cuánto ocupa y subimos el panel.
function useAltoTeclado(activo) {
  const [alto, setAlto] = useState(0)
  useEffect(() => {
    const vv = window.visualViewport
    if (!activo || !vv) return
    const medir = () => setAlto(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)))
    medir()
    vv.addEventListener('resize', medir)
    vv.addEventListener('scroll', medir)
    return () => {
      vv.removeEventListener('resize', medir)
      vv.removeEventListener('scroll', medir)
      setAlto(0)
    }
  }, [activo])
  return alto
}

function IconoChat() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12Z" />
      <path d="M8.5 12h.01M12 12h.01M15.5 12h.01" strokeWidth="2.6" />
    </svg>
  )
}

function IconoCerrar() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

function IconoEnviar() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}
