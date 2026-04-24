'use client'

import { useState, type ReactNode } from 'react'
import dynamic from 'next/dynamic'

const ApprovalDetailPanel = dynamic(
  () => import('@/components/detail/types/ApprovalDetail').then(m => ({ default: m.ApprovalDetailPanel })),
  { ssr: false }
)

interface Props {
  data: {
    id: string
    type: string
    entity: string
    urgency: string
    requested_by: string
    title: string
    description: string
    cost_estimate?: string
    created_at?: string
    expires_at?: string
    status: string
    decided_at?: string
    approval_category?: string | null
  }
  children: ReactNode
}

export function ClickableApprovalRow({ data, children }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div onClick={() => setOpen(true)} style={{ cursor: 'pointer' }} title="Click to view approval details">
        {children}
      </div>
      {open && (
        <ApprovalDetailPanel
          open={open}
          onClose={() => setOpen(false)}
          data={data}
          onStatusChange={() => window.location.reload()}
        />
      )}
    </>
  )
}
