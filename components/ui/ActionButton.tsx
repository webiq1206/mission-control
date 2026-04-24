'use client'

import { useState, useCallback } from 'react'

type ActionVariant = 'approve' | 'reject' | 'modify' | 'acknowledge'
type ActionState = 'idle' | 'loading' | 'success' | 'error'

const VARIANT_CONFIG: Record<ActionVariant, {
  label: string
  icon: string
  color: string
  bg: string
  border: string
  hoverBg: string
}> = {
  approve: {
    label: 'Approve',
    icon: '✓',
    color: 'var(--green)',
    bg: 'var(--green-bg)',
    border: 'var(--green-border)',
    hoverBg: 'rgba(52,211,153,0.15)',
  },
  reject: {
    label: 'Reject',
    icon: '✗',
    color: 'var(--red)',
    bg: 'var(--red-bg)',
    border: 'var(--red-border)',
    hoverBg: 'rgba(248,113,113,0.15)',
  },
  modify: {
    label: 'Modify',
    icon: '✎',
    color: 'var(--amber)',
    bg: 'var(--amber-bg)',
    border: 'var(--amber-border)',
    hoverBg: 'rgba(251,191,36,0.15)',
  },
  acknowledge: {
    label: 'Acknowledge',
    icon: '✓',
    color: 'var(--slate)',
    bg: 'var(--slate-bg)',
    border: 'var(--slate-border)',
    hoverBg: 'rgba(148,163,184,0.12)',
  },
}

interface ActionButtonProps {
  variant: ActionVariant
  onClick: () => Promise<void> | void
  disabled?: boolean
  label?: string
  style?: React.CSSProperties
}

export function ActionButton({ variant, onClick, disabled = false, label, style }: ActionButtonProps) {
  const [state, setState] = useState<ActionState>('idle')
  const [hovered, setHovered] = useState(false)
  const config = VARIANT_CONFIG[variant]

  const handleClick = useCallback(async () => {
    if (state === 'loading' || disabled) return
    setState('loading')
    try {
      await onClick()
      setState('success')
      setTimeout(() => setState('idle'), 1500)
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 2000)
    }
  }, [onClick, state, disabled])

  const isDisabled = disabled || state === 'loading'
  const displayLabel = state === 'loading' ? 'Processing...' : (label || config.label)

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        height: 34,
        padding: '0 16px',
        borderRadius: 'var(--r-md)',
        fontSize: 13,
        fontWeight: 500,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        transition: 'all 180ms ease',
        border: `1px solid ${state === 'error' ? 'var(--red)' : config.border}`,
        color: state === 'success' ? 'var(--green)' : config.color,
        background: hovered && !isDisabled ? config.hoverBg : config.bg,
        opacity: isDisabled && state !== 'loading' ? 0.5 : 1,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {state === 'loading' ? (
        <span style={{ display: 'inline-block', animation: 'spin 0.8s linear infinite', fontSize: 12 }}>⟳</span>
      ) : (
        <span style={{ fontSize: 12 }}>{config.icon}</span>
      )}
      {displayLabel}
    </button>
  )
}
