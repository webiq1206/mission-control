/**
 * GET /api/bmh/dashboard/kpis
 * Entity: Buy My House Boise
 * Returns 4 KPI values for the BMH Deal Dashboard header bar.
 * All values computed from bmh_deals table at query time.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAuth } from '@/app/api/middleware'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // Auth gate — same token as all MC routes
  const auth = requireAuth(req)
  if (auth) return auth

  const db = getDb()

  // Total motivated seller deals in the system
  const totalRow = db.prepare('SELECT COUNT(*) as cnt FROM bmh_deals').get() as { cnt: number }

  // Priority A deals — MSS >= 10 or explicitly labeled Priority A
  const priorityARow = db.prepare(
    "SELECT COUNT(*) as cnt FROM bmh_deals WHERE priority = 'A'"
  ).get() as { cnt: number }

  // Pipeline active = deals in stages 1-7 (agent domain)
  // that have had stage movement in the last 7 days OR are past stage 1
  const pipelineActiveRow = db.prepare(`
    SELECT COUNT(*) as cnt FROM bmh_deals
    WHERE pipeline_stage BETWEEN 1 AND 7
      AND (pipeline_stage > 1 OR last_stage_advance_at >= datetime('now', '-7 days'))
  `).get() as { cnt: number }

  // Deals added this week (last 7 days)
  const addedThisWeekRow = db.prepare(`
    SELECT COUNT(*) as cnt FROM bmh_deals
    WHERE created_at >= datetime('now', '-7 days')
  `).get() as { cnt: number }

  return NextResponse.json({
    total_deals:          totalRow.cnt,
    priority_a_count:     priorityARow.cnt,
    pipeline_active_count: pipelineActiveRow.cnt,
    deals_added_this_week: addedThisWeekRow.cnt,
  })
}
