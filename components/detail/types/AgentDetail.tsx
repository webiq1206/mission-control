'use client'

import { useState, useEffect } from 'react'
import { DetailPanel } from '../DetailPanel'
import { CommandBar } from '../CommandBar'
import { ActionBar, type ActionDef } from '../ActionBar'
import { AGENTS } from '@/lib/entities'

interface AgentData {
  agent_id: string
  agent_name: string
  emoji?: string
  role?: string
  status?: string
  current_task?: string
  current_entity?: string
  model?: string
  tasks_completed_24h?: number
  error_count_24h?: number
  last_seen?: string
  active_goals?: string
}

export function AgentDetailPanel({
  open,
  onClose,
  data,
  onUpdate,
}: {
  open: boolean
  onClose: () => void
  data: AgentData
  onUpdate?: () => void
}) {
  const [activity, setActivity] = useState<Record<string, unknown>[]>([])

  const agentMeta = AGENTS.find(a => a.id === data.agent_id)
  const lastSeen = data.last_seen
  const minsAgo = lastSeen ? Math.floor((Date.now() - new Date(lastSeen).getTime()) / 60000) : null
  const statusColor = !minsAgo ? 'var(--text-muted)'
    : minsAgo < 60 ? 'var(--green)'
    : minsAgo < 180 ? 'var(--amber)'
    : 'var(--red)'

  const token = process.env.NEXT_PUBLIC_GATEWAY_TOKEN

  useEffect(() => {
    if (open) {
      fetch(`/api/activity?limit=20`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(all => {
          const filtered = (all as Record<string, unknown>[]).filter(
            (a: Record<string, unknown>) => a.agent === data.agent_id || a.agent === data.agent_name
          )
          setActivity(filtered.slice(0, 10))
        })
        .catch(() => {})
    }
  }, [open, data.agent_id, data.agent_name])

  async function handleAction(actionId: string) {
    if (actionId === 'create-task') {
      await fetch('/api/nl-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemType: 'agent', itemId: data.agent_id,
          command: `create task assigned to ${data.agent_name}`,
          entitySlug: data.current_entity || undefined,
        }),
      })
      onUpdate?.()
    }
  }

  const actions: ActionDef[] = [
    { id: 'create-task', label: 'Assign New Task', color: 'var(--blue)', icon: '+' },
  ]

  const healthStatus = !minsAgo ? 'Unknown'
    : minsAgo < 60 ? 'Healthy — Active recently'
    : minsAgo < 180 ? 'Idle — Last active a few hours ago'
    : 'Inactive — May need attention'

  return (
    <DetailPanel
      open={open}
      onClose={onClose}
      title={`${data.emoji || agentMeta?.emoji || '🤖'} ${data.agent_name}`}
      subtitle={data.role || agentMeta?.role}
      typeBadge="Agent"
      typeColor={statusColor}
      entityLabel={data.current_entity || undefined}
      footer={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <ActionBar actions={actions} onAction={handleAction} />
          <CommandBar
            itemType="agent"
            itemId={data.agent_id}
            entitySlug={data.current_entity || undefined}
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
          <strong>{data.agent_name}</strong> is your <strong>{data.role || agentMeta?.role}</strong> agent
          {data.current_entity && <>, currently working on <strong>{data.current_entity}</strong></>}.
        </div>
      </section>

      {/* Health */}
      <section style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>
          Agent Health
        </div>
        <div className="glass-card" style={{ padding: 16, borderRadius: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%', background: statusColor,
              boxShadow: minsAgo !== null && minsAgo < 60 ? `0 0 8px ${statusColor}` : 'none',
            }} />
            <span style={{ fontSize: 13, color: statusColor, fontWeight: 500 }}>{healthStatus}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tasks (24h)</div>
              <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'monospace', color: 'var(--text-primary)', marginTop: 2 }}>
                {data.tasks_completed_24h || 0}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Errors (24h)</div>
              <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'monospace', color: (data.error_count_24h || 0) > 0 ? 'var(--red)' : 'var(--text-primary)', marginTop: 2 }}>
                {data.error_count_24h || 0}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Last Seen</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                {minsAgo !== null ? `${minsAgo}m ago` : 'Never'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Model</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, fontFamily: 'monospace' }}>
                {(data.model || agentMeta?.model || 'Unknown').split('/').pop()}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Current work */}
      {data.current_task && (
        <section style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>
            Currently Working On
          </div>
          <div className="glass-card" style={{ padding: 16, borderRadius: 8 }}>
            <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>{data.current_task}</div>
          </div>
        </section>
      )}

      {/* Active goals */}
      {data.active_goals && (
        <section style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>
            Active Goals
          </div>
          <div className="glass-card" style={{ padding: 16, borderRadius: 8 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{data.active_goals}</div>
          </div>
        </section>
      )}

      {/* Recent activity */}
      {activity.length > 0 && (
        <section>
          <div style={{ fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>
            Recent Activity
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activity.map((a, i) => (
              <div key={i} className="glass-card" style={{ padding: '10px 14px', borderRadius: 6, fontSize: 12 }}>
                <div style={{ color: 'var(--text-primary)', marginBottom: 2 }}>{a.action as string}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{a.detail as string}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </DetailPanel>
  )
}
