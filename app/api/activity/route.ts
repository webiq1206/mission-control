import { NextRequest, NextResponse } from 'next/server'
import { getUniversalDb, parseJsonArrayFields } from '@/lib/db-universal'
import { requireAuth } from '../middleware'

export async function GET(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth) return auth

  const db = await getUniversalDb()
  const limit = parseInt(new URL(req.url).searchParams.get('limit') || '50')
  const rawItems = await db.all('SELECT * FROM activity ORDER BY created_at DESC LIMIT ?', limit) as Record<string, unknown>[]
  const items = parseJsonArrayFields(rawItems, ['tags'])

  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth) return auth

  const db = await getUniversalDb()
  const body = await req.json()

  const result = await db.run(`
    INSERT INTO activity (agent, entity, action, detail, task_id, tags)
    VALUES (?, ?, ?, ?, ?, ?)
  `, body.agent,
    body.entity || null,
    body.action,
    body.detail || null,
    body.task_id || null,
    JSON.stringify(body.tags || [])
  )

  await db.run(`UPDATE system_state SET value = CURRENT_TIMESTAMP WHERE key = 'last_agent_activity'`)

  return NextResponse.json({ ok: true, id: result.lastInsertRowid })
}
