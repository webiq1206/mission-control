export const dynamic = 'force-dynamic'

import { getDb } from '@/lib/db'
import { PageRefresher } from '@/components/ui/PageRefresher'
import { ClickableAgentCard } from '@/components/ui/ClickableAgentCard'
import { formatDistanceToNow } from 'date-fns'

export default async function AgentsPage() {
  const db = getDb()
  // Deduplicate: if multiple rows per agent_id, keep the one with most recent last_seen
  const agents = db.prepare(`
    SELECT * FROM agent_heartbeats
    WHERE (agent_id, last_seen) IN (
      SELECT agent_id, MAX(last_seen) FROM agent_heartbeats GROUP BY agent_id
    )
    ORDER BY
      CASE
        WHEN last_seen IS NULL THEN 3
        WHEN (julianday('now') - julianday(last_seen)) * 24 * 60 < 60 THEN 1
        ELSE 2
      END,
      agent_id
  `).all() as Record<string, unknown>[]

  const activeCount = agents.filter(a => {
    if (!a.last_seen) return false
    const mins = (Date.now() - new Date(a.last_seen as string).getTime()) / 60000
    return mins < 60
  }).length

  const idleCount = agents.filter(a => {
    if (!a.last_seen) return false
    const mins = (Date.now() - new Date(a.last_seen as string).getTime()) / 60000
    return mins >= 60 && mins < 180 
  }).length

  const errorCount = agents.filter(a => (a.error_count_24h as number) > 0).length

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200 }}>
      <PageRefresher />

      <div style={{ marginBottom: 28 }}>
        <div className="label" style={{ marginBottom: 6 }}>Mission Control</div>
        <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.5px' }}>Agent Team</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4, lineHeight: 1.6 }}>
          All {agents.length} agents across the Timber + Love system. 
          Active: {activeCount} · Idle: {idleCount} · Errors: {errorCount}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
        <div className="status-chip" style={{ minWidth: 100 }}>
          <div style={{ fontSize: 10, fontFamily: 'monospace', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Active</div>
          <div style={{ fontSize: 32, fontWeight: 600, fontFamily: 'monospace', color: activeCount > 0 ? 'var(--green)' : 'var(--text-muted)', lineHeight: 1 }}>{activeCount}</div>
        </div>
        <div className="status-chip" style={{ minWidth: 100 }}>
          <div style={{ fontSize: 10, fontFamily: 'monospace', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Idle</div>
          <div style={{ fontSize: 32, fontWeight: 600, fontFamily: 'monospace', color: idleCount > 0 ? 'var(--yellow)' : 'var(--text-muted)', lineHeight: 1 }}>{idleCount}</div>
        </div>
        <div className="status-chip" style={{ minWidth: 100 }}>
          <div style={{ fontSize: 10, fontFamily: 'monospace', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Errors</div>
          <div style={{ fontSize: 32, fontWeight: 600, fontFamily: 'monospace', color: errorCount > 0 ? 'var(--red)' : 'var(--text-muted)', lineHeight: 1 }}>{errorCount}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
        {agents.map(agent => {
          const lastSeen = agent.last_seen as string | null
          let statusColor = 'var(--text-faint)'
          let statusLabel = 'Offline'
          let isPulsing = false
          let isInactive = false
          if (lastSeen) {
            const mins = (Date.now() - new Date(lastSeen).getTime()) / 60000
            if (mins < 60) { statusColor = 'var(--green)'; statusLabel = 'Active'; isPulsing = true }
            else if (mins < 120) { statusColor = 'var(--yellow)'; statusLabel = 'Idle' }
            else { statusColor = 'var(--amber)'; statusLabel = 'Inactive'; isInactive = true }
          }
          const hasError = (agent.error_count_24h as number) > 0

          return (
            <ClickableAgentCard key={agent.agent_id as string} data={agent}>
              <div className="glass-card light-shadow-on-hover" style={{
                borderLeft: `3px solid ${statusColor}`,
                padding: '18px',
                boxShadow: hasError
                  ? '0 0 12px rgba(224,82,82,0.2), var(--shadow-card)'
                  : undefined,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 22 }}>{agent.emoji as string}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                      {agent.agent_name as string}
                    </h3>
                    {agent.model && (
                      <div style={{ fontSize: 9, color: 'var(--text-faint)', fontFamily: 'monospace', marginTop: 1 }}>
                        {agent.model as string}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                    <span style={{
                      width: 9, height: 9, borderRadius: '50%', background: statusColor,
                      boxShadow: isPulsing ? `0 0 6px ${statusColor}` : 'none',
                      animation: isPulsing ? 'pulse-glow 2s ease-in-out infinite' : undefined,
                    }} />
                    {isInactive && (
                      <span style={{
                        fontSize: 8, fontFamily: 'monospace', padding: '1px 5px', borderRadius: 4,
                        background: 'var(--amber-bg)', color: 'var(--amber)', border: '1px solid var(--amber-border)',
                        textTransform: 'uppercase', fontWeight: 700,
                      }}>INACTIVE</span>
                    )}
                  </div>
                </div>

                <div style={{ fontSize: 11, color: statusColor, fontFamily: 'monospace', marginBottom: 6 }}>
                  {statusLabel}
                </div>

                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.4 }}>
                  {agent.role as string}
                </div>

                <div style={{
                  fontSize: 11, color: hasError ? 'var(--red)' : 'var(--text-body)', lineHeight: 1.5,
                  overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  marginBottom: 8,
                } as React.CSSProperties}>
                  {(agent.current_task as string) || 'No active task'}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    {lastSeen ? formatDistanceToNow(new Date(lastSeen), { addSuffix: true }) : 'never'}
                  </div>
                  {hasError && (
                    <span style={{
                      fontSize: 10, fontFamily: 'monospace', color: 'var(--red)',
                      padding: '1px 6px', borderRadius: 4,
                      background: 'var(--red-bg)', border: '1px solid var(--red-border)',
                    }}>
                      {agent.error_count_24h as number} err
                    </span>
                  )}
                </div>
              </div>
            </ClickableAgentCard>
          )
        })}
      </div>
    </div>
  )
}
