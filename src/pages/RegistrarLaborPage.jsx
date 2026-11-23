import { useState } from 'react'
import BotonMenu from '../components/BotonMenu.jsx'
import Button from '../components/Button.jsx'
import CampoCelda from '../components/CampoCelda.jsx'
import DataTable from '../components/DataTable.jsx'
import Dialog from '../components/Dialog.jsx'
import DialogCancelar from '../components/DialogCancelar.jsx'
import DialogError from '../components/DialogError.jsx'
import EstadoCarga from '../components/EstadoCarga.jsx'
import Field from '../components/Field.jsx'
import Mensaje from '../components/Mensaje.jsx'
import PageHeader from '../components/PageHeader.jsx'
import Panel from '../components/Panel.jsx'
import Stepper from '../components/Stepper.jsx'
import TablaEditable from '../components/TablaEditable.jsx'
import { useFetch } from '../hooks/useFetch.js'
import { insumosService } from '../services/insumos.js'
import { laboresService } from '../services/labores.js'
import { mantenimientosService } from '../services/mantenimientos.js'
import { cantidad as formatoCantidad, fecha, hectareas, hoyISO, nombreCampania, parsearNumero, pesos } from '../utils/format.js'

// CUU3 – Registrar labor
const PASOS = ['Seleccionar lote', 'Seleccionar labor', 'Cargar insumos', 'Confirmar labor']
const FILA_VACIA = { insumoId: '', cantidad: '' }

export default function RegistrarLaborPage() {
  const lotes = useFetch(mantenimientosService.lotesDisponibles, [])
  const labores = useFetch(laboresService.listar, [])
  const insumos = useFetch(insumosService.listarActivos, [])

  const [paso, setPaso] = useState(0)
  const [asignacion, setAsignacion] = useState(null)
  const [labor, setLabor] = useState(null)
  const [filas, setFilas] = useState([])
  const [fechaLabor, setFechaLabor] = useState(hoyISO())
  const [intentoSeguir, setIntentoSeguir] = useState(false)
  const [orden, setOrden] = useState('sup-mayor')

  const [nuevaLabor, setNuevaLabor] = useState({ descripcion: '', costo: '' })
  const [erroresLabor, setErroresLabor] = useState({})
  const [guardandoLabor, setGuardandoLabor] = useState(false)

  const [dialogo, setDialogo] = useState(null) // 'nuevaLabor' | 'confirmar' | 'cancelar' | 'ok' | 'error'
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState(null)

  const listaLotes = [...(lotes.data ?? [])].sort((a, b) =>
    orden === 'sup-menor' ? a.lote.superficie - b.lote.superficie : b.lote.superficie - a.lote.superficie,
  )
  const listaInsumos = insumos.data ?? []
  const lote = asignacion?.lote
  const semilla = asignacion?.semilla

  // Validación de stock en memoria (paso 4 del CUU): se suma lo pedido por insumo y se compara con su stock.
  const pedidoPorInsumo = {}
  for (const f of filas) {
    const cant = parsearNumero(f.cantidad)
    if (f.insumoId && Number.isInteger(cant) && cant > 0) {
      pedidoPorInsumo[f.insumoId] = (pedidoPorInsumo[f.insumoId] ?? 0) + cant
    }
  }

  const detalle = filas.map((f) => {
    const insumo = listaInsumos.find((i) => String(i.id) === String(f.insumoId))
    const cant = parsearNumero(f.cantidad)
    const cantidadValida = Number.isInteger(cant) && cant > 0
    const errores = {}
    if (!insumo) errores.insumo = 'Elegí un insumo.'
    if (!cantidadValida) errores.cantidad = 'Cantidad entera mayor a 0.'
    const sinStock = insumo && cantidadValida && pedidoPorInsumo[f.insumoId] > Number(insumo.stock)
    return {
      ...f,
      insumo,
      cant,
      subtotal: insumo && cantidadValida ? cant * Number(insumo.precioUnitario) : 0,
      errores,
      sinStock,
    }
  })

  const insumosSinStock = [...new Set(detalle.filter((d) => d.sinStock).map((d) => d.insumo.nombre))]
  const hayErroresFormato = detalle.some((d) => Object.keys(d.errores).length > 0)
  const costoInsumos = detalle.reduce((t, d) => t + d.subtotal, 0)
  const costoBase = Number(labor?.costeBase ?? 0)

  function reiniciar() {
    setPaso(0)
    setAsignacion(null)
    setLabor(null)
    setFilas([])
    setFechaLabor(hoyISO())
    setIntentoSeguir(false)
    setDialogo(null)
  }

  function cambiarFila(indice, campo, valor) {
    setFilas((lista) => lista.map((f, i) => (i === indice ? { ...f, [campo]: valor } : f)))
  }

  function seguirAConfirmar() {
    setIntentoSeguir(true)
    if (hayErroresFormato || insumosSinStock.length > 0 || !fechaLabor) return
    setPaso(3)
  }

  async function crearLabor() {
    const errores = {}
    if (!nuevaLabor.descripcion.trim()) errores.descripcion = 'Escribí el nombre de la labor.'
    const costo = parsearNumero(nuevaLabor.costo)
    if (Number.isNaN(costo) || costo < 0) errores.costo = 'Ingresá un costo de 0 o más.'
    setErroresLabor(errores)
    if (Object.keys(errores).length) return

    setGuardandoLabor(true)
    try {
      const creada = await laboresService.crear({ descripcion: nuevaLabor.descripcion.trim(), costeBase: costo })
      setLabor(creada)
      setNuevaLabor({ descripcion: '', costo: '' })
      setDialogo(null)
      labores.recargar()
    } catch (err) {
      setErroresLabor({ general: err.message })
    } finally {
      setGuardandoLabor(false)
    }
  }

  async function registrar() {
    setEnviando(true)
    try {
      const respuesta = await mantenimientosService.registrar({
        loteSemillaCampaniaId: asignacion.id,
        laborId: labor.id,
        fecha: fechaLabor,
        insumos: detalle.map((d) => ({ insumoId: Number(d.insumoId), cantidad: d.cant })),
      })
      setResultado({ lote: lote.nroLote, labor: labor.descripcion, total: respuesta.costoTotal, campania: nombreCampania(asignacion.campania?.fecha) })
      setDialogo('ok')
    } catch (err) {
      setError(err)
      setDialogo('error')
    } finally {
      setEnviando(false)
    }
  }

  function cerrarExito() {
    reiniciar()
    lotes.recargar()
    insumos.recargar()
  }

  function cerrarError() {
    setDialogo(null)
    if (error?.status === 400) {
      // Stock insuficiente u otro dato inválido: se refresca el stock y se vuelve a los insumos.
      insumos.recargar()
      setPaso(2)
    } else if (error?.status === 409 || error?.status === 404) {
      reiniciar()
      lotes.recargar()
    }
  }

  const lateral = asignacion ? (
    <>
      <Panel
        titulo="Detalle campaña"
        estado={`Lote ${lote.nroLote}`}
        filas={[
          { rotulo: 'Zona', valor: lote.zona, texto: true },
          { rotulo: 'Superficie', valor: hectareas(lote.superficie) },
          { rotulo: 'Semilla', valor: semilla.nombre, texto: true },
          { rotulo: 'Estación', valor: semilla.estacion, texto: true },
          { rotulo: 'Campaña', valor: nombreCampania(asignacion.campania?.fecha), ancho: true },
        ]}
      />
      {paso >= 2 && labor && (
        <Panel
          titulo="Costos"
          estado={labor.descripcion}
          variante="surface"
          filas={[
            { rotulo: 'Insumos', valor: pesos(costoInsumos) },
            { rotulo: 'Costo base', valor: pesos(costoBase) },
            { rotulo: 'Total', valor: pesos(costoInsumos + costoBase), destacado: true, ancho: true },
          ]}
        />
      )}
    </>
  ) : (
    <Panel titulo="Sin lote" estado="Paso 1" variante="surface">
      <p className="small" style={{ margin: 0 }}>
        Elegí el lote sembrado donde se hizo la labor.
      </p>
    </Panel>
  )

  return (
    <>
      <PageHeader
        lineas={['Registrar', 'labor']}
        bajada="Elegí el lote sembrado, la labor y los insumos que usaste. El costo se imputa a la campaña al confirmar."
        dato={{
          rotulo: 'Lotes sembrados',
          valor: lotes.loading ? '…' : listaLotes.length,
          barras: listaLotes.map((a) => ({ etiqueta: `L${a.lote.nroLote}`, valor: Number(a.lote.superficie) })),
          pie: 'Con campaña abierta',
        }}
      />

      <div className="ac-steps-wrap">
        <Stepper pasos={PASOS} actual={paso} onIr={setPaso} />
      </div>

      <div className="ac-cuerpo">
        <div className="ac-cuerpo__lateral">{lateral}</div>

        {paso === 0 && (
          <DataTable
            titulo="Lotes sembrados"
            columnas={[
              { clave: 'lote', titulo: 'Lote', render: (a) => `Lote ${a.lote.nroLote}` },
              { clave: 'zona', titulo: 'Zona', render: (a) => a.lote.zona },
              { clave: 'cultivo', titulo: 'Cultivo', render: (a) => a.semilla.nombre },
              { clave: 'superficie', titulo: 'Superficie', num: true, render: (a) => hectareas(a.lote.superficie) },
            ]}
            filas={listaLotes}
            seleccionadaId={asignacion?.id}
            onSeleccionar={(a) => {
              if (a.id !== asignacion?.id) {
                setLabor(null)
                setFilas([])
              }
              setAsignacion(a)
            }}
            cargando={lotes.loading}
            error={lotes.error}
            onReintentar={lotes.recargar}
            vacio={{
              titulo: 'No hay lotes sembrados con campaña activa',
              texto: 'Las labores se registran sobre lotes en estado Sembrado. Registrá primero una siembra.',
              accion: (
                <Button variante="outline" to="/siembras">
                  Registrar siembra
                </Button>
              ),
            }}
            herramientas={
              <BotonMenu
                etiqueta="Ordenar"
                titulo="Ordenar por"
                valor={orden}
                onElegir={setOrden}
                opciones={[
                  { valor: 'sup-mayor', etiqueta: 'Mayor superficie' },
                  { valor: 'sup-menor', etiqueta: 'Menor superficie' },
                ]}
              />
            }
            acciones={
              <>
                <Button variante="outline" onClick={() => (asignacion ? setDialogo('cancelar') : reiniciar())}>
                  Cancelar
                </Button>
                <Button variante="lime" disabled={!asignacion} onClick={() => setPaso(1)}>
                  Seleccionar
                </Button>
              </>
            }
          />
        )}

        {paso === 1 && (
          <DataTable
            titulo="Labores"
            columnas={[
              { clave: 'descripcion', titulo: 'Labor' },
              { clave: 'costeBase', titulo: 'Costo base', num: true, render: (l) => pesos(l.costeBase) },
            ]}
            filas={labores.data ?? []}
            seleccionadaId={labor?.id}
            onSeleccionar={setLabor}
            cargando={labores.loading}
            error={labores.error}
            onReintentar={labores.recargar}
            vacio={{ titulo: 'No hay labores cargadas', texto: 'Creá la primera con "Nueva labor".' }}
            herramientas={
              <Button variante="outline" onClick={() => setDialogo('nuevaLabor')}>
                Nueva labor
              </Button>
            }
            acciones={
              <>
                <Button variante="outline" onClick={() => setDialogo('cancelar')}>
                  Cancelar
                </Button>
                <Button
                  variante="lime"
                  disabled={!labor}
                  onClick={() => {
                    if (filas.length === 0) setFilas([{ ...FILA_VACIA }])
                    setPaso(2)
                  }}
                >
                  Seleccionar
                </Button>
              </>
            }
          />
        )}

        {paso === 2 && (
          <section className="ac-cream ac-cream--big">
            <div className="ac-toolbar">
              <h2 className="ac-display display-m">Insumos utilizados</h2>
              <Button variante="outline" chico onClick={() => setFilas((l) => [...l, { ...FILA_VACIA }])}>
                Agregar insumo
              </Button>
            </div>

            {insumos.loading ? (
              <EstadoCarga filas={3} />
            ) : insumos.error ? (
              <Mensaje tipo="error" titulo="No se pudieron cargar los insumos">
                {insumos.error.message}{' '}
                <Button variante="outline" chico onClick={insumos.recargar}>
                  Reintentar
                </Button>
              </Mensaje>
            ) : (
              <div className="ac-form">
                {insumosSinStock.length > 0 && (
                  <Mensaje tipo="error" titulo={`Stock insuficiente de ${insumosSinStock.join(', ')}`}>
                    La cantidad declarada supera el stock disponible. Bajá la cantidad o reponé stock en el catálogo de insumos.
                  </Mensaje>
                )}
                <TablaEditable
                  filas={detalle}
                  vacio="Sin insumos. Si la labor no usó productos, se registra solo con su costo base."
                  columnas={[
                    {
                      clave: 'insumo',
                      titulo: 'Insumo',
                      render: (d, i) => (
                        <CampoCelda
                          as="select"
                          etiqueta={`Insumo de la fila ${i + 1}`}
                          value={d.insumoId}
                          error={intentoSeguir ? d.errores.insumo : undefined}
                          onChange={(v) => cambiarFila(i, 'insumoId', v)}
                          opciones={[
                            { valor: '', etiqueta: 'Elegí un insumo' },
                            ...listaInsumos.map((ins) => ({
                              valor: String(ins.id),
                              etiqueta: Number(ins.stock) > 0 ? ins.nombre : `${ins.nombre} (sin stock)`,
                              deshabilitada: Number(ins.stock) <= 0,
                            })),
                          ]}
                        />
                      ),
                    },
                    { clave: 'stock', titulo: 'Stock', num: true, render: (d) => (d.insumo ? formatoCantidad(d.insumo.stock) : '—') },
                    {
                      clave: 'cantidad',
                      titulo: 'Cantidad',
                      render: (d, i) => (
                        <CampoCelda
                          etiqueta={`Cantidad de la fila ${i + 1}`}
                          inputMode="numeric"
                          placeholder="Ej.: 5"
                          value={d.cantidad}
                          error={d.sinStock ? 'Supera el stock.' : intentoSeguir ? d.errores.cantidad : undefined}
                          onChange={(v) => cambiarFila(i, 'cantidad', v)}
                        />
                      ),
                    },
                    { clave: 'precio', titulo: 'Precio unit.', num: true, render: (d) => (d.insumo ? pesos(d.insumo.precioUnitario) : '—') },
                    { clave: 'subtotal', titulo: 'Subtotal', num: true, render: (d) => pesos(d.subtotal) },
                    {
                      clave: 'acciones',
                      titulo: '',
                      render: (_, i) => (
                        <Button variante="outline" chico onClick={() => setFilas((l) => l.filter((__, j) => j !== i))}>
                          Quitar
                        </Button>
                      ),
                    },
                  ]}
                  pie={
                    filas.length > 0 && (
                      <tr>
                        <td colSpan={4}>Costo de insumos</td>
                        <td className="num">{pesos(costoInsumos)}</td>
                        <td />
                      </tr>
                    )
                  }
                />
                <div style={{ maxWidth: 'calc(var(--space-8) * 3)' }}>
                  <Field
                    id="fecha-labor"
                    label="Fecha de la labor"
                    type="date"
                    value={fechaLabor}
                    onChange={(e) => setFechaLabor(e.target.value)}
                    error={intentoSeguir && !fechaLabor ? 'Elegí la fecha de la labor.' : undefined}
                  />
                </div>
              </div>
            )}

            <div className="ac-actions ac-actions--entre">
              <Button variante="danger" onClick={() => setDialogo('cancelar')}>
                Cancelar registro
              </Button>
              <Button variante="lime" disabled={insumos.loading || Boolean(insumos.error)} onClick={seguirAConfirmar}>
                Siguiente
              </Button>
            </div>
          </section>
        )}

        {paso === 3 && (
          <section className="ac-cream ac-cream--big">
            <div className="ac-toolbar">
              <h2 className="ac-display display-m">Confirmar labor</h2>
              <span className="ac-eyebrow" style={{ color: 'var(--ink-muted)' }}>
                Lote {lote.nroLote} · {fecha(fechaLabor)}
              </span>
            </div>
            <TablaEditable
              filas={detalle}
              vacio="La labor no usó insumos."
              columnas={[
                { clave: 'insumo', titulo: 'Insumo', render: (d) => d.insumo.nombre },
                { clave: 'cantidad', titulo: 'Cantidad', num: true, render: (d) => formatoCantidad(d.cant) },
                { clave: 'subtotal', titulo: 'Subtotal', num: true, render: (d) => pesos(d.subtotal) },
              ]}
            />
            <table className="ac-table ac-table--lista" style={{ marginTop: 'var(--space-5)' }}>
              <tbody>
                <tr>
                  <td>Labor</td>
                  <td className="num">{labor.descripcion}</td>
                </tr>
                <tr>
                  <td>Costo de insumos</td>
                  <td className="num">{pesos(costoInsumos)}</td>
                </tr>
                <tr>
                  <td>Costo base de la labor</td>
                  <td className="num">{pesos(costoBase)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td>Costo total</td>
                  <td className="num">{pesos(costoInsumos + costoBase)}</td>
                </tr>
              </tfoot>
            </table>
            <div className="ac-actions ac-actions--entre">
              <Button variante="outline" onClick={() => setPaso(2)}>
                Modificar
              </Button>
              <Button variante="primary" onClick={() => setDialogo('confirmar')}>
                Registrar labor
              </Button>
            </div>
          </section>
        )}
      </div>

      {dialogo === 'nuevaLabor' && (
        <Dialog
          titulo="Nueva labor"
          onCerrar={guardandoLabor ? undefined : () => setDialogo(null)}
          acciones={
            <>
              <Button variante="outline" disabled={guardandoLabor} onClick={() => setDialogo(null)}>
                Cancelar
              </Button>
              <Button variante="lime" disabled={guardandoLabor} onClick={crearLabor}>
                {guardandoLabor ? 'Guardando…' : 'Guardar'}
              </Button>
            </>
          }
        >
          {erroresLabor.general && <Mensaje tipo="error" titulo="No se pudo crear la labor">{erroresLabor.general}</Mensaje>}
          <Field
            id="nueva-labor"
            label="Labor"
            placeholder="Ej.: Aplicar herbicida"
            value={nuevaLabor.descripcion}
            onChange={(e) => setNuevaLabor((n) => ({ ...n, descripcion: e.target.value }))}
            error={erroresLabor.descripcion}
          />
          <Field
            id="nueva-labor-costo"
            label="Costo base ($)"
            inputMode="decimal"
            placeholder="Ej.: 45000"
            value={nuevaLabor.costo}
            onChange={(e) => setNuevaLabor((n) => ({ ...n, costo: e.target.value }))}
            error={erroresLabor.costo}
          />
        </Dialog>
      )}

      {dialogo === 'confirmar' && (
        <Dialog
          titulo="¿Registrar esta labor?"
          onCerrar={enviando ? undefined : () => setDialogo(null)}
          acciones={
            <>
              <Button variante="outline" disabled={enviando} onClick={() => setDialogo(null)}>
                No, volver
              </Button>
              <Button variante="primary" disabled={enviando} onClick={registrar}>
                {enviando ? 'Registrando…' : 'Sí, registrar'}
              </Button>
            </>
          }
        >
          <p className="ac-dialog__texto">
            Se registra «{labor.descripcion}» en el Lote {lote.nroLote} por {pesos(costoInsumos + costoBase)} y se descuenta del stock la
            cantidad de cada insumo.
          </p>
        </Dialog>
      )}

      {dialogo === 'ok' && (
        <Dialog
          variante="ok"
          eyebrow="Listo"
          titulo={`Labor registrada en el Lote ${resultado.lote}`}
          onCerrar={cerrarExito}
          acciones={
            <Button variante="primary" onClick={cerrarExito}>
              Cerrar
            </Button>
          }
        >
          <p style={{ margin: 0 }}>
            «{resultado.labor}» quedó imputada a la campaña {resultado.campania} por {pesos(resultado.total)}.
          </p>
        </Dialog>
      )}

      {dialogo === 'error' && <DialogError error={error} titulo="No se pudo registrar la labor" onCerrar={cerrarError} />}

      {dialogo === 'cancelar' && (
        <DialogCancelar
          titulo="¿Cancelar el registro de la labor?"
          texto="Se descartan la labor y los insumos cargados. No se modifica ningún stock."
          onConfirmar={reiniciar}
          onVolver={() => setDialogo(null)}
        />
      )}
    </>
  )
}
