import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

// Ficha: components/Chatbot.md
// Robot agro 3D del chatbot, armado solo con geometrías de Three.js (sin modelos externos).
// Se carga lazy desde Chatbot.jsx, así three y fiber quedan fuera del bundle inicial.
// activo: false pausa el render loop (chat cerrado). reaccion: un número que cambia en cada mensaje enviado.
// reducido: prefers-reduced-motion; deja al robot quieto y solo ilumina los ojos al reaccionar.

// Los colores salen de los tokens de tokens.css (se leen del DOM para respetar el tema activo).
const TOKENS = {
  cuerpo: '--surface-cream',
  visor: '--ink',
  ojos: '--lime',
  acento: '--forest',
  sombrero: '--lime-strong',
  hoja: '--lime-strong',
  tallo: '--forest',
  luzFria: '--steel-soft',
}

function leerColores(elemento) {
  const estilos = getComputedStyle(elemento)
  return Object.fromEntries(
    Object.entries(TOKENS).map(([clave, variable]) => [clave, estilos.getPropertyValue(variable).trim() || '#ffffff']),
  )
}

export default function RobotAgro({ activo, reaccion, reducido }) {
  const contenedor = useRef(null)
  const [colores, setColores] = useState(null)

  useLayoutEffect(() => {
    setColores(leerColores(contenedor.current))
  }, [])

  return (
    <div ref={contenedor} className="ac-chat__canvas" aria-hidden="true">
      {colores && (
        <Canvas
          frameloop={activo ? 'always' : 'never'}
          dpr={[1, 2]}
          flat
          gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
          camera={{ position: [0, 0.15, 5.6], fov: 35 }}
        >
          <Escena colores={colores} reaccion={reaccion} reducido={reducido} />
        </Canvas>
      )}
    </div>
  )
}

// Hoja con forma de gota, para el brote de la antena.
function crearFormaHoja() {
  const forma = new THREE.Shape()
  forma.moveTo(0, 0)
  forma.quadraticCurveTo(0.14, 0.06, 0.24, 0.0)
  forma.quadraticCurveTo(0.14, -0.08, 0, 0)
  return forma
}

function Escena({ colores, reaccion, reducido }) {
  const raiz = useRef(null)
  const cabeza = useRef(null)
  const brote = useRef(null)
  const brazoDer = useRef(null)
  const brazoIzq = useRef(null)
  const ojos = useRef([])
  const sombra = useRef(null)

  // Mouse en coordenadas normalizadas (-1..1) de toda la ventana, no solo del canvas.
  const mouse = useRef({ x: 0, y: 0 })
  const inicioReaccion = useRef(-10)
  const proximoParpadeo = useRef(2)
  const reloj = useRef(0)

  const materiales = useMemo(() => {
    const estandar = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.05, ...extra })
    return {
      cuerpo: estandar(colores.cuerpo, { roughness: 0.35 }),
      visor: estandar(colores.visor, { roughness: 0.15, metalness: 0.4 }),
      ojos: new THREE.MeshStandardMaterial({ color: colores.ojos, emissive: colores.ojos, emissiveIntensity: 1.1, roughness: 0.3 }),
      acento: estandar(colores.acento),
      sombrero: estandar(colores.sombrero, { roughness: 0.7 }),
      cinta: estandar(colores.visor, { roughness: 0.6 }),
      hoja: estandar(colores.hoja, { side: THREE.DoubleSide, roughness: 0.55 }),
      tallo: estandar(colores.tallo),
      sombra: new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.22, depthWrite: false }),
    }
  }, [colores])

  const formaHoja = useMemo(() => crearFormaHoja(), [])

  useEffect(() => {
    const alMover = (e) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1
      mouse.current.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', alMover, { passive: true })
    return () => window.removeEventListener('pointermove', alMover)
  }, [])

  // Cada mensaje enviado dispara la reacción (salto + saludo + ojos que se iluminan).
  useEffect(() => {
    if (reaccion > 0) inicioReaccion.current = reloj.current
  }, [reaccion])

  // Al desmontar: fiber libera solo las geometrías declaradas en JSX y el renderer (dispose + forceContextLoss).
  // Los materiales son compartidos (se pasan por prop), así que esos los liberamos acá.
  useEffect(() => {
    return () => {
      Object.values(materiales).forEach((material) => material.dispose())
    }
  }, [materiales])

  useFrame((_, delta) => {
    reloj.current += Math.min(delta, 0.1)
    const t = reloj.current
    const r = t - inicioReaccion.current // segundos desde el último mensaje

    // Flotación suave + salto al reaccionar
    const flotacion = reducido ? 0 : Math.sin(t * 1.6) * 0.07
    const salto = !reducido && r >= 0 && r < 0.6 ? Math.sin((r / 0.6) * Math.PI) * 0.35 : 0
    if (raiz.current) {
      raiz.current.position.y = flotacion + salto
      raiz.current.rotation.y = reducido ? 0 : Math.sin(t * 0.5) * 0.08
    }
    if (sombra.current) {
      const escala = 1 - (flotacion + salto) * 0.9
      sombra.current.scale.set(escala, escala, 1)
      sombra.current.material.opacity = 0.22 * escala
    }

    // Cabeza siguiendo al mouse, con suavizado
    if (cabeza.current) {
      const objetivoY = reducido ? 0 : mouse.current.x * 0.45
      const objetivoX = reducido ? 0 : mouse.current.y * 0.25
      cabeza.current.rotation.y = THREE.MathUtils.damp(cabeza.current.rotation.y, objetivoY, 6, delta)
      cabeza.current.rotation.x = THREE.MathUtils.damp(cabeza.current.rotation.x, objetivoX, 6, delta)
    }

    // Brote meciéndose
    if (brote.current) {
      brote.current.rotation.z = reducido ? 0 : Math.sin(t * 2.2) * 0.18
      brote.current.rotation.x = reducido ? 0 : Math.sin(t * 1.3 + 1) * 0.08
    }

    // Brazos: balanceo leve y saludo con el derecho al reaccionar
    if (brazoIzq.current) brazoIzq.current.rotation.z = reducido ? 0.15 : 0.15 + Math.sin(t * 1.6) * 0.05
    if (brazoDer.current) {
      let giro = reducido ? -0.15 : -0.15 - Math.sin(t * 1.6) * 0.05
      if (!reducido && r >= 0 && r < 1.4) {
        const subida = Math.sin(Math.min(r / 1.4, 1) * Math.PI) // sube y baja
        giro = THREE.MathUtils.lerp(giro, -2.5 + Math.sin(r * 14) * 0.3, subida)
      }
      brazoDer.current.rotation.z = giro
    }

    // Parpadeo cada 2-5 s y ojos que se iluminan al reaccionar
    let escalaOjo = 1
    if (t > proximoParpadeo.current) {
      const fase = (t - proximoParpadeo.current) / 0.16
      if (fase >= 1) proximoParpadeo.current = t + 2 + Math.random() * 3
      else escalaOjo = Math.max(0.1, Math.abs(Math.cos(fase * Math.PI)))
    }
    const brillo = r >= 0 && r < 1.2 ? Math.sin((r / 1.2) * Math.PI) : 0
    // El material de los ojos se toca vía la ref del mesh (es el mismo que el de la luz del pecho)
    if (ojos.current[0]) ojos.current[0].material.emissiveIntensity = 1.1 + brillo * 2.4
    ojos.current.forEach((ojo) => {
      if (ojo) ojo.scale.set(1 + brillo * 0.25, escalaOjo * (1 + brillo * 0.25), 1)
    })
  })

  return (
    <>
      <hemisphereLight args={[colores.cuerpo, colores.visor, 0.9]} />
      <directionalLight position={[3, 4, 5]} intensity={2.2} />
      <directionalLight position={[-4, 2, -3]} intensity={1.4} color={colores.luzFria} />
      <pointLight position={[0, 0.5, 2.5]} intensity={0.6} color={colores.ojos} />

      <mesh ref={sombra} position={[0, -1.55, 0]} rotation-x={-Math.PI / 2} material={materiales.sombra}>
        <circleGeometry args={[0.75, 40]} />
      </mesh>

      <group ref={raiz}>
        {/* Cuerpo */}
        <mesh position={[0, -0.78, 0]} material={materiales.cuerpo}>
          <capsuleGeometry args={[0.5, 0.32, 12, 32]} />
        </mesh>
        {/* Panel del pecho con una luz */}
        <mesh position={[0, -0.72, 0.46]} rotation-x={Math.PI / 2} material={materiales.acento}>
          <cylinderGeometry args={[0.2, 0.2, 0.06, 32]} />
        </mesh>
        <mesh position={[0, -0.72, 0.5]} material={materiales.ojos}>
          <sphereGeometry args={[0.07, 20, 16]} />
        </mesh>

        {/* Brazos (el grupo es el hombro, así rotan desde ahí) */}
        <group ref={brazoIzq} position={[-0.52, -0.5, 0]}>
          <mesh position={[-0.06, -0.26, 0]} material={materiales.cuerpo}>
            <capsuleGeometry args={[0.1, 0.3, 8, 16]} />
          </mesh>
          <mesh position={[-0.06, -0.52, 0]} material={materiales.acento}>
            <sphereGeometry args={[0.11, 20, 16]} />
          </mesh>
        </group>
        <group ref={brazoDer} position={[0.52, -0.5, 0]}>
          <mesh position={[0.06, -0.26, 0]} material={materiales.cuerpo}>
            <capsuleGeometry args={[0.1, 0.3, 8, 16]} />
          </mesh>
          <mesh position={[0.06, -0.52, 0]} material={materiales.acento}>
            <sphereGeometry args={[0.11, 20, 16]} />
          </mesh>
        </group>

        {/* Cuello */}
        <mesh position={[0, -0.15, 0]} material={materiales.acento}>
          <cylinderGeometry args={[0.16, 0.2, 0.16, 24]} />
        </mesh>

        {/* Cabeza */}
        <group ref={cabeza} position={[0, 0.38, 0]}>
          <mesh scale={[1.12, 0.9, 1]} material={materiales.cuerpo}>
            <sphereGeometry args={[0.6, 48, 32]} />
          </mesh>
          {/* Visor: casquete de esfera al frente */}
          <mesh scale={[1.12, 0.9, 1]} material={materiales.visor}>
            <sphereGeometry args={[0.612, 48, 24, Math.PI / 2 - 0.95, 1.9, Math.PI / 2 - 0.5, 1.0]} />
          </mesh>
          {/* Ojos */}
          {[-0.2, 0.2].map((x, i) => (
            <mesh
              key={x}
              ref={(el) => {
                ojos.current[i] = el
              }}
              position={[x, 0.03, 0.585]}
              material={materiales.ojos}
            >
              <capsuleGeometry args={[0.055, 0.08, 6, 16]} />
            </mesh>
          ))}
          {/* Tornillos laterales */}
          {[-0.68, 0.68].map((x) => (
            <mesh key={x} position={[x, 0, 0]} rotation-z={Math.PI / 2} material={materiales.acento}>
              <cylinderGeometry args={[0.12, 0.12, 0.08, 24]} />
            </mesh>
          ))}

          {/* Sombrerito de campo */}
          <group position={[0, 0.48, 0]} rotation={[-0.08, 0, 0.1]}>
            <mesh material={materiales.sombrero}>
              <cylinderGeometry args={[0.92, 0.95, 0.04, 48]} />
            </mesh>
            <mesh position={[0, 0.15, 0]} material={materiales.sombrero}>
              <cylinderGeometry args={[0.4, 0.5, 0.28, 40]} />
            </mesh>
            <mesh position={[0, 0.06, 0]} material={materiales.cinta}>
              <cylinderGeometry args={[0.495, 0.505, 0.08, 40]} />
            </mesh>

            {/* Antena con un brote */}
            <group ref={brote} position={[0, 0.28, 0]}>
              <mesh position={[0, 0.14, 0]} material={materiales.tallo}>
                <cylinderGeometry args={[0.025, 0.035, 0.28, 12]} />
              </mesh>
              <mesh position={[0, 0.28, 0]} rotation={[0, 0, 0.5]} material={materiales.hoja}>
                <shapeGeometry args={[formaHoja]} />
              </mesh>
              <mesh position={[0, 0.25, 0]} rotation={[0, Math.PI, 0.6]} material={materiales.hoja}>
                <shapeGeometry args={[formaHoja]} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </>
  )
}
