export const dynamic = 'force-dynamic'

import { getDb } from '@/lib/db'
import { ENTITIES } from '@/lib/entities'
import { PriorityRow } from '@/components/ui/PriorityRow'
import { EntityHealthCard } from '@/components/ui/EntityHealthCard'
import { ApprovalCard } from '@/components/approvals/ApprovalCard'
import { ClickableTaskRow } from '@/components/ui/ClickableTaskRow'
import { ClickableAgentCard } from '@/components/ui/ClickableAgentCard'
import { PageRefresher } from '@/components/ui/PageRefresher'
import { EntityBadge } from '@/components/ui/EntityBadge'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

async function getOverviewData() {
  const db = getDb()

  const taskCounts = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status IN ('executing','approved','in_progress') THEN 1 ELSE 0 END) as executing,
      SUM(CASE WHEN status = 'review' THEN 1 ELSE 0 END) as in_review,
      SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked,
      SUM(CASE WHEN status = 'backlog' THEN 1 ELSE 0 END) as backlog,
      SUM(CASE WHEN status = 'approval_gated' THEN 1 ELSE 0 END) as awaiting_approval,
      SUM(CASE WHEN status = 'blocked' AND created_at <= datetime('now', '-2 days') THEN 1 ELSE 0 END) as blocked_2plus,
      SUM(CASE WHEN status = 'completed' AND completed_at >= datetime('now', '-1 day') THEN 1 ELSE 0 END) as completed_today,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_total
    FROM tasks
  `).get() as Record<string, number>

  const pendingApprovals = db.prepare(
    `SELECT * FROM approvals WHERE status = 'pending'
     ORDER BY CASE urgency WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END, created_at ASC
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

  const blockedTasks = db.prepare(
    `SELECT id, title, entity, assigned_agent, priority FROM tasks WHERE status = 'blocked' ORDER BY CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END LIMIT 8`
  ).all() as Record<string, unknown>[]

  // Count decisions only (non-acknowledgment pending approvals)
  const pendingDecisionsCount = db.prepare(
    `SELECT COUNT(*) as cnt FROM approvals
     WHERE status = 'pending'
     AND (approval_category IS NULL OR approval_category != 'acknowledgment')`
  ).get() as { cnt: number }

  return {
    taskCounts, pendingApprovals, agents, onlineAgents, priorities, entityKpis, blockedTasks,
    pendingDecisionsCount: pendingDecisionsCount.cnt,
  }
}

export default async function OverviewPage() {
  const data = await getOverviewData()
  const pendingCount = data.pendingApprovals.length
  const blockedCount = data.taskCounts.blocked || 0
  const criticalApprovals = data.pendingApprovals.filter(a => ['urgent','critical','high'].includes(a.urgency as string)).length
  const pendingDecisions = data.pendingDecisionsCount
  const blocked2Plus = data.taskCounts.blocked_2plus || 0
  const approvalGatedCount = data.taskCounts.awaiting_approval || 0
  const inboxCount = pendingDecisions + blocked2Plus + approvalGatedCount

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200, minHeight: '100%' }}>
      <PageRefresher />

      {/* ─── NEEDS YOUR ATTENTION — TOP SECTION ───────────── */}
      {inboxCount > 0 && (
        <section style={{ marginBottom: 'var(--sp-6)' }}>
          <Link href="/inbox" style={{ textDecoration: 'none', display: 'block' }}>
            <div style={{
              borderRadius: 12,
              padding: 'var(--sp-5)',
              background: 'linear-gradient(135deg, var(--red-bg), var(--amber-bg))',
              border: '1px solid rgba(255,69,58,0.35)',
              boxShadow: '0 0 0 1px rgba(255,69,58,0.1), 0 0 24px rgba(255,69,58,0.08)',
              cursor: 'pointer',
              transition: 'box-shadow 0.2s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--sp-4)' }}>
                <span style={{
                  width: 9, height: 9, borderRadius: '50%',
                  background: 'var(--red)', flexShrink: 0,
                  boxShadow: '0 0 8px var(--red)',
                  animation: 'pulse-glow 2s ease-in-out infinite',
                }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
                  Needs Your Attention
                </span>
                <span style={{
                  marginLeft: 'auto',
                  fontSize: 11, fontFamily: 'var(--font-mono)', padding: '3px 10px', borderRadius: 20,
                  background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid var(--red-border)',
                  fontWeight: 700,
                }}>
                  Open Inbox →
                </span>
              </div>
              <div style={{ display: 'flex', gap: 'var(--sp-4)', flexWrap: 'wrap' }}>
                {pendingDecisions > 0 && (
                  <div style={{
                    padding: 'var(--sp-3) var(--sp-4)',
                    borderRadius: 8,
                    background: 'var(--amber-bg)',
                    border: '1px solid var(--amber-border)',
                    display: 'flex', flexDirection: 'column', gap: 2, minWidth: 120,
                  }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--amber)', lineHeight: 1 }}>
                      {pendingDecisions}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--amber)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Pending Decisions
                    </div>
                  </div>
                )}
                {blocked2Plus > 0 && (
                  <div style={{
                    padding: 'var(--sp-3) var(--sp-4)',
                    borderRadius: 8,
                    background: 'var(--red-bg)',
                    border: '1px solid var(--red-border)',
                    display: 'flex', flexDirection: 'column', gap: 2, minWidth: 120,
                  }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--red)', lineHeight: 1 }}>
                      {blocked2Plus}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--red)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Blocked 2+ Days
                    </div>
                  </div>
                )}
                {approvalGatedCount > 0 && (
                  <div style={{
                    padding: 'var(--sp-3) var(--sp-4)',
                    borderRadius: 8,
                    background: 'var(--blue-bg)',
                    border: '1px solid var(--blue-border)',
                    display: 'flex', flexDirection: 'column', gap: 2, minWidth: 120,
                  }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue)', lineHeight: 1 }}>
                      {approvalGatedCount}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--blue)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Approval Gated
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* Page Header */}
      <div style={{ marginBottom: 'var(--sp-6)' }}>
        <div className="label" style={{ marginBottom: 6 }}>Mission Control</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <h1 className="h1">Overview</h1>
          {(pendingCount > 0 || blockedCount > 0) && (
            <div style={{ display: 'flex', gap: 8 }}>
              {pendingCount > 0 && (
                <Link href="/approvals" style={{ textDecoration: 'none' }}>
                  <span style={{
                    fontSize: 11, fontFamily: 'var(--font-mono)', padding: '3px 10px', borderRadius: 20,
                    background: 'var(--amber-bg)', color: 'var(--amber)', border: '1px solid var(--amber-border)',
                    cursor: 'pointer',
                  }}>
                    {pendingCount} pending decision{pendingCount !== 1 ? 's' : ''}
                  </span>
                </Link>
              )}
              {blockedCount > 0 && (
                <Link href="/inbox" style={{ textDecoration: 'none' }}>
                  <span style={{
                    fontSize: 11, fontFamily: 'var(--font-mono)', padding: '3px 10px', borderRadius: 20,
                    background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid var(--red-border)',
                    cursor: 'pointer',
                  }}>
                    {blockedCount} blocked
                  </span>
                </Link>
              )}
            </div>
          )}
        </div>
        <p className="body-xs" style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
          Live snapshot — {data.taskCounts.total || 0} tasks across 7 entities
        </p>
      </div>

      {/* ─── OPERATIONAL SNAPSHOT ──────────────────────── */}
      <section style={{ marginBottom: 'var(--sp-8)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 'var(--sp-3)' }}>
          {[
            { label: 'Backlog', value: data.taskCounts.backlog || 0, href: '/tasks', color: 'var(--text-secondary)' },
            { label: 'In Progress', value: data.taskCounts.executing || 0, href: '/tasks', color: 'var(--blue)' },
            { label: 'Awaiting Approval', value: data.taskCounts.awaiting_approval || 0, href: '/inbox', color: 'var(--amber)' },
            { label: 'Blocked', value: data.taskCounts.blocked || 0, href: '/inbox', color: data.taskCounts.blocked > 0 ? 'var(--red)' : 'var(--text-muted)' },
            { label: 'Done Today', value: data.taskCounts.completed_today || 0, href: '/tasks', color: data.taskCounts.completed_today > 0 ? 'var(--green)' : 'var(--text-muted)' },
            { label: 'Agents Online', value: `${data.onlineAgents}/${data.agents.length}`, href: '/agents', color: data.onlineAgents > 0 ? 'var(--green)' : 'var(--text-muted)' },
          ].map(metric => (
            <Link key={metric.label} href={metric.href} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="card" style={{ padding: 'var(--sp-4)', cursor: 'pointer' }}>
                <div className="label" style={{ marginBottom: 'var(--sp-2)', fontSize: 9 }}>{metric.label.toUpperCase()}</div>
                <div className="value-md" style={{ color: metric.color }}>
                  {metric.value}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── NEEDS ATTENTION ──────────────────────────────────────────────────── */}
      {/* Ada design spec 2026-04-23: unified dominant section at top of overview. */}
      {/* When active (any pending approvals OR blocked tasks): amber glow border.  */}
      {/* When all clear: green confirmation, no glow. Replaces separate             */}
      {/* "Needs Your Decision" + "Blocked" sections.                               */}
      <section style={{ marginBottom: 'var(--sp-8)' }}>
        <div
          style={{
            borderRadius: 10,
            padding: 'var(--sp-5)',
            background: 'var(--bg-card)',
            /* Amber attention glow only when there's something actionable */
            border: (pendingCount > 0 || blockedCount > 0)
              ? '1px solid rgba(255,159,10,0.4)'
              : '1px solid var(--border-subtle)',
            boxShadow: (pendingCount > 0 || blockedCount > 0)
              ? '0 0 0 1px rgba(255,159,10,0.15), 0 0 20px rgba(255,159,10,0.08)'
              : 'none',
            transition: 'border 0.3s ease, box-shadow 0.3s ease',
          }}
        >
          {/* Section header row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: (pendingCount > 0 || blockedCount > 0) ? 'var(--sp-5)' : 0 }}>
            <span
              className="label"
              style={{
                color: (pendingCount > 0 || blockedCount > 0)
                  ? 'var(--mc-status-attention)'
                  : 'var(--text-muted)',
              }}
            >
              NEEDS ATTENTION
            </span>
            {/* Pulsing amber dot — only when there's something pending */}
            {(pendingCount > 0 || blockedCount > 0) && (
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--mc-status-attention)',
                boxShadow: '0 0 6px var(--mc-status-attention)',
                animation: 'pulse-glow 2s ease-in-out infinite',
              }} />
            )}
          </div>

          {/* ── ALL CLEAR state ─────────────────────────────────────────────── */}
          {pendingCount === 0 && blockedCount === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}>✓</span>
              <div>
                <div style={{ fontSize: 13, color: 'var(--mc-status-success)', fontWeight: 600, marginBottom: 2 }}>All clear</div>
                <div className="body-xs" style={{ color: 'var(--text-secondary)' }}>No decisions needed. No blocked tasks.</div>
              </div>
            </div>
          )}

          {/* ── PENDING DECISIONS sub-section ──────────────────────────────── */}
          {pendingCount > 0 && (
            <div style={{ marginBottom: blockedCount > 0 ? 'var(--sp-5)' : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--sp-3)' }}>
                {/* Amber dot for decisions */}
                <span style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: 'var(--amber)', flexShrink: 0,
                  boxShadow: '0 0 4px var(--amber)',
                  animation: 'pulse-glow 2s ease-in-out infinite',
                }} />
                <span className="label" style={{ fontSize: 9, color: 'var(--amber)' }}>DECISIONS — {pendingCount}</span>
                {pendingCount > 5 && (
                  <Link href="/approvals" style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--blue)', textDecoration: 'none' }}>
                    See all {pendingCount} →
                  </Link>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.pendingApprovals.slice(0, 5).map((a) => (
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
                {pendingCount > 5 && (
                  <Link href="/approvals" style={{ textDecoration: 'none' }}>
                    <div style={{
                      padding: 'var(--sp-3)', textAlign: 'center', cursor: 'pointer',
                      borderRadius: 6, background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                    }}>
                      <span className="body-sm" style={{ color: 'var(--blue)' }}>
                        + {pendingCount - 5} more decisions → View all
                      </span>
                    </div>
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* ── BLOCKED TASKS sub-section ───────────────────────────────────── */}
          {blockedCount > 0 && (
            <div>
              {/* Divider between Decisions and Blocked if both are showing */}
              {pendingCount > 0 && (
                <div style={{ height: 1, background: 'var(--border-subtle)', marginBottom: 'var(--sp-4)' }} />
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--sp-3)' }}>
                {/* Red dot for blocked */}
                <span style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: 'var(--red)', flexShrink: 0,
                  boxShadow: '0 0 4px var(--red)',
                }} />
                <span className="label" style={{ fontSize: 9, color: 'var(--red)' }}>BLOCKED — {blockedCount}</span>
                <Link href="/tasks" style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--blue)', textDecoration: 'none' }}>
                  View board →
                </Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {data.blockedTasks.map(t => (
                  <ClickableTaskRow key={t.id as string} taskId={t.id as string}>
                    <div style={{
                      padding: 'var(--sp-3) var(--sp-4)',
                      borderRadius: 6,
                      background: 'var(--bg-elevated)',
                      borderLeft: '3px solid var(--red)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      cursor: 'pointer', gap: 12,
                      border: '1px solid var(--border-subtle)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                        <EntityBadge entity={t.entity as string} />
                        <span className="body-sm" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.title as string}
                        </span>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--red)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                        Resolve →
                      </span>
                    </div>
                  </ClickableTaskRow>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─── AGENT TEAM ───────────────────────────────── */}
      <section style={{ marginBottom: 'var(--sp-8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--sp-3)' }}>
          <span className="label">AGENT TEAM</span>
          <span className="meta">— {data.onlineAgents} of {data.agents.length} active</span>
        </div>
        <div style={{ display: 'flex', gap: 'var(--sp-2)', overflowX: 'auto', paddingBottom: 4 }}>
          {data.agents.map((agent) => {
            const lastSeen = agent.last_seen as string | null
            let statusColor = 'var(--text-faint)'
            let isPulsing = false
            let statusLabel = 'Offline'
            if (lastSeen) {
              const mins = (Date.now() - new Date(lastSeen).getTime()) / 60000
              if (mins < 60) { statusColor = 'var(--green)'; isPulsing = true; statusLabel = 'Active' }
              else if (mins < 180) { statusColor = 'var(--amber)'; statusLabel = 'Idle' }
              else { statusLabel = 'Offline' }
            }
            const currentTask = (agent.current_task as string) || ''
            const taskPreview = currentTask.split(' ').slice(0, 5).join(' ')
            const hasError = (agent.error_count_24h as number) > 0
            return (
              <ClickableAgentCard key={agent.agent_id as string} data={agent}>
                <div className="card" style={{
                  flexShrink: 0, width: 165,
                  padding: 'var(--sp-3)',
                  cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', gap: 5,
                  borderLeft: hasError ? '2px solid var(--red)' : '2px solid transparent',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 16 }}>{agent.emoji as string}</span>
                    <span className="h4" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {agent.agent_name as string}
                    </span>
                    <span style={{
                      width: 7, height: 7, borderRadius: '50%', background: statusColor, flexShrink: 0,
                      boxShadow: isPulsing ? `0 0 4px ${statusColor}` : 'none',
                      animation: isPulsing ? 'pulse-glow 2s ease-in-out infinite' : undefined,
                    }} />
                  </div>
                  <div className="meta" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: statusColor, fontSize: 9 }}>
                    {statusLabel}
                  </div>
                  <div className="meta" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {taskPreview || 'No active task'}
                  </div>
                  {hasError && (
                    <div style={{ fontSize: 9, color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>
                      {agent.error_count_24h as number} error{(agent.error_count_24h as number) !== 1 ? 's' : ''} today
                    </div>
                  )}
                </div>
              </ClickableAgentCard>
            )
          })}
        </div>
      </section>

      {/* ─── STRATEGIC PRIORITIES ──────────────────────── */}
      {data.priorities.length > 0 && (
        <section style={{ marginBottom: 'var(--sp-8)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--sp-3)' }}>
            <span className="label">STRATEGIC PRIORITIES</span>
            <Link href="/priorities" style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--blue)', textDecoration: 'none' }}>View all →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.priorities.map((p) => (
              <PriorityRow key={p.id as string} priority={p} />
            ))}
          </div>
        </section>
      )}

      {/* ─── ENTITY HEALTH ────────────────────────────── */}
      <section style={{ marginBottom: 'var(--sp-8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--sp-3)' }}>
          <span className="label">ENTITIES</span>
          <Link href="/entities" style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--blue)', textDecoration: 'none' }}>View all →</Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 'var(--sp-3)' }}>
          {ENTITIES.map(entity => {
            const kpi = data.entityKpis.find(k =>
              k.entity === entity.label || k.entity === entity.slug
            ) || null
            return (
              <EntityHealthCard key={entity.slug} entity={entity} kpi={kpi} />
            )
          })}
        </div>
      </section>
    </div>
  )
}
