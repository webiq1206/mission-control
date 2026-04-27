import { NextRequest, NextResponse } from 'next/server'
import { getUniversalDb } from '@/lib/db-universal'
import { requireAuth } from '../../middleware'

export async function GET(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth) return auth

  const db = await getUniversalDb()

  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()

  const decisionsRow = await db.get(`SELECT COUNT(*) as cnt FROM approvals
     WHERE status = 'pending'
     AND (approval_category IS NULL OR approval_category != 'acknowledgment')`) as { cnt: number }

  const blockedRow = await db.get(`SELECT COUNT(*) as cnt FROM tasks
     WHERE status = 'blocked' AND created_at <= ?`, twoDaysAgo) as { cnt: number }

  const gatedRow = await db.get(`SELECT COUNT(*) as cnt FROM tasks WHERE status = 'approval_gated'`) as { cnt: number }

  const total = decisionsRow.cnt + blockedRow.cnt + gatedRow.cnt

  return NextResponse.json({
    total,
    pending_decisions: decisionsRow.cnt,
    blocked_2plus: blockedRow.cnt,
    approval_gated: gatedRow.cnt,
  })
}
