import FotoCampo from './FotoCampo.jsx'

// Ficha: components/PageHeader.md
// Título en mosaico (2 líneas lime), foto encastrada, tarjeta de dato a la derecha y bajada alineada.
// dato: { rotulo, valor, barras: [{ etiqueta, valor }] (hasta 4), pie }
export default function PageHeader({ lineas, bajada, dato }) {
  const [linea1, linea2] = lineas

  return (
    <header className="ac-hero">
      <h1 className="ac-mosaic ac-hero__l1" aria-label={lineas.join(' ')}>
        <span className="ac-mosaic__line">{linea1}</span>
      </h1>
      {dato && <TarjetaDato {...dato} />}
      <FotoCampo className="ac-hero__foto" />
      {linea2 && (
        <div className="ac-mosaic ac-hero__l2" aria-hidden="true">
          <span className="ac-mosaic__line">{linea2}</span>
        </div>
      )}
      {bajada && <p className="lead ac-hero__bajada">{bajada}</p>}
    </header>
  )
}

function TarjetaDato({ rotulo, valor, barras = [], pie, logo, logoAlt = 'Logo de la empresa' }) {
  const visibles = barras.slice(0, 4)
  const maximo = Math.max(...visibles.map((b) => Number(b.valor) || 0), 1)

  return (
    <div className={`ac-card ac-data ac-hero__kpi${logo ? ' ac-hero__kpi--logo' : ''}`}>
      {logo ? (
        <div className="ac-hero__marca-empresa">
          <div className="ac-hero__logo-emblema">
            <img className="ac-hero__logo" src={logo} alt={logoAlt} />
          </div>
          <div className="ac-hero__logo-texto">
            <span className="ac-eyebrow">GESTIÓN PARA EL CAMPO</span>
            <span className="ac-hero__logo-frase">Cada campaña, una nueva oportunidad para crecer.</span>
          </div>
        </div>
      ) : (
        <>
          <div className="ac-eyebrow" style={{ color: 'var(--fg-muted)' }}>
            {rotulo}
          </div>
          <div className="display-xl ac-num" style={{ color: 'var(--lime)' }}>
            {valor}
          </div>
          {visibles.length > 0 && (
            <>
              <svg className="ac-kpi__barras" viewBox="0 0 220 80" width="100%" height="80" aria-hidden="true">
                <line className="ac-kpi__eje" x1="0" y1="79" x2="220" y2="79" strokeWidth="1" />
                {visibles.map((b, i) => {
                  const cantidad = Number(b.valor) || 0
                  const alto = cantidad > 0 ? Math.max(4, Math.round((cantidad / maximo) * 69)) : 0
                  const ultima = i === visibles.length - 1
                  const anchoEspacio = 220 / visibles.length
                  const x = i * anchoEspacio + (anchoEspacio - 34) / 2
                  return <rect key={i} className={ultima ? 'f4' : 'f2'} x={x} y={79 - alto} width="34" height={alto} rx="3" />
                })}
              </svg>
              <div
                className="ac-eyebrow ac-kpi__pie"
                style={{ gridTemplateColumns: `repeat(${visibles.length}, minmax(0, 1fr))` }}
              >
                {visibles.map((b, i) => (
                  <span key={i}>{b.etiqueta}</span>
                ))}
              </div>
            </>
          )}
          {pie && (
            <div className="ac-eyebrow" style={{ color: 'var(--fg-muted)', marginTop: 'var(--space-2)' }}>
              {pie}
            </div>
          )}
        </>
      )}
    </div>
  )
}
