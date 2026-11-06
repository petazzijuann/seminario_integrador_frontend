import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../services/api.js'
import { guardarSesion } from '../services/auth.js'

export default function LoginPage() {
  const [mostrarContrasena, setMostrarContrasena] = useState(false)
  const [recordar, setRecordar] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()

  async function alEnviar(evento) {
    evento.preventDefault()
    setError('')
    setCargando(true)

    const formulario = new FormData(evento.currentTarget)
    const email = String(formulario.get('email') ?? '').trim()
    const password = String(formulario.get('password') ?? '')

    try {
      const sesion = await api.post('/usuario/login', { email, password })
      if (!sesion?.token || !sesion?.usuario?.email || sesion?.usuario?.rolId == null) {
        throw new Error('El servidor no devolvió una sesión válida.')
      }

      guardarSesion(sesion, recordar)
      const destino = location.state?.from?.pathname ?? '/'
      navigate(destino, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <main className="ac-login">
      <section className="ac-login__presentacion" aria-label="AgroControl">
        <Link className="ac-login__marca" to="/" aria-label="AgroControl, inicio">
          <span className="ac-login__marca-icono" aria-hidden="true">
            <svg viewBox="0 0 40 40" fill="none">
              <path d="M7 29.5 18.5 18 30 29.5" />
              <path d="m12 30 9-9 9 9" />
              <path d="M20 20c0-6.1 4.1-10.2 11-11-1 6.8-4.9 10.8-11 11Z" />
              <path d="M20 20v11" />
            </svg>
          </span>
          <span>AgroControl</span>
        </Link>

        <div className="ac-login__mensaje">
          <p className="ac-eyebrow">GESTIÓN AGRÍCOLA, MÁS SIMPLE</p>
          <h1 className="ac-display">
            Cada campaña,
            <br />
            <span>en buenas manos.</span>
          </h1>
          <p className="ac-login__descripcion">
            Toda la información de tu campo, conectada en un solo lugar.
          </p>
        </div>

        <div className="ac-login__ilustracion" aria-hidden="true">
          <svg viewBox="0 0 580 260" fill="none" preserveAspectRatio="xMidYMid meet">
            <circle className="ac-login__sol" cx="452" cy="55" r="25" />
            <path className="ac-login__campo ac-login__campo--uno" d="M-8 197c97-74 187-69 274-16s172 49 322-28" />
            <path className="ac-login__campo ac-login__campo--dos" d="M-8 224c97-74 187-69 274-16s172 49 322-28" />
            <path className="ac-login__campo ac-login__campo--tres" d="M-8 251c97-74 187-69 274-16s172 49 322-28" />
            <path className="ac-login__surco" d="M67 198c36-26 72-36 108-36m-94 62c43-29 86-37 124-32m152 42c41 7 82 3 127-13m-111 39c42 6 85 1 133-15" />
            <path className="ac-login__planta" d="M278 168v-42m0 22c-16-2-24-11-25-25 15 0 24 8 25 25Zm0-9c14-2 22-10 23-22-14 0-22 8-23 22Z" />
          </svg>
          <div className="ac-login__dato">
            <span className="ac-eyebrow">TU CAMPO, EN FOCO</span>
            <span className="ac-login__dato-texto">Decisiones con perspectiva.</span>
          </div>
        </div>

        <p className="ac-login__pie">Una mirada clara para hacer crecer lo que importa.</p>
      </section>

      <section className="ac-login__acceso" aria-labelledby="login-titulo">
        <div className="ac-login__tarjeta ac-cream ac-float">
          <span className="ac-login__etiqueta ac-eyebrow">TU ESPACIO DE TRABAJO</span>
          <h2 id="login-titulo" className="ac-display">Qué bueno verte.</h2>
          <p className="ac-login__intro">Ingresá tus datos para continuar.</p>

          <form className="ac-login__form" onSubmit={alEnviar}>
            <div className="ac-field">
              <label htmlFor="login-email">Correo electrónico</label>
              <input
                className="ac-input"
                id="login-email"
                name="email"
                type="email"
                placeholder="nombre@empresa.com"
                autoComplete="username"
                required
              />
            </div>

            <div className="ac-field">
              <label htmlFor="login-contrasena">Contraseña</label>
              <div className="ac-login__contrasena">
                <input
                  className="ac-input"
                  id="login-contrasena"
                  name="password"
                  type={mostrarContrasena ? 'text' : 'password'}
                  placeholder="Ingresá tu contraseña"
                  autoComplete="current-password"
                  required
                />
                <button
                  className="ac-login__ver"
                  type="button"
                  aria-label={mostrarContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={mostrarContrasena}
                  onClick={() => setMostrarContrasena((visible) => !visible)}
                >
                  {mostrarContrasena ? 'Ocultar' : 'Ver'}
                </button>
              </div>
            </div>

            <label className="ac-login__recordar">
              <input
                type="checkbox"
                name="recordar"
                checked={recordar}
                onChange={(evento) => setRecordar(evento.target.checked)}
              />
              <span>Recordarme en este dispositivo</span>
            </label>

            {error && (
              <p className="ac-login__error" role="alert">
                {error}
              </p>
            )}

            <button className="ac-btn ac-btn--primary ac-login__enviar" type="submit" disabled={cargando}>
              {cargando ? 'Ingresando…' : 'Ingresar'}
              <span aria-hidden="true">→</span>
            </button>
          </form>

        </div>
        <p className="ac-login__legal">AgroControl <span>·</span> Gestión que echa raíces.</p>
      </section>
    </main>
  )
}
