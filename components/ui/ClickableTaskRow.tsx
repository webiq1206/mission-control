'use client'

import { useState, type ReactNode } from 'react'
import dynamic from 'next/dynamic'

const TaskDetailModal = dynamic(
  () => import('@/components/tasks/TaskDetailModal').then(m => ({ default: m.TaskDetailModal })),
  { ssr: false }
)

interface Props {
  taskId: string
  children: ReactNode
}

export function ClickableTaskRow({ taskId, children }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div onClick={() => setOpen(true)} style={{ cursor: 'pointer' }} title="Click to view task details">
        {children}
      </div>
      {open && <TaskDetailModal taskId={taskId} onClose={() => setOpen(false)} />}
    </>
  )
}
