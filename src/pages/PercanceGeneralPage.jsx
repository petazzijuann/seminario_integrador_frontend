import { useState } from 'react'
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
import { percancesService } from '../services/percances.js'
import { fecha, hectareas, hoyISO, nombreCampania, numero, parsearNumero, pesos } from '../utils/format.js'

// Percance general: un mismo percance (granizo, inundación…) imputado a varias siembras en curso.
// Se crea UN percance y un CostoPercance por siembra elegida. El costo total se reparte por superficie.
const PASOS = ['Seleccionar lotes', 'Cargar percance', 'Confirmar percance']

// Número → texto para un input: coma decimal, sin separador de miles (lo que entiende parsearNumero).
const aTexto = (n) => String(Math.round(n * 100) / 100).replace('.', ',')

// Reparte un total entre las siembras según la superficie de cada lote. Trabaja en centavos y
// la última fila absorbe el redondeo, así la suma da exactamente el total.
function repartirPorSuperficie(total, siembras) {
  const centavos = Math.round(total * 100)
  const superficies = siembras.map((s) => Number(s.loteSemillaCampania.lote.superficie) || 0)
  const totalSup = superficies.reduce((t, v) => t + v, 0)
  const resultado = {}
  let asignado = 0
  siembras.forEach((s, i) => {
    const ultima = i === siembras.length - 1
    const parte = ultima
      ? centavos - asignado
      : Math.round(centavos * (totalSup > 0 ? superficies[i] / totalSup : 1 / siembras.length))
    asignado += parte
    resultado[s.id] = aTexto(parte / 100)
  })
  return resultado
}

export default function PercanceGeneralPage() {
  const disponibles = useFetch(percancesService.siembrasDisponibles, [])

  const [paso, setPaso] = useState(0)
  // Memoria temporal del caso de uso: nada se guarda hasta confirmar.
  const [elegidosIds, setElegidosIds] = useState([])
  const [descripcion, setDescripcion] = useState('')
  const [fechaPercance, setFechaPercance] = useState(hoyISO())
  const [totalTexto, setTotalTexto] = useState('')
  const [costos, setCostos] = useState({}) // { [siembraId]: texto }
  const [errores, setErrores] = useState({})

  const [dialogo, setDialogo] = useState(null) // 'confirmar' | 'cancelar' | 'ok' | 'error'
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState(null)

  const todas = [...(disponibles.data ?? [])].sort(
    (a, b) => a.loteSemillaCampania.lote.nroLote - b.loteSemillaCampania.lote.nroLote,
  )
  const elegidas = todas.filter((s) => elegidosIds.includes(s.id))
  const supElegida = elegidas.reduce((t, s) => t + Number(s.loteSemillaCampania.lote.superficie), 0)
  const costoDe = (s) => parsearNumero(costos[s.id])
  const totalAsignado = elegidas.reduce((t, s) => t + (costoDe(s) || 0), 0)
  const listaLotes = elegidas.map((s) => `Lote ${s.loteSemillaCampania.lote.nroLote}`).join(', ')

  function alternar(siembra) {
    setElegidosIds((ids) => (ids.includes(siembra.id) ? ids.filter((id) => id !== siembra.id) : [...ids, siembra.id]))
  }

  const todasElegidas = todas.length > 0 && elegidosIds.length === todas.length
  const alternarTodas = () => setElegidosIds(todasElegidas ? [] : todas.map((s) => s.id))

  // Al pasar a cargar el percance se reparte de nuevo el total entre los lotes elegidos.
  function irACargar() {
    const total = parsearNumero(totalTexto)
    setCostos(total >= 0 ? repartirPorSuperficie(total, elegidas) : {})
    setErrores({})
    setPaso(1)
  }

  function cambiarTotal(texto) {
    setTotalTexto(texto)
    const total = parsearNumero(texto)
    if (total >= 0) setCostos(repartirPorSuperficie(total, elegidas))
  }

  // Si se ajusta un lote a mano, el costo total pasa a ser la suma de los montos.
  function cambiarCosto(id, texto) {
    const nuevos = { ...costos, [id]: texto }
    setCostos(nuevos)
    const suma = elegidas.reduce((t, s) => t + (parsearNumero(nuevos[s.id]) || 0), 0)
    setTotalTexto(aTexto(suma))
  }

  function validar() {
    const nuevos = {}
    if (!descripcion.trim()) nuevos.descripcion = 'Describí qué pasó (ej.: granizo).'
    if (!fechaPercance) nuevos.fecha = 'Elegí la fecha del percance.'
    if (!(parsearNumero(totalTexto) >= 0)) nuevos.total = 'Ingresá el costo total (0 o más).'
    const porLote = {}
    for (const s of elegidas) {
      const c = costoDe(s)
      if (Number.isNaN(c) || c < 0) porLote[s.id] = 'Costo de 0 o más.'
    }
    if (Object.keys(porLote).length > 0) nuevos.costos = porLote
    setErrores(nuevos)
    return Object.keys(nuevos).length === 0
  }

  function reiniciar() {
    setPaso(0)
    setElegidosIds([])
    setDescripcion('')
    setFechaPercance(hoyISO())
    setTotalTexto('')
    setCostos({})
    setErrores({})
    setDialogo(null)
  }

  async function registrar() {
    setEnviando(true)
    try {
      await percancesService.registrar({
        descripcion: descripcion.trim(),
        fecha: fechaPercance,
        siembras: elegidas.map((s) => ({ siembraId: s.id, costo: costoDe(s) })),
      })
      setResultado({ lotes: elegidas.length, total: totalAsignado })
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
    disponibles.recargar()
  }

  function cerrarError() {
    setDialogo(null)
    // 409: algún lote se cosechó o su campaña se cerró mientras tanto. Se vuelve a empezar con datos frescos.
    if (error?.status === 409) {
      reiniciar()
      disponibles.recargar()
    }
  }

  const cancelar = () => (elegidosIds.length > 0 || descripcion ? setDialogo('cancelar') : reiniciar())

  const panelLateral =
    elegidas.length > 0 ? (
      <Panel
        titulo="Lotes afectados"
        estado={`${elegidas.length} ${elegidas.length === 1 ? 'lote' : 'lotes'}`}
        filas={[
          { rotulo: 'Superficie', valor: hectareas(supElegida) },
          ...(paso >= 1 ? [{ rotulo: 'Costo total', valor: pesos(totalAsignado) }] : []),
          { rotulo: 'Lotes', valor: listaLotes, texto: true, ancho: true },
        ]}
      />
    ) : (
      <Panel titulo="Sin lotes" estado="Paso 1" variante="surface">
        <p className="small" style={{ margin: 0 }}>
          Marcá todos los lotes sembrados que afectó el percance.
        </p>
      </Panel>
    )

  return (
    <>
      <PageHeader
        lineas={['Percance', 'general']}
        bajada="Registrá un percance que afectó a varios lotes sembrados, como un granizo o una inundación. El costo se reparte entre los lotes."
        dato={{
          rotulo: 'Lotes sembrados',
          valor: disponibles.loading ? '…' : todas.length,
          barras: todas.map((s) => ({
            etiqueta: `L${s.loteSemillaCampania.lote.nroLote}`,
            valor: Number(s.loteSemillaCampania.lote.superficie),
          })),
          pie: hectareas(todas.reduce((t, s) => t + Number(s.loteSemillaCampania.lote.superficie), 0)),
        }}
      />

      <div className="ac-steps-wrap ac-steps-wrap--con-accion">
        <Stepper pasos={PASOS} actual={paso} onIr={setPaso} />
        {paso === 0 && (
          <Button variante="outline" enFondo to="/siembras">
            Volver a Siembras
          </Button>
        )}
      </div>

      <div className="ac-cuerpo">
        <div className="ac-cuerpo__lateral">{panelLateral}</div>

        {paso === 0 && (
          <DataTable
            titulo="Lotes sembrados"
            columnas={[
              { clave: 'lote', titulo: 'Lote', render: (s) => `Lote ${s.loteSemillaCampania.lote.nroLote}` },
              { clave: 'zona', titulo: 'Zona', render: (s) => s.loteSemillaCampania.lote.zona },
              { clave: 'cultivo', titulo: 'Cultivo', render: (s) => s.loteSemillaCampania.semilla.nombre },
              { clave: 'campania', titulo: 'Campaña', render: (s) => nombreCampania(s.loteSemillaCampania.campania?.fecha) },
              {
                clave: 'superficie',
                titulo: 'Superficie',
                num: true,
                render: (s) => hectareas(s.loteSemillaCampania.lote.superficie),
              },
            ]}
            filas={todas}
            seleccionadosIds={elegidosIds}
            onSeleccionar={alternar}
            cargando={disponibles.loading}
            error={disponibles.error}
            onReintentar={disponibles.recargar}
            vacio={{
              titulo: 'No hay lotes sembrados',
              texto: 'Los percances generales se imputan a lotes Sembrados de campañas abiertas.',
              accion: (
                <Button variante="outline" to="/siembras">
                  Ir a Siembras
                </Button>
              ),
            }}
            herramientas={
              todas.length > 1 && (
                <Button variante="outline" onClick={alternarTodas}>
                  {todasElegidas ? 'Quitar todos' : 'Elegir todos'}
                </Button>
              )
            }
            acciones={
              <>
                <Button variante="outline" onClick={cancelar}>
                  Cancelar
                </Button>
                <Button variante="lime" disabled={elegidas.length === 0} onClick={irACargar}>
                  {elegidas.length > 0 ? `Seleccionar (${elegidas.length})` : 'Seleccionar'}
                </Button>
              </>
            }
          />
        )}

        {paso === 1 && (
          <section className="ac-cream ac-cream--big">
            <div className="ac-toolbar">
              <h2 className="ac-display display-m">Datos del percance</h2>
            </div>
            <div className="ac-form">
              <div className="ac-form__fila">
                <Field
                  id="percance-descripcion"
                  label="Descripción"
                  placeholder="Ej.: Granizo"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  error={errores.descripcion}
                />
                <Field
                  id="percance-fecha"
                  label="Fecha del percance"
                  type="date"
                  value={fechaPercance}
                  onChange={(e) => setFechaPercance(e.target.value)}
                  error={errores.fecha}
                />
              </div>
              <div className="ac-form__fila">
                <Field
                  id="percance-total"
                  label="Costo total ($)"
                  inputMode="decimal"
                  placeholder="Ej.: 1200000"
                  value={totalTexto}
                  onChange={(e) => cambiarTotal(e.target.value)}
                  error={errores.total}
                  ayuda="Se reparte según la superficie de cada lote. Podés ajustar cada monto abajo."
                />
              </div>

              <TablaEditable
                filas={elegidas}
                getKey={(s) => s.id}
                columnas={[
                  { clave: 'lote', titulo: 'Lote', render: (s) => `Lote ${s.loteSemillaCampania.lote.nroLote}` },
                  {
                    clave: 'superficie',
                    titulo: 'Superficie',
                    num: true,
                    render: (s) => hectareas(s.loteSemillaCampania.lote.superficie),
                  },
                  {
                    clave: 'proporcion',
                    titulo: '% sup.',
                    num: true,
                    render: (s) =>
                      supElegida > 0 ? `${numero((Number(s.loteSemillaCampania.lote.superficie) / supElegida) * 100, 1)} %` : '—',
                  },
                  {
                    clave: 'costo',
                    titulo: 'Costo ($)',
                    render: (s) => (
                      <CampoCelda
                        etiqueta={`Costo del percance en el Lote ${s.loteSemillaCampania.lote.nroLote}`}
                        inputMode="decimal"
                        value={costos[s.id] ?? ''}
                        error={errores.costos?.[s.id]}
                        onChange={(v) => cambiarCosto(s.id, v)}
                      />
                    ),
                  },
                ]}
                pie={
                  <tr>
                    <td colSpan={3}>Total</td>
                    <td className="num">{pesos(totalAsignado)}</td>
                  </tr>
                }
              />
            </div>
            <div className="ac-actions ac-actions--entre">
              <Button variante="danger" onClick={() => setDialogo('cancelar')}>
                Cancelar registro
              </Button>
              <Button variante="lime" onClick={() => validar() && setPaso(2)}>
                Siguiente
              </Button>
            </div>
          </section>
        )}

        {paso === 2 && (
          <section className="ac-cream ac-cream--big">
            <div className="ac-toolbar">
              <h2 className="ac-display display-m">Confirmar percance</h2>
            </div>
            <table className="ac-table ac-table--lista">
              <tbody>
                <tr>
                  <td>Percance</td>
                  <td className="num">{descripcion.trim()}</td>
                </tr>
                <tr>
                  <td>Fecha</td>
                  <td className="num">{fecha(fechaPercance)}</td>
                </tr>
                <tr>
                  <td>Lotes afectados</td>
                  <td className="num">
                    {elegidas.length} · {hectareas(supElegida)}
                  </td>
                </tr>
              </tbody>
            </table>
            <div style={{ marginTop: 'var(--space-5)' }}>
              <TablaEditable
                filas={elegidas}
                getKey={(s) => s.id}
                columnas={[
                  { clave: 'lote', titulo: 'Lote', render: (s) => `Lote ${s.loteSemillaCampania.lote.nroLote}` },
                  { clave: 'cultivo', titulo: 'Cultivo', render: (s) => s.loteSemillaCampania.semilla.nombre },
                  { clave: 'costo', titulo: 'Costo', num: true, render: (s) => pesos(costoDe(s)) },
                ]}
                pie={
                  <tr>
                    <td colSpan={2}>Costo total</td>
                    <td className="num">{pesos(totalAsignado)}</td>
                  </tr>
                }
              />
            </div>
            <div className="ac-actions ac-actions--entre">
              <Button variante="outline" onClick={() => setPaso(1)}>
                Modificar
              </Button>
              <Button variante="primary" onClick={() => setDialogo('confirmar')}>
                Registrar percance
              </Button>
            </div>
          </section>
        )}
      </div>

      {dialogo === 'confirmar' && (
        <Dialog
          titulo={`¿Registrar el percance en ${elegidas.length} ${elegidas.length === 1 ? 'lote' : 'lotes'}?`}
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
            Se registra «{descripcion.trim()}» del {fecha(fechaPercance)} y se imputan {pesos(totalAsignado)} entre {listaLotes}. Los
            lotes siguen <b style={{ color: 'var(--ink)' }}>Sembrado</b>.
          </p>
        </Dialog>
      )}

      {dialogo === 'ok' && (
        <Dialog
          variante="ok"
          eyebrow="Listo"
          titulo={`Percance registrado en ${resultado.lotes} ${resultado.lotes === 1 ? 'lote' : 'lotes'}`}
          onCerrar={cerrarExito}
          acciones={
            <Button variante="primary" onClick={cerrarExito}>
              Cerrar
            </Button>
          }
        >
          <p style={{ margin: 0 }}>Se imputaron {pesos(resultado.total)} a las siembras. El costo ya cuenta en el rinde de cada lote.</p>
        </Dialog>
      )}

      {dialogo === 'error' && (
        <DialogError error={error} titulo="No se pudo registrar el percance" onCerrar={cerrarError}>
          {error?.data?.lotes?.length > 0 && (
            <Mensaje tipo="aviso" titulo="Lotes que ya no están disponibles">
              {error.data.lotes.map((n) => `Lote ${n}`).join(', ')}. Se vuelve a la lista actualizada.
            </Mensaje>
          )}
        </DialogError>
      )}

      {dialogo === 'cancelar' && (
        <DialogCancelar
          titulo="¿Cancelar el percance?"
          texto="Se descartan los lotes elegidos y los datos cargados. No se registra nada."
          onConfirmar={reiniciar}
          onVolver={() => setDialogo(null)}
        />
      )}
    </>
  )
}
