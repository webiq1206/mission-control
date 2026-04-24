'use client'

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'var(--priority-critical)',
  high:     'var(--priority-high)',
  medium:   'var(--priority-medium)',
  low:      'transparent',
}

interface PriorityBarProps {
  priority: string
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export function PriorityBar({ priority, children, className, style }: PriorityBarProps) {
  const color = PRIORITY_COLORS[priority] || 'transparent'

  return (
    <div
      className={className}
      style={{
        borderLeft: `3px solid ${color}`,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function getPriorityColor(priority: string): string {
  return PRIORITY_COLORS[priority] || 'transparent'
}
