'use client'

import { useState } from 'react'
import { PriorityDetailPanel } from '@/components/detail/types/PriorityDetail'

export function PriorityRow({ priority }: { priority: Record<string, unknown> }) {
  const [open, setOpen] = useState(false)
  const p = priority
  const agents = (() => {
    if (Array.isArray(p.assigned_agents)) return p.assigned_agents
    if (typeof p.assigned_agents === 'string') {
      try { const v = JSON.parse(p.assigned_agents); return Array.isArray(v) ? v : [] } catch { return [] }
    }
    return []
  })()

  return (
    <>
      <div
        className="glass-card"
        style={{ padding: '14px 16px', marginBottom: 6, cursor: 'pointer' }}
        onClick={() => setOpen(true)}
        title="Click to view details"
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>{p.title as string}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{
              fontSize: 10, fontFamily: 'monospace',
              color: p.status === 'active' ? 'var(--green)' : p.status === 'blocked' ? 'var(--red)' : 'var(--text-muted)',
            }}>
              {p.status as string}
            </span>
            <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
              {p.progress_pct as number}%
            </span>
          </div>
        </div>

        <div style={{ height: 3, background: 'var(--bg-elevated)', borderRadius: 2, marginBottom: 10 }}>
          <div style={{
            height: '100%', borderRadius: 2,
            width: `${p.progress_pct as number}%`,
            background: p.status === 'blocked' ? 'var(--red)' : 'var(--blue)',
            transition: 'width 0.3s ease',
            boxShadow: `0 0 6px ${p.status === 'blocked' ? 'rgba(224,82,82,0.25)' : 'rgba(74,158,255,0.25)'}`,
          }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {(agents as string[]).map((a: string) => (
              <span key={a} style={{
                fontSize: 10, fontFamily: 'monospace', padding: '2px 6px',
                borderRadius: 5, background: 'var(--bg-elevated)', color: 'var(--text-muted)',
                border: '1px solid var(--border-subtle)',
              }}>
                {a}
              </span>
            ))}
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {p.entity as string}
          </span>
        </div>

        {(p.next_action as string) && (
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8 }}>
            Next: {p.next_action as string}
          </div>
        )}
        {(p.blockers as string) && (
          <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>
            Blocked: {p.blockers as string}
          </div>
        )}
      </div>

      <PriorityDetailPanel
        open={open}
        onClose={() => setOpen(false)}
        data={{
          id: p.id as string,
          title: p.title as string,
          status: p.status as string,
          progress_pct: p.progress_pct as number,
          entity: p.entity as string,
          assigned_agents: p.assigned_agents as string,
          next_action: p.next_action as string,
          blockers: p.blockers as string,
          tags: p.tags as string,
        }}
        onUpdate={() => window.location.reload()}
      />
    </>
  )
}
