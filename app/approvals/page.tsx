export const dynamic = 'force-dynamic'

import { getDb } from '@/lib/db'
import { PageRefresher } from '@/components/ui/PageRefresher'
import { ApprovalCard } from '@/components/approvals/ApprovalCard'
import { ClickableApprovalRow } from '@/components/ui/ClickableApprovalRow'
import { deriveCategory } from '@/lib/approval-framework'
import { EntityBadge } from '@/components/ui/EntityBadge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import Link from 'next/link'

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const params = await searchParams
  const showAll = params.view === 'all'

  const db = getDb()

  const pending = db.prepare(
    `SELECT a.*, t.title AS task_title, t.status AS task_status
     FROM approvals a
     LEFT JOIN tasks t ON a.task_id = t.id
     WHERE a.status = 'pending'
     ORDER BY CASE a.urgency WHEN 'urgent' THEN 1 WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 WHEN 'low' THEN 4 ELSE 3 END, a.created_at ASC`
  ).all() as Record<string, unknown>[]

  const recent = db.prepare(
    `SELECT * FROM approvals WHERE status != 'pending'
     ORDER BY decided_at DESC LIMIT 20`
  ).all() as Record<string, unknown>[]

  const decisions = pending.filter(a => {
    const cat = deriveCategory(a.type as string, a.approval_category as string | null)
    return cat !== 'acknowledgment'
  })
  const acknowledgments = pending.filter(a => {
    const cat = deriveCategory(a.type as string, a.approval_category as string | null)
    return cat === 'acknowledgment'
  })

  // What to show based on toggle
  const visiblePending = showAll ? pending : decisions

  const decisionsCount = decisions.length
  const urgentCount = decisions.filter(a => ['urgent','critical','high'].includes(a.urgency as string)).length

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200 }}>
      <PageRefresher />

      {/* Header */}
      <div style={{ marginBottom: 'var(--sp-6)' }}>
        <div className="label" style={{ marginBottom: 6 }}>Mission Control</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <h1 className="h1">Approvals</h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {decisionsCount > 0 && (
              <span style={{
                fontSize: 11, fontFamily: 'var(--font-mono)', padding: '3px 10px', borderRadius: 20,
                background: 'var(--amber-bg)', color: 'var(--amber)', border: '1px solid var(--amber-border)',
              }}>
                {decisionsCount} decision{decisionsCount !== 1 ? 's' : ''}
              </span>
            )}
            {urgentCount > 0 && (
              <span style={{
                fontSize: 11, fontFamily: 'var(--font-mono)', padding: '3px 10px', borderRadius: 20,
                background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid var(--red-border)',
              }}>
                {urgentCount} urgent / high
              </span>
            )}
          </div>
        </div>
        <p className="body-xs" style={{ marginTop: 4, color: 'var(--text-secondary)' }}>
          These items are waiting for your decision. Approving tells the agent to proceed. Rejecting stops it. Modify sends a revision request.
        </p>
      </div>

      {/* View toggle: Decisions / All */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 'var(--sp-6)' }}>
        <Link
          href="/approvals"
          style={{
            padding: '6px 16px', borderRadius: 6, fontSize: 12, fontFamily: 'var(--font-mono)',
            textDecoration: 'none',
            border: `1px solid ${!showAll ? 'var(--amber-border)' : 'var(--border-faint)'}`,
            background: !showAll ? 'var(--amber-bg)' : 'transparent',
            color: !showAll ? 'var(--amber)' : 'var(--text-muted)',
            fontWeight: !showAll ? 600 : 400,
            transition: 'all 0.2s',
          }}
        >
          Decisions {decisionsCount > 0 ? `(${decisionsCount})` : ''}
        </Link>
        <Link
          href="/approvals?view=all"
          style={{
            padding: '6px 16px', borderRadius: 6, fontSize: 12, fontFamily: 'var(--font-mono)',
            textDecoration: 'none',
            border: `1px solid ${showAll ? 'var(--border-default)' : 'var(--border-faint)'}`,
            background: showAll ? 'rgba(255,255,255,0.06)' : 'transparent',
            color: showAll ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: showAll ? 600 : 400,
            transition: 'all 0.2s',
          }}
        >
          All ({pending.length})
        </Link>
      </div>

      {/* ─── SECTION: NEEDS YOUR DECISION ──────────────────── */}
      {!showAll && (
        <section style={{ marginBottom: 'var(--sp-8)' }}>
          <div className="label" style={{ marginBottom: 'var(--sp-3)', color: decisions.length > 0 ? 'var(--amber)' : undefined }}>
            NEEDS YOUR DECISION — {decisions.length}
          </div>

          {decisions.length === 0 ? (
            <div className="card" style={{ padding: 'var(--sp-6)', textAlign: 'center' }}>
              <div style={{ color: 'var(--green)', fontSize: 14, marginBottom: 4 }}>All clear</div>
              <div className="body-xs">
                No pending decisions. Approvals appear here when agents request permission to take action, progress a workflow, or need your review.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {decisions.map(a => (
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
          )}
        </section>
      )}

      {/* ─── SECTION: ALL PENDING (when toggle = All) ─────── */}
      {showAll && (
        <section style={{ marginBottom: 'var(--sp-8)' }}>
          {/* Decisions */}
          {decisions.length > 0 && (
            <div style={{ marginBottom: 'var(--sp-6)' }}>
              <div className="label" style={{ marginBottom: 'var(--sp-3)', color: 'var(--amber)' }}>
                DECISIONS — {decisions.length}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {decisions.map(a => (
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
            </div>
          )}

          {/* Acknowledgments */}
          <details open={acknowledgments.length > 0 && acknowledgments.length <= 3}>
            <summary style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--sp-3)' }}>
              <span className="label" style={{ color: 'var(--slate)' }}>
                ACKNOWLEDGMENTS — {acknowledgments.length}
              </span>
            </summary>

            {acknowledgments.length === 0 ? (
              <div className="card" style={{ padding: 'var(--sp-4)', textAlign: 'center' }}>
                <div className="body-xs">
                  No acknowledgments pending.
                </div>
              </div>
            ) : (
              <>
                <p className="body-xs" style={{ marginBottom: 'var(--sp-3)' }}>
                  These items do not require a decision — just confirmation you&apos;ve seen them.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {acknowledgments.map(a => (
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
              </>
            )}
          </details>
        </section>
      )}

      {/* ─── SECTION: COMPLETED ────────────────────────────── */}
      {recent.length > 0 && (
        <section style={{ marginBottom: 'var(--sp-8)' }}>
          <details>
            <summary style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--sp-3)' }}>
              <span className="label">COMPLETED — last {recent.length}</span>
            </summary>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {recent.map(a => {
                return (
                  <ClickableApprovalRow
                    key={a.id as string}
                    data={{
                      id: a.id as string,
                      type: a.type as string,
                      entity: a.entity as string,
                      urgency: a.urgency as string,
                      requested_by: a.requested_by as string,
                      title: a.title as string,
                      description: a.description as string,
                      cost_estimate: a.cost_estimate as string,
                      created_at: a.created_at as string,
                      expires_at: a.expires_at as string,
                      status: a.status as string,
                      decided_at: a.decided_at as string,
                      approval_category: a.approval_category as string | null,
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
                )
              })}
            </div>
          </details>
        </section>
      )}
    </div>
  )
}
