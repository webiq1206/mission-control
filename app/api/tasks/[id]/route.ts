import { NextRequest, NextResponse } from 'next/server'
import { getDb, parseJsonArrayFields } from '@/lib/db'
import { requireAuth } from '../../middleware'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(req)
  if (auth) return auth
  const db = getDb()
  const { id } = await params
  const rawTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Record<string, unknown> | undefined
  if (!rawTask) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const task = parseJsonArrayFields(rawTask, ['dependencies', 'tags'])
  const titleSnippet = (rawTask.title as string)?.substring(0, 20) || ''
  const rawActivity = db.prepare(
    `SELECT * FROM activity WHERE detail LIKE ? OR task_id = ? ORDER BY created_at DESC LIMIT 20`
  ).all('%' + titleSnippet + '%', id) as Record<string, unknown>[]
  const activity = parseJsonArrayFields(rawActivity, ['tags'])
  const entity = rawTask.entity as string
  const rawAssets = entity
    ? db.prepare(
        `SELECT * FROM assets WHERE entity = ? ORDER BY created_at DESC LIMIT 10`
      ).all(entity) as Record<string, unknown>[]
    : []
  const assets = rawAssets.length > 0 ? parseJsonArrayFields(rawAssets, ['tags']) : []
  return NextResponse.json({ task, activity, assets })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(req)
  if (auth) return auth

  const db   = getDb()
  const body = await req.json()
  const { id } = await params

  const fields: string[] = []
  const values: unknown[] = []

  const updatable = ['status','priority','assigned_agent','description',
    'objective','dod','expected_output','due_at','started_at','completed_at',
    'approval_requested_at','approved_by','approved_at','parent_id','notes','title']

  for (const field of updatable) {
    if (body[field] !== undefined) {
      fields.push(`${field} = ?`)
      values.push(body[field])
    }
  }

  if (fields.length === 0) return NextResponse.json({ ok: true })

  fields.push('updated_at = CURRENT_TIMESTAMP', 'last_activity_at = CURRENT_TIMESTAMP')
  values.push(id)

  db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(req)
  if (auth) return auth
  const { id } = await params
  getDb().prepare('DELETE FROM tasks WHERE id = ?').run(id)
  return NextResponse.json({ ok: true })
}
