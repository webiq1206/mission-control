/**
 * GET /api/bmh/data-sources/status
 * Entity: Buy My House Boise
 * Returns health status for all data ingestion sources.
 * Updated by pipeline scripts (PropStream nightly, etc.) after each run.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAuth } from '@/app/api/middleware'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth) return auth

  const db = getDb()

  // Return all sources — pipeline scripts write to this table after each run
  const sources = db.prepare('SELECT * FROM bmh_data_sources ORDER BY label ASC').all()

  return NextResponse.json({ sources })
}
