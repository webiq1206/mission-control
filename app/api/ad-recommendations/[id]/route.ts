import { NextRequest, NextResponse } from 'next/server'
import { getUniversalDb } from '@/lib/db-universal'
import { requireAuth } from '../../middleware'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req)
  if (auth) return auth

  const { id } = await params
  const db = await getUniversalDb()
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

  await db.run(`UPDATE ad_recommendations SET ${updates.join(', ')} WHERE id = ?`, ...values)

  return NextResponse.json({ ok: true })
}
