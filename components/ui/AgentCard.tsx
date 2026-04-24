'use client'

import { useState } from 'react'
import { AgentDetailPanel } from '@/components/detail/types/AgentDetail'

export function AgentCard({ agent }: { agent: Record<string, unknown> }) {
  const [open, setOpen] = useState(false)
  const lastSeen = agent.last_seen as string | null
  const minsAgo = lastSeen
    ? Math.floor((Date.now() - new Date(lastSeen).getTime()) / 60000)
    : null
  const statusColor = !minsAgo ? 'var(--text-muted)'
    : minsAgo < 60 ? 'var(--green)'
    : minsAgo < 180 ? 'var(--yellow)'
    : 'var(--red)'

  return (
    <>
      <div
        className="card"
        style={{ padding: '12px 14px', cursor: 'pointer', transition: 'border-color 0.15s' }}
        onClick={() => setOpen(true)}
        title="Click to view agent details"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 16 }}>{agent.emoji as string}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{agent.agent_name as string}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{agent.role as string}</div>
          </div>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: statusColor, flexShrink: 0,
            boxShadow: minsAgo !== null && minsAgo < 60 ? `0 0 6px ${statusColor}` : 'none',
          }} className={minsAgo !== null && minsAgo < 60 ? 'pulse' : ''} />
        </div>

        {(agent.current_task as string) && (
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
            {agent.current_task as string}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
          <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
            {agent.tasks_completed_24h as number || 0} done/24h
          </span>
          {(agent.error_count_24h as number) > 0 && (
            <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--red)' }}>
              {agent.error_count_24h as number} errors
            </span>
          )}
          <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-faint)' }}>
            {lastSeen ? `${minsAgo}m ago` : 'never seen'}
          </span>
        </div>
      </div>

      <AgentDetailPanel
        open={open}
        onClose={() => setOpen(false)}
        data={{
          agent_id: agent.agent_id as string,
          agent_name: agent.agent_name as string,
          emoji: agent.emoji as string,
          role: agent.role as string,
          status: agent.status as string,
          current_task: agent.current_task as string,
          current_entity: agent.current_entity as string,
          model: agent.model as string,
          tasks_completed_24h: agent.tasks_completed_24h as number,
          error_count_24h: agent.error_count_24h as number,
          last_seen: agent.last_seen as string,
          active_goals: agent.active_goals as string,
        }}
        onUpdate={() => window.location.reload()}
      />
    </>
  )
}
