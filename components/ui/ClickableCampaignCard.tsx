'use client'

import { useState, type ReactNode } from 'react'
import dynamic from 'next/dynamic'

const AdCampaignDetailPanel = dynamic(
  () => import('@/components/detail/types/AdCampaignDetail').then(m => ({ default: m.AdCampaignDetailPanel })),
  { ssr: false }
)

interface Props {
  data: Record<string, unknown>
  children: ReactNode
}

export function ClickableCampaignCard({ data, children }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <div onClick={() => setOpen(true)} style={{ cursor: 'pointer' }} title="Click to view campaign details">
        {children}
      </div>
      {open && (
        <AdCampaignDetailPanel
          open={open}
          onClose={() => setOpen(false)}
          data={{
            id: data.id as string,
            name: data.name as string,
            entity: data.entity as string,
            platform: data.platform as string,
            campaign_type: data.campaign_type as string,
            status: data.status as string,
            monthly_budget: data.budget_monthly as number,
            total_spend: data.spend_mtd as number,
            total_leads: data.leads_mtd as number,
            cpl: data.cpl as number,
            roas: data.roas as number,
            notes: data.notes as string,
            updated_at: data.last_updated as string,
          }}
        />
      )}
    </>
  )
}
