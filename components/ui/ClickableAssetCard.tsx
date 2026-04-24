'use client'

import { useState, type ReactNode } from 'react'
import dynamic from 'next/dynamic'

const AssetDetailPanel = dynamic(
  () => import('@/components/detail/types/AssetDetail').then(m => ({ default: m.AssetDetailPanel })),
  { ssr: false }
)

interface Props {
  data: Record<string, unknown>
  children: ReactNode
}

export function ClickableAssetCard({ data, children }: Props) {
  const [open, setOpen] = useState(false)

  function handleClick(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('a')) return
    setOpen(true)
  }

  return (
    <>
      <div onClick={handleClick} style={{ cursor: 'pointer' }} title="Click to view asset details">
        {children}
      </div>
      {open && (
        <AssetDetailPanel
          open={open}
          onClose={() => setOpen(false)}
          data={{
            id: data.id as string,
            title: data.title as string,
            category: data.category as string,
            description: data.description as string,
            entity: data.entity as string,
            url: data.url as string,
            created_at: data.created_at as string,
          }}
        />
      )}
    </>
  )
}
