export const dynamic = 'force-dynamic'

import { getDb } from '@/lib/db'
import { ENTITIES, AGENTS, getEntity } from '@/lib/entities'
import { PageRefresher } from '@/components/ui/PageRefresher'
import Link from 'next/link'
import { format } from 'date-fns'
import { KanbanCard } from '@/components/tasks/KanbanCard'

type Task = Record<string, unknown>

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'var(--priority-critical)',
  high: 'var(--priority-high)',
  medium: 'var(--priority-medium)',
  low: 'var(--text-muted)',
}

const PRIORITY_BG: Record<string, string> = {
  critical: 'var(--red-bg)',
  high: 'var(--amber-bg)',
  medium: 'var(--blue-bg)',
  low: 'transparent',
}

const COLUMN_DEFS = [
  { key: 'backlog',         label: 'BACKLOG',          color: 'var(--text-muted)', hint: 'Queued — not started yet' },
  { key: 'needs_approval',  label: 'AWAITING APPROVAL',color: 'var(--amber)',       hint: 'Needs your sign-off before work begins' },
  { key: 'in_progress',     label: 'IN PROGRESS',      color: 'var(--blue)',        hint: 'Agent is actively working on this' },
  { key: 'review',          label: 'REVIEW',           color: 'var(--purple)',      hint: 'Work done — needs your review' },
  { key: 'blocked',         label: 'BLOCKED',          color: 'var(--red)',         hint: 'Cannot proceed — action needed' },
  { key: 'completed',       label: 'COMPLETED',        color: 'var(--green)',       hint: 'Done — showing last 10 per entity' },
]

function getColumn(status: string): string {
  if (['executing', 'approved', 'in_progress'].includes(status)) return 'in_progress'
  if (['approval_gated', 'proposed'].includes(status)) return 'needs_approval'
  if (status === 'review') return 'review'
  if (status === 'backlog') return 'backlog'
  if (status === 'blocked') return 'blocked'
  if (status === 'completed') return 'completed'
  return 'backlog'
}

function getAgentDisplay(agentId: string | null): string {
  if (!agentId) return '—'
  const agent = AGENTS.find(a => a.id === agentId || a.name.toLowerCase() === agentId?.toLowerCase())
  if (agent) return `${agent.emoji} ${agent.name}`
  return agentId
}

export default async function KanbanPage() {
  const db = getDb()

  const allTasks = db.prepare(`
    SELECT * FROM tasks
    ORDER BY
      CASE priority
        WHEN 'critical' THEN 1
        WHEN 'high'     THEN 2
        WHEN 'medium'   THEN 3
        WHEN 'low'      THEN 4
      END,
      updated_at DESC
  `).all() as Task[]

  const entityStats = ENTITIES.map(entity => {
    const tasks = allTasks.filter(t => {
      const match = getEntity(t.entity as string)
      return match?.slug === entity.slug
    })
    return {
      entity,
      total: tasks.length,
      backlog: tasks.filter(t => t.status === 'backlog').length,
      in_progress: tasks.filter(t => ['executing', 'approved', 'in_progress'].includes(t.status as string)).length,
      blocked: tasks.filter(t => t.status === 'blocked').length,
      needs_approval: tasks.filter(t => ['approval_gated', 'proposed'].includes(t.status as string)).length,
      completed: tasks.filter(t => t.status === 'completed').length,
    }
  })

  const pendingApprovalRows = db.prepare(
    `SELECT task_id, type, approval_category FROM approvals WHERE status = 'pending' AND task_id IS NOT NULL`
  ).all() as { task_id: string; type: string; approval_category: string | null }[]

  const pendingApprovalTaskIds = new Set(pendingApprovalRows.map(r => r.task_id))

  const approvalCategoryByTaskId = new Map<string, { type: string; approval_category: string | null }>()
  for (const row of pendingApprovalRows) {
    approvalCategoryByTaskId.set(row.task_id, { type: row.type, approval_category: row.approval_category })
  }

  const completedByEntity: Record<string, number> = {}
  const columns: Record<string, Task[]> = {
    backlog: [], needs_approval: [], in_progress: [], review: [], blocked: [], completed: []
  }

  for (const task of allTasks) {
    const col = getColumn(task.status as string)
    const entityMatch = getEntity(task.entity as string)
    const entityKey = entityMatch?.slug || (task.entity as string) || 'unknown'

    if (col === 'completed') {
      completedByEntity[entityKey] = (completedByEntity[entityKey] || 0)
      if (completedByEntity[entityKey] >= 10) continue
      completedByEntity[entityKey]++
    }

    columns[col].push(task)
  }

  const now = new Date()

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1600 }}>
      <PageRefresher />

      {/* Header */}
      <div style={{
        marginBottom: 32, paddingBottom: 24,
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      }}>
        <div>
          <div className="label" style={{ marginBottom: 6 }}>Mission Control</div>
          <h1 className="h1" style={{ marginBottom: 4 }}>
            All Entities — Kanban
          </h1>
          <div className="meta">
            {format(now, 'EEEE, MMMM d yyyy — h:mm a')} · {allTasks.length} total tasks
          </div>
        </div>
        <Link href="/tasks" className="btn btn-ghost" style={{ fontSize: 12 }}>
          All Tasks
        </Link>
      </div>

      {/* Entity Summary Row */}
      <div style={{ marginBottom: 32 }}>
        <div className="label" style={{ marginBottom: 16 }}>Entity Status</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          {entityStats.map(({ entity, total, backlog, in_progress, blocked, needs_approval, completed }) => (
            <Link
              key={entity.slug}
              href={`/entities/${entity.slug}`}
              className="glass-card"
              style={{
                borderLeft: `3px solid ${entity.color}`,
                padding: '14px',
                textDecoration: 'none',
                display: 'block',
                transition: 'background 0.15s, transform 0.1s, box-shadow 0.2s',
                boxShadow: (blocked > 0 || needs_approval > 0)
                  ? `0 0 12px ${entity.color}30, var(--glass-shadow)`
                  : 'var(--glass-shadow)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: entity.color, flexShrink: 0, boxShadow: `0 0 4px ${entity.color}50` }} />
                <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 600, color: entity.color }}>
                  {entity.abbr}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500, marginBottom: 8, lineHeight: 1.4 }}>
                {entity.label}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {total === 0 ? (
                  <span style={{ fontSize: 10, color: 'var(--text-faint)', fontFamily: 'monospace' }}>No tasks</span>
                ) : (
                  <>
                    {in_progress > 0 && <span style={{ fontSize: 10, color: 'var(--blue)', fontFamily: 'monospace' }}>▶ {in_progress} active</span>}
                    {blocked > 0 && <span style={{ fontSize: 10, color: 'var(--red)', fontFamily: 'monospace' }}>⚠ {blocked} blocked</span>}
                    {needs_approval > 0 && <span style={{ fontSize: 10, color: 'var(--orange)', fontFamily: 'monospace' }}>⏳ {needs_approval} awaiting approval</span>}
                    {backlog > 0 && <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>· {backlog} backlog</span>}
                    {completed > 0 && <span style={{ fontSize: 10, color: 'var(--green)', fontFamily: 'monospace' }}>✓ {completed} done</span>}
                  </>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Unified Kanban */}
      <div>
        <div className="label" style={{ marginBottom: 16 }}>Unified Task Board</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, overflowX: 'auto' }}>
          {COLUMN_DEFS.map(col => {
            const tasks = columns[col.key] || []
            return (
              <div key={col.key} style={{ minWidth: 280 }}>
                {/* Column Header */}
                <div style={{
                  marginBottom: 16, paddingBottom: 10,
                  borderBottom: `2px solid ${col.color}40`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{
                      fontSize: 11, fontFamily: 'monospace', letterSpacing: '0.08em',
                      textTransform: 'uppercase', color: col.color, fontWeight: 700,
                    }}>
                      {col.label}
                    </span>
                    <span style={{
                      fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)',
                      background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: 12,
                      border: '1px solid var(--border-subtle)',
                    }}>
                      {tasks.length}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{col.hint}</div>
                </div>

                {/* Task Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {tasks.length === 0 ? (
                    <div style={{
                      padding: 'var(--sp-5) var(--sp-4)', textAlign: 'center',
                      color: 'var(--text-faint)', fontSize: 11,
                      border: '1px dashed var(--border-faint)', borderRadius: 'var(--r-md)',
                    }}>
                      No tasks in {col.label.toLowerCase()}
                    </div>
                  ) : (
                    tasks.map(task => (
                      <KanbanCard
                        key={task.id as string}
                        task={task}
                        priorityColor={PRIORITY_COLORS[task.priority as string] || 'transparent'}
                        hasPendingApproval={pendingApprovalTaskIds.has(task.id as string)}
                        approvalType={approvalCategoryByTaskId.get(task.id as string)?.type}
                        approvalCategory={approvalCategoryByTaskId.get(task.id as string)?.approval_category}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
