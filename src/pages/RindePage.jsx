import { useState } from 'react'
import BotonMenu from '../components/BotonMenu.jsx'
import Button from '../components/Button.jsx'
import DataTable from '../components/DataTable.jsx'
import EstadoCarga from '../components/EstadoCarga.jsx'
import EstadoVacio from '../components/EstadoVacio.jsx'
import { BarraReparto, GraficoApilado, GraficoColumnas } from '../components/Graficos.jsx'
import Indicador from '../components/Indicador.jsx'
import Mensaje from '../components/Mensaje.jsx'
import PageHeader from '../components/PageHeader.jsx'
import { useFetch } from '../hooks/useFetch.js'
import { rindeService } from '../services/rinde.js'
import {
  cantidad,
  compacto,
  fecha,
  hectareas,
  kilosPorHa,
  numero,
  pesos,
  pesosPorHa,
  pesosPorTonelada,
  porcentaje,
  toneladas,
} from '../utils/format.js'
import { agruparCampanias, anterioresDelMismoLote, otrasDelMismoLote, promedio, resumir, RUBROS, textoLotes } from '../utils/rinde.js'

// Rinde: tablero de las campañas cerradas. Cuánto se invirtió, cuánto se produjo,
// cuánto costó cada tonelada, y cómo se compara con las campañas anteriores DEL MISMO LOTE
// (Lote 1 2026 contra Lote 1 2025).
// No hay precio de venta en el sistema, así que no se calcula ingreso: el foco es eficiencia y costo.

const MAX_EN_GRAFICO = 12

export default function RindePage() {
  const rinde = useFetch(rindeService.listar, [])
  const [loteId, setLoteId] = useState('todos')
  const [cultivo, setCultivo] = useState('todos')
  const [elegidaId, setElegidaId] = useState(null)
  const [comparar, setComparar] = useState('anterior') // 'anterior' | 'promedio'

  const filas = rinde.data ?? []
  const lotes = [...new Map(filas.map((f) => [f.lote.id, f.lote])).values()].sort((a, b) => a.nroLote - b.nroLote)
  const cultivos = [...new Set(filas.map((f) => f.semilla.nombre))].sort((a, b) => a.localeCompare(b))

  // El cultivo filtra todo (incluida la comparación); el lote además recorta el histórico de la página.
  const delCultivo = cultivo === 'todos' ? filas : filas.filter((f) => f.semilla.nombre === cultivo)
  const filtradas = loteId === 'todos' ? delCultivo : delCultivo.filter((f) => f.lote.id === loteId)
  const campanias = agruparCampanias(filtradas)

  // Por defecto se mira la campaña más reciente; si el filtro la saca, también.
  const elegida = campanias.find((c) => c.id === elegidaId) ?? campanias.at(-1) ?? null

  // Comparación: siempre contra el mismo lote. La "anterior" es la campaña previa de cada lote de la elegida.
  const previas = elegida ? anterioresDelMismoLote(delCultivo, elegida) : []
  const anterior = previas.length ? resumir(previas) : null
  const campaniasPrevias = agruparCampanias(previas)
  const etiquetaAnterior =
    campaniasPrevias.length === 1 ? campaniasPrevias[0].corta : campaniasPrevias.length ? 'la anterior de cada lote' : 'la anterior'
  const otras = elegida ? otrasDelMismoLote(delCultivo, elegida) : []

  function contra(clave) {
    if (comparar === 'promedio') {
      return { anterior: otras.length ? promedio(otras, clave) : null, contra: 'el promedio del lote' }
    }
    return { anterior: anterior?.[clave] ?? null, contra: etiquetaAnterior }
  }
  const variacion = (clave, mejor) => ({ actual: elegida?.resumen[clave] ?? null, mejor, ...contra(clave) })
  const notaPromedio = (clave, formato) => {
    const p = promedio(otras, clave)
    return p === null ? undefined : `Promedio del lote: ${formato(p)}`
  }

  let textoComparacion = 'Es la primera campaña cerrada de este lote: no hay contra qué comparar.'
  if (comparar === 'promedio' && otras.length) {
    textoComparacion = `Contra el promedio de ${otras.length} ${otras.length === 1 ? 'campaña' : 'campañas'} del mismo lote.`
  } else if (comparar === 'anterior' && campaniasPrevias.length) {
    textoComparacion = `Contra ${campaniasPrevias.map((c) => `${c.corta} · ${c.periodo} (${c.textoLotes})`).join(', ')}.`
  }

  const enGrafico = campanias.slice(-MAX_EN_GRAFICO)
  const totalProduccion = campanias.reduce((t, c) => t + c.resumen.produccionT, 0)

  const header = (
    <PageHeader
      lineas={['Rinde de', 'campañas']}
      bajada="Lo que se invirtió, lo que se cosechó y cuánto salió cada tonelada en las campañas cerradas, comparado con el histórico."
      dato={{
        rotulo: 'Producción histórica',
        valor: rinde.loading ? '…' : toneladas(Math.round(totalProduccion)),
        barras: campanias.slice(-4).map((c) => ({ etiqueta: c.corta, valor: c.resumen.produccionT })),
        pie: `${campanias.length} campañas cerradas`,
      }}
    />
  )

  if (rinde.loading || rinde.error || filas.length === 0) {
    return (
      <>
        {header}
        <section className="ac-cream ac-cream--big ac-tablero__seccion">
          {rinde.loading && <EstadoCarga />}
          {rinde.error && (
            <Mensaje tipo="error" titulo="No se pudo calcular el rinde">
              <p style={{ margin: 0 }}>{rinde.error.message}</p>
              <div style={{ marginTop: 'var(--space-3)' }}>
                <Button variante="outline" chico onClick={rinde.recargar}>
                  Reintentar
                </Button>
              </div>
            </Mensaje>
          )}
          {!rinde.loading && !rinde.error && (
            <EstadoVacio
              titulo="Todavía no hay campañas cerradas"
              texto="El rinde se calcula cuando una campaña se cierra, con todos sus lotes cosechados."
              accion={
                <Button variante="outline" to="/campanias">
                  Ir a Campañas
                </Button>
              }
            />
          )}
        </section>
      </>
    )
  }

  const r = elegida.resumen

  return (
    <>
      <section className="ac-cream ac-selector" aria-label="Elegir campaña">
        <div className="ac-selector__campos">
          <BotonMenu
            etiqueta={`Lote: ${loteId === 'todos' ? 'Todos' : `Lote ${lotes.find((l) => l.id === loteId)?.nroLote}`}`}
            titulo="Lote"
            valor={loteId}
            onElegir={setLoteId}
            opciones={[{ valor: 'todos', etiqueta: 'Todos los lotes' }, ...lotes.map((l) => ({ valor: l.id, etiqueta: `Lote ${l.nroLote} · ${l.zona}` }))]}
          />
          <BotonMenu
            etiqueta={`Campaña: ${elegida.corta} · ${elegida.periodo}`}
            titulo="Campaña"
            valor={elegida.id}
            onElegir={setElegidaId}
            opciones={[...campanias].reverse().map((c) => ({ valor: c.id, etiqueta: c.nombre }))}
          />
          <BotonMenu
            etiqueta={`Cultivo: ${cultivo === 'todos' ? 'Todos' : cultivo}`}
            titulo="Cultivo"
            valor={cultivo}
            onElegir={setCultivo}
            opciones={[{ valor: 'todos', etiqueta: 'Todos' }, ...cultivos.map((c) => ({ valor: c, etiqueta: c }))]}
          />
          <BotonMenu
            etiqueta={`Comparar con: ${comparar === 'promedio' ? 'promedio del lote' : 'campaña anterior del lote'}`}
            titulo="Comparar con"
            valor={comparar}
            onElegir={setComparar}
            opciones={[
              { valor: 'anterior', etiqueta: 'Campaña anterior del mismo lote' },
              { valor: 'promedio', etiqueta: 'Promedio del mismo lote' },
            ]}
          />
        </div>
        <p className="small ac-selector__texto">{textoComparacion}</p>
      </section>

      {header}

      <section className="ac-cream ac-cream--big ac-tablero__seccion">
        <div className="ac-toolbar">
          <div>
            <span className="ac-eyebrow" style={{ color: 'var(--ink-muted)' }}>
              {elegida.textoLotes} · {elegida.cultivos.join(' · ')} · {hectareas(r.superficie)}
            </span>
            <h2 className="ac-display display-m">Campaña {elegida.periodo}</h2>
          </div>
          <span className="ac-eyebrow" style={{ color: 'var(--ink-muted)' }}>
            {elegida.corta} · inicio {fecha(elegida.campania.fecha)}
          </span>
        </div>

        <div className="ac-indicadores ac-indicadores--3">
          <Indicador
            rotulo="Producción"
            valor={toneladas(Math.round(r.produccionT * 10) / 10)}
            variacion={variacion('produccionT', 'sube')}
            nota={notaPromedio('produccionT', (v) => toneladas(Math.round(v)))}
          />
          <Indicador
            rotulo="Rinde"
            valor={r.kilosHectarea === null ? '—' : kilosPorHa(r.kilosHectarea)}
            variacion={variacion('kilosHectarea', 'sube')}
            nota={notaPromedio('kilosHectarea', kilosPorHa)}
          />
          <Indicador
            rotulo="Inversión por hectárea"
            valor={pesosPorHa(r.costoPorHa)}
            variacion={variacion('costoPorHa', 'baja')}
            nota={`Total invertido ${pesos(r.costos.total)}`}
          />
          <Indicador
            rotulo="Costo por tonelada"
            valor={pesosPorTonelada(r.costoPorTonelada)}
            variacion={variacion('costoPorTonelada', 'baja')}
            nota={notaPromedio('costoPorTonelada', pesosPorTonelada)}
          />
          <Indicador
            rotulo="Multiplicación de semilla"
            valor={r.multiplicacion === null ? '—' : `× ${numero(r.multiplicacion, 1)}`}
            variacion={variacion('multiplicacion', 'sube')}
            nota={`${toneladas(r.sembradoT)} sembradas`}
          />
          <Indicador
            rotulo="Kilos por cada $1.000"
            valor={r.kilosPorMil === null ? '—' : `${numero(r.kilosPorMil, 1)} kg`}
            variacion={variacion('kilosPorMil', 'sube')}
            nota={`Humedad promedio ${r.humedad === null ? '—' : porcentaje(r.humedad)}`}
          />
        </div>

        <div className="ac-tablero__reparto">
          <h3 className="ac-display display-s">En qué se fue la plata</h3>
          <BarraReparto partes={r.costos} series={RUBROS} formato={pesos} />
        </div>
      </section>

      <div className="ac-tablero__graficos">
        <section className="ac-cream ac-cream--big">
          <h2 className="ac-display display-s">Costo por tonelada</h2>
          <p className="small ac-tablero__bajada">Cuánto costó producir cada tonelada. Más bajo es mejor.</p>
          <GraficoColumnas
            descripcion="Costo por tonelada de cada campaña"
            datos={enGrafico.map((c) => ({ id: c.id, etiqueta: c.corta, valor: c.resumen.costoPorTonelada, nota: c.nombre }))}
            formato={pesosPorTonelada}
            formatoEje={(v) => `$${compacto(v)}`}
            seleccionadoId={elegida.id}
            onSeleccionar={setElegidaId}
          />
        </section>
        <section className="ac-cream ac-cream--big">
          <h2 className="ac-display display-s">Rinde</h2>
          <p className="small ac-tablero__bajada">Kilos cosechados por hectárea. Más alto es mejor.</p>
          <GraficoColumnas
            descripcion="Rinde en kilos por hectárea de cada campaña"
            datos={enGrafico.map((c) => ({ id: c.id, etiqueta: c.corta, valor: c.resumen.kilosHectarea, nota: c.nombre }))}
            formato={kilosPorHa}
            formatoEje={compacto}
            seleccionadoId={elegida.id}
            onSeleccionar={setElegidaId}
          />
        </section>
      </div>

      <section className="ac-cream ac-cream--big ac-tablero__seccion">
        <h2 className="ac-display display-s">Inversión por hectárea, por rubro</h2>
        <p className="small ac-tablero__bajada">
          Por hectárea para que se puedan comparar campañas de distinta superficie.
          {campanias.length > MAX_EN_GRAFICO && ` Se muestran las últimas ${MAX_EN_GRAFICO}; el resto está en la tabla.`}
        </p>
        <GraficoApilado
          descripcion="Inversión por hectárea de cada campaña, separada por rubro"
          datos={enGrafico.map((c) => ({
            id: c.id,
            etiqueta: c.corta,
            partes: Object.fromEntries(RUBROS.map((s) => [s.clave, c.resumen.superficie ? c.resumen.costos[s.clave] / c.resumen.superficie : 0])),
          }))}
          series={RUBROS}
          formato={pesosPorHa}
          formatoEje={(v) => `$${compacto(v)}`}
          seleccionadoId={elegida.id}
          onSeleccionar={setElegidaId}
        />
      </section>

      <div className="ac-tablero__seccion">
        <DataTable
          titulo={loteId === 'todos' ? 'Histórico de campañas' : `Histórico del ${textoLotes(filtradas)}`}
          getId={(c) => c.id}
          filas={[...campanias].reverse()}
          seleccionadaId={elegida.id}
          onSeleccionar={(c) => setElegidaId(c.id)}
          columnas={[
            { clave: 'campania', titulo: 'Campaña', render: (c) => `${c.corta} · ${c.periodo}` },
            { clave: 'lote', titulo: 'Lote', render: (c) => c.textoLotes },
            { clave: 'cultivo', titulo: 'Cultivo', render: (c) => c.cultivos.join(', ') },
            { clave: 'superficie', titulo: 'Superficie', num: true, render: (c) => hectareas(c.resumen.superficie) },
            { clave: 'produccion', titulo: 'Producción', num: true, render: (c) => toneladas(Math.round(c.resumen.produccionT * 10) / 10) },
            { clave: 'rinde', titulo: 'Rinde', num: true, render: (c) => (c.resumen.kilosHectarea === null ? '—' : kilosPorHa(c.resumen.kilosHectarea)) },
            { clave: 'inversion', titulo: 'Inversión', num: true, render: (c) => pesos(c.resumen.costos.total) },
            { clave: 'ha', titulo: '$/ha', num: true, render: (c) => pesos(c.resumen.costoPorHa) },
            { clave: 't', titulo: '$/t', num: true, render: (c) => pesos(c.resumen.costoPorTonelada) },
          ]}
        />
      </div>

      <div className="ac-tablero__seccion">
        <DataTable
          titulo={`Lotes de ${elegida.corta}`}
          getId={(l) => l.loteSemillaCampaniaId}
          filas={elegida.lotes}
          columnas={[
            { clave: 'lote', titulo: 'Lote', render: (l) => `Lote ${l.lote.nroLote}` },
            { clave: 'semilla', titulo: 'Semilla', render: (l) => l.semilla.nombre },
            { clave: 'superficie', titulo: 'Superficie', num: true, render: (l) => hectareas(l.lote.superficie) },
            { clave: 'sembrado', titulo: 'Sembrado', num: true, render: (l) => toneladas(l.cantidadSembrada) },
            { clave: 'rinde', titulo: 'Rinde', num: true, render: (l) => (l.kilosHectarea === null ? '—' : kilosPorHa(l.kilosHectarea)) },
            { clave: 'humedad', titulo: 'Humedad', num: true, render: (l) => (l.porcentajeHumedad === null ? '—' : porcentaje(l.porcentajeHumedad)) },
            { clave: 'labores', titulo: 'Labores', num: true, render: (l) => cantidad(l.cantidadLabores) },
            { clave: 'inversion', titulo: 'Inversión', num: true, render: (l) => pesos(l.costos.total) },
            { clave: 'ha', titulo: '$/ha', num: true, render: (l) => pesos(l.lote.superficie ? l.costos.total / l.lote.superficie : null) },
            {
              clave: 't',
              titulo: '$/t',
              num: true,
              render: (l) => pesos(l.produccionKg ? l.costos.total / (l.produccionKg / 1000) : null),
            },
          ]}
        >
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <Mensaje tipo="aviso" titulo="Cómo se calculan los costos">
              Los insumos y percances quedan guardados con su costo del momento. La semilla y el costo base de las labores se valoran con el precio
              actual del catálogo, así que si cambió desde la campaña, el número puede diferir.
            </Mensaje>
          </div>
        </DataTable>
      </div>
    </>
  )
}
