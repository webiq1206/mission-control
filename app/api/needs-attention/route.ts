import { NextRequest, NextResponse } from 'next/server'
import { getUniversalDb, parseJsonArrayFields } from '@/lib/db-universal'
import { requireAuth } from '../middleware'

const URGENCY_ORDER: Record<string, number> = { critical: 1, urgent: 1, high: 2, normal: 3, medium: 3, low: 4 }

export async function GET(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth) return auth

  const db = await getUniversalDb()
  const url = new URL(req.url)
  const entity = url.searchParams.get('entity')
  const limit = parseInt(url.searchParams.get('limit') ?? '50')

  const entityClause = entity ? `AND entity = '${entity.replace(/'/g, "''")}'` : ''

  const [rawApprovals, rawBlockedTasks, rawSurfaceBlocked] = await Promise.all([
    db.all(`
      SELECT id, title, entity, urgency, status, created_at, description, type, requested_by, cost_estimate, task_id, approval_category
      FROM approvals
      WHERE status = 'pending'
      ${entityClause}
      ORDER BY created_at ASC
    `),
    db.all(`
      SELECT id, title, entity, priority, status, created_at, updated_at, description, assigned_agent
      FROM tasks
      WHERE status = 'blocked'
      ${entityClause}
      ORDER BY created_at ASC
    `),
    db.all(`
      SELECT id, title, entity, priority, status, created_at, updated_at, description, assigned_agent
      FROM tasks
      WHERE surface_blocked = 1 AND status NOT IN ('completed','archived','cancelled','blocked')
      ${entityClause}
      ORDER BY created_at ASC
    `),
  ])

  const staleApprovals = rawApprovals.filter(a => {
    const ageMs = Date.now() - new Date(a.created_at as string).getTime()
    return ageMs > 7 * 24 * 60 * 60 * 1000
  })

  const items: Record<string, unknown>[] = []

  for (const a of rawApprovals) {
    const ageMs = Date.now() - new Date(a.created_at as string).getTime()
    const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000))
    items.push({
      ...a,
      item_type: 'approval',
      age_days: ageDays,
      is_stale: ageDays >= 7,
    })
  }

  for (const t of rawBlockedTasks) {
    const ageMs = Date.now() - new Date((t.updated_at as string) || (t.created_at as string)).getTime()
    const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000))
    items.push({
      ...t,
      item_type: 'blocked_task',
      urgency: (t.priority as string) === 'critical' ? 'critical' : (t.priority as string) === 'high' ? 'high' : 'normal',
      age_days: ageDays,
    })
  }

  for (const t of rawSurfaceBlocked) {
    const ageMs = Date.now() - new Date((t.updated_at as string) || (t.created_at as string)).getTime()
    const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000))
    items.push({
      ...t,
      item_type: 'surface_blocked',
      urgency: (t.priority as string) === 'critical' ? 'critical' : 'normal',
      age_days: ageDays,
    })
  }

  // Sort by urgency (critical first), then age (oldest first)
  items.sort((a, b) => {
    const aU = URGENCY_ORDER[a.urgency as string] ?? 5
    const bU = URGENCY_ORDER[b.urgency as string] ?? 5
    if (aU !== bU) return aU - bU
    return new Date(a.created_at as string).getTime() - new Date(b.created_at as string).getTime()
  })

  return NextResponse.json({
    items: items.slice(0, limit),
    total: items.length,
    stale_count: staleApprovals.length,
  })
}
