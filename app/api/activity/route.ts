import { NextRequest, NextResponse } from 'next/server'
import { getDb, parseJsonArrayFields } from '@/lib/db'
import { requireAuth } from '../middleware'

export async function GET(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth) return auth

  const db = getDb()
  const limit = parseInt(new URL(req.url).searchParams.get('limit') || '50')
  const rawItems = db.prepare(
    'SELECT * FROM activity ORDER BY created_at DESC LIMIT ?'
  ).all(limit) as Record<string, unknown>[]
  const items = parseJsonArrayFields(rawItems, ['tags'])

  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth) return auth

  const db   = getDb()
  const body = await req.json()

  const result = db.prepare(`
    INSERT INTO activity (agent, entity, action, detail, task_id, tags)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    body.agent,
    body.entity || null,
    body.action,
    body.detail || null,
    body.task_id || null,
    JSON.stringify(body.tags || [])
  )

  db.prepare(`UPDATE system_state SET value = CURRENT_TIMESTAMP WHERE key = 'last_agent_activity'`).run()

  return NextResponse.json({ ok: true, id: result.lastInsertRowid })
}
