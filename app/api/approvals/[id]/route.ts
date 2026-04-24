import { NextRequest, NextResponse } from 'next/server'
import { getDb, parseJsonArrayFields } from '@/lib/db'
import { requireAuth } from '../../middleware'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(req)
  if (auth) return auth

  const db = getDb()
  const { id } = await params
  const rawApproval = db.prepare('SELECT * FROM approvals WHERE id = ?').get(id) as Record<string, unknown> | undefined
  if (!rawApproval) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const approval = parseJsonArrayFields(rawApproval, ['deliverables'])

  let task = null
  if (rawApproval.task_id) {
    const rawTask = db.prepare('SELECT id, title, status, priority, entity, assigned_agent FROM tasks WHERE id = ?').get(rawApproval.task_id as string) as Record<string, unknown> | undefined
    if (rawTask) task = parseJsonArrayFields(rawTask, ['dependencies', 'tags'])
  }

  const rawAssets = db.prepare(
    'SELECT * FROM assets WHERE entity = ? ORDER BY created_at DESC LIMIT 10'
  ).all(rawApproval.entity as string) as Record<string, unknown>[]
  const assets = rawAssets.length > 0 ? parseJsonArrayFields(rawAssets, ['tags']) : []

  return NextResponse.json({ approval, task, assets })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(req)
  if (auth) return auth

  const body = await req.json()
  const { id } = await params
  getDb().prepare(`
    UPDATE approvals SET
      status = ?, decided_by = 'jared', decided_at = CURRENT_TIMESTAMP,
      decision_note = ?
    WHERE id = ?
  `).run(body.status, body.note || null, id)

  return NextResponse.json({ ok: true })
}
