import { useEffect, useState } from 'react'
import Button from '../components/Button.jsx'
import CatalogoHeader from '../components/CatalogoHeader.jsx'
import DataTable from '../components/DataTable.jsx'
import Field from '../components/Field.jsx'
import FormDialog from '../components/FormDialog.jsx'
import Mensaje from '../components/Mensaje.jsx'
import { useFetch } from '../hooks/useFetch.js'
import { usuariosService } from '../services/usuarios.js'

const FORM_INICIAL = { nombre: '', email: '', password: '', rolId: '' }

export default function UsuariosPage() {
  const usuarios = useFetch(usuariosService.listar, [])
  const [roles, setRoles] = useState([])
  const [cargandoRoles, setCargandoRoles] = useState(true)
  const [errorRoles, setErrorRoles] = useState(null)
  const [form, setForm] = useState(FORM_INICIAL)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)
  const [aviso, setAviso] = useState('')
  const [usuarioRestableciendo, setUsuarioRestableciendo] = useState(null)
  const [nuevaContrasena, setNuevaContrasena] = useState('')
  const [confirmacionContrasena, setConfirmacionContrasena] = useState('')
  const [errorRestablecer, setErrorRestablecer] = useState(null)
  const [restableciendo, setRestableciendo] = useState(false)

  useEffect(() => {
    let cancelado = false

    usuariosService.listarRoles()
      .then((resultado) => {
        if (cancelado) return
        if (!Array.isArray(resultado)) throw new Error('El servidor devolvió una lista de roles inválida.')
        setRoles(resultado)
      })
      .catch((err) => {
        if (!cancelado) setErrorRoles(err)
      })
      .finally(() => {
        if (!cancelado) setCargandoRoles(false)
      })

    return () => {
      cancelado = true
    }
  }, [])

  function actualizar(campo, valor) {
    setForm((actual) => ({ ...actual, [campo]: valor }))
    setError(null)
    setAviso('')
  }

  async function crearUsuario(evento) {
    evento.preventDefault()
    setError(null)
    setAviso('')
    setGuardando(true)

    try {
      await usuariosService.crear({
        nombre: form.nombre.trim(),
        email: form.email.trim(),
        password: form.password,
        rolId: Number(form.rolId),
      })
      setAviso(`El usuario ${form.nombre.trim()} fue creado.`)
      setForm({ ...FORM_INICIAL, rolId: form.rolId })
      usuarios.recargar()
    } catch (err) {
      setError(err)
    } finally {
      setGuardando(false)
    }
  }

  function abrirRestablecer(usuario) {
    setUsuarioRestableciendo(usuario)
    setNuevaContrasena('')
    setConfirmacionContrasena('')
    setErrorRestablecer(null)
  }

  async function restablecerContrasena() {
    setErrorRestablecer(null)
    if (!nuevaContrasena) {
      setErrorRestablecer(new Error('Ingresá una nueva contraseña.'))
      return
    }
    if (nuevaContrasena !== confirmacionContrasena) {
      setErrorRestablecer(new Error('Las contraseñas no coinciden.'))
      return
    }

    setRestableciendo(true)
    try {
      await usuariosService.restablecerContrasena(usuarioRestableciendo.id, nuevaContrasena)
      setAviso(`Se restableció la contraseña de ${usuarioRestableciendo.nombre}.`)
      setUsuarioRestableciendo(null)
    } catch (err) {
      setErrorRestablecer(err)
    } finally {
      setRestableciendo(false)
    }
  }

  return (
    <div className="ac-usuarios-page">
      <CatalogoHeader
        eyebrow="ADMINISTRACIÓN"
        titulo="Crear usuario"
        bajada="Dale acceso al equipo y asignale un rol para definir sus permisos."
      />

      <section className="ac-cream ac-cream--big ac-usuarios">
        <h2 className="ac-display display-s">Datos de la cuenta</h2>
        <p className="ac-usuarios__intro">Completá la información del nuevo usuario.</p>

        {errorRoles && (
          <Mensaje tipo="error" titulo="No se pudieron cargar los roles">
            {errorRoles.message}
          </Mensaje>
        )}
        {!cargandoRoles && !errorRoles && roles.length === 0 && (
          <Mensaje tipo="aviso" titulo="No hay roles disponibles">
            No se puede crear un usuario hasta que haya roles configurados.
          </Mensaje>
        )}
        {aviso && <Mensaje tipo="ok" titulo="Usuario creado">{aviso}</Mensaje>}
        {error && (
          <Mensaje tipo="error" titulo="No se pudo crear el usuario">
            {error.message}
          </Mensaje>
        )}

        <form className="ac-form ac-usuarios__form" onSubmit={crearUsuario}>
          <Field
            id="usuario-nombre"
            label="Nombre completo"
            placeholder="Ej.: María García"
            autoComplete="name"
            value={form.nombre}
            onChange={(evento) => actualizar('nombre', evento.target.value)}
            required
          />
          <Field
            id="usuario-email"
            label="Correo electrónico"
            type="email"
            placeholder="nombre@empresa.com"
            autoComplete="email"
            value={form.email}
            onChange={(evento) => actualizar('email', evento.target.value)}
            required
          />
          <Field
            id="usuario-password"
            label="Contraseña inicial"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(evento) => actualizar('password', evento.target.value)}
            required
          />
          <Field
            id="usuario-rol"
            label="Rol"
            as="select"
            value={form.rolId}
            onChange={(evento) => actualizar('rolId', evento.target.value)}
            disabled={cargandoRoles || roles.length === 0}
            required
            opciones={[
              { valor: '', etiqueta: cargandoRoles ? 'Cargando roles…' : 'Seleccioná un rol', deshabilitada: true },
              ...roles.map((rol) => ({ valor: String(rol.id), etiqueta: rol.descripcion })),
            ]}
          />

          <div className="ac-usuarios__acciones">
            <Button variante="lime" type="submit" disabled={guardando || cargandoRoles || roles.length === 0}>
              {guardando ? 'Creando…' : 'Crear usuario'}
            </Button>
          </div>
        </form>
      </section>

      <div className="ac-usuarios__tabla">
        <DataTable
          titulo="Usuarios"
          columnas={[
            { clave: 'nombre', titulo: 'Nombre' },
            { clave: 'email', titulo: 'Correo electrónico' },
            {
              clave: 'rol',
              titulo: 'Rol',
              render: (usuario) => usuario.rol?.descripcion ?? roles.find((rol) => rol.id === usuario.rolId)?.descripcion ?? '—',
            },
            {
              clave: 'acciones',
              titulo: '',
              render: (usuario) => (
                <Button variante="outline" chico onClick={() => abrirRestablecer(usuario)}>
                  Reiniciar contraseña
                </Button>
              ),
            },
          ]}
          filas={usuarios.data ?? []}
          cargando={usuarios.loading}
          error={usuarios.error}
          onReintentar={usuarios.recargar}
          vacio={{ titulo: 'Todavía no hay usuarios cargados' }}
        />
      </div>

      {usuarioRestableciendo && (
        <FormDialog
          titulo={`Reiniciar contraseña de ${usuarioRestableciendo.nombre}`}
          etiquetaGuardar="Reiniciar contraseña"
          guardando={restableciendo}
          error={errorRestablecer}
          onGuardar={restablecerContrasena}
          onCancelar={() => setUsuarioRestableciendo(null)}
        >
          <Field
            id="usuario-nueva-contrasena"
            label="Nueva contraseña"
            type="password"
            autoComplete="new-password"
            value={nuevaContrasena}
            onChange={(evento) => setNuevaContrasena(evento.target.value)}
            required
          />
          <Field
            id="usuario-confirmar-contrasena"
            label="Confirmar contraseña"
            type="password"
            autoComplete="new-password"
            value={confirmacionContrasena}
            onChange={(evento) => setConfirmacionContrasena(evento.target.value)}
            required
          />
        </FormDialog>
      )}
    </div>
  )
}
