import { useState } from 'react'
import BotonMenu from '../components/BotonMenu.jsx'
import Button from '../components/Button.jsx'
import CatalogoHeader from '../components/CatalogoHeader.jsx'
import DataTable from '../components/DataTable.jsx'
import EstadoTag from '../components/EstadoTag.jsx'
import Field from '../components/Field.jsx'
import FormDialog from '../components/FormDialog.jsx'
import Mensaje from '../components/Mensaje.jsx'
import PageHeader from '../components/PageHeader.jsx'
import { useCrud } from '../hooks/useCrud.js'
import { lotesService } from '../services/lotes.js'
import { cantidad, hectareas, parsearNumero } from '../utils/format.js'

// Catálogo de lotes (columna FA de la matriz CRUD: alta; los CUU leen y actualizan su estado).
const ESTADOS = ['Libre', 'En uso', 'Sembrado', 'Cosechado']
const FORM_VACIO = { nroLote: '', superficie: '', distanciaSurcos: '', zona: '' }

export default function LotesPage() {
  const crud = useCrud(lotesService)
  const [filtro, setFiltro] = useState('todos')
  const [orden, setOrden] = useState('nro')
  const [editando, setEditando] = useState(null) // null = cerrado; { id?: number } = abierto
  const [form, setForm] = useState(FORM_VACIO)
  const [errores, setErrores] = useState({})
  const [errorApi, setErrorApi] = useState(null)
  const [aviso, setAviso] = useState('')

  const filas = crud.items
    .filter((l) => filtro === 'todos' || l.estado === filtro)
    .sort((a, b) => {
      if (orden === 'sup-mayor') return b.superficie - a.superficie
      if (orden === 'sup-menor') return a.superficie - b.superficie
      return a.nroLote - b.nroLote
    })

  function abrir(lote) {
    setEditando(lote ?? {})
    setForm(
      lote
        ? { nroLote: String(lote.nroLote), superficie: String(lote.superficie), distanciaSurcos: String(lote.distanciaSurcos), zona: lote.zona }
        : FORM_VACIO,
    )
    setErrores({})
    setErrorApi(null)
  }

  function validar() {
    const e = {}
    const nro = parsearNumero(form.nroLote)
    if (!editando.id) {
      if (!Number.isInteger(nro) || nro <= 0) e.nroLote = 'Número entero mayor a 0.'
      else if (crud.items.some((l) => l.nroLote === nro)) e.nroLote = `Ya existe el Lote ${nro}.`
    }
    if (!(parsearNumero(form.superficie) > 0)) e.superficie = 'Superficie mayor a 0.'
    if (!(parsearNumero(form.distanciaSurcos) > 0)) e.distanciaSurcos = 'Distancia mayor a 0.'
    if (!form.zona.trim()) e.zona = 'Indicá la zona.'
    setErrores(e)
    return Object.keys(e).length === 0
  }

  async function guardar() {
    if (!validar()) return
    try {
      const datos = {
        nroLote: parsearNumero(form.nroLote),
        superficie: parsearNumero(form.superficie),
        distanciaSurcos: parsearNumero(form.distanciaSurcos),
        zona: form.zona.trim(),
      }
      await crud.guardar(editando.id, datos)
      setAviso(editando.id ? `Lote ${form.nroLote} actualizado.` : `Lote ${datos.nroLote} creado en estado Libre.`)
      setEditando(null)
    } catch (err) {
      setErrorApi(err)
    }
  }

  const campo = (clave) => (e) => setForm((f) => ({ ...f, [clave]: e.target.value }))

  return (
    <>
      <PageHeader
        lineas={['Catálogo', 'Lotes']}
        bajada="Superficie, distancia entre surcos y zona de cada lote. El estado lo cambian los casos de uso."
        dato={{
          rotulo: 'Lotes',
          valor: filas.loading ? '…' : filas.length,
          barras: filas.map((a) => ({ etiqueta: `L${a.nroLote}`, valor: Number(a.superficie) })),
          pie: hectareas(filas.reduce((t, a) => t + Number(a.superficie), 0)),
        }}
      />

      <CatalogoHeader
        acciones={
          <>
            <Button variante="outline" to="/lotes/asignar">
              Asignar lote
            </Button>
            <Button variante="primary" enFondo onClick={() => abrir(null)}>
              Nuevo lote
            </Button>
          </>
        }
      />

      <DataTable
        titulo="Todos los lotes"
        columnas={[
          { clave: 'nroLote', titulo: 'Lote', render: (l) => `Lote ${l.nroLote}` },
          { clave: 'zona', titulo: 'Zona' },
          { clave: 'superficie', titulo: 'Superficie', num: true, render: (l) => hectareas(l.superficie) },
          { clave: 'distanciaSurcos', titulo: 'Dist. surcos', num: true, render: (l) => cantidad(l.distanciaSurcos) },
          { clave: 'estado', titulo: 'Estado', render: (l) => <EstadoTag estado={l.estado} /> },
          {
            clave: 'acciones',
            titulo: '',
            render: (l) => (
              <Button variante="outline" chico onClick={() => abrir(l)}>
                Modificar
              </Button>
            ),
          },
        ]}
        filas={filas}
        cargando={crud.loading}
        error={crud.error}
        onReintentar={crud.recargar}
        vacio={
          crud.items.length === 0
            ? { titulo: 'Todavía no hay lotes', texto: 'Cargá el primero con "Nuevo lote".' }
            : { titulo: 'Ningún lote con ese estado' }
        }
        herramientas={
          <>
            <BotonMenu
              etiqueta="Filtrar"
              titulo="Filtrar por estado"
              valor={filtro}
              onElegir={setFiltro}
              opciones={[{ valor: 'todos', etiqueta: 'Todos' }, ...ESTADOS.map((e) => ({ valor: e, etiqueta: e }))]}
            />
            <BotonMenu
              etiqueta="Ordenar"
              titulo="Ordenar por"
              valor={orden}
              onElegir={setOrden}
              opciones={[
                { valor: 'nro', etiqueta: 'Número de lote' },
                { valor: 'sup-mayor', etiqueta: 'Mayor superficie' },
                { valor: 'sup-menor', etiqueta: 'Menor superficie' },
              ]}
            />
          </>
        }
      >
        {aviso && (
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <Mensaje tipo="ok" titulo={aviso} />
          </div>
        )}
      </DataTable>

      {editando && (
        <FormDialog
          titulo={editando.id ? `Modificar Lote ${editando.nroLote}` : 'Nuevo lote'}
          etiquetaGuardar={editando.id ? 'Guardar cambios' : 'Crear lote'}
          guardando={crud.guardando}
          error={errorApi}
          onGuardar={guardar}
          onCancelar={() => setEditando(null)}
        >
          <div className="ac-form__fila">
            <Field
              id="lote-nro"
              label="Número de lote"
              inputMode="numeric"
              value={form.nroLote}
              onChange={campo('nroLote')}
              disabled={Boolean(editando.id)}
              error={errores.nroLote}
              ayuda={editando.id ? 'El número no se puede cambiar.' : undefined}
            />
            <Field id="lote-zona" label="Zona" placeholder="Ej.: Marcos Paz" value={form.zona} onChange={campo('zona')} error={errores.zona} />
          </div>
          <div className="ac-form__fila">
            <Field
              id="lote-superficie"
              label="Superficie (ha)"
              inputMode="decimal"
              placeholder="Ej.: 16,5"
              value={form.superficie}
              onChange={campo('superficie')}
              error={errores.superficie}
            />
            <Field
              id="lote-surcos"
              label="Distancia entre surcos"
              inputMode="decimal"
              placeholder="Ej.: 52"
              value={form.distanciaSurcos}
              onChange={campo('distanciaSurcos')}
              error={errores.distanciaSurcos}
            />
          </div>
        </FormDialog>
      )}
    </>
  )
}
