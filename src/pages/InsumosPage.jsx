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
import { insumosService } from '../services/insumos.js'
import { cantidad, parsearNumero, pesos } from '../utils/format.js'

const FORM_VACIO = { nombre: '', stock: '', precioUnitario: '' }

const servicio = {
  listar: insumosService.listarTodas,
  crear: insumosService.crear,
  actualizar: insumosService.actualizar,
  darDeBaja: insumosService.darDeBaja,
  reactivar: insumosService.reactivar,
}

export default function InsumosPage() {
  const crud = useCrud(servicio)
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
    .filter((insumo) => filtro === 'todas' || insumo.estado === filtro)
    .sort((a, b) => {
      if (orden === 'stock-mayor') return b.stock - a.stock
      if (orden === 'stock-menor') return a.stock - b.stock
      return a.nombre.localeCompare(b.nombre)
    })

  function abrir(insumo) {
    setEditando(insumo ?? {})
    setForm(
      insumo
        ? { nombre: insumo.nombre, stock: String(insumo.stock), precioUnitario: String(insumo.precioUnitario) }
        : { ...FORM_VACIO },
    )
    setErrores({})
    setErrorApi(null)
  }

  function validar() {
    const e = {}
    if (!form.nombre.trim()) e.nombre = 'Indicá el nombre del insumo.'
    const stock = parsearNumero(form.stock)
    if (!Number.isInteger(stock) || stock < 0) e.stock = 'Cantidad entera, 0 o más.'
    const precio = parsearNumero(form.precioUnitario)
    if (Number.isNaN(precio) || precio < 0) e.precioUnitario = 'Precio de 0 o más.'
    setErrores(e)
    return Object.keys(e).length === 0
  }

  async function guardar() {
    if (!validar()) return
    const nombre = form.nombre.trim()
    try {
      await crud.guardar(editando.id, {
        nombre,
        stock: parsearNumero(form.stock),
        precioUnitario: parsearNumero(form.precioUnitario),
      })
      setAviso(editando.id ? `${nombre} actualizado.` : `${nombre} creado como Activo.`)
      setEditando(null)
    } catch (err) {
      setErrorApi(err)
    }
  }

  async function confirmarBaja() {
    try {
      await crud.darDeBaja(aBaja.id)
      setAviso(`${aBaja.nombre} pasó a Inactivo.`)
      setABaja(null)
    } catch (err) {
      setABaja(null)
      setErrorBaja(err)
    }
  }

  async function reactivar(insumo) {
    try {
      await crud.reactivar(insumo.id)
      setAviso(`${insumo.nombre} volvió a Activo.`)
    } catch (err) {
      setErrorBaja(err)
    }
  }

  const campo = (clave) => (e) => setForm((f) => ({ ...f, [clave]: e.target.value }))

  return (
    <>
      <CatalogoHeader
        titulo="Insumos"
        bajada="Administrá los productos consumidos en las labores y su stock disponible."
        acciones={
          <Button variante="primary" enFondo onClick={() => abrir(null)}>
            Nuevo insumo
          </Button>
        }
      />

      <DataTable
        titulo={filtro === 'Inactiva' ? 'Insumos dados de baja' : 'Insumos'}
        columnas={[
          { clave: 'nombre', titulo: 'Nombre' },
          { clave: 'stock', titulo: 'Stock', num: true, render: (i) => cantidad(i.stock) },
          { clave: 'precio', titulo: 'Precio unitario', num: true, render: (i) => pesos(i.precioUnitario) },
          { clave: 'estado', titulo: 'Estado', render: (i) => <EstadoTag estado={i.estado} /> },
          {
            clave: 'acciones',
            titulo: '',
            render: (i) => (
              <>
                <Button variante="outline" chico disabled={crud.guardando} onClick={() => abrir(i)}>
                  Modificar
                </Button>
                {i.estado === 'Activa' ? (
                  <Button variante="outline" chico disabled={crud.guardando} onClick={() => setABaja(i)}>
                    Dar de baja
                  </Button>
                ) : (
                  <Button variante="outline" chico disabled={crud.guardando} onClick={() => reactivar(i)}>
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
            ? { titulo: 'Todavía no hay insumos', texto: 'Cargá el primero con "Nuevo insumo".' }
            : { titulo: 'Ningún insumo coincide con el filtro' }
        }
        herramientas={
          <>
            <BotonMenu
              etiqueta="Filtrar"
              titulo="Filtrar por estado"
              valor={filtro}
              onElegir={setFiltro}
              opciones={[
                { valor: 'Activa', etiqueta: 'Activos' },
                { valor: 'Inactiva', etiqueta: 'Inactivos' },
                { valor: 'todas', etiqueta: 'Todos' },
              ]}
            />
            <BotonMenu
              etiqueta="Ordenar"
              titulo="Ordenar por"
              valor={orden}
              onElegir={setOrden}
              opciones={[
                { valor: 'nombre', etiqueta: 'Nombre' },
                { valor: 'stock-mayor', etiqueta: 'Mayor stock' },
                { valor: 'stock-menor', etiqueta: 'Menor stock' },
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
          titulo={editando.id ? `Modificar ${editando.nombre}` : 'Nuevo insumo'}
          etiquetaGuardar={editando.id ? 'Guardar cambios' : 'Crear insumo'}
          guardando={crud.guardando}
          error={errorApi}
          onGuardar={guardar}
          onCancelar={() => setEditando(null)}
        >
          <div className="ac-form__fila">
            <Field
              id="insumo-nombre"
              label="Nombre"
              placeholder="Ej.: Fertilizante"
              value={form.nombre}
              onChange={campo('nombre')}
              error={errores.nombre}
            />
            <Field
              id="insumo-stock"
              label="Stock"
              inputMode="numeric"
              placeholder="Ej.: 25"
              value={form.stock}
              onChange={campo('stock')}
              error={errores.stock}
            />
          </div>
          <Field
            id="insumo-precio"
            label="Precio unitario ($)"
            inputMode="decimal"
            placeholder="Ej.: 640000"
            value={form.precioUnitario}
            onChange={campo('precioUnitario')}
            error={errores.precioUnitario}
          />
        </FormDialog>
      )}

      {aBaja && (
        <Dialog
          titulo={`¿Dar de baja ${aBaja.nombre}?`}
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
            El insumo pasará a Inactivo y dejará de estar disponible. No se elimina y podés reactivarlo cuando quieras.
          </p>
        </Dialog>
      )}

      {errorBaja && <DialogError error={errorBaja} titulo="No se pudo cambiar el estado" onCerrar={() => setErrorBaja(null)} />}
    </>
  )
}
