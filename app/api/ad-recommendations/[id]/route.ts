import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAuth } from '../../middleware'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req)
  if (auth) return auth

  const { id } = await params
  const db = getDb()
  const body = await req.json()

  const updates: string[] = []
  const values: unknown[] = []

  if (body.status !== undefined) {
    updates.push('status = ?')
    values.push(body.status)
  }
  if (body.decision !== undefined) {
    updates.push('decision = ?')
    values.push(body.decision)
  }

  updates.push("updated_at = datetime('now')")
  values.push(id)

  db.prepare(`UPDATE ad_recommendations SET ${updates.join(', ')} WHERE id = ?`).run(...values)

  return NextResponse.json({ ok: true })
}
