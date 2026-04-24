'use client'

interface KPICardProps {
  label: string
  value: string | number
  trend?: 'up' | 'down' | 'flat' | null
  trendLabel?: string
  color?: string
  style?: React.CSSProperties
}

const TREND_ICONS: Record<string, { icon: string; color: string }> = {
  up:   { icon: '↑', color: 'var(--green)' },
  down: { icon: '↓', color: 'var(--red)' },
  flat: { icon: '→', color: 'var(--text-muted)' },
}

export function KPICard({ label, value, trend, trendLabel, color, style }: KPICardProps) {
  const trendConfig = trend ? TREND_ICONS[trend] : null

  return (
    <div
      className="card"
      style={{
        padding: 'var(--sp-5)',
        minHeight: 100,
        position: 'relative',
        overflow: 'hidden',
        borderTopWidth: 2,
        borderTopStyle: 'solid',
        borderTopColor: color || 'var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        ...style,
      }}
    >
      <div
        className="label"
        style={{ marginBottom: 'var(--sp-2)' }}
      >
        {label}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span
          className="value-xl"
          style={color ? { color } : undefined}
        >
          {value}
        </span>

        {trendConfig && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <span style={{ color: trendConfig.color, fontSize: 14, fontWeight: 600 }}>
              {trendConfig.icon}
            </span>
            {trendLabel && (
              <span style={{ fontSize: 11, color: trendConfig.color, fontFamily: 'var(--font-mono)' }}>
                {trendLabel}
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  )
}
