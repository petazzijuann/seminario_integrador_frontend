import { useState } from 'react'
import BotonMenu from '../components/BotonMenu.jsx'
import Button from '../components/Button.jsx'
import CampoCelda from '../components/CampoCelda.jsx'
import DataTable from '../components/DataTable.jsx'
import Dialog from '../components/Dialog.jsx'
import DialogCancelar from '../components/DialogCancelar.jsx'
import DialogError from '../components/DialogError.jsx'
import Field from '../components/Field.jsx'
import Mensaje from '../components/Mensaje.jsx'
import PageHeader from '../components/PageHeader.jsx'
import Panel from '../components/Panel.jsx'
import Stepper from '../components/Stepper.jsx'
import TablaEditable from '../components/TablaEditable.jsx'
import { useFetch } from '../hooks/useFetch.js'
import { semillasService } from '../services/semillas.js'
import { siembrasService } from '../services/siembras.js'
import { fecha, hectareas, hoyISO, nombreCampania, parsearNumero, pesos, toneladas } from '../utils/format.js'

// CUU2 – Registrar siembra
const PASOS = ['Seleccionar lote', 'Cargar siembra', 'Confirmar siembra']
const PERCANCE_VACIO = { descripcion: '', fecha: '', costo: '' }

export default function RegistrarSiembraPage() {
  const lotes = useFetch(siembrasService.lotesDisponibles, [])

  const [paso, setPaso] = useState(0)
  const [asignacion, setAsignacion] = useState(null) // lote–semilla–campaña elegido
  const [cantidadTexto, setCantidadTexto] = useState('')
  const [fechaSiembra, setFechaSiembra] = useState(hoyISO())
  const [percances, setPercances] = useState([])
  const [errores, setErrores] = useState({})

  // Alternativo 2.a: stock que el ingeniero suma antes de registrar. Se guarda en memoria y se envía al confirmar.
  const [stockAgregado, setStockAgregado] = useState(0)
  const [stockYaGuardado, setStockYaGuardado] = useState(0) // si un intento anterior ya lo mandó al back
  const [stockTexto, setStockTexto] = useState('')
  const [errorStock, setErrorStock] = useState('')

  const [filtro, setFiltro] = useState('todos')
  const [orden, setOrden] = useState('sup-mayor')

  const [dialogo, setDialogo] = useState(null) // 'stock' | 'confirmar' | 'cancelar' | 'quitar' | 'ok' | 'error'
  const [percanceAQuitar, setPercanceAQuitar] = useState(null)
  const [error, setError] = useState(null)
  const [stockGuardadoEnFallo, setStockGuardadoEnFallo] = useState(0)
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState(null)

  const todas = lotes.data ?? []
  const cultivos = [...new Set(todas.map((a) => a.semilla?.nombre).filter(Boolean))]
  const zonas = [...new Set(todas.map((a) => a.lote?.zona).filter(Boolean))]

  const visibles = todas
    .filter((a) => {
      if (filtro === 'todos') return true
      const [tipo, valor] = filtro.split(':')
      return tipo === 'cultivo' ? a.semilla?.nombre === valor : a.lote?.zona === valor
    })
    .sort((a, b) => {
      switch (orden) {
        case 'zona-az': return a.lote.zona.localeCompare(b.lote.zona)
        case 'zona-za': return b.lote.zona.localeCompare(a.lote.zona)
        case 'cultivo-az': return a.semilla.nombre.localeCompare(b.semilla.nombre)
        case 'cultivo-za': return b.semilla.nombre.localeCompare(a.semilla.nombre)
        case 'sup-menor': return a.lote.superficie - b.lote.superficie
        default: return b.lote.superficie - a.lote.superficie
      }
    })

  const lote = asignacion?.lote
  const semilla = asignacion?.semilla
  const stockDisponible = semilla ? Number(semilla.stock) + stockYaGuardado + stockAgregado : 0
  const cantidad = parsearNumero(cantidadTexto)
  const cantidadValida = Number.isInteger(cantidad) && cantidad > 0
  const stockRestante = cantidadValida ? stockDisponible - cantidad : stockDisponible
  const totalPercances = percances.reduce((t, p) => t + (parsearNumero(p.costo) || 0), 0)

  function validar() {
    const nuevos = {}
    if (!cantidadValida) nuevos.cantidad = 'Ingresá una cantidad entera de toneladas mayor a 0.'
    else if (cantidad > stockDisponible) {
      nuevos.cantidad = `Supera el stock disponible (${toneladas(stockDisponible)}). Sumá stock con "Modificar stock".`
    }
    if (!fechaSiembra) nuevos.fecha = 'Elegí la fecha de finalización de la siembra.'

    const erroresPercances = percances.map((p) => {
      const e = {}
      if (!p.descripcion.trim()) e.descripcion = 'Falta la descripción.'
      if (!p.fecha) e.fecha = 'Falta la fecha.'
      const costo = parsearNumero(p.costo)
      if (Number.isNaN(costo) || costo < 0) e.costo = 'Costo de 0 o más.'
      return e
    })
    if (erroresPercances.some((e) => Object.keys(e).length > 0)) nuevos.percances = erroresPercances

    setErrores(nuevos)
    return Object.keys(nuevos).length === 0
  }

  function reiniciar() {
    setPaso(0)
    setAsignacion(null)
    setCantidadTexto('')
    setFechaSiembra(hoyISO())
    setPercances([])
    setErrores({})
    setStockAgregado(0)
    setStockYaGuardado(0)
    setDialogo(null)
  }

  function elegirLote(nueva) {
    // Cambiar de lote descarta lo cargado para el anterior.
    if (nueva.id !== asignacion?.id) {
      setCantidadTexto('')
      setPercances([])
      setErrores({})
      setStockAgregado(0)
      setStockYaGuardado(0)
    }
    setAsignacion(nueva)
  }

  function cambiarPercance(indice, campo, valor) {
    setPercances((lista) => lista.map((p, i) => (i === indice ? { ...p, [campo]: valor } : p)))
  }

  function quitarPercance() {
    setPercances((lista) => lista.filter((_, i) => i !== percanceAQuitar))
    setErrores((e) => ({ ...e, percances: undefined }))
    setDialogo(null)
  }

  function confirmarStock() {
    const valor = parsearNumero(stockTexto)
    if (!Number.isInteger(valor) || valor <= 0) {
      setErrorStock('Ingresá una cantidad entera de toneladas mayor a 0.')
      return
    }
    setStockAgregado((s) => s + valor)
    setStockTexto('')
    setErrorStock('')
    setDialogo(null)
  }

  function revisar() {
    if (validar()) setPaso(2)
  }

  async function registrar() {
    setEnviando(true)
    let guardadoAhora = 0
    try {
      if (stockAgregado > 0) {
        await semillasService.agregarStock(semilla.id, stockAgregado)
        guardadoAhora = stockAgregado
        setStockYaGuardado((s) => s + stockAgregado)
        setStockAgregado(0)
      }
      await siembrasService.registrar({
        loteSemillaCampaniaId: asignacion.id,
        cantidadSembrada: cantidad,
        fechaSiembra,
        percances: percances.map((p) => ({ descripcion: p.descripcion.trim(), fecha: p.fecha, costo: parsearNumero(p.costo) })),
      })
      setResultado({ lote: lote.nroLote, semilla: semilla.nombre, restante: stockDisponible - cantidad })
      setDialogo('ok')
    } catch (err) {
      setStockGuardadoEnFallo(guardadoAhora)
      setError(err)
      setDialogo('error')
    } finally {
      setEnviando(false)
    }
  }

  function cerrarExito() {
    reiniciar()
    lotes.recargar()
  }

  function cerrarError() {
    setDialogo(null)
    if (error?.status === 409) {
      reiniciar()
      lotes.recargar()
    }
  }

  const panelLateral = asignacion ? (
    <>
      <Panel
        titulo={`Lote ${lote.nroLote}`}
        estado="Elegido"
        filas={[
          { rotulo: 'Zona', valor: lote.zona, texto: true },
          { rotulo: 'Superficie', valor: hectareas(lote.superficie) },
          { rotulo: 'Cultivo', valor: semilla.nombre, texto: true },
          { rotulo: 'Campaña', valor: nombreCampania(asignacion.campania?.fecha) },
        ]}
      />
      {paso >= 1 && (
        <Panel
          titulo={`Stock de ${semilla.nombre}`}
          estado={semilla.estacion}
          variante="surface"
          filas={[
            { rotulo: 'Stock actual', valor: toneladas(Number(semilla.stock) + stockYaGuardado) },
            ...(stockAgregado > 0 ? [{ rotulo: 'A agregar', valor: `+${toneladas(stockAgregado)}` }] : []),
            { rotulo: 'A sembrar', valor: cantidadValida ? toneladas(cantidad) : '—' },
            { rotulo: 'Queda', valor: toneladas(stockRestante), destacado: true },
          ]}
        >
          {paso === 1 && (
            <div>
              <Button variante="outline" chico onClick={() => setDialogo('stock')}>
                Modificar stock
              </Button>
            </div>
          )}
        </Panel>
      )}
    </>
  ) : (
    <Panel titulo="Sin lote" estado="Paso 1" variante="surface">
      <p className="small" style={{ margin: 0 }}>
        Elegí el lote en el que terminó la siembra.
      </p>
    </Panel>
  )

  return (
    <>
      <PageHeader
        lineas={['Registrar', 'siembra']}
        bajada="Elegí el lote en uso, cargá las toneladas sembradas y los percances. El stock se descuenta al confirmar."
        dato={{
          rotulo: 'Lotes en uso',
          valor: lotes.loading ? '…' : todas.length,
          barras: todas.map((a) => ({ etiqueta: `L${a.lote.nroLote}`, valor: Number(a.lote.superficie) })),
          pie: hectareas(todas.reduce((t, a) => t + Number(a.lote.superficie), 0)),
        }}
      />

      <div className="ac-steps-wrap ac-steps-wrap--con-accion">
        <Stepper pasos={PASOS} actual={paso} onIr={setPaso} />
        {paso === 0 && (
          <Button variante="outline" enFondo to="/siembras/percance">
            Percance general
          </Button>
        )}
      </div>

      <div className="ac-cuerpo">
        <div className="ac-cuerpo__lateral">{panelLateral}</div>

        {paso === 0 && (
          <DataTable
            titulo="Lotes en uso"
            columnas={[
              { clave: 'lote', titulo: 'Lote', render: (a) => `Lote ${a.lote.nroLote}` },
              { clave: 'zona', titulo: 'Zona', render: (a) => a.lote.zona },
              { clave: 'cultivo', titulo: 'Cultivo', render: (a) => a.semilla.nombre },
              { clave: 'superficie', titulo: 'Superficie', num: true, render: (a) => hectareas(a.lote.superficie) },
            ]}
            filas={visibles}
            seleccionadaId={asignacion?.id}
            onSeleccionar={elegirLote}
            cargando={lotes.loading}
            error={lotes.error}
            onReintentar={lotes.recargar}
            vacio={
              todas.length === 0
                ? {
                    titulo: 'No hay lotes en uso',
                    texto: 'Para registrar una siembra primero asigná un lote a una campaña.',
                    accion: (
                      <Button variante="outline" to="/lotes/asignar">
                        Asignar lote
                      </Button>
                    ),
                  }
                : { titulo: 'Ningún lote coincide con el filtro' }
            }
            herramientas={
              <>
                <BotonMenu
                  etiqueta="Filtrar"
                  titulo="Filtrar por"
                  valor={filtro}
                  onElegir={setFiltro}
                  opciones={[
                    { valor: 'todos', etiqueta: 'Todos' },
                    ...cultivos.map((c) => ({ valor: `cultivo:${c}`, etiqueta: `Cultivo: ${c}` })),
                    ...zonas.map((z) => ({ valor: `zona:${z}`, etiqueta: `Zona: ${z}` })),
                  ]}
                />
                <BotonMenu
                  etiqueta="Ordenar"
                  titulo="Ordenar por"
                  valor={orden}
                  onElegir={setOrden}
                  opciones={[
                    { valor: 'zona-az', etiqueta: 'Zona A-Z' },
                    { valor: 'zona-za', etiqueta: 'Zona Z-A' },
                    { valor: 'cultivo-az', etiqueta: 'Cultivo A-Z' },
                    { valor: 'cultivo-za', etiqueta: 'Cultivo Z-A' },
                    { valor: 'sup-mayor', etiqueta: 'Mayor superficie' },
                    { valor: 'sup-menor', etiqueta: 'Menor superficie' },
                  ]}
                />
              </>
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
          <section className="ac-cream ac-cream--big">
            <div className="ac-toolbar">
              <h2 className="ac-display display-m">Datos de la siembra</h2>
            </div>
            <div className="ac-form">
              <div className="ac-form__fila">
                <Field
                  id="cantidad"
                  label={`Cantidad de semillas de ${semilla.nombre.toLowerCase()} sembradas (t)`}
                  inputMode="numeric"
                  placeholder="Ej.: 2"
                  value={cantidadTexto}
                  onChange={(e) => setCantidadTexto(e.target.value)}
                  error={errores.cantidad}
                  ayuda={`Toneladas enteras. Disponible: ${toneladas(stockDisponible)}.`}
                />
                <Field
                  id="fecha-siembra"
                  label="Fecha de finalización de siembra"
                  type="date"
                  value={fechaSiembra}
                  onChange={(e) => setFechaSiembra(e.target.value)}
                  error={errores.fecha}
                />
              </div>

              <div className="ac-toolbar" style={{ marginBottom: 0 }}>
                <h3 className="ac-display display-s">Percances</h3>
                <Button variante="outline" chico onClick={() => setPercances((l) => [...l, { ...PERCANCE_VACIO, fecha: fechaSiembra }])}>
                  Añadir percance
                </Button>
              </div>
              <TablaEditable
                filas={percances}
                vacio="Sin percances. Si algo salió mal durante la siembra, añadilo con su costo."
                columnas={[
                  {
                    clave: 'descripcion',
                    titulo: 'Descripción',
                    render: (p, i) => (
                      <CampoCelda
                        etiqueta={`Descripción del percance ${i + 1}`}
                        value={p.descripcion}
                        placeholder="Ej.: Máquina rota"
                        error={errores.percances?.[i]?.descripcion}
                        onChange={(v) => cambiarPercance(i, 'descripcion', v)}
                      />
                    ),
                  },
                  {
                    clave: 'fecha',
                    titulo: 'Fecha',
                    render: (p, i) => (
                      <CampoCelda
                        etiqueta={`Fecha del percance ${i + 1}`}
                        type="date"
                        value={p.fecha}
                        error={errores.percances?.[i]?.fecha}
                        onChange={(v) => cambiarPercance(i, 'fecha', v)}
                      />
                    ),
                  },
                  {
                    clave: 'costo',
                    titulo: 'Costo ($)',
                    render: (p, i) => (
                      <CampoCelda
                        etiqueta={`Costo del percance ${i + 1}`}
                        inputMode="decimal"
                        placeholder="Ej.: 845000"
                        value={p.costo}
                        error={errores.percances?.[i]?.costo}
                        onChange={(v) => cambiarPercance(i, 'costo', v)}
                      />
                    ),
                  },
                  {
                    clave: 'acciones',
                    titulo: '',
                    render: (_, i) => (
                      <Button
                        variante="outline"
                        chico
                        onClick={() => {
                          setPercanceAQuitar(i)
                          setDialogo('quitar')
                        }}
                      >
                        Eliminar
                      </Button>
                    ),
                  },
                ]}
                pie={
                  percances.length > 0 && (
                    <tr>
                      <td colSpan={2}>Total percances</td>
                      <td className="num">{pesos(totalPercances)}</td>
                      <td />
                    </tr>
                  )
                }
              />
            </div>
            <div className="ac-actions ac-actions--entre">
              <Button variante="danger" onClick={() => setDialogo('cancelar')}>
                Cancelar registración
              </Button>
              <Button variante="lime" onClick={revisar}>
                Revisar siembra
              </Button>
            </div>
          </section>
        )}

        {paso === 2 && (
          <section className="ac-cream ac-cream--big">
            <div className="ac-toolbar">
              <h2 className="ac-display display-m">Confirmar siembra</h2>
            </div>
            <table className="ac-table ac-table--lista">
              <tbody>
                <FilaResumen dato="Semilla" valor={`${semilla.nombre} (${semilla.estacion})`} />
                <FilaResumen dato="Cantidad sembrada" valor={toneladas(cantidad)} />
                <FilaResumen dato="Fecha de finalización" valor={fecha(fechaSiembra)} />
                {stockAgregado > 0 && <FilaResumen dato="Stock a agregar antes" valor={`+${toneladas(stockAgregado)}`} />}
                <FilaResumen dato="Stock después de sembrar" valor={toneladas(stockRestante)} />
                <FilaResumen dato="Percances" valor={percances.length ? `${percances.length} · ${pesos(totalPercances)}` : 'Ninguno'} />
              </tbody>
            </table>
            {percances.length > 0 && (
              <div style={{ marginTop: 'var(--space-5)' }}>
                <TablaEditable
                  filas={percances}
                  columnas={[
                    { clave: 'descripcion', titulo: 'Percance', render: (p) => p.descripcion },
                    { clave: 'fecha', titulo: 'Fecha', render: (p) => fecha(p.fecha) },
                    { clave: 'costo', titulo: 'Costo', num: true, render: (p) => pesos(parsearNumero(p.costo)) },
                  ]}
                />
              </div>
            )}
            <div className="ac-actions ac-actions--entre">
              <Button variante="outline" onClick={() => setPaso(1)}>
                Modificar
              </Button>
              <Button variante="primary" onClick={() => setDialogo('confirmar')}>
                Registrar siembra
              </Button>
            </div>
          </section>
        )}
      </div>

      {dialogo === 'stock' && (
        <Dialog
          titulo={`Agregar stock de ${semilla.nombre.toLowerCase()}`}
          onCerrar={() => setDialogo(null)}
          acciones={
            <>
              <Button variante="outline" onClick={() => setDialogo(null)}>
                Cancelar
              </Button>
              <Button variante="lime" onClick={confirmarStock}>
                Agregar
              </Button>
            </>
          }
        >
          <p className="ac-dialog__texto">
            Stock actual: {toneladas(Number(semilla.stock) + stockYaGuardado + stockAgregado)}. El ajuste se guarda al registrar la siembra.
          </p>
          <Field
            id="stock-extra"
            label="Toneladas a agregar"
            inputMode="numeric"
            placeholder="Ej.: 4"
            value={stockTexto}
            onChange={(e) => setStockTexto(e.target.value)}
            error={errorStock}
          />
        </Dialog>
      )}

      {dialogo === 'quitar' && (
        <Dialog
          titulo="¿Eliminar el percance?"
          onCerrar={() => setDialogo(null)}
          acciones={
            <>
              <Button variante="outline" onClick={() => setDialogo(null)}>
                No, volver
              </Button>
              <Button variante="danger" onClick={quitarPercance}>
                Sí, eliminar
              </Button>
            </>
          }
        >
          <p className="ac-dialog__texto">
            Se quita «{percances[percanceAQuitar]?.descripcion || 'percance sin descripción'}» de la siembra.
          </p>
        </Dialog>
      )}

      {dialogo === 'confirmar' && (
        <Dialog
          titulo="¿Registrar esta siembra?"
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
            {stockAgregado > 0 && `Primero se suman ${toneladas(stockAgregado)} al stock. `}
            Se descuentan {toneladas(cantidad)} de {semilla.nombre.toLowerCase()} del stock y el Lote {lote.nroLote} pasa a{' '}
            <b style={{ color: 'var(--ink)' }}>Sembrado</b>.
            {percances.length > 0 && ` Se guardan ${percances.length} percance(s) por ${pesos(totalPercances)}.`}
          </p>
        </Dialog>
      )}

      {dialogo === 'ok' && (
        <Dialog
          variante="ok"
          eyebrow="Listo"
          titulo={`Siembra registrada en el Lote ${resultado.lote}`}
          onCerrar={cerrarExito}
          acciones={
            <Button variante="primary" onClick={cerrarExito}>
              Cerrar
            </Button>
          }
        >
          <p style={{ margin: 0 }}>
            El lote pasó a Sembrado. Quedan {toneladas(resultado.restante)} de {resultado.semilla.toLowerCase()}.
          </p>
        </Dialog>
      )}

      {dialogo === 'error' && (
        <DialogError error={error} titulo="No se pudo registrar la siembra" onCerrar={cerrarError}>
          {stockGuardadoEnFallo > 0 && (
            <Mensaje tipo="aviso" titulo="El stock agregado sí quedó guardado">
              Se sumaron {toneladas(stockGuardadoEnFallo)} a {semilla.nombre.toLowerCase()} antes del error.
            </Mensaje>
          )}
        </DialogError>
      )}

      {dialogo === 'cancelar' && (
        <DialogCancelar
          titulo="¿Cancelar esta siembra?"
          texto="Se descartan la cantidad, los percances y el stock que agregaste. El lote sigue En uso."
          onConfirmar={reiniciar}
          onVolver={() => setDialogo(null)}
        />
      )}
    </>
  )
}

function FilaResumen({ dato, valor }) {
  return (
    <tr>
      <td>{dato}</td>
      <td className="num">{valor}</td>
    </tr>
  )
}
