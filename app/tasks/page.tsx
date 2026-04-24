export const dynamic = 'force-dynamic'

import { getDb } from '@/lib/db'
import { ENTITIES } from '@/lib/entities'
import { PageRefresher } from '@/components/ui/PageRefresher'
import { ClickableTaskRow } from '@/components/ui/ClickableTaskRow'

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string; status?: string }>
}) {
  const params = await searchParams
  const db = getDb()

  const statusCounts = db.prepare(`
    SELECT status, COUNT(*) as count FROM tasks GROUP BY status
  `).all() as { status: string; count: number }[]

  const countMap: Record<string, number> = {}
  for (const row of statusCounts) countMap[row.status] = row.count
  const allCount = statusCounts.reduce((s, r) => s + r.count, 0)

  let query = 'SELECT * FROM tasks WHERE 1=1'
  const qParams: unknown[] = []

  if (params.entity) {
    const ent = ENTITIES.find(e => e.slug === params.entity)
    if (ent) {
      query += ' AND (entity = ? OR entity = ?)'
      qParams.push(ent.label, ent.slug)
    }
  }
  if (params.status) {
    query += ' AND status = ?'
    qParams.push(params.status)
  }

  query += " ORDER BY CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 END, updated_at DESC LIMIT 200"

  const tasks = db.prepare(query).all(...qParams) as Record<string, unknown>[]

  const PRIORITY_COLORS: Record<string, string> = {
    critical: 'var(--red)', high: 'var(--amber)', medium: 'var(--amber)', low: 'var(--text-muted)',
  }
  const STATUS_COLORS: Record<string, string> = {
    backlog: 'var(--text-muted)', proposed: 'var(--amber)', approval_gated: 'var(--amber)',
    approved: 'var(--blue)', executing: 'var(--blue)', review: 'var(--amber)',
    blocked: 'var(--red)', completed: 'var(--green)',
  }

  const FILTERS = ['all', 'executing', 'proposed', 'review', 'blocked', 'backlog', 'completed']
  const activeFilter = params.status || 'all'

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200 }}>
      <PageRefresher />

      <div style={{ marginBottom: 24 }}>
        <div className="label" style={{ marginBottom: 6 }}>Mission Control</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.5px' }}>Tasks</h1>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
            {tasks.length} {activeFilter !== 'all' ? `${activeFilter}` : 'total'}
            {params.entity ? ` · ${params.entity}` : ''}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace', marginRight: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Filter:
        </span>
        {FILTERS.map(s => {
          const isActive = (s === 'all' && !params.status) || params.status === s
          const count = s === 'all' ? allCount : (countMap[s] || 0)
          return (
            <a
              key={s}
              href={s === 'all' ? '/tasks' : `/tasks?status=${s}${params.entity ? `&entity=${params.entity}` : ''}`}
              style={{
                padding: '5px 14px', borderRadius: 6, fontSize: 11, fontFamily: 'monospace',
                textDecoration: 'none',
                border: `1px solid ${isActive ? 'var(--border-default)' : 'var(--border-faint)'}`,
                background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: isActive ? 600 : 400,
                transition: 'all 0.2s ease',
              }}
            >
              {s} {count > 0 ? `(${count})` : ''}
            </a>
          )
        })}
      </div>

      {tasks.length === 0 ? (
        <div className="card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
          No tasks found.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {tasks.map(task => {
            const statusTint = STATUS_COLORS[task.status as string] || 'var(--text-muted)'
            return (
            <ClickableTaskRow key={task.id as string} taskId={task.id as string}>
              <div className="card light-shadow-on-hover" style={{
                padding: '12px 16px',
                borderLeft: `3px solid ${PRIORITY_COLORS[task.priority as string] || 'var(--border-faint)'}`,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <span style={{
                  fontSize: 9, fontFamily: 'monospace', padding: '2px 7px', borderRadius: 5,
                  color: statusTint,
                  background: `color-mix(in srgb, ${statusTint} 7%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${statusTint} 12.5%, transparent)`,
                  minWidth: 64, textAlign: 'center', textTransform: 'uppercase', flexShrink: 0,
                }}>
                  {task.status as string}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{task.title as string}</div>
                  {(task.dod as string) && (
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, fontStyle: 'italic' }}>
                      Done: {task.dod as string}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace', flexShrink: 0 }}>
                  {task.entity as string}
                </span>
                {(task.assigned_agent as string) && (
                  <span style={{
                    fontSize: 10, fontFamily: 'monospace', padding: '2px 6px', borderRadius: 5,
                    background: 'var(--bg-elevated)', color: 'var(--text-muted)',
                    border: '1px solid var(--border-subtle)', flexShrink: 0,
                  }}>
                    {task.assigned_agent as string}
                  </span>
                )}
              </div>
            </ClickableTaskRow>
            )
          })}
        </div>
      )}
    </div>
  )
}
