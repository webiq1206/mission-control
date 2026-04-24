/**
 * GET /api/bmh/deals
 * Entity: Buy My House Boise
 * Returns a filterable, sortable list of BMH deals.
 *
 * Query params:
 *   priority  — 'A', 'B', or 'C' (filter by priority tier)
 *   stage     — integer 1-10 (filter by pipeline stage)
 *   sort      — 'mss_desc' (default), 'mss_asc', 'dom_desc', 'created_desc'
 *   limit     — integer, default 50
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDb, safeJsonArray } from '@/lib/db'
import { requireAuth } from '@/app/api/middleware'

export const dynamic = 'force-dynamic'

// Signal shape as stored in bmh_deals.signals JSON column
interface BmhSignal {
  label: string
  tier: number   // 1 = red (urgent), 2 = amber (moderate), 3 = gray (monitor)
  source: string
}

// Outreach history event as stored in bmh_deals.outreach_history JSON column
interface OutreachEvent {
  date: string
  method: string
  outcome: string
  agent?: string
}

export async function GET(req: NextRequest) {
  // Auth gate
  const auth = requireAuth(req)
  if (auth) return auth

  const db = getDb()
  const { searchParams } = new URL(req.url)

  const priority = searchParams.get('priority')
  const stage    = searchParams.get('stage')
  const sort     = searchParams.get('sort') || 'mss_desc'
  const limit    = Math.min(parseInt(searchParams.get('limit') || '50'), 200) // cap at 200

  // Build query dynamically based on filters
  let query = 'SELECT * FROM bmh_deals WHERE 1=1'
  const params: unknown[] = []

  if (priority) {
    query += ' AND priority = ?'
    params.push(priority.toUpperCase())
  }
  if (stage) {
    query += ' AND pipeline_stage = ?'
    params.push(parseInt(stage))
  }

  // Apply sort order — MSS descending is default (highest motivated sellers first)
  const sortMap: Record<string, string> = {
    mss_desc:     'mss DESC, created_at DESC',
    mss_asc:      'mss ASC, created_at DESC',
    dom_desc:     'dom DESC, mss DESC',
    created_desc: 'created_at DESC',
  }
  query += ` ORDER BY ${sortMap[sort] || sortMap.mss_desc} LIMIT ?`
  params.push(limit)

  const rows = db.prepare(query).all(...params) as Record<string, unknown>[]

  // Parse JSON text columns into actual arrays before returning
  const deals = rows.map(row => ({
    ...row,
    signals:          safeJsonArray<BmhSignal>(row.signals),
    outreach_history: safeJsonArray<OutreachEvent>(row.outreach_history),
  }))

  return NextResponse.json(deals)
}
