/**
 * GET /api/bmh/pipeline/stages
 * Entity: Buy My House Boise
 * Returns all 10 pipeline stages with deal counts and agent_owned flag.
 * Used by the dashboard stage lane and the deal detail stage progress bar.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAuth } from '@/app/api/middleware'

export const dynamic = 'force-dynamic'

interface StageWithCount {
  stage_number: number
  label: string
  agent_owned: number  // 1 = agent domain, 0 = Clint domain (stages 8-10)
  description: string | null
  count: number        // current deals at this stage
}

export async function GET(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth) return auth

  const db = getDb()

  // LEFT JOIN so stages with zero deals still appear in the result
  const stages = db.prepare(`
    SELECT
      s.stage_number,
      s.label,
      s.agent_owned,
      s.description,
      COUNT(d.id) as count
    FROM bmh_pipeline_stages s
    LEFT JOIN bmh_deals d ON d.pipeline_stage = s.stage_number
    GROUP BY s.stage_number
    ORDER BY s.stage_number ASC
  `).all() as StageWithCount[]

  return NextResponse.json(stages)
}
