import { NextRequest, NextResponse } from 'next/server'
import { getUniversalDb, parseJsonArrayFields } from '@/lib/db-universal'
import { requireAuth } from '../middleware'

export async function GET(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth) return auth

  const status = new URL(req.url).searchParams.get('status') || 'pending'
  const db = await getUniversalDb()
  const rawApprovals = await db.all("SELECT * FROM approvals WHERE status = ? ORDER BY CASE urgency WHEN 'urgent' THEN 1 WHEN 'normal' THEN 2 WHEN 'low' THEN 3 END, created_at ASC", status) as Record<string, unknown>[]
  const approvals = parseJsonArrayFields(rawApprovals, ['deliverables'])
  return NextResponse.json(approvals)
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth) return auth

  const db = await getUniversalDb()
  const body = await req.json()

  const deliverables = body.deliverables
    ? (typeof body.deliverables === 'string' ? body.deliverables : JSON.stringify(body.deliverables))
    : '[]'

  await db.run(`
    INSERT INTO approvals
      (id, task_id, type, requested_by, entity, title, description,
       cost_estimate, urgency, expires_at, deliverables, approval_category)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO NOTHING
  `, body.id || `APR-${Date.now()}`,
    body.task_id || null,
    body.type,
    body.requested_by,
    body.entity,
    body.title,
    body.description,
    body.cost_estimate || null,
    body.urgency || 'normal',
    body.expires_at || null,
    deliverables,
    body.approval_category || null,
  )

  return NextResponse.json({ ok: true })
}
