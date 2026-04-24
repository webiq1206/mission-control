'use client'

import type { ApprovalCategory } from '@/lib/types'
import { deriveCategory, getCategoryMeta } from '@/lib/approval-framework'

interface Props {
  type: string
  approvalCategory?: string | null
  size?: 'sm' | 'md'
}

export function ApprovalCategoryBadge({ type, approvalCategory, size = 'md' }: Props) {
  const category: ApprovalCategory = deriveCategory(type, approvalCategory)
  const meta = getCategoryMeta(category)

  const isSm = size === 'sm'

  return (
    <span
      title={meta.description}
      style={{
        fontSize: isSm ? 8 : 9,
        fontFamily: 'monospace',
        fontWeight: 600,
        letterSpacing: '0.06em',
        padding: isSm ? '1px 5px' : '2px 8px',
        borderRadius: 5,
        background: meta.bgColor,
        color: meta.color,
        border: `1px solid ${meta.borderColor}`,
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        lineHeight: isSm ? '14px' : '16px',
      }}
    >
      {meta.label}
    </span>
  )
}
