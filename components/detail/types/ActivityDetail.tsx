'use client'

import { useMemo, type ReactNode } from 'react'
import { DetailPanel } from '../DetailPanel'
import { CommandBar } from '../CommandBar'
import { ActionBar, type ActionDef } from '../ActionBar'
import { AGENTS } from '@/lib/entities'
import { formatDistanceToNow } from 'date-fns'

const ENTITY_REF_PATTERN = /\[(approval|task|priority|idea|recommendation):([^\]]+)\]/g

interface ActivityData {
  id: number
  agent: string
  entity?: string
  action: string
  detail?: string
  task_id?: string
  tags?: string | string[]
  created_at: string
}

function parseEntityRefs(detail: string): { type: string; id: string }[] {
  const refs: { type: string; id: string }[] = []
  let match: RegExpExecArray | null
  const re = new RegExp(ENTITY_REF_PATTERN.source, ENTITY_REF_PATTERN.flags)
  while ((match = re.exec(detail)) !== null) {
    refs.push({ type: match[1], id: match[2] })
  }
  return refs
}

function renderDetailWithRefs(detail: string): ReactNode[] {
  const parts: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  const re = new RegExp(ENTITY_REF_PATTERN.source, ENTITY_REF_PATTERN.flags)

  while ((match = re.exec(detail)) !== null) {
    if (match.index > lastIndex) {
      parts.push(detail.slice(lastIndex, match.index))
    }
    const refType = match[1]
    const refId = match[2]
    parts.push(
      <span
        key={`${refType}-${refId}-${match.index}`}
        style={{
          display: 'inline-block',
          fontSize: 11, fontFamily: 'monospace', padding: '1px 6px', borderRadius: 3,
          background: 'rgba(74,158,255,0.1)', color: 'var(--blue)',
          border: '1px solid rgba(74,158,255,0.2)',
          cursor: 'default',
        }}
        title={`${refType}: ${refId}`}
      >
        {refType}:{refId}
      </span>
    )
    lastIndex = re.lastIndex
  }

  if (lastIndex < detail.length) {
    parts.push(detail.slice(lastIndex))
  }

  return parts
}

export function ActivityDetailPanel({
  open,
  onClose,
  data,
  onUpdate,
}: {
  open: boolean
  onClose: () => void
  data: ActivityData
  onUpdate?: () => void
}) {
  const agentMeta = AGENTS.find(a => a.id === data.agent || a.name.toLowerCase() === data.agent?.toLowerCase())
  let tags: string[] = []
  try {
    const raw = typeof data.tags === 'string' ? JSON.parse(data.tags) : data.tags
    tags = Array.isArray(raw) ? raw : []
  } catch { tags = [] }

  const actionLabel = data.action?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Activity'

  const resolvedTarget = useMemo(() => {
    if (!data.detail) return null
    const refs = parseEntityRefs(data.detail)
    return refs.length ? refs[0] : null
  }, [data.detail])

  async function handleAction(actionId: string) {
    if (actionId === 'create-task') {
      await fetch('/api/nl-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemType: 'activity', itemId: String(data.id),
          command: `create task Follow up on: ${data.detail || data.action}`,
          entitySlug: data.entity || undefined,
        }),
      })
      onUpdate?.()
    }
  }

  const actions: ActionDef[] = [
    { id: 'create-task', label: 'Create Follow-up Task', color: 'var(--blue)', icon: '+' },
  ]

  return (
    <DetailPanel
      open={open}
      onClose={onClose}
      title={actionLabel}
      subtitle={`${agentMeta?.emoji || '🤖'} ${agentMeta?.name || data.agent} — ${formatDistanceToNow(new Date(data.created_at), { addSuffix: true })}`}
      typeBadge="Activity"
      typeColor="var(--blue)"
      entityLabel={data.entity || undefined}
      footer={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <ActionBar actions={actions} onAction={handleAction} />
          <CommandBar
            itemType="activity"
            itemId={String(data.id)}
            entitySlug={data.entity || undefined}
            resolvedTarget={resolvedTarget}
            onCommandComplete={onUpdate}
          />
        </div>
      }
    >
      {/* What happened */}
      <section style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>
          What happened
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6 }}>
          <strong>{agentMeta?.name || data.agent}</strong> ({agentMeta?.role || 'Agent'}) performed a <strong>{actionLabel.toLowerCase()}</strong> action
          {data.entity && <> for <strong>{data.entity}</strong></>}
          {' '}{formatDistanceToNow(new Date(data.created_at), { addSuffix: true })}.
        </div>
      </section>

      {/* Details */}
      {data.detail && (
        <section style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>
            Details
          </div>
          <div className="glass-card" style={{ padding: 16, borderRadius: 8 }}>
            <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6 }}>
              {renderDetailWithRefs(data.detail)}
            </div>
          </div>
        </section>
      )}

      {/* Linked Entity */}
      {resolvedTarget && (
        <section style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>
            Linked {resolvedTarget.type}
          </div>
          <div className="glass-card" style={{
            padding: '10px 14px', borderRadius: 8,
            display: 'flex', alignItems: 'center', gap: 8,
            borderLeft: '3px solid var(--blue)',
          }}>
            <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--blue)', fontWeight: 600 }}>
              {resolvedTarget.id}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              — instructions will act on this {resolvedTarget.type}
            </span>
          </div>
        </section>
      )}

      {/* Context */}
      <section style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>
          Context
        </div>
        <div className="glass-card" style={{ padding: 16, borderRadius: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Agent</div>
              <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 2 }}>{agentMeta?.emoji} {agentMeta?.name || data.agent}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Action</div>
              <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 2 }}>{actionLabel}</div>
            </div>
            {data.entity && (
              <div>
                <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Entity</div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 2 }}>{data.entity}</div>
              </div>
            )}
            {data.task_id && (
              <div>
                <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Linked Task</div>
                <div style={{ fontSize: 13, color: 'var(--blue)', marginTop: 2, fontFamily: 'monospace' }}>{data.task_id}</div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Tags */}
      {tags.length > 0 && (
        <section>
          <div style={{ fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>
            Tags
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(tags as string[]).map((tag: string) => (
              <span key={tag} style={{
                fontSize: 10, fontFamily: 'monospace', padding: '3px 8px', borderRadius: 4,
                background: 'rgba(59,130,246,0.1)', color: 'var(--blue)',
                border: '1px solid rgba(59,130,246,0.2)',
              }}>{tag}</span>
            ))}
          </div>
        </section>
      )}
    </DetailPanel>
  )
}
