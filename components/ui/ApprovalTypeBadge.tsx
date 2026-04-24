'use client'

import type { ApprovalCategory } from '@/lib/types'

const TYPE_CONFIG: Record<ApprovalCategory, { label: string; color: string; bg: string; border: string }> = {
  execution:      { label: 'ACTION NEEDED',        color: 'var(--type-execution)',   bg: 'var(--type-execution-bg)',   border: 'rgba(96,165,250,0.18)'   },
  progression:    { label: 'MOVE FORWARD?',          color: 'var(--type-progression)', bg: 'var(--type-progression-bg)', border: 'rgba(52,211,153,0.18)'   },
  review:         { label: 'REVIEW NEEDED',          color: 'var(--type-review)',      bg: 'var(--type-review-bg)',      border: 'rgba(192,132,252,0.18)'  },
  acknowledgment: { label: 'FOR YOUR AWARENESS',    color: 'var(--type-ack)',         bg: 'var(--type-ack-bg)',         border: 'rgba(148,163,184,0.14)'  },
}

interface ApprovalTypeBadgeProps {
  category: ApprovalCategory
  style?: React.CSSProperties
}

export function ApprovalTypeBadge({ category, style }: ApprovalTypeBadgeProps) {
  const config = TYPE_CONFIG[category] || TYPE_CONFIG.execution

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: '0.06em',
        padding: '2px 8px',
        borderRadius: 5,
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        lineHeight: '16px',
        color: config.color,
        background: config.bg,
        border: `1px solid ${config.border}`,
        ...style,
      }}
    >
      {config.label}
    </span>
  )
}
