'use client'

import { useState, type ReactNode } from 'react'
import dynamic from 'next/dynamic'

const AgentDetailPanel = dynamic(
  () => import('@/components/detail/types/AgentDetail').then(m => ({ default: m.AgentDetailPanel })),
  { ssr: false }
)

interface Props {
  data: Record<string, unknown>
  children: ReactNode
}

export function ClickableAgentCard({ data, children }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div onClick={() => setOpen(true)} style={{ cursor: 'pointer' }} title="Click to view agent details">
        {children}
      </div>
      {open && (
        <AgentDetailPanel
          open={open}
          onClose={() => setOpen(false)}
          data={{
            agent_id: data.agent_id as string,
            agent_name: data.agent_name as string,
            emoji: data.emoji as string,
            role: data.role as string,
            status: data.status as string,
            current_task: data.current_task as string,
            current_entity: data.current_entity as string,
            model: data.model as string,
            tasks_completed_24h: data.tasks_completed_24h as number,
            error_count_24h: data.error_count_24h as number,
            last_seen: data.last_seen as string,
            active_goals: data.active_goals as string,
          }}
          onUpdate={() => window.location.reload()}
        />
      )}
    </>
  )
}
