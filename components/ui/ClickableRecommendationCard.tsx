'use client'

import { useState, type ReactNode } from 'react'
import dynamic from 'next/dynamic'

const AdRecommendationDetailPanel = dynamic(
  () => import('@/components/detail/types/AdRecommendationDetail').then(m => ({ default: m.AdRecommendationDetailPanel })),
  { ssr: false }
)

interface Props {
  data: Record<string, unknown>
  children: ReactNode
}

export function ClickableRecommendationCard({ data, children }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <div onClick={() => setOpen(true)} style={{ cursor: 'pointer' }} title="Click to view recommendation details">
        {children}
      </div>
      {open && (
        <AdRecommendationDetailPanel
          open={open}
          onClose={() => setOpen(false)}
          data={{
            id: data.id as string,
            type: data.recommendation_type as string,
            entity: data.entity as string,
            title: data.title as string,
            description: data.description as string,
            impact: data.projected_impact as string,
            status: data.status as string,
            decision: data.decision as string,
          }}
          onUpdate={() => window.location.reload()}
        />
      )}
    </>
  )
}
