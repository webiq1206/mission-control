'use client'

import { useState } from 'react'
import { DetailPanel } from '../DetailPanel'
import { CommandBar } from '../CommandBar'
import { ActionBar, type ActionDef } from '../ActionBar'

interface IdeaData {
  id: string
  title: string
  description?: string
  context?: string
  objective?: string
  next_steps?: string
  entity?: string
  submitted_by?: string
  status?: string
}

const sectionLabel: React.CSSProperties = {
  fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase',
  letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8,
}

export function IdeaDetailPanel({
  open,
  onClose,
  data,
  onUpdate,
}: {
  open: boolean
  onClose: () => void
  data: IdeaData
  onUpdate?: () => void
}) {
  const [status, setStatus] = useState(data.status || 'new')

  async function handleAction(actionId: string, reason?: string) {
    if (actionId === 'approve') {
      await fetch('/api/nl-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemType: 'idea', itemId: data.id, command: 'approve', entitySlug: data.entity }),
      })
      setStatus('approved')
      onUpdate?.()
      return
    }
    if (actionId === 'reject') {
      await fetch('/api/nl-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemType: 'idea', itemId: data.id, command: `reject${reason ? ` — ${reason}` : ''}`, entitySlug: data.entity }),
      })
      setStatus('rejected')
      onUpdate?.()
      return
    }
    if (actionId === 'create-task') {
      await fetch('/api/nl-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemType: 'idea', itemId: data.id,
          command: `create task from idea: ${data.title}`,
          entitySlug: data.entity,
        }),
      })
      setStatus('converted')
      onUpdate?.()
    }
  }

  const isPending = status === 'new'
  const actions: ActionDef[] = isPending ? [
    { id: 'approve', label: 'Greenlight', color: 'var(--green)', icon: '✓' },
    { id: 'reject', label: 'Pass', color: 'var(--red)', icon: '✗', requiresConfirm: true, confirmPrompt: 'Why pass on this idea?' },
    { id: 'create-task', label: 'Create Task', color: 'var(--blue)', icon: '+' },
  ] : status === 'converted' ? [] : [
    { id: 'create-task', label: 'Create Task', color: 'var(--blue)', icon: '+' },
  ]

  const statusColors: Record<string, { bg: string; border: string; text: string; label: string }> = {
    approved: { bg: 'rgba(45,212,160,0.05)', border: 'rgba(45,212,160,0.15)', text: 'var(--green)', label: 'Greenlighted. This idea is approved for exploration.' },
    rejected: { bg: 'rgba(224,82,82,0.05)', border: 'rgba(224,82,82,0.15)', text: 'var(--red)', label: 'Passed. This idea has been shelved.' },
    converted: { bg: 'rgba(167,139,250,0.05)', border: 'rgba(167,139,250,0.15)', text: 'var(--purple)', label: 'Converted. A task has been created from this idea.' },
  }

  const statusInfo = statusColors[status]

  return (
    <DetailPanel
      open={open}
      onClose={onClose}
      title={data.title}
      subtitle={data.submitted_by ? `Submitted by ${data.submitted_by}` : undefined}
      typeBadge="Idea"
      typeColor="var(--amber)"
      entityLabel={data.entity || undefined}
      footer={
        actions.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <ActionBar actions={actions} onAction={handleAction} />
            <CommandBar itemType="idea" itemId={data.id} entitySlug={data.entity} onCommandComplete={onUpdate} />
          </div>
        ) : (
          <CommandBar itemType="idea" itemId={data.id} entitySlug={data.entity} onCommandComplete={onUpdate} />
        )
      }
    >
      <section style={{ marginBottom: 20 }}>
        <div style={sectionLabel}>What is this</div>
        <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6 }}>
          An idea{data.submitted_by && <> from <strong>{data.submitted_by}</strong></>}
          {data.entity && <> for <strong>{data.entity}</strong></>}.
          Review it and decide whether to greenlight, pass, or turn it into a tracked task.
        </div>
      </section>

      {data.context && (
        <section style={{ marginBottom: 20 }}>
          <div style={sectionLabel}>Context</div>
          <div className="glass-card" style={{ padding: 16, borderRadius: 8 }}>
            <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6 }}>{data.context}</div>
          </div>
        </section>
      )}

      {data.objective && (
        <section style={{ marginBottom: 20 }}>
          <div style={sectionLabel}>Objective</div>
          <div className="glass-card" style={{ padding: 16, borderRadius: 8 }}>
            <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6 }}>{data.objective}</div>
          </div>
        </section>
      )}

      {data.next_steps && (
        <section style={{ marginBottom: 20 }}>
          <div style={sectionLabel}>Next Steps</div>
          <div className="glass-card" style={{ padding: 16, borderRadius: 8 }}>
            <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6 }}>{data.next_steps}</div>
          </div>
        </section>
      )}

      {data.description && (
        <section style={{ marginBottom: 20 }}>
          <div style={sectionLabel}>Details</div>
          <div className="glass-card" style={{ padding: 16, borderRadius: 8 }}>
            <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6 }}>{data.description}</div>
          </div>
        </section>
      )}

      {statusInfo && (
        <div style={{
          padding: '12px 16px', borderRadius: 8, fontSize: 13,
          background: statusInfo.bg,
          border: `1px solid ${statusInfo.border}`,
          color: statusInfo.text,
        }}>
          {statusInfo.label}
        </div>
      )}
    </DetailPanel>
  )
}
