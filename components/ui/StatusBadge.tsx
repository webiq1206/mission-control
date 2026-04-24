'use client'

interface StatusConfig {
  label: string
  color: string
  bg: string
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  backlog:        { label: 'Backlog',     color: 'var(--text-muted)',    bg: 'transparent'       },
  proposed:       { label: 'Proposed',    color: 'var(--amber)',         bg: 'var(--amber-bg)'   },
  approval_gated: { label: 'Awaiting Approval', color: 'var(--amber)',  bg: 'var(--amber-bg)'   },
  approved:       { label: 'Approved',    color: 'var(--green)',         bg: 'var(--green-bg)'   },
  executing:      { label: 'In Progress', color: 'var(--blue)',          bg: 'var(--blue-bg)'    },
  in_progress:    { label: 'In Progress', color: 'var(--blue)',          bg: 'var(--blue-bg)'    },
  review:         { label: 'In Review',   color: 'var(--purple)',        bg: 'var(--purple-bg)'  },
  completed:      { label: 'Completed',   color: 'var(--green)',         bg: 'transparent'       },
  blocked:        { label: 'Blocked',     color: 'var(--red)',           bg: 'var(--red-bg)'     },
  cancelled:      { label: 'Cancelled',   color: 'var(--text-muted)',    bg: 'transparent'       },
  active:         { label: 'Active',      color: 'var(--green)',         bg: 'var(--green-bg)'   },
  pending:        { label: 'Pending',     color: 'var(--amber)',         bg: 'var(--amber-bg)'   },
  rejected:       { label: 'Rejected',    color: 'var(--red)',           bg: 'var(--red-bg)'     },
  acknowledged:   { label: 'Acknowledged',color: 'var(--slate)',         bg: 'var(--slate-bg)'   },
  deferred:       { label: 'Deferred',    color: 'var(--text-secondary)',bg: 'transparent'       },
  new:            { label: 'New',         color: 'var(--blue)',          bg: 'var(--blue-bg)'    },
  reviewed:       { label: 'Reviewed',    color: 'var(--green)',         bg: 'var(--green-bg)'   },
  queued:         { label: 'Queued',      color: 'var(--amber)',         bg: 'var(--amber-bg)'   },
  done:           { label: 'Done',        color: 'var(--green)',         bg: 'transparent'       },
  draft:          { label: 'Draft',       color: 'var(--text-muted)',    bg: 'transparent'       },
  published:      { label: 'Published',   color: 'var(--green)',         bg: 'var(--green-bg)'   },
}

interface StatusBadgeProps {
  status: string
  style?: React.CSSProperties
}

export function StatusBadge({ status, style }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || { label: status, color: 'var(--text-muted)', bg: 'transparent' }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        fontWeight: 500,
        padding: '2px 7px',
        borderRadius: 4,
        whiteSpace: 'nowrap',
        lineHeight: '16px',
        letterSpacing: '0.02em',
        color: config.color,
        background: config.bg,
        ...style,
      }}
    >
      {config.label}
    </span>
  )
}
