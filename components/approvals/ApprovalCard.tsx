'use client'

import React, { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { EntityBadge, getEntityColor } from '@/components/ui/EntityBadge'
import { ApprovalTypeBadge } from '@/components/ui/ApprovalTypeBadge'
import { NaturalLanguageInput } from '@/components/ui/NaturalLanguageInput'
import { ApprovalDetailPanel } from '@/components/detail/types/ApprovalDetail'
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal'
import {
  deriveCategory,
  getPurposeText,
  getImpactText,
  getNextStepText,
  getActionOutcomes,
} from '@/lib/approval-framework'
import { emitApprovalAction } from '@/lib/approval-events'
import type { ApprovalCategory } from '@/lib/types'

type ApprovalAction = 'approved' | 'rejected' | 'deferred' | 'acknowledged'
type CardState = 'idle' | 'fading'

interface ApprovalCardProps {
  id: string
  type: string
  entity: string
  urgency: string
  requested_by: string
  title: string
  description: string
  cost_estimate?: string
  created_at?: string
  expires_at?: string
  task_id?: string
  task_title?: string
  approval_category?: string | null
  compact?: boolean
}

const URGENCY_BORDER: Record<string, string> = {
  urgent: 'var(--red)',
  critical: 'var(--red)',
  high: 'var(--amber)',
  normal: 'var(--blue)',
  low: 'transparent',
}

const URGENCY_LABEL: Record<string, { label: string; color: string }> = {
  critical: { label: 'CRITICAL', color: 'var(--red)' },
  urgent:   { label: 'URGENT',   color: 'var(--red)' },
  high:     { label: 'HIGH',     color: 'var(--amber)' },
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function SectionDivider() {
  return <div style={{ height: 1, background: 'var(--border-faint)', margin: '12px 0' }} />
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="label" style={{ marginBottom: 6, fontSize: 9, letterSpacing: '0.08em' }}>
      {children}
    </div>
  )
}

export function ApprovalCard({
  id,
  type,
  entity,
  urgency,
  requested_by,
  title,
  description,
  cost_estimate,
  created_at,
  expires_at,
  task_id,
  task_title,
  approval_category,
  compact = false,
}: ApprovalCardProps) {
  const [localStatus, setLocalStatus] = useState<'pending' | ApprovalAction>('pending')
  const [cardState, setCardState] = useState<CardState>('idle')
  const [detailOpen, setDetailOpen] = useState(false)
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [nlNote, setNlNote] = useState('')
  const [modifyOpen, setModifyOpen] = useState(false)
  const [modifyNote, setModifyNote] = useState('')
  const [modifySaving, setModifySaving] = useState(false)

  const token = typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_GATEWAY_TOKEN : ''
  const category = deriveCategory(type, approval_category)
  const isAcknowledgment = category === 'acknowledgment'
  const outcomes = getActionOutcomes(category, type, requested_by)
  const purpose = getPurposeText(category, type, requested_by, entity)
  const impact = getImpactText(category, urgency)

  const performAction = useCallback(async (action: ApprovalAction) => {
    try {
      await fetch(`/api/approvals/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: action, note: nlNote || undefined }),
      })

      setLocalStatus(action)
      emitApprovalAction()

      const toastMessages: Record<string, string> = {
        approved: `${title} approved — ${requested_by} picks up immediately`,
        rejected: `${title} rejected — reason sent to ${requested_by}`,
        deferred: `Changes applied — pending re-approval`,
        acknowledged: `Acknowledged — logged`,
      }
      toast.success(toastMessages[action] || `${action} recorded`, {
        duration: 3000,
        style: {
          background: '#13131C',
          color: '#ECEEF4',
          border: '1px solid rgba(255,255,255,0.09)',
          fontSize: 13,
        },
      })

      setCardState('fading')
      setTimeout(() => setCardState('idle'), 1500)
    } catch {
      toast.error('Action failed — please try again', {
        style: {
          background: '#13131C',
          color: '#F87171',
          border: '1px solid rgba(248,113,113,0.18)',
          fontSize: 13,
        },
      })
    }
  }, [id, token, nlNote, title, requested_by])

  const performModify = useCallback(async () => {
    if (!modifyNote.trim()) return
    setModifySaving(true)
    try {
      await fetch(`/api/approvals/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'deferred', note: modifyNote }),
      })
      setLocalStatus('deferred')
      emitApprovalAction()
      toast.success(`Modification sent to ${requested_by} — they will revise and re-queue`, {
        duration: 3000,
        style: { background: '#13131C', color: '#ECEEF4', border: '1px solid rgba(255,255,255,0.09)', fontSize: 13 },
      })
      setModifyOpen(false)
      setCardState('fading')
      setTimeout(() => setCardState('idle'), 1500)
    } catch {
      toast.error('Save failed — please try again', {
        style: { background: '#13131C', color: '#F87171', border: '1px solid rgba(248,113,113,0.18)', fontSize: 13 },
      })
    } finally {
      setModifySaving(false)
    }
  }, [id, token, modifyNote, requested_by])

  function handleCardClick(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('button')) return
    if ((e.target as HTMLElement).closest('textarea')) return
    if ((e.target as HTMLElement).closest('[data-linked-task]')) return
    if (compact) {
      setDetailOpen(true)
    }
  }

  const actionStatusBorderColor: Record<string, string> = {
    approved: 'var(--green)',
    rejected: 'var(--red)',
    acknowledged: 'var(--slate)',
    deferred: 'var(--amber)',
  }

  if (cardState === 'fading' && localStatus !== 'pending') {
    return (
      <div
        className="card fade-out"
        style={{
          padding: 'var(--sp-4) var(--sp-5)',
          borderLeft: `3px solid ${actionStatusBorderColor[localStatus] || 'var(--border-subtle)'}`,
          opacity: 0.6,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            color: actionStatusBorderColor[localStatus],
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            textTransform: 'uppercase',
            fontWeight: 600,
          }}>
            {localStatus === 'approved' ? 'Approved' : localStatus === 'rejected' ? 'Rejected' : localStatus === 'acknowledged' ? 'Acknowledged' : 'Modified'}
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            — {requested_by} notified
          </span>
        </div>
      </div>
    )
  }

  if (localStatus !== 'pending') {
    return null
  }

  const borderLeftColor = URGENCY_BORDER[urgency] || 'transparent'

  if (compact) {
    return (
      <>
        <div
          className="card"
          style={{
            padding: 'var(--sp-3) var(--sp-4)',
            borderLeft: `3px solid ${borderLeftColor}`,
            cursor: 'pointer',
          }}
          onClick={handleCardClick}
        >
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
            <ApprovalTypeBadge category={category} />
            <EntityBadge entity={entity} />
            <span className="meta">{timeAgo(created_at)}</span>
            {URGENCY_LABEL[urgency] && (
              <span style={{
                fontSize: 9, fontFamily: 'var(--font-mono)', padding: '1px 6px', borderRadius: 4,
                background: urgency === 'high' ? 'var(--amber-bg)' : 'var(--red-bg)',
                color: URGENCY_LABEL[urgency].color,
                border: `1px solid ${urgency === 'high' ? 'var(--amber-border)' : 'var(--red-border)'}`,
                textTransform: 'uppercase', fontWeight: 600,
              }}>{URGENCY_LABEL[urgency].label}</span>
            )}
          </div>

          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>
            {title}
          </div>
          <div className="body-xs line-clamp-2" style={{ marginBottom: 8 }}>
            {description}
          </div>

          <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {isAcknowledgment ? (
                <button onClick={() => performAction('acknowledged')} style={compactBtnStyle('var(--slate)', 'var(--slate-bg)', 'var(--slate-border)')}>Acknowledge</button>
              ) : (
                <>
                  <button onClick={() => performAction('approved')} style={compactBtnStyle('var(--green)', 'var(--green-bg)', 'var(--green-border)')}>Approve</button>
                  <button onClick={() => performAction('rejected')} style={compactBtnStyle('var(--red)', 'var(--red-bg)', 'var(--red-border)')}>Reject</button>
                </>
              )}
            </div>
            <span
              style={{ fontSize: 11, color: 'var(--blue)', cursor: 'pointer' }}
              onClick={(e) => { e.stopPropagation(); setDetailOpen(true) }}
            >
              See full details →
            </span>
          </div>
        </div>

        <ApprovalDetailPanel
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          data={{ id, type, entity, urgency, requested_by, title, description, cost_estimate, created_at, expires_at, status: localStatus, task_id, approval_category }}
          onStatusChange={() => window.location.reload()}
        />
      </>
    )
  }

  return (
    <>
      <div
        className="card"
        style={{
          padding: 'var(--sp-5)',
          borderLeft: `3px solid ${borderLeftColor}`,
        }}
      >
        {/* Header row */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
          <ApprovalTypeBadge category={category} />
          <EntityBadge entity={entity} />
          <span className="meta">from {requested_by}</span>
          <span style={{ flex: 1 }} />
          <span className="meta">{timeAgo(created_at)}</span>
          {URGENCY_LABEL[urgency] && (
            <span style={{
              fontSize: 9, fontFamily: 'var(--font-mono)', padding: '1px 6px', borderRadius: 4,
              background: urgency === 'high' ? 'var(--amber-bg)' : 'var(--red-bg)',
              color: URGENCY_LABEL[urgency].color,
              border: `1px solid ${urgency === 'high' ? 'var(--amber-border)' : 'var(--red-border)'}`,
              textTransform: 'uppercase', fontWeight: 600,
            }}>{URGENCY_LABEL[urgency].label}</span>
          )}
        </div>

        {/* Title */}
        <div className="h3" style={{ marginBottom: 4, lineHeight: 1.4 }}>
          {title}
        </div>

        {cost_estimate && (
          <div style={{ fontSize: 12, color: 'var(--amber)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>
            Est. cost: {cost_estimate}
          </div>
        )}

        {task_id && task_title && (
          <div
            data-linked-task
            onClick={() => setTaskModalOpen(true)}
            style={{ marginBottom: 2, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
          >
            <span style={{
              fontSize: 9, fontFamily: 'var(--font-mono)', padding: '1px 5px', borderRadius: 4,
              background: 'var(--blue-bg)', color: 'var(--blue)', border: '1px solid var(--blue-border)',
              textTransform: 'uppercase',
            }}>Task</span>
            <span style={{ fontSize: 11, color: 'var(--blue)' }}>{task_title}</span>
          </div>
        )}

        {/* Section 1: Why you're seeing this */}
        <SectionDivider />
        <SectionLabel>WHY YOU&apos;RE SEEING THIS</SectionLabel>
        <div className="body-sm" style={{ lineHeight: 1.6 }}>{purpose}</div>

        {/* Section 2: What you're deciding */}
        <SectionDivider />
        <SectionLabel>WHAT YOU&apos;RE DECIDING</SectionLabel>
        <div className="body-sm" style={{ lineHeight: 1.6 }}>{description}</div>

        {/* Section 3: Why it matters */}
        <SectionDivider />
        <SectionLabel>WHY IT MATTERS</SectionLabel>
        <div className="body-sm" style={{ lineHeight: 1.6, color: ['urgent','critical'].includes(urgency) ? 'var(--red)' : urgency === 'high' ? 'var(--amber)' : undefined }}>
          {impact}
        </div>

        {/* Section 4: What happens when you act */}
        <SectionDivider />
        <SectionLabel>WHAT HAPPENS WHEN YOU ACT</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
          <OutcomeBlock icon="✓" label="Approve" color="var(--green)" items={outcomes.approve.items} />
          <OutcomeBlock icon="✗" label="Reject" color="var(--red)" items={outcomes.reject.items} />
          <OutcomeBlock icon="✎" label="Modify" color="var(--amber)" items={outcomes.modify.items} />
          {outcomes.acknowledge && (
            <OutcomeBlock icon="✓" label="Acknowledge" color="var(--slate)" items={outcomes.acknowledge.items} />
          )}
        </div>

        {/* Section 5: Next step */}
        <SectionDivider />
        <SectionLabel>NEXT STEP AFTER YOUR DECISION</SectionLabel>
        <div className="body-sm" style={{ lineHeight: 1.6, fontWeight: 500 }}>
          {getNextStepText(category, 'pending', requested_by)}
        </div>

        {/* Section 6: NL input + action buttons */}
        <SectionDivider />
        <NaturalLanguageInput
          placeholder="Type any instruction in plain language..."
          onSubmit={async (val) => { setNlNote(val) }}
          style={{ marginBottom: 10 }}
        />

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {isAcknowledgment ? (
            <ActionBtn label="Acknowledge" color="var(--slate)" bg="var(--slate-bg)" border="var(--slate-border)" hoverBg="rgba(148,163,184,0.12)" onClick={() => performAction('acknowledged')} />
          ) : (
            <>
              <ActionBtn label="✓ Approve" color="var(--green)" bg="var(--green-bg)" border="var(--green-border)" hoverBg="rgba(52,211,153,0.15)" onClick={() => performAction('approved')} />
              <ActionBtn label="✗ Reject" color="var(--red)" bg="var(--red-bg)" border="var(--red-border)" hoverBg="rgba(248,113,113,0.15)" onClick={() => performAction('rejected')} />
              <ActionBtn label="✎ Modify" color="var(--amber)" bg="var(--amber-bg)" border="var(--amber-border)" hoverBg="rgba(251,191,36,0.15)" onClick={() => setModifyOpen(true)} />
            </>
          )}
        </div>
      </div>

      {taskModalOpen && task_id && (
        <TaskDetailModal taskId={task_id} onClose={() => setTaskModalOpen(false)} />
      )}

      {/* Modify modal */}
      {modifyOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setModifyOpen(false) }}
        >
          <div className="card" style={{ width: '100%', maxWidth: 560, padding: 'var(--sp-6)' }}>
            <div style={{ marginBottom: 'var(--sp-4)' }}>
              <div className="h3" style={{ marginBottom: 6 }}>Request Changes</div>
              <div className="body-sm">{title}</div>
            </div>
            <div style={{ marginBottom: 'var(--sp-3)' }}>
              <div className="label" style={{ marginBottom: 8 }}>WHAT NEEDS TO CHANGE</div>
              <textarea
                value={modifyNote}
                onChange={e => setModifyNote(e.target.value)}
                placeholder="Describe the change needed in plain language. The agent will revise and re-queue for your approval."
                style={{
                  width: '100%', minHeight: 120,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 8, padding: 12,
                  color: 'var(--text-primary)', fontSize: 13, lineHeight: 1.6,
                  resize: 'vertical', outline: 'none', boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-default)'}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setModifyOpen(false); setModifyNote('') }}
                style={{
                  padding: '8px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                  background: 'transparent', border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={performModify}
                disabled={!modifyNote.trim() || modifySaving}
                style={{
                  padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  background: modifyNote.trim() ? 'var(--amber-bg)' : 'var(--bg-elevated)',
                  border: `1px solid ${modifyNote.trim() ? 'var(--amber-border)' : 'var(--border-subtle)'}`,
                  color: modifyNote.trim() ? 'var(--amber)' : 'var(--text-muted)',
                  opacity: modifySaving ? 0.6 : 1,
                }}
              >
                {modifySaving ? 'Sending...' : 'Send to Agent'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function OutcomeBlock({ icon, label, color, items }: { icon: string; label: string; color: string; items: string[] }) {
  return (
    <div style={{ paddingLeft: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ color, fontSize: 12, fontWeight: 600 }}>{icon}</span>
        <span style={{ color, fontSize: 12, fontWeight: 600 }}>{label}</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>→</span>
      </div>
      {items.map((item, i) => (
        <div key={i} style={{ fontSize: 12, color: 'var(--text-body)', lineHeight: 1.6, paddingLeft: 20 }}>
          {item}
        </div>
      ))}
    </div>
  )
}

function ActionBtn({ label, color, bg, border, hoverBg, onClick }: {
  label: string; color: string; bg: string; border: string; hoverBg: string; onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 34,
        padding: '0 16px',
        borderRadius: 'var(--r-md)',
        fontSize: 13,
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 180ms ease',
        border: `1px solid ${border}`,
        color,
        background: hovered ? hoverBg : bg,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  )
}

function compactBtnStyle(color: string, bg: string, border: string): React.CSSProperties {
  return {
    padding: '4px 10px',
    borderRadius: 6,
    fontSize: 11,
    fontFamily: 'var(--font-mono)',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 180ms ease',
    border: `1px solid ${border}`,
    color,
    background: bg,
    whiteSpace: 'nowrap',
  }
}
