'use client'

import { useState, type ReactNode } from 'react'
import dynamic from 'next/dynamic'

const IdeaDetailPanel = dynamic(
  () => import('@/components/detail/types/IdeaDetail').then(m => ({ default: m.IdeaDetailPanel })),
  { ssr: false }
)

interface Props {
  data: Record<string, unknown>
  children: ReactNode
}

export function ClickableIdeaCard({ data, children }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <div onClick={() => setOpen(true)} style={{ cursor: 'pointer' }} title="Click to view idea details">
        {children}
      </div>
      {open && (
        <IdeaDetailPanel
          open={open}
          onClose={() => setOpen(false)}
          data={{
            id: data.id as string,
            title: data.title as string,
            description: data.description as string,
            context: data.context as string,
            objective: data.objective as string,
            next_steps: data.next_steps as string,
            entity: data.entity as string,
            submitted_by: data.submitted_by as string,
            status: data.status as string,
          }}
          onUpdate={() => window.location.reload()}
        />
      )}
    </>
  )
}
