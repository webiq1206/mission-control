import { NextRequest, NextResponse } from 'next/server'
import { getUniversalDb } from '@/lib/db-universal'
import { requireAuth } from '../middleware'

export async function GET(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth) return auth

  const db = await getUniversalDb()
  const { searchParams } = new URL(req.url)
  const entity = searchParams.get('entity')
  const status = searchParams.get('status')
  const priority = searchParams.get('priority')

  let query = 'SELECT * FROM ad_recommendations WHERE 1=1'
  const params: unknown[] = []

  if (entity && entity !== 'All') {
    query += ' AND entity = ?'
    params.push(entity)
  }
  if (status) {
    query += ' AND status = ?'
    params.push(status)
  }
  if (priority) {
    query += ' AND priority = ?'
    params.push(priority)
  }

  query += ` ORDER BY CASE priority
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
    ELSE 5 END, created_at ASC`

  const recs = await db.all(query, ...params)
  return NextResponse.json(recs)
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth) return auth

  const db = await getUniversalDb()
  const body = await req.json()

  await db.runNamed(`
    INSERT INTO ad_recommendations
      (id, campaign_id, entity, category, priority, title, context, expected_impact,
       implementation, manual_steps, status, decision)
    VALUES
      (@id, @campaign_id, @entity, @category, @priority, @title, @context, @expected_impact,
       @implementation, @manual_steps, @status, @decision)
    ON CONFLICT(id) DO UPDATE SET
      campaign_id=excluded.campaign_id,
      entity=excluded.entity,
      category=excluded.category,
      priority=excluded.priority,
      title=excluded.title,
      context=excluded.context,
      expected_impact=excluded.expected_impact,
      implementation=excluded.implementation,
      manual_steps=excluded.manual_steps,
      status=excluded.status,
      decision=excluded.decision,
      updated_at=datetime('now')
  `, {
    id: body.id || `rec-${Date.now()}`,
    campaign_id: body.campaign_id || null,
    entity: body.entity,
    category: body.category || null,
    priority: body.priority || 'medium',
    title: body.title,
    context: body.context || null,
    expected_impact: body.expected_impact || null,
    implementation: body.implementation || null,
    manual_steps: body.manual_steps || null,
    status: body.status || 'pending',
    decision: body.decision || null,
  })

  return NextResponse.json({ ok: true })
}
