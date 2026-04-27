export const dynamic = 'force-dynamic'

import { getDb } from '@/lib/db'
import { PageRefresher } from '@/components/ui/PageRefresher'
import { EntityBadge } from '@/components/ui/EntityBadge'
import { ApprovalCard } from '@/components/approvals/ApprovalCard'
import { ClickableTaskRow } from '@/components/ui/ClickableTaskRow'
import { deriveCategory } from '@/lib/approval-framework'

function daysAgo(dateStr: string): number {
  const then = new Date(dateStr).getTime()
  const now = Date.now()
  return Math.floor((now - then) / (1000 * 60 * 60 * 24))
}

const URGENCY_ORDER: Record<string, number> = {
  critical: 1, urgent: 1, high: 2, normal: 3, low: 4,
}

async function getInboxData() {
  const db = getDb()

  // Pending approvals that are NOT acknowledgments
  const allPending = db.prepare(
    `SELECT * FROM approvals WHERE status = 'pending' ORDER BY created_at ASC`
  ).all() as Record<string, unknown>[]

  const pendingDecisions = allPending.filter(a => {
    const cat = deriveCategory(a.type as string, a.approval_category as string | null)
    return cat !== 'acknowledgment'
  })

  // Tasks that are blocked for 2+ days
  const blockedTasks = db.prepare(
    `SELECT * FROM tasks WHERE status = 'blocked'
     AND created_at <= datetime('now', '-2 days')
     ORDER BY created_at ASC`
  ).all() as Record<string, unknown>[]

  // Tasks that are approval_gated
  const approvalGatedTasks = db.prepare(
    `SELECT * FROM tasks WHERE status = 'approval_gated'
     ORDER BY CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, created_at ASC`
  ).all() as Record<string, unknown>[]

  return { pendingDecisions, blockedTasks, approvalGatedTasks }
}

export default async function InboxPage() {
  const { pendingDecisions, blockedTasks, approvalGatedTasks } = await getInboxData()

  const totalCount = pendingDecisions.length + blockedTasks.length + approvalGatedTasks.length

  // Sort pending decisions by urgency then age
  const sortedDecisions = [...pendingDecisions].sort((a, b) => {
    const ua = URGENCY_ORDER[a.urgency as string] ?? 3
    const ub = URGENCY_ORDER[b.urgency as string] ?? 3
    if (ua !== ub) return ua - ub
    return new Date(a.created_at as string).getTime() - new Date(b.created_at as string).getTime()
  })

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200, minHeight: '100%' }}>
      <PageRefresher />

      {/* Page Header */}
      <div style={{ marginBottom: 'var(--sp-6)' }}>
        <div className="label" style={{ marginBottom: 6 }}>Mission Control</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <h1 className="h1">Jared&apos;s Inbox</h1>
          {totalCount > 0 ? (
            <span style={{
              fontSize: 13, fontFamily: 'var(--font-mono)', padding: '3px 12px', borderRadius: 20,
              background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid var(--red-border)',
              fontWeight: 700,
            }}>
              {totalCount} item{totalCount !== 1 ? 's' : ''} need your attention
            </span>
          ) : (
            <span style={{
              fontSize: 13, fontFamily: 'var(--font-mono)', padding: '3px 12px', borderRadius: 20,
              background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid var(--green-border)',
            }}>
              All clear
            </span>
          )}
        </div>
        <p className="body-xs" style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
          Only items that require your action appear here — pending decisions, blocked tasks (2+ days), and approval-gated tasks.
        </p>
      </div>

      {totalCount === 0 && (
        <div className="card" style={{ padding: 'var(--sp-8)', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
          <div style={{ fontSize: 16, color: 'var(--green)', fontWeight: 600, marginBottom: 6 }}>Inbox zero</div>
          <div className="body-xs" style={{ color: 'var(--text-secondary)' }}>
            No decisions needed. No tasks blocked for 2+ days. No approval-gated tasks.
          </div>
        </div>
      )}

      {/* ─── PENDING DECISIONS ─────────────────────────────── */}
      {sortedDecisions.length > 0 && (
        <section style={{ marginBottom: 'var(--sp-8)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--sp-4)',
            paddingBottom: 'var(--sp-3)', borderBottom: '1px solid var(--border-faint)',
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: 'var(--amber)', flexShrink: 0,
              boxShadow: '0 0 6px var(--amber)',
              animation: 'pulse-glow 2s ease-in-out infinite',
            }} />
            <span className="label" style={{ color: 'var(--amber)', fontSize: 11 }}>
              PENDING DECISIONS — {sortedDecisions.length}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sortedDecisions.map(a => (
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
                approval_category={a.approval_category as string | null}
              />
            ))}
          </div>
        </section>
      )}

      {/* ─── BLOCKED TASKS (2+ days) ───────────────────────── */}
      {blockedTasks.length > 0 && (
        <section style={{ marginBottom: 'var(--sp-8)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--sp-4)',
            paddingBottom: 'var(--sp-3)', borderBottom: '1px solid var(--border-faint)',
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: 'var(--red)', flexShrink: 0,
              boxShadow: '0 0 6px var(--red)',
            }} />
            <span className="label" style={{ color: 'var(--red)', fontSize: 11 }}>
              BLOCKED TASKS (2+ DAYS) — {blockedTasks.length}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {blockedTasks.map(t => {
              const age = daysAgo(t.created_at as string)
              const agentName = t.assigned_agent as string | null
              return (
                <ClickableTaskRow key={t.id as string} taskId={t.id as string}>
                  <div style={{
                    padding: 'var(--sp-4)',
                    borderRadius: 10,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--red-border)',
                    borderLeft: '3px solid var(--red)',
                    display: 'flex', flexDirection: 'column', gap: 8,
                    cursor: 'pointer',
                    transition: 'box-shadow 0.2s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                          {t.title as string}
                        </div>
                        {(t.description as string) && (
                          <div className="body-xs" style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {t.description as string}
                          </div>
                        )}
                      </div>
                      <span style={{
                        fontSize: 10, fontFamily: 'var(--font-mono)', padding: '3px 8px', borderRadius: 6,
                        background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid var(--red-border)',
                        flexShrink: 0, fontWeight: 700,
                      }}>
                        Day {age}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <EntityBadge entity={t.entity as string} showFull />
                      {agentName && (
                        <span style={{
                          fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 7px', borderRadius: 5,
                          background: 'var(--bg-elevated)', color: 'var(--text-muted)',
                          border: '1px solid var(--border-subtle)',
                        }}>
                          {agentName} needs input
                        </span>
                      )}
                      <span className="meta" style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>
                        Blocked {age} day{age !== 1 ? 's' : ''} ago
                      </span>
                    </div>
                  </div>
                </ClickableTaskRow>
              )
            })}
          </div>
        </section>
      )}

      {/* ─── APPROVAL-GATED TASKS ─────────────────────────── */}
      {approvalGatedTasks.length > 0 && (
        <section style={{ marginBottom: 'var(--sp-8)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--sp-4)',
            paddingBottom: 'var(--sp-3)', borderBottom: '1px solid var(--border-faint)',
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: 'var(--blue)', flexShrink: 0,
              boxShadow: '0 0 6px var(--blue)',
            }} />
            <span className="label" style={{ color: 'var(--blue)', fontSize: 11 }}>
              WAITING YOUR APPROVAL — {approvalGatedTasks.length}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {approvalGatedTasks.map(t => {
              const age = daysAgo(t.created_at as string)
              const agentName = t.assigned_agent as string | null
              const priority = t.priority as string
              const priorityColor = priority === 'critical' || priority === 'high' ? 'var(--amber)' : 'var(--text-muted)'
              return (
                <ClickableTaskRow key={t.id as string} taskId={t.id as string}>
                  <div style={{
                    padding: 'var(--sp-4)',
                    borderRadius: 10,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderLeft: `3px solid ${priorityColor}`,
                    display: 'flex', flexDirection: 'column', gap: 8,
                    cursor: 'pointer',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                          {t.title as string}
                        </div>
                        {(t.description as string) && (
                          <div className="body-xs" style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {t.description as string}
                          </div>
                        )}
                      </div>
                      <span style={{
                        fontSize: 10, fontFamily: 'var(--font-mono)', padding: '3px 8px', borderRadius: 6,
                        background: 'var(--amber-bg)', color: 'var(--amber)', border: '1px solid var(--amber-border)',
                        flexShrink: 0,
                      }}>
                        Day {age}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <EntityBadge entity={t.entity as string} showFull />
                      {agentName && (
                        <span style={{
                          fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 7px', borderRadius: 5,
                          background: 'var(--bg-elevated)', color: 'var(--text-muted)',
                          border: '1px solid var(--border-subtle)',
                        }}>
                          {agentName} waiting
                        </span>
                      )}
                      <span className="meta" style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>
                        Waiting {age} day{age !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </ClickableTaskRow>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
