/**
 * BMH Data Health — /bmh/data-health
 * Entity: Buy My House Boise
 * Author: Kai (Developer Agent) | 2026-04-23
 *
 * Shows per-source health status for BMH data ingestion pipelines.
 * Status cards: PropStream, Zillow, Realtor.com, County Records.
 * Updated automatically by pipeline scripts after each run.
 */

export const dynamic = 'force-dynamic'

import Link from 'next/link'

interface DataSource {
  id: string
  label: string
  last_run_at: string | null
  records_updated: number
  status: 'ok' | 'warning' | 'error'
  error_message: string | null
}

// Status badge color and label lookup
const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  ok:      { color: '#22C55E', bg: 'rgba(34,197,94,0.12)',   label: 'OK' },
  warning: { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  label: 'Warning' },
  error:   { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   label: 'Error' },
}

async function fetchDataSources(token: string): Promise<DataSource[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3333'}/api/bmh/data-sources/status`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) return []
  const data = await res.json() as { sources: DataSource[] }
  return data.sources || []
}

/** Formats ISO datetime string as a human-readable relative time */
function formatLastRun(isoString: string | null): string {
  if (!isoString) return 'Never'
  try {
    const diff = Date.now() - new Date(isoString).getTime()
    const hours = Math.floor(diff / 3600000)
    if (hours < 1) return 'Less than 1 hour ago'
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  } catch {
    return isoString
  }
}

export default async function DataHealthPage() {
  const token = process.env.NEXT_PUBLIC_GATEWAY_TOKEN || ''
  const sources = await fetchDataSources(token)

  return (
    <div style={{ padding: '28px 32px', maxWidth: 900, minHeight: '100%' }}>

      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 'var(--sp-6)' }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          <Link href="/bmh" style={{ color: 'var(--bmh-accent)', textDecoration: 'none' }}>BMH Dashboard</Link>
          {' → '}Data Health
        </div>
        <h1 className="h1">Data Source Health</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
          Ingestion pipeline status for all BMH data sources
        </p>
      </div>

      {sources.length === 0 ? (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-faint)',
          borderRadius: 8, padding: 'var(--sp-8)', textAlign: 'center',
        }}>
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>No data source records found.</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
            Sources populate after the first pipeline run.
          </div>
        </div>
      ) : (
        /* 2-col grid on desktop, 1-col on mobile */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 'var(--sp-4)',
        }}
          className="data-health-grid"
        >
          {sources.map(source => {
            const statusCfg = STATUS_CONFIG[source.status] || STATUS_CONFIG.ok

            return (
              <div key={source.id} style={{
                background: 'var(--bg-card)',
                border: `1px solid var(--border-faint)`,
                borderLeft: `3px solid ${statusCfg.color}`,  // left-border accent signals status
                borderRadius: 8,
                padding: 'var(--sp-5)',
              }}>
                {/* Source name + status badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-4)' }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {source.label}
                  </span>
                  <span style={{
                    background: statusCfg.bg,
                    color: statusCfg.color,
                    fontSize: 11, fontWeight: 600,
                    padding: '2px 10px', borderRadius: 4,
                  }}>
                    {statusCfg.label}
                  </span>
                </div>

                {/* Last run + records */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Last run</span>
                    <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                      {formatLastRun(source.last_run_at)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Records updated</span>
                    <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                      {source.records_updated.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Error message — only shown when status=error */}
                {source.status === 'error' && source.error_message && (
                  <div style={{
                    marginTop: 'var(--sp-3)',
                    padding: 'var(--sp-3)',
                    background: 'rgba(239,68,68,0.08)',
                    borderRadius: 4,
                    fontSize: 12, color: '#EF4444',
                    fontFamily: 'var(--font-geist-mono)',
                  }}>
                    {source.error_message}
                  </div>
                )}

                {/* Warning message */}
                {source.status === 'warning' && source.error_message && (
                  <div style={{
                    marginTop: 'var(--sp-3)',
                    padding: 'var(--sp-3)',
                    background: 'rgba(245,158,11,0.08)',
                    borderRadius: 4,
                    fontSize: 12, color: '#F59E0B',
                  }}>
                    {source.error_message}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Mobile: single column */}
      <style>{`
        @media (max-width: 768px) {
          .data-health-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
