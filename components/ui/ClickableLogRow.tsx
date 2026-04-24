'use client'

import { useState, type ReactNode } from 'react'
import dynamic from 'next/dynamic'

const ActivityDetailPanel = dynamic(
  () => import('@/components/detail/types/ActivityDetail').then(m => ({ default: m.ActivityDetailPanel })),
  { ssr: false }
)

interface LogRowProps {
  data: {
    id: number
    agent: string
    entity?: string
    action: string
    detail?: string
    task_id?: string
    tags?: string
    created_at: string
  }
  children: ReactNode
}

export function ClickableLogRow({ data, children }: LogRowProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div onClick={() => setOpen(true)} style={{ cursor: 'pointer' }} title="Click to view details">
        {children}
      </div>
      {open && (
        <ActivityDetailPanel
          open={open}
          onClose={() => setOpen(false)}
          data={{
            id: data.id,
            agent: data.agent,
            entity: data.entity,
            action: data.action,
            detail: data.detail,
            task_id: data.task_id,
            tags: data.tags,
            created_at: data.created_at,
          }}
        />
      )}
    </>
  )
}
