export const dynamic = 'force-dynamic'

import { getDb } from '@/lib/db'
import { ENTITIES } from '@/lib/entities'
import { PriorityRow } from '@/components/ui/PriorityRow'
import { ApprovalCard } from '@/components/approvals/ApprovalCard'
import { ClickableTaskRow } from '@/components/ui/ClickableTaskRow'
import { ClickableAgentCard } from '@/components/ui/ClickableAgentCard'
import { PageRefresher } from '@/components/ui/PageRefresher'
import { EntityBadge } from '@/components/ui/EntityBadge'
import Link from 'next/link'

const ACTIVE_STATUSES = `'backlog','in_progress','blocked','approval_gated','assigned','executing','on_hold','open','next','pending_review'`

async function getDashboardData() {
  const db = getDb()

  const counts = db.prepare(`
    SELECT
      SUM(CASE WHEN status IN (${ACTIVE_STATUSES}) THEN 1 ELSE 0 END) as total_active,
      SUM(CASE WHEN status = 'backlog' THEN 1 ELSE 0 END) as backlog,
      SUM(CASE WHEN status IN ('in_progress','executing','assigned') THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked,
      SUM(CASE WHEN status = 'approval_gated' THEN 1 ELSE 0 END) as approval_gated,
      SUM(CASE WHEN status = 'completed' AND COALESCE(completed_at, updated_at) >= datetime('now', '-7 days') THEN 1 ELSE 0 END) as completed_7d,
      SUM(CASE WHEN surface_blocked = 1 AND status NOT IN ('completed','archived','cancelled') THEN 1 ELSE 0 END) as surface_blocked
    FROM tasks
  `).get() as Record<string, number>

  const pendingApprovals = db.prepare(
    `SELECT * FROM approvals WHERE status = 'pending'
     ORDER BY CASE urgency WHEN 'critical' THEN 1 WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END, created_at ASC
     LIMIT 20`
  ).all() as Record<string, unknown>[]

  const blockedTasks = db.prepare(
    `SELECT id, title, entity, assigned_agent, priority, updated_at
     FROM tasks WHERE status = 'blocked'
     ORDER BY CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, updated_at ASC
     LIMIT 10`
  ).all() as Record<string, unknown>[]

  const inProgressTasks = db.prepare(
    `SELECT id, title, entity, assigned_agent, priority, updated_at, status
     FROM tasks WHERE status IN ('in_progress','executing','assigned')
     ORDER BY CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, updated_at DESC
     LIMIT 30`
  ).all() as Record<string, unknown>[]

  const recentlyCompleted = db.prepare(
    `SELECT id, title, entity, assigned_agent, COALESCE(completed_at, updated_at) as done_at
     FROM tasks WHERE status = 'completed' AND COALESCE(completed_at, updated_at) >= datetime('now', '-7 days')
     ORDER BY COALESCE(completed_at, updated_at) DESC
     LIMIT 10`
  ).all() as Record<string, unknown>[]

  const agents = db.prepare('SELECT * FROM agent_heartbeats ORDER BY agent_id').all() as Record<string, unknown>[]

  const onlineAgents = agents.filter(a => {
    const lastSeen = a.last_seen as string | null
    if (!lastSeen) return false
    return (Date.now() - new Date(lastSeen).getTime()) / 60000 < 60
  }).length

  const priorities = db.prepare(
    "SELECT * FROM priorities WHERE status = 'active' ORDER BY sort_order LIMIT 5"
  ).all() as Record<string, unknown>[]

  const entityKpis = db.prepare('SELECT * FROM entity_kpis').all() as Record<string, unknown>[]

  // Per-entity stats for quick stats section
  const entityStats = db.prepare(`
    SELECT
      entity,
      COUNT(*) as active_tasks
    FROM tasks
    WHERE status IN (${ACTIVE_STATUSES})
    GROUP BY entity
  `).all() as { entity: string; active_tasks: number }[]

  const entityApprovals = db.prepare(`
    SELECT entity, COUNT(*) as pending
    FROM approvals WHERE status = 'pending'
    GROUP BY entity
  `).all() as { entity: string; pending: number }[]

  const entityLastActivity = db.prepare(`
    SELECT entity, MAX(created_at) as last_activity
    FROM activity GROUP BY entity
  `).all() as { entity: string; last_activity: string }[]

  const recentActivity = db.prepare(
    `SELECT id, agent, action, detail, entity, created_at FROM activity ORDER BY created_at DESC LIMIT 10`
  ).all() as Record<string, unknown>[]

  return {
    counts,
    pendingApprovals,
    blockedTasks,
    inProgressTasks,
    recentlyCompleted,
    agents,
    onlineAgents,
    priorities,
    entityKpis,
    entityStats,
    entityApprovals,
    entityLastActivity,
    recentActivity,
  }
}

function UrgencyBadge({ urgency }: { urgency: string }) {
  const colors: Record<string, { bg: string; color: string; border: string }> = {
    critical: { bg: 'var(--red-bg)', color: 'var(--red)', border: 'var(--red-border)' },
    urgent:   { bg: 'var(--red-bg)', color: 'var(--red)', border: 'var(--red-border)' },
    high:     { bg: 'var(--amber-bg)', color: 'var(--amber)', border: 'var(--amber-border)' },
    normal:   { bg: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: 'var(--border-subtle)' },
    medium:   { bg: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: 'var(--border-subtle)' },
    low:      { bg: 'transparent', color: 'var(--text-muted)', border: 'var(--border-faint)' },
  }
  const c = colors[urgency] ?? colors.normal
  return (
    <span style={{
      fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 7px', borderRadius: 10,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600,
    }}>
      {urgency}
    </span>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    critical: 'var(--red)', high: 'var(--amber)', medium: 'var(--blue)',
    low: 'var(--text-muted)', normal: 'var(--text-muted)',
  }
  return (
    <span style={{
      width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
      background: colors[priority] ?? 'var(--text-muted)',
      boxShadow: priority === 'critical' ? '0 0 6px var(--red)' : 'none',
    }} />
  )
}

function SummaryCard({
  label, value, color, href, subtext,
}: { label: string; value: number | string; color: string; href: string; subtext?: string }) {
  return (
    <Link href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="card" style={{ padding: 'var(--sp-4)', cursor: 'pointer' }}>
        <div className="label" style={{ marginBottom: 'var(--sp-2)', fontSize: 9 }}>{label.toUpperCase()}</div>
        <div className="value-md" style={{ color }}>{value}</div>
        {subtext && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{subtext}</div>}
      </div>
    </Link>
  )
}

export default async function OverviewPage() {
  const data = await getDashboardData()
  const {
    counts, pendingApprovals, blockedTasks, inProgressTasks,
    recentlyCompleted, agents, onlineAgents, priorities,
    entityStats, entityApprovals, entityLastActivity, recentActivity,
  } = data

  const pendingCount = pendingApprovals.length
  const blockedCount = counts.blocked || 0
  const needsAttention = pendingCount + (counts.surface_blocked || 0) + blockedCount
  const criticalAlerts = pendingApprovals.filter(a => ['urgent','critical','high'].includes(a.urgency as string)).length
  const completedLast7d = counts.completed_7d || 0

  // Group in-progress tasks by entity
  const byEntity: Record<string, typeof inProgressTasks> = {}
  for (const t of inProgressTasks) {
    const ent = (t.entity as string) || 'Unknown'
    if (!byEntity[ent]) byEntity[ent] = []
    byEntity[ent].push(t)
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200, minHeight: '100%' }}>
      <PageRefresher />

      {/* ─── HEADER ─────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 'var(--sp-5)' }}>
        <div className="label" style={{ marginBottom: 6 }}>Mission Control</div>
        <h1 className="h1">Dashboard</h1>
        <p className="body-xs" style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
          {counts.total_active || 0} active tasks across 7 entities
        </p>
      </div>

      {/* ─── SECTION 1: SUMMARY CARDS ───────────────────────────────────── */}
      <section style={{ marginBottom: 'var(--sp-8)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--sp-3)' }}>
          <SummaryCard
            label="Active Tasks" value={counts.total_active || 0}
            color="var(--text-primary)" href="/kanban"
          />
          <SummaryCard
            label="Needs Attention" value={needsAttention}
            color={needsAttention > 0 ? 'var(--amber)' : 'var(--text-muted)'} href="/approvals"
            subtext={pendingCount > 0 ? `${pendingCount} pending approvals` : undefined}
          />
          <SummaryCard
            label="Blocked" value={blockedCount}
            color={blockedCount > 0 ? 'var(--red)' : 'var(--text-muted)'} href="/kanban"
          />
          <SummaryCard
            label="Completed (7d)" value={completedLast7d}
            color={completedLast7d > 0 ? 'var(--green)' : 'var(--text-muted)'} href="/kanban"
          />
          <SummaryCard
            label="Critical Alerts" value={criticalAlerts}
            color={criticalAlerts > 0 ? 'var(--red)' : 'var(--green)'} href="/approvals"
            subtext={criticalAlerts === 0 ? 'All clear' : undefined}
          />
          <SummaryCard
            label="Agents Online" value={`${onlineAgents}/${agents.length}`}
            color={onlineAgents > 0 ? 'var(--green)' : 'var(--text-muted)'} href="/agents"
          />
        </div>
      </section>

      {/* ─── SECTION 2: NEEDS JARED'S ATTENTION ────────────────────────── */}
      <section style={{ marginBottom: 'var(--sp-8)' }}>
        <div style={{
          borderRadius: 10, padding: 'var(--sp-5)',
          background: 'var(--bg-card)',
          border: needsAttention > 0 ? '1px solid rgba(255,159,10,0.4)' : '1px solid var(--border-subtle)',
          boxShadow: needsAttention > 0 ? '0 0 0 1px rgba(255,159,10,0.15), 0 0 20px rgba(255,159,10,0.08)' : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: needsAttention > 0 ? 'var(--sp-5)' : 0 }}>
            <span className="label" style={{ color: needsAttention > 0 ? 'var(--mc-status-attention)' : 'var(--text-muted)' }}>
              NEEDS YOUR ATTENTION
            </span>
            {needsAttention > 0 && (
              <>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: 'var(--mc-status-attention)',
                  boxShadow: '0 0 6px var(--mc-status-attention)',
                  animation: 'pulse-glow 2s ease-in-out infinite',
                }} />
                <span style={{
                  fontSize: 11, fontFamily: 'var(--font-mono)', padding: '2px 9px', borderRadius: 10,
                  background: 'var(--amber-bg)', color: 'var(--amber)', border: '1px solid var(--amber-border)',
                }}>
                  {needsAttention}
                </span>
              </>
            )}
            <Link href="/approvals" style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--blue)', textDecoration: 'none' }}>
              View all →
            </Link>
          </div>

          {needsAttention === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}>✓</span>
              <div>
                <div style={{ fontSize: 13, color: 'var(--mc-status-success)', fontWeight: 600, marginBottom: 2 }}>All clear</div>
                <div className="body-xs" style={{ color: 'var(--text-secondary)' }}>No decisions needed. No blocked tasks.</div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Critical/urgent first */}
              {pendingApprovals.slice(0, 10).map((a) => (
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
                  approval_category={a.approval_category as string | null}
                  compact
                />
              ))}
              {pendingCount > 10 && (
                <Link href="/approvals" style={{ textDecoration: 'none' }}>
                  <div style={{
                    padding: 'var(--sp-3)', textAlign: 'center', cursor: 'pointer',
                    borderRadius: 6, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                  }}>
                    <span className="body-sm" style={{ color: 'var(--blue)' }}>
                      + {pendingCount - 10} more → View all in Needs Attention
                    </span>
                  </div>
                </Link>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ─── SECTION 3: IN PROGRESS BY ENTITY ─────────────────────────── */}
      {inProgressTasks.length > 0 && (
        <section style={{ marginBottom: 'var(--sp-8)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--sp-4)' }}>
            <span className="label">IN PROGRESS</span>
            <span className="meta">— {inProgressTasks.length} tasks</span>
            <Link href="/kanban" style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--blue)', textDecoration: 'none' }}>Board view →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            {Object.entries(byEntity).map(([entity, tasks]) => (
              <div key={entity}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--sp-2)' }}>
                  <EntityBadge entity={entity} />
                  <span className="meta">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {tasks.slice(0, 5).map(t => (
                    <ClickableTaskRow key={t.id as string} taskId={t.id as string}>
                      <div className="card" style={{
                        padding: 'var(--sp-3) var(--sp-4)',
                        display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                      }}>
                        <PriorityBadge priority={t.priority as string} />
                        <span className="body-sm" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.title as string}
                        </span>
                        {t.assigned_agent && (
                          <span className="meta" style={{ flexShrink: 0, fontSize: 10 }}>{t.assigned_agent as string}</span>
                        )}
                        <span className="meta" style={{ flexShrink: 0, fontSize: 10 }}>
                          {t.updated_at ? new Date(t.updated_at as string).toLocaleDateString() : ''}
                        </span>
                      </div>
                    </ClickableTaskRow>
                  ))}
                  {tasks.length > 5 && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', paddingLeft: 'var(--sp-3)' }}>
                      + {tasks.length - 5} more...
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── SECTION 4: BLOCKED ────────────────────────────────────────── */}
      {blockedTasks.length > 0 && (
        <section style={{ marginBottom: 'var(--sp-8)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--sp-3)' }}>
            <span className="label" style={{ color: 'var(--red)' }}>BLOCKED</span>
            <span className="meta">— {blockedCount} tasks</span>
            <Link href="/kanban" style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--blue)', textDecoration: 'none' }}>View all →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {blockedTasks.map(t => {
              const updatedAt = t.updated_at as string
              const blockedDays = updatedAt
                ? Math.floor((Date.now() - new Date(updatedAt).getTime()) / (24 * 60 * 60 * 1000))
                : 0
              const isLongBlocked = blockedDays > 3
              return (
                <ClickableTaskRow key={t.id as string} taskId={t.id as string}>
                  <div style={{
                    padding: 'var(--sp-3) var(--sp-4)',
                    borderRadius: 6,
                    background: isLongBlocked ? 'rgba(255,69,58,0.08)' : 'var(--bg-elevated)',
                    borderLeft: '3px solid var(--red)',
                    border: `1px solid ${isLongBlocked ? 'var(--red-border)' : 'var(--border-subtle)'}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    cursor: 'pointer', gap: 12,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                      <EntityBadge entity={t.entity as string} />
                      <span className="body-sm" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.title as string}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      {isLongBlocked && (
                        <span style={{ fontSize: 10, color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>
                          {blockedDays}d blocked
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>Resolve →</span>
                    </div>
                  </div>
                </ClickableTaskRow>
              )
            })}
          </div>
        </section>
      )}

      {/* ─── SECTION 5: RECENTLY COMPLETED ────────────────────────────── */}
      {recentlyCompleted.length > 0 && (
        <section style={{ marginBottom: 'var(--sp-8)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--sp-3)' }}>
            <span className="label">RECENTLY COMPLETED</span>
            <span className="meta">— last 7 days</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {recentlyCompleted.map(t => (
              <ClickableTaskRow key={t.id as string} taskId={t.id as string}>
                <div className="card" style={{
                  padding: 'var(--sp-2) var(--sp-4)',
                  display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
                  <EntityBadge entity={t.entity as string} />
                  <span className="body-sm" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.title as string}
                  </span>
                  {t.assigned_agent && (
                    <span className="meta" style={{ flexShrink: 0, fontSize: 10 }}>{t.assigned_agent as string}</span>
                  )}
                  <span className="meta" style={{ flexShrink: 0, fontSize: 10 }}>
                    {t.done_at ? new Date(t.done_at as string).toLocaleDateString() : ''}
                  </span>
                </div>
              </ClickableTaskRow>
            ))}
          </div>
        </section>
      )}

      {/* ─── SECTION 6: QUICK STATS BY ENTITY ─────────────────────────── */}
      <section style={{ marginBottom: 'var(--sp-8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--sp-3)' }}>
          <span className="label">ENTITY OVERVIEW</span>
          <Link href="/entities" style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--blue)', textDecoration: 'none' }}>View entities →</Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--sp-3)' }}>
          {ENTITIES.map(entity => {
            const stats = entityStats.find(s => s.entity === entity.label || s.entity === entity.slug)
            const approvals = entityApprovals.find(a => a.entity === entity.label || a.entity === entity.slug)
            const lastAct = entityLastActivity.find(a => a.entity === entity.label || a.entity === entity.slug)
            const activeTasks = stats?.active_tasks ?? 0
            const pendingAppr = approvals?.pending ?? 0
            return (
              <Link key={entity.slug} href={`/entities/${entity.slug}`} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ padding: 'var(--sp-4)', cursor: 'pointer' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--sp-2)' }}>
                    {entity.label}
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: activeTasks > 0 ? 'var(--blue)' : 'var(--text-muted)' }}>
                        {activeTasks}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Active</div>
                    </div>
                    {pendingAppr > 0 && (
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--amber)' }}>{pendingAppr}</div>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Pending</div>
                      </div>
                    )}
                  </div>
                  {lastAct?.last_activity && (
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 'var(--sp-2)' }}>
                      Last: {new Date(lastAct.last_activity).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* ─── RECENT ACTIVITY ────────────────────────────────────────────── */}
      {recentActivity.length > 0 && (
        <section style={{ marginBottom: 'var(--sp-8)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--sp-3)' }}>
            <span className="label">RECENT ACTIVITY</span>
            <Link href="/logs" style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--blue)', textDecoration: 'none' }}>View logs →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {recentActivity.map(act => (
              <div key={act.id as number} className="card" style={{
                padding: 'var(--sp-2) var(--sp-4)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', flexShrink: 0 }}>
                  {act.agent as string}
                </span>
                {act.entity && <EntityBadge entity={act.entity as string} />}
                <span className="body-sm" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {act.action as string}{act.detail ? ` — ${act.detail as string}` : ''}
                </span>
                <span className="meta" style={{ flexShrink: 0, fontSize: 10 }}>
                  {act.created_at ? new Date(act.created_at as string).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── STRATEGIC PRIORITIES ───────────────────────────────────────── */}
      {priorities.length > 0 && (
        <section style={{ marginBottom: 'var(--sp-8)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--sp-3)' }}>
            <span className="label">STRATEGIC PRIORITIES</span>
            <Link href="/priorities" style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--blue)', textDecoration: 'none' }}>View all →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {priorities.map((p) => (
              <PriorityRow key={p.id as string} priority={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
