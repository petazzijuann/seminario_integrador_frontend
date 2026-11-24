import { useEffect, useId, useRef, useState } from 'react'
import { useInactividad, usePestaniaVisible, usePrefiereMenosMovimiento } from '../hooks/useMovimiento.js'

// Ficha: components/Chatbot.md
// Botón flotante que abre el panel de Agrobot. Muestra la cabeza del robot (sombrero + brote)
// como SVG inline: pesa ~2 KB, no monta un segundo contexto WebGL y usa los mismos tokens
// que la escena 3D, así acompaña el tema. La escena 3D (RobotAgro.jsx) sigue siendo del panel.
//
// Animaciones: todas en CSS (chatbot.css). Acá solo se decide CUÁNDO corren.
// Se apagan con prefers-reduced-motion, con la pestaña oculta y con el panel abierto.

const CLAVE_SALUDO = 'agrobot:saludo-visto'
const TEXTO_SALUDO = '¿Necesitás una mano?'
const DEMORA_SALUDO = 1200
const GESTOS = ['asomar', 'ladear']
const DURACION_GESTO = 1000
const GESTO_MIN = 20000
const GESTO_VENTANA = 10000
// A los 20 s sin actividad del usuario el bot entra en reposo. Alterna entre las dos
// escenas para que no se vuelva repetitivo si la pestaña queda abierta mucho tiempo.
const DEMORA_IDLE = 20000
const ESCENAS_IDLE = ['dormido', 'plantando']

// localStorage puede tirar (modo privado de Safari, cookies bloqueadas): nunca debe romper el botón.
function leerBandera(clave) {
  try {
    return window.localStorage.getItem(clave) === '1'
  } catch {
    return false
  }
}

function escribirBandera(clave) {
  try {
    window.localStorage.setItem(clave, '1')
  } catch {
    // Sin persistencia el saludo vuelve a aparecer en la próxima visita. No es grave.
  }
}

export default function AgrobotFab({ abierto, yaAbierto, idPanel, onAlternar, refBoton }) {
  const reducido = usePrefiereMenosMovimiento()
  const visible = usePestaniaVisible()
  const [gesto, setGesto] = useState(null)
  const [descartado, setDescartado] = useState(() => leerBandera(CLAVE_SALUDO))
  const [listoSaludo, setListoSaludo] = useState(false)
  const mira = useRef(null)
  const idClip = `ac-bot-cara-${useId().replace(/:/g, '')}`

  // El bot solo se mueve con el panel cerrado, la pestaña visible y sin movimiento reducido.
  const animable = !abierto && visible && !reducido
  const { inactivo, rondas } = useInactividad(DEMORA_IDLE, animable)

  // En reposo manda la escena idle; los gestos cortos se callan hasta que el usuario vuelva.
  const escenaIdle = animable && inactivo ? ESCENAS_IDLE[rondas % ESCENAS_IDLE.length] : null
  const gestoActivo = animable && !inactivo ? gesto : null
  const mostrarSaludo = listoSaludo && !descartado && !yaAbierto && !abierto

  // Burbuja de saludo: una sola vez por navegador, y después de una demora corta.
  useEffect(() => {
    if (descartado) return
    const t = setTimeout(() => setListoSaludo(true), DEMORA_SALUDO)
    return () => clearTimeout(t)
  }, [descartado])

  // Abrir el panel también cuenta como "ya lo vio".
  useEffect(() => {
    if (yaAbierto) escribirBandera(CLAVE_SALUDO)
  }, [yaAbierto])

  function cerrarSaludo() {
    setDescartado(true)
    escribirBandera(CLAVE_SALUDO)
  }

  // Gesto corto cada 20-30 s. Cadena de setTimeout, no un loop por frame.
  useEffect(() => {
    if (!animable || inactivo) return
    let aEmpezar = 0
    let aTerminar = 0
    const programar = () => {
      aEmpezar = setTimeout(() => {
        setGesto(GESTOS[Math.floor(Math.random() * GESTOS.length)])
        aTerminar = setTimeout(() => {
          setGesto(null)
          programar()
        }, DURACION_GESTO)
      }, GESTO_MIN + Math.random() * GESTO_VENTANA)
    }
    programar()
    return () => {
      clearTimeout(aEmpezar)
      clearTimeout(aTerminar)
      setGesto(null)
    }
  }, [animable, inactivo])

  // Seguimiento del mouse. Mismo criterio que la escena 3D (coordenadas de ventana, -1..1),
  // pero acá se escribe en dos custom properties: lo mueve el compositor, sin re-render de React.
  useEffect(() => {
    const el = mira.current
    if (!animable || !el) return
    let frame = 0
    let x = 0
    let y = 0
    const aplicar = () => {
      frame = 0
      el.style.setProperty('--ac-bot-x', x)
      el.style.setProperty('--ac-bot-y', y)
    }
    const alMover = (e) => {
      x = Math.max(-1, Math.min(1, (e.clientX / window.innerWidth) * 2 - 1))
      y = Math.max(-1, Math.min(1, (e.clientY / window.innerHeight) * 2 - 1))
      if (!frame) frame = requestAnimationFrame(aplicar)
    }
    window.addEventListener('pointermove', alMover, { passive: true })
    return () => {
      window.removeEventListener('pointermove', alMover)
      if (frame) cancelAnimationFrame(frame)
      el.style.removeProperty('--ac-bot-x')
      el.style.removeProperty('--ac-bot-y')
    }
  }, [animable])

  const clases = [
    'ac-chat__fab',
    abierto ? 'ac-chat__fab--abierto' : '',
    animable ? '' : 'ac-chat__fab--quieto',
    gestoActivo ? `ac-chat__fab--${gestoActivo}` : '',
    escenaIdle ? `ac-chat__fab--${escenaIdle}` : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      {mostrarSaludo && (
        <div className="ac-chat__saludo" role="note">
          <p className="ac-chat__saludo-texto">{TEXTO_SALUDO}</p>
          <button type="button" className="ac-chat__saludo-cerrar" aria-label="Cerrar saludo" onClick={cerrarSaludo}>
            <IconoCerrar tamanio={14} />
          </button>
        </div>
      )}

      <button
        ref={refBoton}
        type="button"
        className={clases}
        aria-label={abierto ? 'Cerrar asistente Agrobot' : 'Abrir asistente Agrobot'}
        aria-expanded={abierto}
        aria-controls={idPanel}
        onClick={onAlternar}
      >
        <span className="ac-chat__icono ac-chat__icono--cabeza">
          <span className="ac-chat__flota">
            <span className="ac-chat__gesto">
              <span ref={mira} className="ac-chat__mira">
                <CabezaAgrobot idClip={idClip} />
              </span>
            </span>
          </span>
        </span>
        <span className="ac-chat__icono ac-chat__icono--cerrar">
          <IconoCerrar />
        </span>
      </button>
    </>
  )
}

// Cabeza del robot en 2D, con las mismas proporciones y tokens que RobotAgro.jsx:
// cuerpo crema, visor oscuro, ojos lima, tornillos y tallo verdes, sombrero lima fuerte.
// Toda la geometría cae dentro del círculo inscripto del viewBox, así nada se recorta.
function CabezaAgrobot({ idClip }) {
  return (
    <svg className="ac-bot" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={idClip}>
          <ellipse cx="50" cy="60" rx="24" ry="19.5" />
        </clipPath>
      </defs>

      {/* Tornillos laterales (detrás de la cabeza) */}
      <circle cx="26.5" cy="60" r="4" fill="var(--forest)" />
      <circle cx="73.5" cy="60" r="4" fill="var(--forest)" />

      {/* Cabeza */}
      <ellipse cx="50" cy="60" rx="24" ry="19.5" fill="var(--surface-cream)" />

      {/* Visor: recortado por la cabeza para que siga su curva */}
      <g clipPath={`url(#${idClip})`}>
        <rect x="27" y="48.5" width="46" height="17.5" rx="8.75" fill="var(--ink)" />
      </g>

      {/* Ojos: el grupo abierto parpadea; el cerrado solo aparece durmiendo */}
      <g className="ac-bot__ojos">
        <g className="ac-bot__ojos-abiertos">
          <rect x="41" y="54.5" width="4" height="7" rx="2" fill="var(--lime)" />
          <rect x="55" y="54.5" width="4" height="7" rx="2" fill="var(--lime)" />
        </g>
        <g className="ac-bot__ojos-cerrados">
          <path d="M40.6 57.6 Q43 60.4 45.4 57.6" stroke="var(--lime)" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <path d="M54.6 57.6 Q57 60.4 59.4 57.6" stroke="var(--lime)" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        </g>
      </g>

      {/* Sombrero de campo, apenas ladeado como en la escena 3D */}
      <g transform="rotate(-4 50 41)">
        <path d="M32.5 41 L35.5 31 L64.5 31 L67.5 41 Z" fill="var(--lime-strong)" />
        <ellipse cx="50" cy="41" rx="33" ry="4.6" fill="var(--lime-strong)" />
        <rect x="32.8" y="37.6" width="34.4" height="3.2" rx="1.2" fill="var(--ink)" />

        {/* Antena con brote */}
        <g className="ac-bot__brote">
          <path d="M50 31 C50 27 49 24 50 21" stroke="var(--forest)" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <path d="M50 22 Q56 18 58 23 Q53 26 50 22 Z" fill="var(--lime-strong)" />
          <path d="M50 24 Q44 21 42 26 Q47 28 50 24 Z" fill="var(--lime-strong)" />
        </g>
      </g>

      {/* Escena idle "dormido": zzz subiendo. Oculta salvo en reposo. */}
      <g className="ac-bot__zzz">
        <text className="ac-bot__z" x="69" y="35" fontSize="12">z</text>
        <text className="ac-bot__z" x="77" y="28" fontSize="9.5">z</text>
        <text className="ac-bot__z" x="83.5" y="22" fontSize="7.5">z</text>
      </g>

      {/* Escena idle "plantando": un brote crece al pie del círculo. Oculta salvo en reposo. */}
      <g className="ac-bot__plantita">
        <path d="M50 93 C50 89 50 86 50 82" stroke="var(--forest)" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M50 85 Q45 82 43 86 Q47 88.5 50 85 Z" fill="var(--lime-strong)" />
        <path d="M50 82.5 Q55 79.5 57 83.5 Q53 86 50 82.5 Z" fill="var(--lime-strong)" />
      </g>
    </svg>
  )
}

function IconoCerrar({ tamanio = 22 }) {
  return (
    <svg viewBox="0 0 24 24" width={tamanio} height={tamanio} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}
