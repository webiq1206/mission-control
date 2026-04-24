'use client'

import { useState } from 'react'

export interface ActionDef {
  id: string
  label: string
  color: string
  hoverColor?: string
  icon?: string
  disabled?: boolean
  requiresConfirm?: boolean
  confirmPrompt?: string
}

interface ActionBarProps {
  actions: ActionDef[]
  onAction: (actionId: string, reason?: string) => void
  loading?: boolean
}

export function ActionBar({ actions, onAction, loading }: ActionBarProps) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  if (actions.length === 0) return null

  function handleClick(action: ActionDef) {
    if (action.requiresConfirm) {
      setConfirmingId(action.id)
      setReason('')
      return
    }
    onAction(action.id)
  }

  function handleConfirm() {
    if (confirmingId) {
      onAction(confirmingId, reason || undefined)
      setConfirmingId(null)
      setReason('')
    }
  }

  if (confirmingId) {
    const action = actions.find(a => a.id === confirmingId)
    return (
      <div>
        <div style={{
          fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8,
        }}>
          {action?.confirmPrompt || `Reason for ${action?.label || 'this action'}:`}
        </div>
        <input
          type="text"
          value={reason}
          onChange={e => setReason(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleConfirm()}
          placeholder="Optional reason..."
          autoFocus
          style={{
            width: '100%', padding: '8px 12px', borderRadius: 6,
            background: 'var(--bg-card)', border: '1px solid var(--border-faint)',
            color: 'var(--text-primary)', fontSize: 12, outline: 'none',
            marginBottom: 8, transition: 'border-color 0.2s',
          }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleConfirm}
            disabled={loading}
            style={{
              padding: '8px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600,
              background: action?.color || 'var(--blue)', color: '#fff',
              border: 'none', cursor: 'pointer',
              transition: 'opacity 0.2s',
            }}
          >
            Confirm {action?.label}
          </button>
          <button
            onClick={() => setConfirmingId(null)}
            style={{
              padding: '8px 16px', borderRadius: 6, fontSize: 12,
              background: 'var(--bg-card)', color: 'var(--text-secondary)',
              border: '1px solid var(--border-faint)', cursor: 'pointer',
              transition: 'border-color 0.2s',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {actions.map(action => (
        <button
          key={action.id}
          onClick={() => handleClick(action)}
          disabled={action.disabled || loading}
          style={{
            padding: '8px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600,
            background: action.color, color: '#fff',
            border: 'none', cursor: action.disabled ? 'not-allowed' : 'pointer',
            opacity: action.disabled ? 0.5 : 1,
            transition: 'opacity 0.2s, transform 0.15s',
          }}
        >
          {action.icon && <span style={{ marginRight: 4 }}>{action.icon}</span>}
          {action.label}
        </button>
      ))}
    </div>
  )
}
