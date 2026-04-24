export function EntityHealthCard({
  entity,
  kpi,
}: {
  entity: { slug: string; label: string; abbr: string; color: string; activity: string }
  kpi: Record<string, unknown> | null
}) {
  const healthColor = !kpi ? 'var(--text-muted)'
    : kpi.health_status === 'healthy' ? 'var(--green)'
    : kpi.health_status === 'warning' ? 'var(--orange)'
    : kpi.health_status === 'critical' ? 'var(--red)'
    : 'var(--text-muted)'

  return (
    <a
      href={`/entities/${entity.slug}`}
      className="glass-card"
      style={{
        padding: '18px 20px',
        textDecoration: 'none',
        display: 'block',
        borderLeft: `3px solid ${entity.color}`,
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: entity.color, flexShrink: 0,
            boxShadow: `0 0 8px ${entity.color}50`,
          }} />
          <span style={{
            fontSize: 9, fontFamily: 'monospace', color: entity.color,
            letterSpacing: '0.10em', textTransform: 'uppercase', fontWeight: 600,
          }}>
            {entity.abbr}
          </span>
        </div>
        <span style={{
          fontSize: 9, fontFamily: 'monospace', padding: '2px 7px',
          borderRadius: 5, color: healthColor,
          background: kpi ? `${healthColor}12` : 'transparent',
          border: kpi ? `1px solid ${healthColor}25` : 'none',
          letterSpacing: '0.06em',
        }}>
          {kpi ? (kpi.health_status as string) : 'no data'}
        </span>
      </div>

      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 12, lineHeight: 1.3 }}>
        {entity.label}
      </div>

      {kpi?.kpi_1_label ? (
        <div style={{ display: 'flex', gap: 16 }}>
          <div>
            <div style={{
              fontSize: 9, color: 'var(--text-muted)', fontFamily: 'monospace',
              textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: 4,
            }}>
              {kpi.kpi_1_label as string}
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'monospace', color: entity.color }}>
              {kpi.kpi_1_value as string || '—'}
            </div>
          </div>
          {(kpi.kpi_2_label as string) && (
            <div>
              <div style={{
                fontSize: 9, color: 'var(--text-muted)', fontFamily: 'monospace',
                textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: 4,
              }}>
                {kpi.kpi_2_label as string}
              </div>
              <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'monospace', color: entity.color }}>
                {kpi.kpi_2_value as string || '—'}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
          No KPI data yet
        </div>
      )}
    </a>
  )
}
