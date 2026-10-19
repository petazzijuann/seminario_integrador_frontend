// Ficha: components/CatalogoHeader.md
// Encabezado de los catálogos (Lotes, Semillas, Insumos, Labores). No usa el mosaico:
// PageHeader queda reservado para la entrada de los casos de uso.
export default function CatalogoHeader({ eyebrow = '', titulo, bajada, acciones }) {
  return (
    <header className="ac-catalogo-head">
      <div>
        <span className="ac-eyebrow" style={{ color: 'var(--fg-muted)' }}>
          {eyebrow}
        </span>
        <h1 className="ac-display display-l">{titulo}</h1>
        {bajada && <p className="body">{bajada}</p>}
      </div>
      {acciones && <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>{acciones}</div>}
    </header>
  )
}
