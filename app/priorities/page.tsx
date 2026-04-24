export const dynamic = 'force-dynamic'

import { getDb } from '@/lib/db'
import { PriorityRow } from '@/components/ui/PriorityRow'
import { PageRefresher } from '@/components/ui/PageRefresher'

export default async function PrioritiesPage() {
  const db = getDb()
  const priorities = db.prepare('SELECT * FROM priorities ORDER BY sort_order ASC').all() as Record<string, unknown>[]

  const activePriorities = priorities.filter(p => (p.status as string) === 'active')
  const blockedPriorities = priorities.filter(p => (p.status as string) === 'blocked')
  const pausedPriorities = priorities.filter(p => (p.status as string) === 'paused')
  const completedPriorities = priorities.filter(p => (p.status as string) === 'completed')

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200 }}>
      <PageRefresher />

      <div style={{ marginBottom: 24 }}>
        <div className="label" style={{ marginBottom: 4 }}>Mission Control</div>
        <h1 style={{ fontSize: 26, fontWeight: 700 }}>Strategic Priorities</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
          {activePriorities.length} active · {blockedPriorities.length} blocked · {priorities.length} total
        </p>
      </div>

      {activePriorities.length > 0 && (
        <section style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--green)', marginBottom: 10 }}>ACTIVE ({activePriorities.length})</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {activePriorities.map(p => (
              <PriorityRow key={p.id as string} priority={p} />
            ))}
          </div>
        </section>
      )}

      {blockedPriorities.length > 0 && (
        <section style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--red)', marginBottom: 10 }}>BLOCKED ({blockedPriorities.length})</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {blockedPriorities.map(p => (
              <PriorityRow key={p.id as string} priority={p} />
            ))}
          </div>
        </section>
      )}

      {pausedPriorities.length > 0 && (
        <section style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--yellow)', marginBottom: 10 }}>PAUSED ({pausedPriorities.length})</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {pausedPriorities.map(p => (
              <PriorityRow key={p.id as string} priority={p} />
            ))}
          </div>
        </section>
      )}

      {completedPriorities.length > 0 && (
        <section>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10 }}>COMPLETED ({completedPriorities.length})</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {completedPriorities.map(p => (
              <PriorityRow key={p.id as string} priority={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
