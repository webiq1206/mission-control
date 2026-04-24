import { NextRequest, NextResponse } from 'next/server'
import { getDb, parseJsonArrayFields } from '@/lib/db'
import { requireAuth } from '../middleware'

export async function GET(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth) return auth
  const rawItems = getDb().prepare(
    'SELECT * FROM priorities ORDER BY sort_order ASC'
  ).all() as Record<string, unknown>[]
  const items = parseJsonArrayFields(rawItems, ['assigned_agents'])
  return NextResponse.json(items)
}

export async function PATCH(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth) return auth

  const body = await req.json()
  getDb().prepare(`
    UPDATE priorities SET
      status = ?, progress_pct = ?, blockers = ?, next_action = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(body.status, body.progress_pct || 0, body.blockers || null, body.next_action || null, body.id)

  return NextResponse.json({ ok: true })
}
