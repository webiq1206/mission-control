import { NextRequest, NextResponse } from 'next/server'
import { getUniversalDb } from '@/lib/db-universal'
import { requireAuth } from '../middleware'

export async function GET(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth) return auth

  const db = await getUniversalDb()

  const activeStatuses = `'backlog','in_progress','blocked','approval_gated','assigned','executing','on_hold','open','next','pending_review'`

  const [counts, pendingApprovals, recentActivity, criticalTasks] = await Promise.all([
    db.get<{
      total_active: number
      backlog: number
      in_progress: number
      blocked: number
      approval_gated: number
      completed_7d: number
      surface_blocked: number
    }>(`
      SELECT
        SUM(CASE WHEN status IN (${activeStatuses}) THEN 1 ELSE 0 END) as total_active,
        SUM(CASE WHEN status = 'backlog' THEN 1 ELSE 0 END) as backlog,
        SUM(CASE WHEN status IN ('in_progress','executing','assigned') THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked,
        SUM(CASE WHEN status = 'approval_gated' THEN 1 ELSE 0 END) as approval_gated,
        SUM(CASE WHEN status = 'completed' AND COALESCE(completed_at, updated_at) >= datetime('now', '-7 days') THEN 1 ELSE 0 END) as completed_7d,
        SUM(CASE WHEN surface_blocked = 1 AND status NOT IN ('completed','archived','cancelled') THEN 1 ELSE 0 END) as surface_blocked
      FROM tasks
    `),
    db.all<{ id: string; title: string; entity: string; urgency: string; created_at: string }>(
      `SELECT id, title, entity, urgency, created_at FROM approvals WHERE status = 'pending' ORDER BY created_at ASC`
    ),
    db.all<{ id: number; agent: string; action: string; detail: string; entity: string; created_at: string }>(
      `SELECT id, agent, action, detail, entity, created_at FROM activity ORDER BY created_at DESC LIMIT 10`
    ),
    db.all<{ id: string; title: string; entity: string; priority: string }>(
      `SELECT id, title, entity, priority FROM tasks WHERE priority = 'critical' AND status NOT IN ('completed','archived','cancelled') LIMIT 10`
    ),
  ])

  const pendingCount = pendingApprovals.length
  const criticalApprovals = pendingApprovals.filter(a => ['urgent','critical','high'].includes(a.urgency))
  const staleApprovals = pendingApprovals.filter(a => {
    const ageMs = Date.now() - new Date(a.created_at).getTime()
    return ageMs > 7 * 24 * 60 * 60 * 1000
  })

  const needsAttention =
    pendingCount +
    (counts?.surface_blocked ?? 0) +
    (counts?.blocked ?? 0)

  const criticalAlerts = [
    ...criticalApprovals.map(a => ({ type: 'approval', id: a.id, title: a.title, entity: a.entity, urgency: a.urgency })),
    ...criticalTasks.map(t => ({ type: 'task', id: t.id, title: t.title, entity: t.entity, urgency: 'critical' })),
    ...staleApprovals.slice(0, 5).map(a => ({ type: 'stale_approval', id: a.id, title: a.title, entity: a.entity, urgency: 'normal' })),
  ]

  return NextResponse.json({
    totalActive: counts?.total_active ?? 0,
    backlog: counts?.backlog ?? 0,
    inProgress: counts?.in_progress ?? 0,
    blocked: counts?.blocked ?? 0,
    approvalGated: counts?.approval_gated ?? 0,
    completedLast7Days: counts?.completed_7d ?? 0,
    pendingApprovals: pendingCount,
    needsAttention,
    criticalAlerts,
    recentActivity,
  })
}
