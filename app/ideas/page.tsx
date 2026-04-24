'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { EntityBadge, getEntityColor } from '@/components/ui/EntityBadge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ENTITIES } from '@/lib/entities'

interface Idea {
  id: string
  entity: string | null
  title: string
  description: string | null
  context: string | null
  objective: string | null
  next_steps: string | null
  submitted_by: string
  status: string
  priority: string
  created_at: string
}

export default function IdeasPage() {
  return <Suspense><IdeasContent /></Suspense>
}

function IdeasContent() {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formEntity, setFormEntity] = useState('')
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [expandedEntities, setExpandedEntities] = useState<Set<string>>(new Set())
  const searchParams = useSearchParams()

  const token = process.env.NEXT_PUBLIC_GATEWAY_TOKEN

  useEffect(() => {
    fetch('/api/ideas')
      .then(r => r.json())
      .then(d => {
        const items = (d.ideas || d || []) as Idea[]
        setIdeas(Array.isArray(items) ? items : [])
        setLoading(false)
        const entities = new Set(items.map((i: Idea) => i.entity || 'Global'))
        setExpandedEntities(entities)
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleSubmit() {
    if (!formTitle.trim()) return
    setSubmitting(true)
    try {
      await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          entity: formEntity || null,
          title: formTitle,
          description: formDescription,
          submitted_by: 'jared',
        }),
      })
      setFormTitle('')
      setFormDescription('')
      setFormEntity('')
      setShowForm(false)
      const res = await fetch('/api/ideas')
      const d = await res.json()
      setIdeas(d.ideas || d || [])
    } finally {
      setSubmitting(false)
    }
  }

  async function handleStartTask(idea: Idea) {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: idea.title,
          entity: idea.entity || 'Multi-Entity',
          description: idea.description || idea.context || '',
          objective: idea.objective || idea.description || '',
          status: 'backlog',
          priority: idea.priority || 'medium',
          source: 'idea',
        }),
      })
      if (res.ok) {
        await fetch(`/api/ideas/${idea.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ status: 'queued' }),
        })
        const r = await fetch('/api/ideas')
        const d = await r.json()
        setIdeas(d.ideas || d || [])
      }
    } catch { /* handled silently */ }
  }

  const byEntity: Record<string, Idea[]> = {}
  for (const idea of ideas) {
    const key = idea.entity || 'Global'
    if (!byEntity[key]) byEntity[key] = []
    byEntity[key].push(idea)
  }

  const sortedKeys = ENTITIES.map(e => e.label).filter(l => byEntity[l])
  const extra = Object.keys(byEntity).filter(k => !sortedKeys.includes(k))
  const allKeys = [...sortedKeys, ...extra]

  function toggleEntity(key: string) {
    setExpandedEntities(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ marginBottom: 'var(--sp-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="label" style={{ marginBottom: 6 }}>Mission Control</div>
          <h1 className="h1">Ideas</h1>
          <p className="body-xs" style={{ marginTop: 4 }}>
            Ideas submitted via Telegram or directly. Each entity has its own queue.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary"
        >
          {showForm ? 'Cancel' : '+ Submit Idea'}
        </button>
      </div>

      {/* Submit Idea Form */}
      {showForm && (
        <div className="card" style={{ padding: 'var(--sp-5)', marginBottom: 'var(--sp-6)' }}>
          <div className="label" style={{ marginBottom: 'var(--sp-3)' }}>SUBMIT NEW IDEA</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            <div>
              <label className="meta" style={{ display: 'block', marginBottom: 4 }}>Entity</label>
              <select value={formEntity} onChange={e => setFormEntity(e.target.value)}>
                <option value="">Select entity...</option>
                {ENTITIES.map(e => <option key={e.slug} value={e.label}>{e.label}</option>)}
                <option value="">Global / No Entity</option>
              </select>
            </div>
            <div>
              <label className="meta" style={{ display: 'block', marginBottom: 4 }}>Idea title</label>
              <input
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                placeholder="What's the idea?"
              />
            </div>
            <div>
              <label className="meta" style={{ display: 'block', marginBottom: 4 }}>Description</label>
              <textarea
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
                placeholder="What it is, what you're thinking..."
                rows={3}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
              <span className="meta">Submitted by: Jared</span>
              <div style={{ flex: 1 }} />
              <button
                onClick={handleSubmit}
                disabled={!formTitle.trim() || submitting}
                className="btn btn-primary"
              >
                {submitting ? 'Submitting...' : 'Submit →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--sp-10)', color: 'var(--text-muted)' }}>Loading ideas...</div>
      ) : allKeys.length === 0 ? (
        <div className="card" style={{ padding: 'var(--sp-8)', textAlign: 'center' }}>
          <div className="h3" style={{ color: 'var(--text-muted)', marginBottom: 'var(--sp-2)' }}>No ideas submitted yet</div>
          <div className="body-sm" style={{ color: 'var(--text-secondary)', maxWidth: 400, margin: '0 auto' }}>
            Ideas appear when you submit them here or send them via Telegram.
            Each idea can be converted into a task with the &quot;Start Task&quot; button.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          {allKeys.map(entityKey => {
            const items = byEntity[entityKey]
            const isOpen = expandedEntities.has(entityKey)
            const entityColor = getEntityColor(entityKey)

            return (
              <div key={entityKey} className="card" style={{ overflow: 'hidden' }}>
                <div
                  onClick={() => toggleEntity(entityKey)}
                  style={{
                    padding: 'var(--sp-4)',
                    display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
                    cursor: 'pointer',
                    borderLeft: `3px solid ${entityColor}`,
                  }}
                >
                  <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{isOpen ? '▼' : '▶'}</span>
                  <EntityBadge entity={entityKey} showFull />
                  <span className="meta">— {items.length} idea{items.length !== 1 ? 's' : ''}</span>
                </div>

                {isOpen && (
                  <div style={{ padding: '0 var(--sp-4) var(--sp-4)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
                    {items.map(idea => (
                      <div key={idea.id} className="card-inset" style={{ borderLeft: `2px solid ${entityColor}40` }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <StatusBadge status={idea.status} />
                            <span className="meta">{new Date(idea.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="h4" style={{ marginBottom: 4 }}>{idea.title}</div>
                        {(idea.context || idea.description) && (
                          <div className="body-sm line-clamp-3" style={{ marginBottom: 6 }}>
                            {idea.context || idea.description}
                          </div>
                        )}
                        <div className="meta" style={{ marginBottom: 6 }}>by {idea.submitted_by}</div>
                        {idea.objective && (
                          <div style={{ marginBottom: 6 }}>
                            <span className="label" style={{ fontSize: 8 }}>OBJECTIVE</span>
                            <div className="body-xs" style={{ marginTop: 2 }}>{idea.objective}</div>
                          </div>
                        )}
                        {idea.next_steps && (
                          <div style={{ marginBottom: 8 }}>
                            <span className="label" style={{ fontSize: 8 }}>NEXT STEPS</span>
                            <div className="body-xs" style={{ marginTop: 2, whiteSpace: 'pre-line' }}>{idea.next_steps}</div>
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                          {idea.status !== 'queued' && idea.status !== 'done' && (
                            <button
                              onClick={() => handleStartTask(idea)}
                              style={{
                                padding: '4px 12px', borderRadius: 'var(--r-md)', fontSize: 11,
                                fontFamily: 'var(--font-mono)', fontWeight: 500, cursor: 'pointer',
                                border: '1px solid var(--green-border)', color: 'var(--green)',
                                background: 'var(--green-bg)', transition: 'all 180ms ease',
                              }}
                            >
                              Start Task →
                            </button>
                          )}
                          {idea.status === 'queued' && (
                            <span className="meta" style={{ color: 'var(--green)' }}>Task created</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
