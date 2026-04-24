'use client'

import { useState } from 'react'
import { TaskDetailModal } from './TaskDetailModal'
import { AGENTS, getEntity } from '@/lib/entities'
import { EntityBadge, getEntityColor } from '@/components/ui/EntityBadge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { format, isPast } from 'date-fns'

export function KanbanCard({ task, priorityColor, hasPendingApproval, approvalType, approvalCategory }: {
  task: Record<string, unknown>,
  priorityColor: string,
  hasPendingApproval?: boolean,
  approvalType?: string,
  approvalCategory?: string | null,
}) {
  const [open, setOpen] = useState(false)
  const agent = AGENTS.find(a => a.id === task.assigned_agent || a.name.toLowerCase() === (task.assigned_agent as string)?.toLowerCase())
  const entityColor = getEntityColor(task.entity as string)

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className="kanban-card"
        style={{
          borderLeft: `3px solid ${entityColor}`,
          cursor: 'pointer',
          position: 'relative',
        }}
        title="Click to view details"
      >
        {/* Row 1: Entity + Status + Agent */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <EntityBadge entity={task.entity as string} />
            <StatusBadge status={task.status as string} />
          </div>
          {agent && (
            <span style={{ fontSize: 14 }} title={agent.name}>{agent.emoji}</span>
          )}
        </div>

        {/* Title */}
        <div className="kanban-card-title line-clamp-2">
          {task.title as string}
        </div>

        {/* Bottom row: due date, approval indicator, priority dot */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {(task.due_at as string) && (
              <span className="meta" style={{
                color: isPast(new Date(task.due_at as string)) ? 'var(--red)' : undefined,
              }}>
                Due {format(new Date(task.due_at as string), 'MMM d')}
              </span>
            )}
            {hasPendingApproval && (
              <span style={{
                fontSize: 9, fontFamily: 'var(--font-mono)', padding: '1px 6px', borderRadius: 4,
                background: 'var(--amber-bg)', color: 'var(--amber)',
                border: '1px solid var(--amber-border)',
                textTransform: 'uppercase', fontWeight: 500,
              }}>
                Awaiting
              </span>
            )}
          </div>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: priorityColor,
            boxShadow: priorityColor !== 'transparent' ? `0 0 6px ${priorityColor}60` : 'none',
            flexShrink: 0,
          }} />
        </div>
      </div>

      {open && <TaskDetailModal taskId={task.id as string} onClose={() => setOpen(false)} />}
    </>
  )
}
