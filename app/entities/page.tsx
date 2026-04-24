export const dynamic = 'force-dynamic'

import { getDb } from '@/lib/db'
import { ENTITIES } from '@/lib/entities'
import Link from 'next/link'
import { PageRefresher } from '@/components/ui/PageRefresher'

export default async function EntitiesIndexPage() {
  const db = getDb()

  const entityData = ENTITIES.map(entity => {
    const tasks = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'executing' THEN 1 ELSE 0 END) as executing,
        SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked,
        SUM(CASE WHEN status IN ('proposed','approval_gated') THEN 1 ELSE 0 END) as pending_approval
      FROM tasks WHERE entity = ? OR entity = ?
    `).get(entity.label, entity.slug) as Record<string, number>

    const kpi = db.prepare(
      `SELECT * FROM entity_kpis WHERE entity = ? OR entity = ? LIMIT 1`
    ).get(entity.label, entity.slug) as Record<string, unknown> | undefined

    const pendingApprovals = db.prepare(
      `SELECT COUNT(*) as count FROM approvals
       WHERE (entity = ? OR entity = ?) AND status = 'pending'`
    ).get(entity.label, entity.slug) as { count: number }

    return { ...entity, tasks, kpi, pendingApprovals: pendingApprovals.count }
  })

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200 }}>
      <PageRefresher />

      <div style={{ marginBottom: 28 }}>
        <div className="label" style={{ marginBottom: 6 }}>Mission Control</div>
        <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.5px' }}>Entities</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
          All {ENTITIES.length} business entities. Click any entity to view its full dashboard.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {entityData.map(entity => (
          <Link
            key={entity.slug}
            href={`/entities/${entity.slug}`}
            className="glass-card"
            style={{
              borderLeft: `3px solid ${entity.color}`,
              padding: '18px 20px',
              textDecoration: 'none',
              display: 'block',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{
                  fontSize: 9, fontFamily: 'monospace', letterSpacing: '0.1em',
                  textTransform: 'uppercase', color: entity.color, marginBottom: 4, fontWeight: 600,
                }}>
                  {entity.abbr} · {entity.activity} Activity
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {entity.label}
                </div>
              </div>
              {entity.pendingApprovals > 0 && (
                <span style={{
                  background: 'rgba(224,138,60,0.10)', color: 'var(--orange)',
                  border: '1px solid rgba(224,138,60,0.15)',
                  fontSize: 10, fontFamily: 'monospace', fontWeight: 700,
                  padding: '2px 8px', borderRadius: 10,
                }}>
                  {entity.pendingApprovals} pending
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
              {[
                { label: 'total',    value: entity.tasks?.total || 0,            color: 'var(--text-muted)' },
                { label: 'active',   value: entity.tasks?.executing || 0,        color: 'var(--blue)' },
                { label: 'blocked',  value: entity.tasks?.blocked || 0,          color: entity.tasks?.blocked ? 'var(--red)' : 'var(--text-muted)' },
                { label: 'proposed', value: entity.tasks?.pending_approval || 0, color: entity.tasks?.pending_approval ? 'var(--orange)' : 'var(--text-muted)' },
              ].map(stat => (
                <div key={stat.label} style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: 18, fontWeight: 700, fontFamily: 'monospace',
                    color: stat.color,
                  }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {entity.kpi && (entity.kpi.kpi_1_label as string) && (
              <div style={{
                borderTop: '1px solid var(--border-faint)', paddingTop: 10,
                display: 'flex', gap: 12,
              }}>
                <div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {entity.kpi.kpi_1_label as string}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: entity.color, fontFamily: 'monospace' }}>
                    {entity.kpi.kpi_1_value as string}
                  </div>
                </div>
                {(entity.kpi.kpi_2_label as string) && (
                  <div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {entity.kpi.kpi_2_label as string}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: entity.color, fontFamily: 'monospace' }}>
                      {entity.kpi.kpi_2_value as string}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
