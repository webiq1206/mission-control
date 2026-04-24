'use client'
import { useState } from 'react'

export function NLTaskInput({ entitySlug, onCreated }: { entitySlug: string, onCreated?: () => void }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ title?: string; agent?: string; priority?: string } | null>(null)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!text.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/tasks/natural', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer b6a02df0fdb863b30f11d58f7fd206b1583b7618e722ea80'
        },
        body: JSON.stringify({ text, entity: entitySlug })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setResult(data)
      setText('')
      onCreated?.()
      // Refresh page to show new task
      setTimeout(() => window.location.reload(), 1200)
    } catch(e: unknown) {
      setError(e instanceof Error ? e.message : 'Error creating task')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ marginBottom: 28, padding: '16px 18px', background: 'var(--bg-card)', border: '1px solid var(--border-faint)', borderRadius: 8 }}>
      <div style={{ fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 10 }}>
        Create Task — Plain English
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="Describe a task in plain English... e.g. 'Write a BMH email sequence for cold leads'"
          style={{
            flex: 1, padding: '9px 12px', borderRadius: 5,
            background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)', fontSize: 13,
            outline: 'none',
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={loading || !text.trim()}
          style={{
            padding: '9px 18px', borderRadius: 5, fontSize: 12, fontWeight: 600,
            background: loading ? 'var(--bg-elevated)' : 'var(--blue)',
            color: loading ? 'var(--text-muted)' : '#fff',
            border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {loading ? 'Creating…' : 'Create Task'}
        </button>
      </div>
      {result && (
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--green)', fontFamily: 'monospace' }}>
          ✓ Created: &quot;{result.title}&quot; → assigned to {result.agent} · {result.priority} priority
        </div>
      )}
      {error && (
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--red)', fontFamily: 'monospace' }}>
          ✗ {error}
        </div>
      )}
    </div>
  )
}
