export const dynamic = 'force-dynamic'

import { getDb } from '@/lib/db'
import { ENTITIES } from '@/lib/entities'
import { notFound } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { ApprovalCard } from '@/components/approvals/ApprovalCard'
import { PriorityRow } from '@/components/ui/PriorityRow'
import { KPICard } from '@/components/ui/KPICard'
import { EntityBadge } from '@/components/ui/EntityBadge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { NLTaskInput } from './NLTaskInput'
import { KanbanCard } from '@/components/tasks/KanbanCard'
import { ClickableAssetCard } from '@/components/ui/ClickableAssetCard'
import { ClickableLogRow } from '@/components/ui/ClickableLogRow'

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'var(--priority-critical)',
  high: 'var(--priority-high)',
  medium: 'var(--priority-medium)',
  low: 'var(--text-muted)',
}

const COLUMN_CONFIG = [
  { key: 'backlog',   label: 'BACKLOG',   color: 'var(--text-muted)' },
  { key: 'proposed',  label: 'PROPOSED',  color: 'var(--amber)' },
  { key: 'executing', label: 'EXECUTING', color: 'var(--blue)' },
  { key: 'review',    label: 'REVIEW',    color: 'var(--purple)' },
  { key: 'completed', label: 'COMPLETED', color: 'var(--green)' },
]

function getColumn(status: string): string {
  if (['executing', 'approved', 'in_progress'].includes(status)) return 'executing'
  if (['approval_gated', 'proposed'].includes(status)) return 'proposed'
  if (status === 'review') return 'review'
  if (status === 'completed') return 'completed'
  return 'backlog'
}

function timeAgo(ts: string) {
  try { return formatDistanceToNow(new Date(ts), { addSuffix: true }) }
  catch { return ts }
}

export default async function EntityPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const entity = ENTITIES.find(e => e.slug === slug)
  if (!entity) notFound()

  const db = getDb()

  const allTasks = db.prepare(`
    SELECT * FROM tasks
    WHERE entity = ? OR entity = ?
    ORDER BY
      CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 END,
      updated_at DESC
    LIMIT 200
  `).all(entity.label, entity.slug) as Record<string, unknown>[]

  const kpi = db.prepare(
    `SELECT * FROM entity_kpis WHERE entity = ? OR entity = ? LIMIT 1`
  ).get(entity.label, entity.slug) as Record<string, unknown> | undefined

  const activity = db.prepare(`
    SELECT * FROM activity WHERE entity = ? OR entity = ? ORDER BY created_at DESC LIMIT 40
  `).all(entity.label, entity.slug) as Record<string, unknown>[]

  const priorities = db.prepare(`
    SELECT * FROM priorities WHERE entity = ? OR entity = ? ORDER BY sort_order
  `).all(entity.label, entity.slug) as Record<string, unknown>[]

  const approvals = db.prepare(`
    SELECT * FROM approvals WHERE (entity = ? OR entity = ?) AND status = 'pending'
    ORDER BY CASE urgency WHEN 'urgent' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END
  `).all(entity.label, entity.slug) as Record<string, unknown>[]

  const assets = db.prepare(`
    SELECT * FROM assets WHERE entity = ? OR entity = ? ORDER BY created_at DESC LIMIT 20
  `).all(entity.label, entity.slug) as Record<string, unknown>[]

  const counts = {
    proposed:  allTasks.filter(t => ['proposed', 'approval_gated'].includes(t.status as string)).length,
    executing: allTasks.filter(t => ['approved', 'executing', 'in_progress'].includes(t.status as string)).length,
    blocked:   allTasks.filter(t => t.status === 'blocked').length,
    completed: allTasks.filter(t => t.status === 'completed').length,
  }

  const kanbanData: Record<string, Record<string, unknown>[]> = {
    backlog: [], proposed: [], executing: [], review: [], completed: [],
  }
  for (const task of allTasks) {
    const col = getColumn(task.status as string)
    if (kanbanData[col]) {
      if (col === 'completed' && kanbanData[col].length >= 15) continue
      kanbanData[col].push(task)
    }
  }

  const kpiCards = kpi ? [
    { label: kpi.kpi_1_label as string, value: kpi.kpi_1_value as string, trend: kpi.kpi_1_trend as string | null },
    { label: kpi.kpi_2_label as string, value: kpi.kpi_2_value as string, trend: kpi.kpi_2_trend as string | null },
    { label: kpi.kpi_3_label as string, value: kpi.kpi_3_value as string, trend: null },
  ].filter(k => k.label) : []

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1400 }}>
      {/* Entity color bar */}
      <div style={{ height: 3, background: entity.color, borderRadius: 2, marginBottom: 'var(--sp-6)' }} />

      {/* ─── HEADER ────────────────────────────────────── */}
      <div style={{
        marginBottom: 'var(--sp-8)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--sp-2)' }}>
            <EntityBadge entity={entity.slug} />
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase',
              padding: '2px 6px', borderRadius: 4,
              background: `${entity.color}15`, color: entity.color,
              border: `1px solid ${entity.color}30`,
            }}>
              {entity.activity} Activity
            </span>
          </div>
          <h1 className="h1" style={{ marginBottom: 'var(--sp-2)' }}>{entity.label}</h1>
          <div style={{ display: 'flex', gap: 'var(--sp-4)', flexWrap: 'wrap' }}>
            {Object.entries(counts).map(([status, count]) => (
              <span key={status} className="meta">
                {count} {status}
              </span>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--sp-3)', flexShrink: 0 }}>
          <Link href={`/reports?entity=${entity.slug}`} className="btn btn-ghost" style={{ fontSize: 12 }}>
            Generate Report
          </Link>
          <Link href={`/tasks?entity=${entity.slug}`} className="btn" style={{
            fontSize: 12, border: `1px solid ${entity.color}40`, background: `${entity.color}10`, color: entity.color, textDecoration: 'none',
          }}>
            All Tasks
          </Link>
        </div>
      </div>

      {/* ─── KPI STRIP (always 3, same height) ─────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--sp-4)', marginBottom: 'var(--sp-8)' }}>
        {kpiCards.length > 0 ? (
          kpiCards.map((k, i) => (
            <KPICard
              key={i}
              label={k.label}
              value={k.value || '—'}
              trend={k.trend as 'up' | 'down' | 'flat' | null}
              color={entity.color}
            />
          ))
        ) : (
          [1, 2, 3].map(i => (
            <KPICard key={i} label="No KPI data yet" value="—" color={`${entity.color}60`} />
          ))
        )}
        {kpiCards.length === 1 && [1, 2].map(i => (
          <KPICard key={`pad-${i}`} label="—" value="—" color={`${entity.color}60`} />
        ))}
        {kpiCards.length === 2 && (
          <KPICard key="pad-1" label="—" value="—" color={`${entity.color}60`} />
        )}
      </div>

      {/* ─── PENDING APPROVALS ──────────────────────────── */}
      <section style={{ marginBottom: 'var(--sp-8)' }}>
        <div className="label" style={{ marginBottom: 'var(--sp-3)', color: approvals.length > 0 ? 'var(--amber)' : undefined }}>
          PENDING APPROVALS — {approvals.length > 0 ? `${approvals.length} NEED YOUR DECISION` : 'NONE'}
        </div>
        {approvals.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {approvals.map(a => (
              <ApprovalCard
                key={a.id as string}
                id={a.id as string}
                type={a.type as string}
                entity={a.entity as string || entity.label}
                urgency={a.urgency as string}
                requested_by={a.requested_by as string}
                title={a.title as string}
                description={a.description as string}
                cost_estimate={a.cost_estimate as string | undefined}
                created_at={a.created_at as string}
                expires_at={a.expires_at as string | undefined}
                approval_category={a.approval_category as string | null}
                compact
              />
            ))}
          </div>
        ) : (
          <div className="card" style={{ padding: 'var(--sp-4)', textAlign: 'center' }}>
            <div className="body-xs">No pending approvals. Approvals appear when agents need permission to act on behalf of {entity.label}.</div>
          </div>
        )}
      </section>

      {/* ─── STRATEGIC PRIORITIES ──────────────────────── */}
      <section style={{ marginBottom: 'var(--sp-8)' }}>
        <div className="label" style={{ marginBottom: 'var(--sp-3)' }}>STRATEGIC PRIORITIES</div>
        {priorities.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {priorities.map(p => <PriorityRow key={p.id as string} priority={p} />)}
          </div>
        ) : (
          <div className="card" style={{ padding: 'var(--sp-4)', textAlign: 'center' }}>
            <div className="body-xs">No strategic priorities assigned to {entity.label}. Create priorities on the Priorities page.</div>
          </div>
        )}
      </section>

      {/* ─── CREATE TASK ───────────────────────────────── */}
      <section style={{ marginBottom: 'var(--sp-6)' }}>
        <NLTaskInput entitySlug={slug} />
      </section>

      {/* ─── TASK BOARD (5 columns) ────────────────────── */}
      <section style={{ marginBottom: 'var(--sp-8)' }}>
        <div className="label" style={{ marginBottom: 'var(--sp-3)' }}>TASK BOARD</div>
        <div className="kanban-board">
          {COLUMN_CONFIG.map(col => {
            const tasks = kanbanData[col.key] || []
            return (
              <div key={col.key} className="kanban-column">
                <div className="kanban-column-header">
                  <span className="kanban-column-title" style={{ color: col.color }}>{col.label}</span>
                  <span className="meta" style={{
                    background: 'var(--bg-inset)', padding: '2px 8px', borderRadius: 10,
                  }}>{tasks.length}</span>
                </div>
                <div className="kanban-cards">
                  {tasks.length === 0 ? (
                    <div style={{
                      padding: 'var(--sp-5)', textAlign: 'center', color: 'var(--text-faint)',
                      fontSize: 11, border: '1px dashed var(--border-faint)', borderRadius: 'var(--r-md)',
                    }}>
                      No tasks
                    </div>
                  ) : (
                    tasks.map(task => (
                      <KanbanCard
                        key={task.id as string}
                        task={task}
                        priorityColor={PRIORITY_COLORS[task.priority as string] || 'transparent'}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ─── ASSETS ────────────────────────────────────── */}
      <section style={{ marginBottom: 'var(--sp-8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-3)' }}>
          <span className="label">ASSETS — {assets.length} ITEMS</span>
          {assets.length > 0 && (
            <Link href={`/assets?entity=${entity.slug}`} style={{ fontSize: 11, color: entity.color, textDecoration: 'none' }}>
              View all assets for {entity.label} →
            </Link>
          )}
        </div>
        {assets.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--sp-3)' }}>
            {assets.map(asset => (
              <ClickableAssetCard key={asset.id as string} data={asset}>
                <div className="card" style={{ padding: 'var(--sp-4)', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span className="label" style={{ fontSize: 9 }}>{asset.category as string}</span>
                    <StatusBadge status={asset.status as string} />
                  </div>
                  <div className="h4" style={{ marginBottom: 4 }}>{asset.title as string}</div>
                  {(asset.description as string) && (
                    <div className="body-xs line-clamp-2">{asset.description as string}</div>
                  )}
                  <div className="meta" style={{ marginTop: 6 }}>
                    {asset.created_by as string} · {timeAgo(asset.created_at as string)}
                  </div>
                </div>
              </ClickableAssetCard>
            ))}
          </div>
        ) : (
          <div className="card" style={{ padding: 'var(--sp-4)', textAlign: 'center' }}>
            <div className="body-xs">No assets yet. Assets are registered here when agents create deliverables for {entity.label}.</div>
          </div>
        )}
      </section>

      {/* ─── RECENT ACTIVITY ───────────────────────────── */}
      <section>
        <div className="label" style={{ marginBottom: 'var(--sp-3)' }}>RECENT ACTIVITY — {entity.label.toUpperCase()}</div>
        <div className="card" style={{ padding: 'var(--sp-4)' }}>
          {activity.length === 0 ? (
            <div style={{ padding: 'var(--sp-5)', textAlign: 'center' }}>
              <div className="body-xs">No activity logged yet. Activity appears here when agents perform work for {entity.label}.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
              {activity.map(a => {
                const tags = (() => {
                  try {
                    const parsed = typeof a.tags === 'string' ? JSON.parse(a.tags as string) : a.tags
                    return Array.isArray(parsed) ? parsed : []
                  } catch { return [] }
                })()
                return (
                  <ClickableLogRow
                    key={a.id as number}
                    data={{
                      id: a.id as number,
                      agent: a.agent as string,
                      entity: a.entity as string || entity.label,
                      action: a.action as string,
                      detail: a.detail as string,
                      task_id: a.task_id as string,
                      tags: a.tags as string,
                      created_at: a.created_at as string,
                    }}
                  >
                    <div style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      borderLeft: `2px solid ${entity.color}40`,
                      paddingLeft: 12,
                      cursor: 'pointer',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 2, alignItems: 'center' }}>
                          <span className="meta" style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>
                            {a.agent as string}
                          </span>
                          {(tags as string[]).map((tag: string) => (
                            <span key={tag} className="label" style={{ fontSize: 8 }}>{tag}</span>
                          ))}
                        </div>
                        <div className="body-sm">{a.action as string}</div>
                      </div>
                      <span className="meta" style={{ flexShrink: 0, marginTop: 2 }}>
                        {timeAgo(a.created_at as string)}
                      </span>
                    </div>
                  </ClickableLogRow>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
