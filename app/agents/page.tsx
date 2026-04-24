export const dynamic = 'force-dynamic'

import { getDb } from '@/lib/db'
import { PageRefresher } from '@/components/ui/PageRefresher'
import { ClickableAgentCard } from '@/components/ui/ClickableAgentCard'
import { formatDistanceToNow } from 'date-fns'

export default async function AgentsPage() {
  const db = getDb()
  const agents = db.prepare('SELECT * FROM agent_heartbeats ORDER BY agent_id').all() as Record<string, unknown>[]

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
          let statusColor = 'var(--red)'
          let isPulsing = false
          if (lastSeen) {
            const mins = (Date.now() - new Date(lastSeen).getTime()) / 60000
            if (mins < 60) { statusColor = 'var(--green)'; isPulsing = true }
            else if (mins < 180) { statusColor = 'var(--yellow)' }
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 24 }}>{agent.emoji as string}</span>
                  <h3 style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)' }}>{agent.agent_name as string}</h3>
                   <span style={{
                      width: 10, height: 10, borderRadius: '50%', background: statusColor,
                      display: 'inline-block', flexShrink: 0, marginLeft: 'auto',
                      boxShadow: isPulsing ? `0 0 6px ${statusColor}` : 'none',
                      animation: isPulsing ? 'pulse-glow 2s ease-in-out infinite' : undefined,
                    }} />
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', flexGrow: 1, marginBottom: 8 }}>
                  {agent.role as string}
                  {hasError && <span style={{ color: 'var(--red)', marginLeft: 8 }}>({(agent.error_count_24h as number)} errors)</span>}
                </div>
                <div style={{
                  fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5,
                  overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  marginBottom: 10,
                } as React.CSSProperties}>
                  {(agent.current_task as string) || 'No active task'}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  Last seen: {lastSeen ? formatDistanceToNow(new Date(lastSeen), { addSuffix: true }) : <span style={{color: 'var(--red)'}}>never checked in</span>}
                </div>
              </div>
            </ClickableAgentCard>
          )
        })}
      </div>
    </div>
  )
}
