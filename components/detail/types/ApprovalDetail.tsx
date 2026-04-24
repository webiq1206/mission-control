'use client'

import { useState, useEffect, useCallback } from 'react'
import { DetailPanel } from '../DetailPanel'
import { CommandBar } from '../CommandBar'
import { ActionBar, type ActionDef } from '../ActionBar'
import { ApprovalFollowThrough } from '@/components/approvals/ApprovalFollowThrough'
import { ApprovalCategoryBadge } from '@/components/approvals/ApprovalCategoryBadge'
import {
  deriveCategory,
  getCategoryMeta,
  getPurposeText,
  getImpactText,
  getActionOutcomes,
  getNextStepText,
} from '@/lib/approval-framework'
import { formatDistanceToNow } from 'date-fns'
import dynamic from 'next/dynamic'

const TaskDetailModal = dynamic(
  () => import('@/components/tasks/TaskDetailModal').then(m => ({ default: m.TaskDetailModal })),
  { ssr: false }
)

interface ApprovalData {
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
  status?: string
  task_id?: string
  deliverables?: string
  approval_category?: string | null
}

interface Deliverable {
  type: 'file' | 'url' | 'asset'
  label: string
  path?: string
  url?: string
  asset_id?: string
}

interface LinkedTask {
  id: string
  title: string
  status: string
  priority: string
  entity: string
  assigned_agent?: string
}

function parseDeliverables(raw: string | undefined): Deliverable[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function extractLegacyDeliverables(description: string): Deliverable[] {
  const results: Deliverable[] = []
  const pathRegex = /workspace-[a-z0-9-]+\/[^\s"'<>]+/g
  const urlRegex = /https?:\/\/[^\s"'<>]+/g

  const paths = description.match(pathRegex) || []
  for (const p of paths) {
    const filename = p.split('/').pop() || p
    results.push({ type: 'file', label: filename, path: p })
  }

  const urls = description.match(urlRegex) || []
  for (const u of urls) {
    const cleaned = u.replace(/[.)]+$/, '')
    const domain = new URL(cleaned).hostname.replace('www.', '')
    results.push({ type: 'url', label: domain, url: cleaned })
  }

  return results
}

function DeliverableCard({ d }: { d: Deliverable }) {
  const [expanded, setExpanded] = useState(false)
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const token = typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_GATEWAY_TOKEN : ''

  async function loadContent() {
    if (content !== null) {
      setExpanded(!expanded)
      return
    }
    if (d.type !== 'file' || !d.path) return
    setLoading(true)
    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(d.path)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setContent(data.content)
      } else {
        setContent('File not found or unreadable')
      }
    } catch {
      setContent('Failed to load file')
    } finally {
      setLoading(false)
      setExpanded(true)
    }
  }

  const typeBadgeColors: Record<string, { bg: string; color: string; border: string }> = {
    file:  { bg: 'rgba(99,179,237,0.08)', color: 'var(--blue)',  border: 'rgba(99,179,237,0.15)' },
    url:   { bg: 'rgba(45,212,160,0.08)', color: 'var(--green)', border: 'rgba(45,212,160,0.15)' },
    asset: { bg: 'rgba(224,138,60,0.08)', color: 'var(--orange)', border: 'rgba(224,138,60,0.15)' },
  }

  const badge = typeBadgeColors[d.type] || typeBadgeColors.file

  return (
    <div className="glass-card" style={{ padding: '12px 14px', borderRadius: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
          <span style={{
            fontSize: 9, fontFamily: 'monospace', padding: '2px 6px', borderRadius: 4,
            background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`,
            textTransform: 'uppercase', flexShrink: 0,
          }}>
            {d.type}
          </span>
          <span style={{ fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {d.label}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {d.type === 'file' && d.path && (
            <button
              onClick={loadContent}
              style={{
                fontSize: 11, padding: '4px 10px', borderRadius: 5,
                background: expanded ? 'var(--blue)' : 'var(--bg-elevated)',
                color: expanded ? '#fff' : 'var(--text-secondary)',
                border: `1px solid ${expanded ? 'var(--blue)' : 'var(--border-subtle)'}`,
                cursor: 'pointer', fontFamily: 'monospace',
              }}
            >
              {loading ? '...' : expanded ? 'Collapse' : 'Preview'}
            </button>
          )}
          {d.type === 'url' && d.url && (
            <a
              href={d.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 11, padding: '4px 10px', borderRadius: 5,
                background: 'var(--bg-elevated)', color: 'var(--green)',
                border: '1px solid rgba(45,212,160,0.15)',
                cursor: 'pointer', fontFamily: 'monospace', textDecoration: 'none',
              }}
            >
              Open
            </a>
          )}
        </div>
      </div>

      {d.type === 'file' && d.path && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {d.path}
        </div>
      )}
      {d.type === 'url' && d.url && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {d.url}
        </div>
      )}

      {expanded && content !== null && (
        <div style={{
          marginTop: 10, padding: 14, borderRadius: 6,
          background: 'var(--bg-base)', border: '1px solid var(--border-subtle)',
          maxHeight: 400, overflow: 'auto',
        }}>
          <pre style={{
            fontSize: 12, fontFamily: 'monospace', color: 'var(--text-secondary)',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, lineHeight: 1.6,
          }}>
            {content}
          </pre>
        </div>
      )}
    </div>
  )
}

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase',
  letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8,
}

function OutcomeBlock({ label, items, color }: { label: string; items: string[]; color: string }) {
  return (
    <div style={{
      padding: '10px 14px', borderRadius: 8,
      background: `${color}08`, border: `1px solid ${color}15`,
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color, marginBottom: 6 }}>{label}</div>
      {items.map((item, i) => (
        <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, paddingLeft: 12, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 0, color: 'var(--text-muted)' }}>-</span>
          {item}
        </div>
      ))}
    </div>
  )
}

export function ApprovalDetailPanel({
  open,
  onClose,
  data,
  onStatusChange,
}: {
  open: boolean
  onClose: () => void
  data: ApprovalData
  onStatusChange?: () => void
}) {
  const [status, setStatus] = useState(data.status || 'pending')
  const [modifying, setModifying] = useState(false)
  const [editCost, setEditCost] = useState(data.cost_estimate || '')
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [legacyDeliverables, setLegacyDeliverables] = useState<Deliverable[]>([])
  const [linkedTask, setLinkedTask] = useState<LinkedTask | null>(null)
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [enrichedLoaded, setEnrichedLoaded] = useState(false)
  const token = typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_GATEWAY_TOKEN : ''

  const category = deriveCategory(data.type, data.approval_category)
  const categoryMeta = getCategoryMeta(category)
  const isAcknowledgment = category === 'acknowledgment'
  const outcomes = getActionOutcomes(category, data.type, data.requested_by)

  const fetchEnriched = useCallback(async () => {
    if (enrichedLoaded || !open) return
    try {
      const res = await fetch(`/api/approvals/${data.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const result = await res.json()
      const approval = result.approval as Record<string, unknown>

      const structured = parseDeliverables(approval.deliverables as string)
      setDeliverables(structured)

      const desc = (approval.description as string) || data.description
      const legacy = extractLegacyDeliverables(desc)
      const structuredPaths = new Set(structured.map(d => d.path || d.url))
      const uniqueLegacy = legacy.filter(l => !structuredPaths.has(l.path || l.url))
      setLegacyDeliverables(uniqueLegacy)

      if (result.task) setLinkedTask(result.task as LinkedTask)

      setEnrichedLoaded(true)
    } catch {
      setLegacyDeliverables(extractLegacyDeliverables(data.description))
      setEnrichedLoaded(true)
    }
  }, [data.id, data.description, open, token, enrichedLoaded])

  useEffect(() => { fetchEnriched() }, [fetchEnriched])

  async function handleAction(actionId: string, reason?: string) {
    if (actionId === 'modify') {
      setModifying(true)
      return
    }
    if (actionId === 'create-task') {
      await fetch('/api/nl-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemType: 'approval', itemId: data.id,
          command: `create task Follow up on approval: ${data.title}`,
          entitySlug: data.entity,
        }),
      })
      onStatusChange?.()
      return
    }

    const statusMap: Record<string, string> = {
      approve: 'approved',
      reject: 'rejected',
      acknowledge: 'acknowledged',
    }
    const newStatus = statusMap[actionId] || 'approved'
    await fetch(`/api/approvals/${data.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus, note: reason }),
    })
    setStatus(newStatus)
    onStatusChange?.()
  }

  async function saveCostEdit() {
    await fetch(`/api/approvals/${data.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: 'pending', note: `Cost estimate modified to: ${editCost}` }),
    })
    setModifying(false)
  }

  const isPending = status === 'pending'

  const actions: ActionDef[] = isPending
    ? isAcknowledgment
      ? [
          { id: 'acknowledge', label: 'Acknowledge', color: 'var(--text-secondary)', icon: '✓' },
        ]
      : [
          { id: 'approve', label: 'Approve', color: 'var(--green)', icon: '✓' },
          { id: 'reject', label: 'Reject', color: 'var(--red)', icon: '✗', requiresConfirm: true, confirmPrompt: 'Why are you rejecting this?' },
          { id: 'modify', label: 'Modify', color: 'var(--blue)', icon: '✎' },
          { id: 'create-task', label: 'Create Task', color: 'rgba(100,140,190,0.3)' },
        ]
    : [
        { id: 'create-task', label: 'Create Task', color: 'rgba(100,140,190,0.3)' },
      ]

  const urgencyColor = data.urgency === 'urgent' ? 'var(--red)' : 'var(--amber)'
  const hasDeliverables = deliverables.length > 0 || legacyDeliverables.length > 0

  return (
    <DetailPanel
      open={open}
      onClose={onClose}
      title={data.title}
      subtitle={`Requested by ${data.requested_by}`}
      typeBadge={categoryMeta.label}
      typeColor={categoryMeta.color.startsWith('var(') ? urgencyColor : categoryMeta.color}
      entityLabel={data.entity}
      footer={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!modifying && <ActionBar actions={actions} onAction={handleAction} />}
          <CommandBar
            itemType="approval"
            itemId={data.id}
            entitySlug={data.entity}
            onCommandComplete={onStatusChange}
          />
        </div>
      }
    >
      {/* Linked Task */}
      {linkedTask && (
        <section style={{ marginBottom: 20 }}>
          <div
            className="glass-card light-shadow-on-hover"
            onClick={() => setTaskModalOpen(true)}
            role="button"
            style={{ padding: '10px 14px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
          >
            <span style={{
              fontSize: 9, fontFamily: 'monospace', padding: '2px 6px', borderRadius: 4,
              background: 'rgba(99,179,237,0.08)', color: 'var(--blue)', border: '1px solid rgba(99,179,237,0.15)',
              textTransform: 'uppercase',
            }}>
              Linked Task
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {linkedTask.title}
            </span>
            <span style={{
              fontSize: 10, fontFamily: 'monospace', padding: '2px 6px', borderRadius: 4,
              background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)',
            }}>
              {linkedTask.status}
            </span>
          </div>
        </section>
      )}

      {/* SECTION 1: Clear Purpose */}
      <section style={{ marginBottom: 20 }}>
        <div style={sectionLabelStyle}>Clear Purpose</div>
        <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6 }}>
          {getPurposeText(category, data.type, data.requested_by, data.entity)}
        </div>
      </section>

      {/* SECTION 2: Approval Category */}
      <section style={{ marginBottom: 20 }}>
        <div style={sectionLabelStyle}>Approval Type</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ApprovalCategoryBadge type={data.type} approvalCategory={data.approval_category} />
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{categoryMeta.description}</span>
        </div>
      </section>

      {/* SECTION 3: What Is Being Decided */}
      <section style={{ marginBottom: 20 }}>
        <div style={sectionLabelStyle}>What Is Being Decided</div>
        <div className="glass-card" style={{ padding: 16, borderRadius: 8 }}>
          <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7 }}>
            {data.description}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
            <div>
              <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Type</div>
              <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 2 }}>{data.type}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Urgency</div>
              <div style={{ fontSize: 13, color: urgencyColor, marginTop: 2 }}>{data.urgency}</div>
            </div>
            {data.cost_estimate && (
              <div>
                <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cost Estimate</div>
                <div style={{ fontSize: 13, color: 'var(--yellow)', marginTop: 2 }}>{data.cost_estimate}</div>
              </div>
            )}
            {data.created_at && (
              <div>
                <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Requested</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {formatDistanceToNow(new Date(data.created_at), { addSuffix: true })}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* SECTION 4: Why It Matters */}
      <section style={{ marginBottom: 20 }}>
        <div style={sectionLabelStyle}>Why It Matters</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {getImpactText(category, data.urgency)}
        </div>
      </section>

      {/* SECTION 5: Action Outcomes */}
      {isPending && (
        <section style={{ marginBottom: 20 }}>
          <div style={sectionLabelStyle}>Action Outcomes</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {isAcknowledgment && outcomes.acknowledge ? (
              <OutcomeBlock label={outcomes.acknowledge.label} items={outcomes.acknowledge.items} color="var(--text-secondary)" />
            ) : (
              <>
                <OutcomeBlock label={outcomes.approve.label} items={outcomes.approve.items} color="var(--green)" />
                <OutcomeBlock label={outcomes.reject.label} items={outcomes.reject.items} color="var(--red)" />
                <OutcomeBlock label={outcomes.modify.label} items={outcomes.modify.items} color="var(--blue)" />
              </>
            )}
          </div>
        </section>
      )}

      {/* SECTION 6: Next Step / After Action */}
      {!isPending && (
        <section style={{ marginBottom: 20 }}>
          <div style={sectionLabelStyle}>What Happens Next</div>
          <div style={{
            padding: '12px 16px', borderRadius: 8,
            background: status === 'approved' ? 'rgba(45,212,160,0.05)' : status === 'rejected' ? 'rgba(224,82,82,0.05)' : status === 'acknowledged' ? 'rgba(138,138,168,0.05)' : 'var(--bg-elevated)',
            border: `1px solid ${status === 'approved' ? 'rgba(45,212,160,0.12)' : status === 'rejected' ? 'rgba(224,82,82,0.12)' : status === 'acknowledged' ? 'rgba(138,138,168,0.12)' : 'var(--border-faint)'}`,
          }}>
            <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6 }}>
              {getNextStepText(category, status, data.requested_by)}
            </div>
          </div>
        </section>
      )}

      {/* Deliverables */}
      {hasDeliverables && (
        <section style={{ marginBottom: 20 }}>
          <div style={{ ...sectionLabelStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
            Deliverables
            <span style={{
              fontSize: 10, padding: '1px 6px', borderRadius: 10,
              background: 'rgba(99,179,237,0.08)', color: 'var(--blue)', border: '1px solid rgba(99,179,237,0.15)',
            }}>
              {deliverables.length + legacyDeliverables.length}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {deliverables.map((d, i) => (
              <DeliverableCard key={`d-${i}`} d={d} />
            ))}
            {legacyDeliverables.length > 0 && deliverables.length > 0 && (
              <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 4 }}>
                Referenced in description
              </div>
            )}
            {legacyDeliverables.map((d, i) => (
              <DeliverableCard key={`l-${i}`} d={d} />
            ))}
          </div>
        </section>
      )}

      {/* Modify mode */}
      {modifying && (
        <section style={{ marginBottom: 20 }}>
          <div style={sectionLabelStyle}>Modify Before Approving</div>
          <div className="glass-card" style={{ padding: 16, borderRadius: 8 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
              Adjusted cost estimate:
            </label>
            <input
              type="text"
              value={editCost}
              onChange={e => setEditCost(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 6,
                background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)', fontSize: 13, outline: 'none',
                marginBottom: 8, boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={saveCostEdit}
                style={{ padding: '8px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: 'var(--blue)', color: '#fff', border: 'none', cursor: 'pointer' }}
              >
                Save Changes
              </button>
              <button
                onClick={() => setModifying(false)}
                style={{ padding: '8px 16px', borderRadius: 6, fontSize: 12, background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Status result: follow-through */}
      {status === 'approved' && (
        <ApprovalFollowThrough
          approvalId={data.id}
          approvalType={data.type}
          title={data.title}
          description={data.description}
          costEstimate={data.cost_estimate}
        />
      )}
      {status === 'rejected' && (
        <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(224,82,82,0.05)', border: '1px solid rgba(224,82,82,0.12)', fontSize: 13, color: 'var(--red)' }}>
          Rejected. Agents have been notified and no action will be taken.
        </div>
      )}

      {/* Task detail modal */}
      {taskModalOpen && linkedTask && (
        <TaskDetailModal taskId={linkedTask.id} onClose={() => setTaskModalOpen(false)} />
      )}
    </DetailPanel>
  )
}
