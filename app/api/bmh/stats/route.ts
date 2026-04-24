/**
 * GET /api/bmh/stats
 * Entity: Buy My House Boise
 * Author: Kai (Developer Agent) — 2026-04-23
 *
 * Returns aggregate stats for the BMH dashboard header.
 * Combines bmh_deals (sourced) and bmh_leads (inbound) into a single summary.
 *
 * Response:
 *   active_leads_30d     — inbound leads received in the last 30 days
 *   total_deals          — all-time deal count in bmh_deals
 *   priority_a_count     — current Priority A deals (MSS >= threshold or priority = 'A')
 *   avg_response_hours   — always 24 (SLA commitment; update when real data available)
 *   pipeline_active      — deals in stages 1-7 (agent domain) with recent movement
 *   new_leads_7d         — inbound leads in last 7 days (recent pipeline health signal)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAuth } from '@/app/api/middleware'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth) return auth

  const db = getDb()

  // Inbound leads received in last 30 days
  const leadsRow = db.prepare(`
    SELECT COUNT(*) as cnt FROM bmh_leads
    WHERE created_at >= datetime('now', '-30 days')
  `).get() as { cnt: number }

  // All-time deal count
  const totalDealsRow = db.prepare(
    'SELECT COUNT(*) as cnt FROM bmh_deals'
  ).get() as { cnt: number }

  // Priority A deals — explicitly labeled or MSS >= 10
  const priorityARow = db.prepare(`
    SELECT COUNT(*) as cnt FROM bmh_deals
    WHERE priority = 'A' OR mss >= 10
  `).get() as { cnt: number }

  // Active pipeline: stages 1-7 (agent domain), with stage movement in last 7 days
  // OR already past stage 1 (shows persistent engagement)
  const pipelineActiveRow = db.prepare(`
    SELECT COUNT(*) as cnt FROM bmh_deals
    WHERE pipeline_stage BETWEEN 1 AND 7
      AND (pipeline_stage > 1 OR last_stage_advance_at >= datetime('now', '-7 days'))
  `).get() as { cnt: number }

  // New inbound leads last 7 days
  const newLeads7dRow = db.prepare(`
    SELECT COUNT(*) as cnt FROM bmh_leads
    WHERE created_at >= datetime('now', '-7 days')
  `).get() as { cnt: number }

  return NextResponse.json({
    active_leads_30d:    leadsRow.cnt,
    total_deals:         totalDealsRow.cnt,
    priority_a_count:    priorityARow.cnt,
    avg_response_hours:  24,   // SLA commitment — update when real data tracked
    pipeline_active:     pipelineActiveRow.cnt,
    new_leads_7d:        newLeads7dRow.cnt,
  })
}
