import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAuth } from '../middleware'
import { ENTITIES } from '@/lib/entities'

export async function GET(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth) return auth

  const db   = getDb()
  const kpis = db.prepare('SELECT * FROM entity_kpis').all() as Record<string, unknown>[]

  const result = ENTITIES.map(e => {
    const kpi = kpis.find(k => k.entity === e.label || k.entity === e.slug)
    return { ...e, ...kpi }
  })

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth) return auth

  const body = await req.json()
  getDb().prepare(`
    INSERT INTO entity_kpis
      (entity, kpi_1_label, kpi_1_value, kpi_1_trend,
       kpi_2_label, kpi_2_value, kpi_2_trend,
       kpi_3_label, kpi_3_value, health_status, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(entity) DO UPDATE SET
      kpi_1_label=excluded.kpi_1_label, kpi_1_value=excluded.kpi_1_value,
      kpi_1_trend=excluded.kpi_1_trend, kpi_2_label=excluded.kpi_2_label,
      kpi_2_value=excluded.kpi_2_value, kpi_2_trend=excluded.kpi_2_trend,
      kpi_3_label=excluded.kpi_3_label, kpi_3_value=excluded.kpi_3_value,
      health_status=excluded.health_status, updated_at=CURRENT_TIMESTAMP
  `).run(
    body.entity,
    body.kpi_1_label || null, body.kpi_1_value || null, body.kpi_1_trend || null,
    body.kpi_2_label || null, body.kpi_2_value || null, body.kpi_2_trend || null,
    body.kpi_3_label || null, body.kpi_3_value || null,
    body.health_status || 'unknown'
  )

  return NextResponse.json({ ok: true })
}
