import { useState } from 'react'
import BotonMenu from '../components/BotonMenu.jsx'
import Button from '../components/Button.jsx'
import CatalogoHeader from '../components/CatalogoHeader.jsx'
import DataTable from '../components/DataTable.jsx'
import EstadoTag from '../components/EstadoTag.jsx'
import Indicador from '../components/Indicador.jsx'
import { useFetch } from '../hooks/useFetch.js'
import { stockService } from '../services/stock.js'
import { cantidad, numero, pesos, toneladas } from '../utils/format.js'

// Insumos: tablero de stock (solo lectura) de semillas e insumos.
// Con el consumo histórico se estima para cuántos usos más alcanza cada uno:
//   alcanza = stock / (consumido / usos)   (usos = siembras para la semilla, labores para el insumo)
// La edición del stock y el precio sigue en Catálogos.

// Por debajo de esta cantidad de usos se avisa "Stock bajo".
const USOS_MINIMOS = 2

function conCobertura(item) {
  const promedio = item.usos > 0 ? item.consumido / item.usos : null
  const alcanza = promedio ? item.stock / promedio : null
  let situacion = 'Con stock'
  if (item.stock <= 0) situacion = 'Sin stock'
  else if (alcanza !== null && alcanza < USOS_MINIMOS) situacion = 'Stock bajo'
  else if (alcanza === null) situacion = 'Sin consumo'
  return { ...item, promedio, alcanza, valor: item.stock * item.precioUnitario, situacion }
}

const PRIORIDAD = { 'Sin stock': 0, 'Stock bajo': 1, 'Con stock': 2, 'Sin consumo': 3 }

function ordenar(items, orden) {
  return [...items].sort((a, b) => {
    if (orden === 'valor') return b.valor - a.valor
    if (orden === 'nombre') return a.nombre.localeCompare(b.nombre)
    // 'urgencia': primero lo que falta, después lo que alcanza para menos usos.
    return PRIORIDAD[a.situacion] - PRIORIDAD[b.situacion] || (a.alcanza ?? Infinity) - (b.alcanza ?? Infinity)
  })
}

const OPCIONES_ORDEN = [
  { valor: 'urgencia', etiqueta: 'Lo más urgente primero' },
  { valor: 'valor', etiqueta: 'Mayor valor en stock' },
  { valor: 'nombre', etiqueta: 'Nombre' },
]

const alcanzaPara = (item, [singular, plural]) => {
  if (item.alcanza === null) return '—'
  const n = Math.floor(item.alcanza)
  return `${numero(n)} ${n === 1 ? singular : plural}`
}

export default function StockPage() {
  const stock = useFetch(stockService.obtener, [])
  const [ordenSemillas, setOrdenSemillas] = useState('urgencia')
  const [ordenInsumos, setOrdenInsumos] = useState('urgencia')
  const [verInactivas, setVerInactivas] = useState(false)

  const semillas = (stock.data?.semillas ?? []).map(conCobertura)
  const insumos = (stock.data?.insumos ?? []).map(conCobertura)
  const semillasVisibles = verInactivas ? semillas : semillas.filter((s) => s.estado === 'Activa')

  const activas = semillas.filter((s) => s.estado === 'Activa')
  const valorSemillas = activas.reduce((t, s) => t + s.valor, 0)
  const valorInsumos = insumos.reduce((t, i) => t + i.valor, 0)
  const alertas = [...activas, ...insumos].filter((i) => i.situacion === 'Sin stock' || i.situacion === 'Stock bajo')

  const columnasComunes = (uso, formatoStock) => [
    { clave: 'situacion', titulo: 'Situación', render: (i) => <EstadoTag estado={i.situacion} /> },
    { clave: 'stock', titulo: 'Stock', num: true, render: (i) => formatoStock(i.stock) },
    { clave: 'precio', titulo: 'Precio', num: true, render: (i) => pesos(i.precioUnitario) },
    { clave: 'valor', titulo: 'Valor en stock', num: true, render: (i) => pesos(i.valor) },
    { clave: 'consumido', titulo: 'Usado', num: true, render: (i) => (i.usos ? formatoStock(i.consumido) : '—') },
    { clave: 'usos', titulo: uso[1][0].toUpperCase() + uso[1].slice(1), num: true, render: (i) => cantidad(i.usos) },
    { clave: 'promedio', titulo: `Prom. por ${uso[0]}`, num: true, render: (i) => (i.promedio === null ? '—' : formatoStock(Math.round(i.promedio * 10) / 10)) },
    { clave: 'alcanza', titulo: 'Alcanza para', num: true, render: (i) => alcanzaPara(i, uso) },
  ]

  return (
    <>
      <CatalogoHeader
        eyebrow="Stock"
        titulo="Insumos"
        bajada={`Semillas e insumos disponibles y para cuántas siembras o labores alcanzan según lo que se usó hasta ahora. Se avisa "Stock bajo" si alcanza para menos de ${USOS_MINIMOS}.`}
        acciones={
          <>
            <Button variante="outline" to="/catalogos/semillas">
              Editar semillas
            </Button>
            <Button variante="outline" to="/catalogos/insumos">
              Editar insumos
            </Button>
          </>
        }
      />

      <section className="ac-cream ac-cream--big ac-tablero__seccion" style={{ marginTop: 0 }}>
        <div className="ac-indicadores">
          <Indicador rotulo="Valor total en stock" valor={stock.loading ? '…' : pesos(valorSemillas + valorInsumos)} nota="Stock × precio actual" />
          <Indicador
            rotulo="Semillas activas"
            valor={stock.loading ? '…' : toneladas(activas.reduce((t, s) => t + s.stock, 0))}
            nota={`${activas.length} variedades · ${pesos(valorSemillas)}`}
          />
          <Indicador rotulo="Insumos" valor={stock.loading ? '…' : pesos(valorInsumos)} nota={`${insumos.length} productos`} />
          <Indicador
            rotulo="Para reponer"
            valor={stock.loading ? '…' : cantidad(alertas.length)}
            nota={alertas.length ? alertas.map((a) => a.nombre).join(', ') : 'Nada sin stock ni con stock bajo'}
          />
        </div>
      </section>

      <div className="ac-tablero__seccion">
        <DataTable
          titulo="Semillas"
          filas={ordenar(semillasVisibles, ordenSemillas)}
          cargando={stock.loading}
          error={stock.error}
          onReintentar={stock.recargar}
          vacio={{ titulo: verInactivas ? 'No hay semillas cargadas' : 'No hay semillas activas' }}
          columnas={[
            { clave: 'nombre', titulo: 'Semilla', render: (s) => s.nombre },
            { clave: 'estado', titulo: 'Estado', render: (s) => <EstadoTag estado={s.estado} /> },
            ...columnasComunes(['siembra', 'siembras'], toneladas),
          ]}
          herramientas={
            <>
              <BotonMenu
                etiqueta="Filtrar"
                titulo="Mostrar"
                valor={verInactivas ? 'todas' : 'activas'}
                onElegir={(v) => setVerInactivas(v === 'todas')}
                opciones={[
                  { valor: 'activas', etiqueta: 'Solo activas' },
                  { valor: 'todas', etiqueta: 'Todas' },
                ]}
              />
              <BotonMenu etiqueta="Ordenar" titulo="Ordenar por" valor={ordenSemillas} onElegir={setOrdenSemillas} opciones={OPCIONES_ORDEN} />
            </>
          }
        />
      </div>

      <div className="ac-tablero__seccion">
        <DataTable
          titulo="Insumos"
          filas={ordenar(insumos, ordenInsumos)}
          cargando={stock.loading}
          error={stock.error}
          onReintentar={stock.recargar}
          vacio={{ titulo: 'Todavía no hay insumos cargados' }}
          columnas={[{ clave: 'nombre', titulo: 'Insumo', render: (i) => i.nombre }, ...columnasComunes(['labor', 'labores'], cantidad)]}
          herramientas={<BotonMenu etiqueta="Ordenar" titulo="Ordenar por" valor={ordenInsumos} onElegir={setOrdenInsumos} opciones={OPCIONES_ORDEN} />}
        />
      </div>
    </>
  )
}
