import { useEffect, useRef, useState } from 'react'

// Preferencias y estado del entorno que condicionan las animaciones.
// usePrefiereMenosMovimiento salió de Chatbot.jsx (era local) para poder reusarla
// también en AgrobotFab.jsx; la lógica es la misma de antes.

/** prefers-reduced-motion: reduce. Reactivo (el usuario puede cambiarlo sin recargar). */
export function usePrefiereMenosMovimiento() {
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

/** false cuando la pestaña está oculta, para pausar animaciones y timers. */
export function usePestaniaVisible() {
  const [visible, setVisible] = useState(() => !document.hidden)
  useEffect(() => {
    const alCambiar = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', alCambiar)
    return () => document.removeEventListener('visibilitychange', alCambiar)
  }, [])
  return visible
}

// Actividad "en todo el sistema": cualquiera de estos eventos cuenta como que el usuario está ahí.
const EVENTOS_ACTIVIDAD = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll']
// El timer no se reprograma en cada píxel del mouse: alcanza con refrescarlo una vez por segundo.
const PASO_REFRESCO = 1000

/**
 * true cuando pasaron `ms` sin ninguna actividad del usuario.
 * `rondas` cuenta cuántas veces se entró en inactividad, para alternar animaciones.
 * @param {number} ms
 * @param {boolean} activo  false desarma los listeners y el timer.
 */
export function useInactividad(ms, activo) {
  const [inactivo, setInactivo] = useState(false)
  const [rondas, setRondas] = useState(0)
  const esInactivo = useRef(false)

  useEffect(() => {
    if (!activo) return
    let timer = 0
    let ultimoRefresco = 0

    const dormir = () => {
      esInactivo.current = true
      setInactivo(true)
      setRondas((n) => n + 1)
    }

    const alHaberActividad = () => {
      if (esInactivo.current) {
        esInactivo.current = false
        setInactivo(false)
      }
      const ahora = Date.now()
      if (ahora - ultimoRefresco < PASO_REFRESCO) return
      ultimoRefresco = ahora
      clearTimeout(timer)
      timer = setTimeout(dormir, ms)
    }

    timer = setTimeout(dormir, ms)
    for (const evento of EVENTOS_ACTIVIDAD) {
      window.addEventListener(evento, alHaberActividad, { passive: true })
    }
    return () => {
      clearTimeout(timer)
      for (const evento of EVENTOS_ACTIVIDAD) {
        window.removeEventListener(evento, alHaberActividad)
      }
      esInactivo.current = false
      setInactivo(false)
    }
  }, [ms, activo])

  return { inactivo, rondas }
}
