import { useState } from 'react'
import BotonMenu from '../components/BotonMenu.jsx'
import Button from '../components/Button.jsx'
import CatalogoHeader from '../components/CatalogoHeader.jsx'
import DataTable from '../components/DataTable.jsx'
import Dialog from '../components/Dialog.jsx'
import DialogError from '../components/DialogError.jsx'
import EstadoTag from '../components/EstadoTag.jsx'
import Field from '../components/Field.jsx'
import FormDialog from '../components/FormDialog.jsx'
import Mensaje from '../components/Mensaje.jsx'
import { useCrud } from '../hooks/useCrud.js'
import { laboresService } from '../services/labores.js'
import { parsearNumero, pesos } from '../utils/format.js'

// Catálogo de labores de mantenimiento: reutilizable entre campañas (Aplicar herbicida, Fertilizar…).
const FORM_VACIO = { descripcion: '', costeBase: '' }

const servicioCatalogo = {
  ...laboresService,
  listar: laboresService.listarTodas,
}

export default function LaboresCatalogoPage() {
  const crud = useCrud(servicioCatalogo)
  const [filtro, setFiltro] = useState('Activa')
  const [orden, setOrden] = useState('nombre')
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(FORM_VACIO)
  const [errores, setErrores] = useState({})
  const [errorApi, setErrorApi] = useState(null)
  const [aBaja, setABaja] = useState(null)
  const [errorBaja, setErrorBaja] = useState(null)
  const [aviso, setAviso] = useState('')

  const filas = crud.items
    .filter((labor) => filtro === 'todas' || labor.estado === filtro)
    .sort((a, b) => {
      if (orden === 'costo-mayor') return b.costeBase - a.costeBase
      if (orden === 'costo-menor') return a.costeBase - b.costeBase
      return a.descripcion.localeCompare(b.descripcion)
    })

  function abrir(labor) {
    setEditando(labor ?? {})
    setForm(labor ? { descripcion: labor.descripcion, costeBase: String(labor.costeBase) } : FORM_VACIO)
    setErrores({})
    setErrorApi(null)
  }

  async function guardar() {
    const e = {}
    if (!form.descripcion.trim()) e.descripcion = 'Escribí el nombre de la labor.'
    const costo = parsearNumero(form.costeBase)
    if (!Number.isFinite(costo) || costo < 0) e.costeBase = 'Costo de 0 o más.'
    setErrores(e)
    if (Object.keys(e).length) return

    try {
      await crud.guardar(editando.id, { descripcion: form.descripcion.trim(), costeBase: costo })
      setAviso(editando.id ? 'Labor actualizada.' : `«${form.descripcion.trim()}» agregada al catálogo.`)
      setEditando(null)
    } catch (err) {
      setErrorApi(err)
    }
  }

  async function confirmarBaja() {
    try {
      await crud.darDeBaja(aBaja.id)
      setAviso(`${aBaja.descripcion} pasó a Inactiva.`)
      setABaja(null)
    } catch (err) {
      setABaja(null)
      setErrorBaja(err)
    }
  }

  async function reactivar(labor) {
    try {
      await crud.reactivar(labor.id)
      setAviso(`${labor.descripcion} volvió a Activa.`)
    } catch (err) {
      setErrorBaja(err)
    }
  }

  return (
    <>
      <CatalogoHeader
        titulo="Labores de mantenimiento"
        bajada="Catálogo que se reutiliza en todas las campañas. El costo base se suma al costo de los insumos de cada labor."
        acciones={
          <Button variante="primary" enFondo onClick={() => abrir(null)}>
            Nueva labor
          </Button>
        }
      />

      <DataTable
        titulo={filtro === 'Inactiva' ? 'Labores dadas de baja' : 'Labores'}
        columnas={[
          { clave: 'descripcion', titulo: 'Labor' },
          { clave: 'costeBase', titulo: 'Costo base', num: true, render: (l) => pesos(l.costeBase) },
          { clave: 'estado', titulo: 'Estado', render: (l) => <EstadoTag estado={l.estado} /> },
          {
            clave: 'acciones',
            titulo: '',
            render: (l) => (
              <>
                <Button variante="outline" chico onClick={() => abrir(l)}>
                  Modificar
                </Button>
                {l.estado === 'Activa' ? (
                  <Button variante="outline" chico disabled={crud.guardando} onClick={() => setABaja(l)}>
                    Dar de baja
                  </Button>
                ) : (
                  <Button variante="outline" chico disabled={crud.guardando} onClick={() => reactivar(l)}>
                    Reactivar
                  </Button>
                )}
              </>
            ),
          },
        ]}
        filas={filas}
        cargando={crud.loading}
        error={crud.error}
        onReintentar={crud.recargar}
        vacio={
          crud.items.length === 0
            ? { titulo: 'El catálogo está vacío', texto: 'Cargá las labores habituales con "Nueva labor".' }
            : { titulo: 'Ninguna labor coincide con el filtro' }
        }
        herramientas={
          <>
            <BotonMenu
              etiqueta="Filtrar"
              titulo="Filtrar por estado"
              valor={filtro}
              onElegir={setFiltro}
              opciones={[
                { valor: 'Activa', etiqueta: 'Activas' },
                { valor: 'Inactiva', etiqueta: 'Inactivas' },
                { valor: 'todas', etiqueta: 'Todas' },
              ]}
            />
            <BotonMenu
              etiqueta="Ordenar"
              titulo="Ordenar por"
              valor={orden}
              onElegir={setOrden}
              opciones={[
                { valor: 'nombre', etiqueta: 'Nombre' },
                { valor: 'costo-mayor', etiqueta: 'Mayor costo' },
                { valor: 'costo-menor', etiqueta: 'Menor costo' },
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
          titulo={editando.id ? 'Modificar labor' : 'Nueva labor'}
          etiquetaGuardar={editando.id ? 'Guardar cambios' : 'Crear labor'}
          guardando={crud.guardando}
          error={errorApi}
          onGuardar={guardar}
          onCancelar={() => setEditando(null)}
        >
          <Field
            id="labor-descripcion"
            label="Labor"
            placeholder="Ej.: Aplicar herbicida"
            value={form.descripcion}
            onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
            error={errores.descripcion}
          />
          <div className="ac-form__fila">
            <Field
              id="labor-costo"
              label="Costo base ($)"
              inputMode="decimal"
              placeholder="Ej.: 45000"
              value={form.costeBase}
              onChange={(e) => setForm((f) => ({ ...f, costeBase: e.target.value }))}
              error={errores.costeBase}
            />
          </div>
        </FormDialog>
      )}

      {aBaja && (
        <Dialog
          titulo={`¿Dar de baja «${aBaja.descripcion}»?`}
          onCerrar={crud.guardando ? undefined : () => setABaja(null)}
          acciones={
            <>
              <Button variante="outline" disabled={crud.guardando} onClick={() => setABaja(null)}>
                No, volver
              </Button>
              <Button variante="primary" disabled={crud.guardando} onClick={confirmarBaja}>
                {crud.guardando ? 'Guardando…' : 'Sí, dar de baja'}
              </Button>
            </>
          }
        >
          <p className="ac-dialog__texto">
            Pasará a Inactiva y dejará de ofrecerse al registrar labores. No se elimina y podés reactivarla cuando quieras.
          </p>
        </Dialog>
      )}

      {errorBaja && <DialogError error={errorBaja} titulo="No se pudo cambiar el estado" onCerrar={() => setErrorBaja(null)} />}
    </>
  )
}
