'use client'

import { useState } from 'react'

interface CommandBarProps {
  itemType: string
  itemId: string
  entitySlug?: string
  resolvedTarget?: { type: string; id: string } | null
  onCommandComplete?: () => void
}

const PLACEHOLDERS: Record<string, string> = {
  approval:  'e.g. "approve this", "reject — too expensive", "modify cost to $300/mo"',
  priority:  'e.g. "update progress to 60%", "mark as blocked", "add blocker: waiting on design"',
  agent:     'e.g. "assign a task to research competitors", "what is this agent working on?"',
  activity:  'e.g. "approve this", "mark complete", "reject — reason", "create a follow-up task"',
  campaign:  'e.g. "pause this campaign", "create a task to review performance"',
  recommendation: 'e.g. "approve this recommendation", "reject — not aligned with strategy"',
  idea:      'e.g. "approve this idea", "create a task from this", "reject — low priority"',
  asset:     'e.g. "create a task to update this asset", "add a note"',
}

interface PendingConfirmation {
  message: string
  command: string
}

export function CommandBar({ itemType, itemId, entitySlug, resolvedTarget, onCommandComplete }: CommandBarProps) {
  const [command, setCommand] = useState('')
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [pending, setPending] = useState<PendingConfirmation | null>(null)

  async function sendCommand(cmd: string, confirmed: boolean) {
    const res = await fetch('/api/nl-command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemType, itemId, command: cmd, entitySlug, confirmed }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Command failed')
    return data
  }

  async function handleRun() {
    if (!command.trim() || loading) return
    setLoading(true)
    setFeedback('')
    setPending(null)
    try {
      const data = await sendCommand(command.trim(), false)
      if (data.requiresConfirmation) {
        setPending({ message: data.message, command: command.trim() })
        setFeedback('')
      } else {
        setFeedback(`✓ ${data.message || 'Done'}`)
        setCommand('')
        onCommandComplete?.()
      }
    } catch (e: unknown) {
      setFeedback(`✗ ${e instanceof Error ? e.message : 'Command failed'}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm() {
    if (!pending) return
    setLoading(true)
    try {
      const data = await sendCommand(pending.command, true)
      setFeedback(`✓ ${data.message || 'Done'}`)
      setCommand('')
      setPending(null)
      onCommandComplete?.()
    } catch (e: unknown) {
      setFeedback(`✗ ${e instanceof Error ? e.message : 'Command failed'}`)
    } finally {
      setLoading(false)
    }
  }

  function handleCancel() {
    setPending(null)
    setFeedback('')
  }

  return (
    <div>
      <div style={{
        fontSize: 10, fontFamily: 'monospace', textTransform: 'uppercase',
        letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        Instruct
        {resolvedTarget && (
          <span style={{
            fontSize: 9, padding: '2px 6px', borderRadius: 3,
            background: 'rgba(74,158,255,0.12)', color: 'var(--blue)',
            border: '1px solid rgba(74,158,255,0.2)',
            textTransform: 'none', letterSpacing: 'normal',
          }}>
            Acting on {resolvedTarget.type}: {resolvedTarget.id}
          </span>
        )}
      </div>

      {pending ? (
        <div>
          <div style={{
            padding: '10px 14px', borderRadius: 6, marginBottom: 8,
            background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.25)',
            fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5,
          }}>
            <strong style={{ color: 'rgb(251,146,60)' }}>Confirm:</strong> {pending.message}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleConfirm}
              disabled={loading}
              style={{
                padding: '8px 16px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                background: 'rgb(251,146,60)', color: '#fff',
                border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? '...' : 'Confirm'}
            </button>
            <button
              onClick={handleCancel}
              disabled={loading}
              style={{
                padding: '8px 16px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                background: 'var(--bg-elevated)', color: 'var(--text-muted)',
                border: '1px solid var(--border-faint)', cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={command}
            onChange={e => setCommand(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleRun()}
            placeholder={PLACEHOLDERS[itemType] || 'Type an instruction...'}
            style={{
              flex: 1, padding: '8px 12px', borderRadius: 6,
              background: 'var(--bg-card)', border: '1px solid var(--border-faint)',
              color: 'var(--text-primary)', fontSize: 12, outline: 'none',
              transition: 'border-color 0.2s',
            }}
          />
          <button
            onClick={handleRun}
            disabled={loading || !command.trim()}
            style={{
              padding: '8px 16px', borderRadius: 6, fontSize: 11, fontWeight: 600,
              background: loading ? 'var(--bg-elevated)' : 'var(--blue)',
              color: loading ? 'var(--text-muted)' : '#fff',
              border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap', opacity: !command.trim() ? 0.5 : 1,
              transition: 'opacity 0.2s, background 0.2s',
              boxShadow: loading ? 'none' : '0 0 12px rgba(74,158,255,0.15)',
            }}
          >
            {loading ? '...' : 'Run'}
          </button>
        </div>
      )}
      {feedback && (
        <div style={{
          marginTop: 6, fontSize: 11, fontFamily: 'monospace',
          color: feedback.startsWith('✓') ? 'var(--green)' : 'var(--red)',
        }}>
          {feedback}
        </div>
      )}
    </div>
  )
}
