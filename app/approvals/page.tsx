export const dynamic = 'force-dynamic'

import { getDb } from '@/lib/db'
import { PageRefresher } from '@/components/ui/PageRefresher'
import { ApprovalCard } from '@/components/approvals/ApprovalCard'
import { ClickableTaskRow } from '@/components/ui/ClickableTaskRow'
import { EntityBadge } from '@/components/ui/EntityBadge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ClickableApprovalRow } from '@/components/ui/ClickableApprovalRow'
import Link from 'next/link'

type SearchParams = { tab?: string; entity?: string }

function ageDays(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (24 * 60 * 60 * 1000))
}

export default async function NeedsAttentionPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const activeTab = params.tab || 'all'
  const entityFilter = params.entity || ''

  const db = getDb()

  const entityClause = entityFilter ? `AND entity = '${entityFilter.replace(/'/g, "''")}'` : ''

  const allPending = db.prepare(`
    SELECT a.*, t.title AS task_title, t.status AS task_status
    FROM approvals a
    LEFT JOIN tasks t ON a.task_id = t.id
    WHERE a.status = 'pending' ${entityClause}
    ORDER BY
      CASE a.urgency WHEN 'critical' THEN 1 WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
      a.created_at ASC
  `).all() as Record<string, unknown>[]

  const blockedTasks = db.prepare(`
    SELECT id, title, entity, priority, status, updated_at, created_at, description, assigned_agent
    FROM tasks WHERE status = 'blocked' ${entityClause}
    ORDER BY
      CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
      updated_at ASC
  `).all() as Record<string, unknown>[]

  const recentlyActioned = db.prepare(`
    SELECT * FROM approvals
    WHERE status IN ('approved','rejected','dismissed','archived')
    ${entityClause}
    ORDER BY decided_at DESC LIMIT 20
  `).all() as Record<string, unknown>[]

  const entities = db.prepare(`
    SELECT DISTINCT entity FROM approvals WHERE status='pending'
    UNION
    SELECT DISTINCT entity FROM tasks WHERE status='blocked'
    ORDER BY entity
  `).all() as { entity: string }[]

  // Tab filtering
  const criticalItems = allPending.filter(a => ['critical','urgent'].includes(a.urgency as string))
  const highItems = allPending.filter(a => a.urgency === 'high')

  const tabItems = activeTab === 'critical' ? criticalItems
    : activeTab === 'high' ? highItems
    : activeTab === 'approvals' ? allPending
    : activeTab === 'blocked' ? []
    : allPending // 'all'

  const totalCount = allPending.length + blockedTasks.length
  const criticalCount = criticalItems.length
  const staleCount = allPending.filter(a => ageDays(a.created_at as string) >= 7).length

  function tabUrl(tab: string) {
    const p = new URLSearchParams()
    p.set('tab', tab)
    if (entityFilter) p.set('entity', entityFilter)
    return `/approvals?${p}`
  }
  function entityUrl(ent: string) {
    const p = new URLSearchParams()
    if (activeTab !== 'all') p.set('tab', activeTab)
    if (ent) p.set('entity', ent)
    return `/approvals${p.toString() ? '?' + p : ''}`
  }

  const tabStyle = (tab: string) => ({
    padding: '6px 16px', borderRadius: 6, fontSize: 12, fontFamily: 'var(--font-mono)',
    textDecoration: 'none',
    border: `1px solid ${activeTab === tab ? 'var(--amber-border)' : 'var(--border-faint)'}`,
    background: activeTab === tab ? 'var(--amber-bg)' : 'transparent',
    color: activeTab === tab ? 'var(--amber)' : 'var(--text-muted)',
    fontWeight: activeTab === tab ? 600 : 400,
  })

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200 }}>
      <PageRefresher />

      {/* Header */}
      <div style={{ marginBottom: 'var(--sp-5)' }}>
        <div className="label" style={{ marginBottom: 6 }}>Mission Control</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <h1 className="h1">Needs Your Attention</h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {totalCount > 0 && (
              <span style={{
                fontSize: 11, fontFamily: 'var(--font-mono)', padding: '3px 10px', borderRadius: 20,
                background: 'var(--amber-bg)', color: 'var(--amber)', border: '1px solid var(--amber-border)',
              }}>
                {totalCount} item{totalCount !== 1 ? 's' : ''}
              </span>
            )}
            {criticalCount > 0 && (
              <span style={{
                fontSize: 11, fontFamily: 'var(--font-mono)', padding: '3px 10px', borderRadius: 20,
                background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid var(--red-border)',
              }}>
                {criticalCount} critical / urgent
              </span>
            )}
            {staleCount > 0 && (
              <span style={{
                fontSize: 11, fontFamily: 'var(--font-mono)', padding: '3px 10px', borderRadius: 20,
                background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)',
              }}>
                {staleCount} stale (7d+)
              </span>
            )}
          </div>
        </div>
        <p className="body-xs" style={{ marginTop: 4, color: 'var(--text-secondary)' }}>
          Pending decisions, blocked tasks, and items requiring your attention. Sorted oldest-first.
        </p>
      </div>

      {/* Filters row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--sp-5)', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <Link href={tabUrl('all')} style={tabStyle('all')}>
            All ({totalCount})
          </Link>
          <Link href={tabUrl('critical')} style={tabStyle('critical')}>
            Critical ({criticalCount})
          </Link>
          <Link href={tabUrl('high')} style={tabStyle('high')}>
            High ({highItems.length})
          </Link>
          <Link href={tabUrl('approvals')} style={tabStyle('approvals')}>
            Approvals ({allPending.length})
          </Link>
          <Link href={tabUrl('blocked')} style={tabStyle('blocked')}>
            Blocked ({blockedTasks.length})
          </Link>
          <Link href={tabUrl('archive')} style={tabStyle('archive')}>
            Archive ({recentlyActioned.length})
          </Link>
        </div>

        {/* Entity filter */}
        {entities.length > 1 && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, alignItems: 'center' }}>
            <span className="meta">Filter:</span>
            <Link href={entityUrl('')} style={{
              padding: '4px 10px', borderRadius: 6, fontSize: 11,
              border: `1px solid ${!entityFilter ? 'var(--blue-border)' : 'var(--border-faint)'}`,
              background: !entityFilter ? 'var(--blue-bg)' : 'transparent',
              color: !entityFilter ? 'var(--blue)' : 'var(--text-muted)',
              textDecoration: 'none',
            }}>All</Link>
            {entities.map(e => (
              <Link key={e.entity} href={entityUrl(e.entity)} style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 11,
                border: `1px solid ${entityFilter === e.entity ? 'var(--blue-border)' : 'var(--border-faint)'}`,
                background: entityFilter === e.entity ? 'var(--blue-bg)' : 'transparent',
                color: entityFilter === e.entity ? 'var(--blue)' : 'var(--text-muted)',
                textDecoration: 'none',
              }}>{e.entity}</Link>
            ))}
          </div>
        )}
      </div>

      {/* ─── ARCHIVE TAB ──────────────────────────────────────────────── */}
      {activeTab === 'archive' && (
        <section>
          {recentlyActioned.length === 0 ? (
            <div className="card" style={{ padding: 'var(--sp-6)', textAlign: 'center' }}>
              <div className="body-xs">No archived approvals.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {recentlyActioned.map(a => (
                <ClickableApprovalRow
                  key={a.id as string}
                  data={{
                    id: a.id as string, type: a.type as string, entity: a.entity as string,
                    urgency: a.urgency as string, requested_by: a.requested_by as string,
                    title: a.title as string, description: a.description as string,
                    cost_estimate: a.cost_estimate as string, created_at: a.created_at as string,
                    expires_at: a.expires_at as string, status: a.status as string,
                    decided_at: a.decided_at as string, approval_category: a.approval_category as string | null,
                  }}
                >
                  <div className="card" style={{
                    padding: 'var(--sp-2) var(--sp-4)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    cursor: 'pointer',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                      <StatusBadge status={a.status as string} />
                      <span className="body-sm" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.title as string}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <EntityBadge entity={a.entity as string} />
                      <span className="meta">
                        {a.decided_at ? new Date(a.decided_at as string).toLocaleDateString() : ''}
                      </span>
                    </div>
                  </div>
                </ClickableApprovalRow>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ─── BLOCKED TASKS TAB ──────────────────────────────────────────── */}
      {activeTab === 'blocked' && (
        <section>
          {blockedTasks.length === 0 ? (
            <div className="card" style={{ padding: 'var(--sp-6)', textAlign: 'center' }}>
              <div style={{ color: 'var(--green)', fontSize: 14, marginBottom: 4 }}>No blocked tasks</div>
              <div className="body-xs">All tasks are flowing.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {blockedTasks.map(t => {
                const days = ageDays((t.updated_at as string) || (t.created_at as string))
                const isLong = days > 3
                return (
                  <ClickableTaskRow key={t.id as string} taskId={t.id as string}>
                    <div style={{
                      padding: 'var(--sp-4)',
                      borderRadius: 8,
                      background: isLong ? 'rgba(255,69,58,0.06)' : 'var(--bg-card)',
                      border: `1px solid ${isLong ? 'var(--red-border)' : 'var(--border-subtle)'}`,
                      borderLeft: `3px solid var(--red)`,
                      cursor: 'pointer',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <EntityBadge entity={t.entity as string} />
                        <span style={{
                          fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 7px', borderRadius: 10,
                          background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid var(--red-border)',
                        }}>
                          {isLong ? `${days}d BLOCKED` : 'BLOCKED'}
                        </span>
                        <span className="meta" style={{ marginLeft: 'auto' }}>{t.assigned_agent as string}</span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>
                        {t.title as string}
                      </div>
                      {t.description && (
                        <div className="body-xs line-clamp-2">{t.description as string}</div>
                      )}
                    </div>
                  </ClickableTaskRow>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* ─── ALL / CRITICAL / HIGH / APPROVALS TABS ───────────────────── */}
      {activeTab !== 'archive' && activeTab !== 'blocked' && (
        <div>
          {/* Approvals section */}
          {tabItems.length > 0 && (
            <section style={{ marginBottom: blockedTasks.length > 0 && activeTab === 'all' ? 'var(--sp-8)' : 0 }}>
              {activeTab === 'all' && (
                <div className="label" style={{ marginBottom: 'var(--sp-3)', color: 'var(--amber)' }}>
                  PENDING APPROVALS — {allPending.length}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {tabItems.map(a => (
                  <ApprovalCard
                    key={a.id as string}
                    id={a.id as string}
                    type={a.type as string}
                    entity={a.entity as string}
                    urgency={a.urgency as string}
                    requested_by={a.requested_by as string}
                    title={a.title as string}
                    description={a.description as string}
                    cost_estimate={a.cost_estimate as string | undefined}
                    created_at={a.created_at as string}
                    expires_at={a.expires_at as string | undefined}
                    task_id={a.task_id as string | undefined}
                    task_title={a.task_title as string | undefined}
                    approval_category={a.approval_category as string | null}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Blocked tasks shown in 'all' tab */}
          {activeTab === 'all' && blockedTasks.length > 0 && (
            <section>
              <div className="label" style={{ marginBottom: 'var(--sp-3)', color: 'var(--red)' }}>
                BLOCKED TASKS — {blockedTasks.length}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {blockedTasks.slice(0, 8).map(t => {
                  const days = ageDays((t.updated_at as string) || (t.created_at as string))
                  const isLong = days > 3
                  return (
                    <ClickableTaskRow key={t.id as string} taskId={t.id as string}>
                      <div style={{
                        padding: 'var(--sp-3) var(--sp-4)', borderRadius: 6,
                        background: isLong ? 'rgba(255,69,58,0.06)' : 'var(--bg-elevated)',
                        border: `1px solid ${isLong ? 'var(--red-border)' : 'var(--border-subtle)'}`,
                        borderLeft: `3px solid var(--red)`,
                        display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                      }}>
                        <EntityBadge entity={t.entity as string} />
                        <span className="body-sm" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.title as string}
                        </span>
                        {isLong && (
                          <span style={{ fontSize: 10, color: 'var(--red)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                            {days}d blocked
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: 'var(--red)', flexShrink: 0 }}>Resolve →</span>
                      </div>
                    </ClickableTaskRow>
                  )
                })}
                {blockedTasks.length > 8 && (
                  <Link href={tabUrl('blocked')} style={{ textDecoration: 'none' }}>
                    <div style={{
                      padding: 'var(--sp-3)', textAlign: 'center',
                      borderRadius: 6, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                    }}>
                      <span className="body-sm" style={{ color: 'var(--blue)' }}>
                        + {blockedTasks.length - 8} more blocked tasks →
                      </span>
                    </div>
                  </Link>
                )}
              </div>
            </section>
          )}

          {/* All clear */}
          {tabItems.length === 0 && (activeTab !== 'all' || blockedTasks.length === 0) && (
            <div className="card" style={{ padding: 'var(--sp-6)', textAlign: 'center' }}>
              <div style={{ color: 'var(--green)', fontSize: 14, marginBottom: 4 }}>All clear</div>
              <div className="body-xs">
                {activeTab === 'critical' ? 'No critical or urgent items.' :
                  activeTab === 'high' ? 'No high-priority items.' :
                  'No pending items requiring your attention.'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
