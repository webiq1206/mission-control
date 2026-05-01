import { NextRequest, NextResponse } from 'next/server'
import { getUniversalDb } from '@/lib/db-universal'
import { requireAuth } from '../../middleware'

export async function POST(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth) return auth

  const db = await getUniversalDb()
  const body = await req.json()

  if (body.ids && Array.isArray(body.ids) && body.ids.length > 0) {
    // Archive specific IDs
    const placeholders = body.ids.map(() => '?').join(',')
    const result = await db.run(
      `UPDATE tasks SET status='archived', updated_at=CURRENT_TIMESTAMP WHERE id IN (${placeholders}) AND status NOT IN ('archived')`,
      ...body.ids
    )
    return NextResponse.json({ archived: result.changes })
  }

  // Default: archive completed tasks older than 30 days
  const result = await db.run(
    `UPDATE tasks SET status='archived', updated_at=CURRENT_TIMESTAMP
     WHERE status='completed' AND COALESCE(completed_at, updated_at) < datetime('now', '-30 days')`
  )
  return NextResponse.json({ archived: result.changes })
}
