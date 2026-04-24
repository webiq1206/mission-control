'use client'

import { useState } from 'react'
import { DetailPanel } from '../DetailPanel'
import { CommandBar } from '../CommandBar'
import { ActionBar, type ActionDef } from '../ActionBar'

interface PriorityData {
  id: string
  title: string
  status: string
  progress_pct: number
  entity: string
  assigned_agents?: string | string[]
  next_action?: string
  blockers?: string
  tags?: string | string[]
}

export function PriorityDetailPanel({
  open,
  onClose,
  data,
  onUpdate,
}: {
  open: boolean
  onClose: () => void
  data: PriorityData
  onUpdate?: () => void
}) {
  const [modifying, setModifying] = useState(false)
  const [editProgress, setEditProgress] = useState(String(data.progress_pct))
  const [editStatus, setEditStatus] = useState(data.status)
  const [editBlockers, setEditBlockers] = useState(data.blockers || '')
  const [editNext, setEditNext] = useState(data.next_action || '')
  const token = process.env.NEXT_PUBLIC_GATEWAY_TOKEN

  const agents = (() => {
    if (Array.isArray(data.assigned_agents)) return data.assigned_agents
    if (typeof data.assigned_agents === 'string') {
      try { const v = JSON.parse(data.assigned_agents); return Array.isArray(v) ? v : [] } catch { return [] }
    }
    return []
  })()

  const tags = (() => {
    if (Array.isArray(data.tags)) return data.tags
    if (typeof data.tags === 'string') {
      try { const v = JSON.parse(data.tags); return Array.isArray(v) ? v : [] } catch { return [] }
    }
    return []
  })()

  const statusColor = data.status === 'active' ? 'var(--green)'
    : data.status === 'blocked' ? 'var(--red)'
    : data.status === 'paused' ? 'var(--amber)'
    : 'var(--text-muted)'

  async function handleAction(actionId: string) {
    if (actionId === 'modify') {
      setModifying(true)
      return
    }
    if (actionId === 'create-task') {
      await fetch('/api/nl-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemType: 'priority', itemId: data.id,
          command: `create task for priority: ${data.title}`,
          entitySlug: data.entity,
        }),
      })
      onUpdate?.()
      return
    }
  }

  async function saveModifications() {
    await fetch('/api/priorities', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        id: data.id,
        status: editStatus,
        progress_pct: parseInt(editProgress) || 0,
        blockers: editBlockers,
        next_action: editNext,
      }),
    })
    setModifying(false)
    onUpdate?.()
  }

  const actions: ActionDef[] = [
    { id: 'modify', label: 'Modify', color: 'var(--blue)', icon: '✎' },
    { id: 'create-task', label: 'Create Task', color: 'rgba(100,140,190,0.3)' },
  ]

  return (
    <DetailPanel
      open={open}
      onClose={onClose}
      title={data.title}
      subtitle={`${data.entity} — ${data.status}`}
      typeBadge="Priority"
      typeColor={statusColor}
      entityLabel={data.entity}
      footer={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <ActionBar actions={actions} onAction={handleAction} />
          <CommandBar
            itemType="priority"
            itemId={data.id}
            entitySlug={data.entity}
            onCommandComplete={onUpdate}
          />
        </div>
      }
    >
      {/* What is this */}
      <section style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>
          What is this
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6 }}>
          A strategic priority for <strong>{data.entity}</strong> that is currently <strong style={{ color: statusColor }}>{data.status}</strong> at <strong>{data.progress_pct}%</strong> completion.
        </div>
      </section>

      {/* Why it matters */}
      <section style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>
          Why it matters
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {data.status === 'blocked'
            ? `This priority is blocked and needs attention. ${data.blockers ? `Blocker: ${data.blockers}` : 'Review the blockers and decide how to proceed.'}`
            : data.status === 'active' && data.progress_pct < 30
            ? 'This priority is in its early stages. Monitor progress and ensure agents are aligned on the objectives.'
            : data.status === 'active' && data.progress_pct >= 70
            ? 'This priority is nearing completion. Review the remaining work and ensure quality before marking complete.'
            : 'Track this priority to ensure it stays on schedule and aligned with business goals.'}
        </div>
      </section>

      {/* Progress */}
      <section style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>
          Progress
        </div>
        <div className="glass-card" style={{ padding: 16, borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 24, fontWeight: 600, fontFamily: 'monospace', color: statusColor }}>
              {data.progress_pct}%
            </span>
            <span style={{ fontSize: 12, fontFamily: 'monospace', color: statusColor, fontWeight: 600 }}>
              {data.status}
            </span>
          </div>
          <div style={{ height: 6, background: 'var(--bg-card)', borderRadius: 3 }}>
            <div style={{
              height: '100%', borderRadius: 3,
              width: `${data.progress_pct}%`,
              background: data.status === 'blocked' ? 'var(--red)' : 'var(--blue)',
              transition: 'width 0.3s ease',
              boxShadow: `0 0 8px ${data.status === 'blocked' ? 'rgba(224,82,82,0.3)' : 'rgba(59,130,246,0.3)'}`,
            }} />
          </div>
        </div>
      </section>

      {/* Details */}
      <section style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>
          Details
        </div>
        <div className="glass-card" style={{ padding: 16, borderRadius: 8 }}>
          {data.next_action && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Next Action</div>
              <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 4 }}>{data.next_action}</div>
            </div>
          )}
          {data.blockers && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--red)', textTransform: 'uppercase' }}>Blockers</div>
              <div style={{ fontSize: 13, color: 'var(--red)', marginTop: 4 }}>{data.blockers}</div>
            </div>
          )}
          {agents.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Assigned Agents</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                {(agents as string[]).map((a: string) => (
                  <span key={a} style={{
                    fontSize: 11, fontFamily: 'monospace', padding: '2px 8px', borderRadius: 4,
                    background: 'var(--bg-card)', color: 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)',
                  }}>{a}</span>
                ))}
              </div>
            </div>
          )}
          {tags.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tags</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                {(tags as string[]).map((t: string) => (
                  <span key={t} style={{
                    fontSize: 10, fontFamily: 'monospace', padding: '2px 6px', borderRadius: 4,
                    background: 'rgba(59,130,246,0.1)', color: 'var(--blue)',
                    border: '1px solid rgba(59,130,246,0.2)',
                  }}>{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Modify mode */}
      {modifying && (
        <section style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>
            Modify Priority
          </div>
          <div className="glass-card" style={{ padding: 16, borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Status</label>
              <select
                value={editStatus}
                onChange={e => setEditStatus(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13 }}
              >
                <option value="active">Active</option>
                <option value="blocked">Blocked</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Progress %</label>
              <input type="number" min="0" max="100" value={editProgress} onChange={e => setEditProgress(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13, boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Next Action</label>
              <input type="text" value={editNext} onChange={e => setEditNext(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13, boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Blockers</label>
              <input type="text" value={editBlockers} onChange={e => setEditBlockers(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13, boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={saveModifications} style={{ padding: '8px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: 'var(--blue)', color: '#fff', border: 'none', cursor: 'pointer' }}>Save Changes</button>
              <button onClick={() => setModifying(false)} style={{ padding: '8px 16px', borderRadius: 6, fontSize: 12, background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </section>
      )}
    </DetailPanel>
  )
}
