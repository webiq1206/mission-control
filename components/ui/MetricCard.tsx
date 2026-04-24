export function MetricCard({
  label, value, sub, color,
}: {
  label: string
  value: string | number
  sub?: string
  color?: string
}) {
  const colorVar = color ? `var(--${color})` : 'var(--text-primary)'
  const dimVar = color ? `var(--${color}-dim)` : undefined

  return (
    <div className="card" style={{
      padding: '16px 18px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div className="label" style={{ marginBottom: 8 }}>{label}</div>
      <div style={{
        fontSize: 28, fontWeight: 700, fontFamily: 'monospace',
        color: colorVar,
        lineHeight: 1,
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
          {sub}
        </div>
      )}
      {dimVar && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 'var(--r-lg)',
          background: dimVar, pointerEvents: 'none', opacity: 0.25,
        }} />
      )}
    </div>
  )
}
