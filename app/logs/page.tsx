import { getDb } from '@/lib/db'
import { AGENTS, ENTITIES } from '@/lib/entities'
import { formatDistanceToNow, format } from 'date-fns'
import { ClickableLogRow } from '@/components/ui/ClickableLogRow'

export const dynamic = 'force-dynamic'

function getAgentInfo(agentId: string) {
  const agent = AGENTS.find(
    a => a.id === agentId || a.name.toLowerCase() === agentId?.toLowerCase()
  )
  return agent || null
}

function getEntityColor(entityStr: string): string {
  const entity = ENTITIES.find(
    e => e.label === entityStr || e.slug === entityStr
  )
  return entity?.color || 'var(--text-muted)'
}

function getActionBadge(action: string): { label: string; bg: string; color: string } {
  switch (action) {
    case 'heartbeat':
      return { label: 'HEARTBEAT', bg: 'rgba(85,85,85,0.1)', color: 'var(--text-muted)' }
    case 'blocked':
      return { label: 'BLOCKED', bg: 'var(--red-dim)', color: 'var(--red)' }
    case 'task_completed':
      return { label: 'COMPLETED', bg: 'var(--green-dim)', color: 'var(--green)' }
    case 'task_in_progress':
      return { label: 'IN PROGRESS', bg: 'var(--blue-dim)', color: 'var(--blue)' }
    case 'system':
      return { label: 'SYSTEM', bg: 'var(--purple-dim)', color: 'var(--purple)' }
    case 'error':
      return { label: 'ERROR', bg: 'var(--red-dim)', color: 'var(--red)' }
    case 'task_assigned':
      return { label: 'ASSIGNED', bg: 'var(--orange-dim)', color: 'var(--orange)' }
    case 'approval_requested':
      return { label: 'APPROVAL', bg: 'var(--yellow-dim)', color: 'var(--yellow)' }
    default:
      return { label: action.toUpperCase().replace(/_/g, ' '), bg: 'rgba(85,85,85,0.1)', color: 'var(--text-secondary)' }
  }
}

function formatTimestamp(ts: string): string {
  try {
    const date = new Date(ts)
    const agoMs = Date.now() - date.getTime()
    const agoMin = Math.floor(agoMs / 60000)
    if (agoMin < 60) {
      return `${agoMin}m ago`
    }
    const agoHr = Math.floor(agoMin / 60)
    if (agoHr < 24) {
      return `${agoHr}h ago`
    }
    return format(date, 'MMM d')
  } catch {
    return ts.slice(0, 10)
  }
}

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; agent?: string; limit?: string }>
}) {
  const params = await searchParams
  const db = getDb()
  const limit = parseInt(params.limit || '100')

  let query = 'SELECT * FROM activity WHERE 1=1'
  const qParams: unknown[] = []

  if (params.agent) {
    query += ' AND agent = ?'
    qParams.push(params.agent)
  }
  if (params.tag) {
    query += ' AND tags LIKE ?'
    qParams.push(`%${params.tag}%`)
  }

  query += ' ORDER BY created_at DESC LIMIT ?'
  qParams.push(limit)

  const logs = db.prepare(query).all(...qParams) as Record<string, unknown>[]

  const ACTION_FILTERS = ['all', 'heartbeat', 'task_in_progress', 'task_completed', 'blocked', 'system', 'error']

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200 }}>
      <div style={{ marginBottom: 28 }}>
        <div className="label" style={{ marginBottom: 4 }}>Mission Control</div>
        <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.5px', marginBottom: 8 }}>Activity Logs</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5 }}>
          Displaying {logs.length} entries{params.tag ? ` tagged "${params.tag}"` : ''}{params.agent ? ` by ${params.agent}` : ''}
        </p>
      </div>

      {/* Action filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {ACTION_FILTERS.map(t => {
          const badge = t !== 'all' ? getActionBadge(t) : null
          const isActive = (t === 'all' && !params.tag) || params.tag === t
          return (
            <a key={t} href={t === 'all' ? '/logs' : `/logs?tag=${t}`} style={{
              padding: '4px 12px', borderRadius: 6, fontSize: 11, fontFamily: 'monospace',
              textDecoration: 'none', border: '1px solid var(--border-subtle)',
              background: isActive ? (badge?.bg || 'var(--bg-elevated)') : 'transparent',
              color: isActive ? (badge?.color || 'var(--text-primary)') : 'var(--text-muted)',
              transition: 'background 0.15s, color 0.15s',
            }}>
              {t}
            </a>
          )
        })}
      </div>

      {logs.length === 0 ? (
        <div className="glass-card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, borderRadius: 10 }}>
          No activity logged yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'relative' }}>
          <div style={{
            position: 'absolute', left: 18, top: 0, bottom: 0,
            width: 2, background: 'rgba(255,255,255,0.08)',
          }} />
          {logs.map(log => {
            const agentInfo = getAgentInfo(log.agent as string)
            const badge = getActionBadge(log.action as string)
            const entityColor = getEntityColor(log.entity as string)
            const entityStr = (log.entity as string) || 'Global'
            const detail = (log.detail as string) || (log.action as string)

            return (
              <ClickableLogRow
                key={log.id as number}
                data={{
                  id: log.id as number,
                  agent: log.agent as string,
                  entity: log.entity as string,
                  action: log.action as string,
                  detail: log.detail as string,
                  task_id: log.task_id as string,
                  tags: log.tags as string,
                  created_at: log.created_at as string,
                }}
              >
                <div className="glass-card" style={{
                  borderRadius: 10, padding: '16px 18px',
                  borderLeft: `3px solid ${badge.color}40`,
                  display: 'flex', alignItems: 'flex-start', gap: 16,
                  position: 'relative',
                  marginLeft: 40,
                  transition: 'border-color 0.15s',
                }}>
                  <div style={{
                    position: 'absolute', left: -26, top: 18,
                    width: 14, height: 14, borderRadius: '50%', background: badge.color,
                    border: '2px solid var(--bg-base)',
                    boxShadow: `0 0 10px ${badge.color}60`,
                    flexShrink: 0,
                  }} />
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'flex', gap: 8, alignItems: 'center',
                      marginBottom: 6, flexWrap: 'wrap',
                    }}>
                      <span style={{
                        fontSize: 12, fontWeight: 500, color: 'var(--text-primary)',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        {agentInfo ? (
                          <>{agentInfo.emoji} {agentInfo.name}</>
                        ) : (
                          <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{log.agent as string}</span>
                        )}
                      </span>

                      <span style={{
                        fontSize: 9, fontFamily: 'monospace', fontWeight: 600,
                        letterSpacing: '0.06em', padding: '2px 6px', borderRadius: 4,
                        background: badge.bg, color: badge.color,
                        border: `1px solid ${badge.color}30`,
                      }}>
                        {badge.label}
                      </span>

                      <span style={{
                        fontSize: 9, fontFamily: 'monospace', padding: '2px 6px', borderRadius: 4,
                        background: `color-mix(in srgb, ${entityColor} 8.2%, transparent)`, color: entityColor,
                        border: `1px solid color-mix(in srgb, ${entityColor} 18.8%, transparent)`,
                        display: 'flex', alignItems: 'center', gap: 4,
                        letterSpacing: '0.06em',
                      }}>
                        <span style={{
                          width: 5, height: 5, borderRadius: '50%',
                          background: entityColor, display: 'inline-block', flexShrink: 0,
                        }} />
                        {entityStr}
                      </span>

                      <span style={{
                        marginLeft: 'auto', fontSize: 10, fontFamily: 'monospace',
                        color: 'var(--text-muted)', flexShrink: 0,
                      }}>
                        {formatTimestamp(log.created_at as string)}
                      </span>
                    </div>

                    <div style={{
                      fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6,
                      whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    }}>
                      {detail}
                    </div>
                  </div>
                </div>
              </ClickableLogRow>
            )
          })}
        </div>
      )}
    </div>
  )
}
