export const dynamic = 'force-dynamic'

import { getDb } from '@/lib/db'
import { ENTITIES } from '@/lib/entities'
import { PageRefresher } from '@/components/ui/PageRefresher'
import { ClickableTaskRow } from '@/components/ui/ClickableTaskRow'
import { EntityBadge } from '@/components/ui/EntityBadge'
import Link from 'next/link'

const PRIORITY_DOT_COLOR: Record<string, string> = {
  critical: 'var(--red)',
  high: 'var(--amber)',
  medium: 'var(--blue)',
  low: 'var(--text-muted)',
}

const AGENT_EMOJIS: Record<string, string> = {
  hank: '🦞', larry: '🧠', nora: '💼', maya: '🗂️',
  sam: '💻', kai: '🛠️', ada: '🎨', priya: '✍️',
  omar: '📈', zoe: '📱', quinn: '🚀',
}

function TaskCard({ task }: { task: Record<string, unknown> }) {
  const priority = task.priority as string
  const agent = task.assigned_agent as string | null
  const agentEmoji = agent ? (AGENT_EMOJIS[agent.toLowerCase()] || '🤖') : null
  const updatedAt = task.updated_at as string
  const updatedDate = updatedAt ? new Date(updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''

  return (
    <ClickableTaskRow taskId={task.id as string}>
      <div style={{
        padding: 'var(--sp-3) var(--sp-3)',
        borderRadius: 8,
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderLeft: `3px solid ${PRIORITY_DOT_COLOR[priority] || 'var(--border-faint)'}`,
        cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: 6,
        transition: 'box-shadow 0.15s',
      }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4 }}>
          {task.title as string}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <EntityBadge entity={task.entity as string} />
          {agentEmoji && agent && (
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {agentEmoji} {agent}
            </span>
          )}
          <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
            {updatedDate}
          </span>
        </div>
      </div>
    </ClickableTaskRow>
  )
}

function KanbanColumn({
  title, color, tasks, emptyText, columnStyle,
}: {
  title: string
  color: string
  tasks: Record<string, unknown>[]
  emptyText: string
  columnStyle?: React.CSSProperties
}) {
  return (
    <div style={{
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      ...columnStyle,
    }}>
      {/* Column header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginBottom: 'var(--sp-3)',
        padding: 'var(--sp-2) var(--sp-3)',
        borderRadius: 8,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-faint)',
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: color, flexShrink: 0,
          boxShadow: `0 0 4px ${color}80`,
        }} />
        <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', fontWeight: 600 }}>
          {title}
        </span>
        <span style={{
          marginLeft: 'auto',
          fontSize: 10, fontFamily: 'var(--font-mono)',
          padding: '1px 6px', borderRadius: 8,
          background: `color-mix(in srgb, ${color} 10%, transparent)`,
          color: color, border: `1px solid color-mix(in srgb, ${color} 20%, transparent)`,
          fontWeight: 600,
        }}>
          {tasks.length}
        </span>
      </div>

      {/* Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        {tasks.length === 0 ? (
          <div style={{
            padding: 'var(--sp-4)', textAlign: 'center',
            borderRadius: 8, border: '1px dashed var(--border-faint)',
            color: 'var(--text-faint)', fontSize: 11,
          }}>
            {emptyText}
          </div>
        ) : (
          tasks.map(t => <TaskCard key={t.id as string} task={t} />)
        )}
      </div>
    </div>
  )
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string; status?: string }>
}) {
  const params = await searchParams
  const db = getDb()

  // Build entity filter clause
  let entityClause = ''
  const entityParams: unknown[] = []
  if (params.entity) {
    const ent = ENTITIES.find(e => e.slug === params.entity)
    if (ent) {
      entityClause = ' AND (entity = ? OR entity = ?)'
      entityParams.push(ent.label, ent.slug)
    }
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Fetch each column
  const backlogTasks = db.prepare(
    `SELECT * FROM tasks WHERE status = 'backlog'${entityClause}
     ORDER BY CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, updated_at DESC
     LIMIT 100`
  ).all(...entityParams) as Record<string, unknown>[]

  const inProgressTasks = db.prepare(
    `SELECT * FROM tasks WHERE status IN ('in_progress','executing','approved')${entityClause}
     ORDER BY CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, updated_at DESC
     LIMIT 100`
  ).all(...entityParams) as Record<string, unknown>[]

  const needsInputTasks = db.prepare(
    `SELECT * FROM tasks WHERE status IN ('blocked','approval_gated','on_hold')${entityClause}
     ORDER BY CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, updated_at DESC
     LIMIT 100`
  ).all(...entityParams) as Record<string, unknown>[]

  const completedTasks = db.prepare(
    `SELECT * FROM tasks WHERE status = 'completed' AND updated_at >= ?${entityClause}
     ORDER BY updated_at DESC LIMIT 50`
  ).all(sevenDaysAgo, ...entityParams) as Record<string, unknown>[]

  const totalCount = backlogTasks.length + inProgressTasks.length + needsInputTasks.length + completedTasks.length

  return (
    <div style={{ padding: '28px 32px', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageRefresher />

      {/* Page Header */}
      <div style={{ marginBottom: 'var(--sp-5)' }}>
        <div className="label" style={{ marginBottom: 6 }}>Mission Control</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <h1 className="h1">Tasks</h1>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
            {totalCount} tasks{params.entity ? ` · ${params.entity}` : ''}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 'var(--sp-5)', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace', marginRight: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Entity:
        </span>
        <Link
          href="/tasks"
          style={{
            padding: '5px 12px', borderRadius: 6, fontSize: 11, fontFamily: 'monospace',
            textDecoration: 'none',
            border: `1px solid ${!params.entity ? 'var(--border-default)' : 'var(--border-faint)'}`,
            background: !params.entity ? 'rgba(255,255,255,0.06)' : 'transparent',
            color: !params.entity ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: !params.entity ? 600 : 400,
          }}
        >
          All
        </Link>
        {ENTITIES.map(e => (
          <Link
            key={e.slug}
            href={`/tasks?entity=${e.slug}`}
            style={{
              padding: '5px 12px', borderRadius: 6, fontSize: 11, fontFamily: 'monospace',
              textDecoration: 'none',
              border: `1px solid ${params.entity === e.slug ? 'var(--border-default)' : 'var(--border-faint)'}`,
              background: params.entity === e.slug ? 'rgba(255,255,255,0.06)' : 'transparent',
              color: params.entity === e.slug ? e.color : 'var(--text-muted)',
              fontWeight: params.entity === e.slug ? 600 : 400,
            }}
          >
            {e.abbr}
          </Link>
        ))}
      </div>

      {/* Kanban Board */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 'var(--sp-4)',
        flex: 1,
        alignItems: 'start',
        minWidth: 0,
      }}>
        <KanbanColumn
          title="Backlog"
          color="var(--text-muted)"
          tasks={backlogTasks}
          emptyText="No backlog tasks"
        />
        <KanbanColumn
          title="In Progress"
          color="var(--blue)"
          tasks={inProgressTasks}
          emptyText="Nothing in progress"
        />
        <KanbanColumn
          title="Needs Input"
          color="var(--red)"
          tasks={needsInputTasks}
          emptyText="No blocked tasks"
        />
        <KanbanColumn
          title="Completed (7d)"
          color="var(--green)"
          tasks={completedTasks}
          emptyText="No recent completions"
        />
      </div>
    </div>
  )
}
