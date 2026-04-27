/**
 * GET /api/bmh/data-sources/status
 * Entity: Buy My House Boise
 * Returns health status for all data ingestion sources.
 * Updated by pipeline scripts (PropStream nightly, etc.) after each run.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUniversalDb } from '@/lib/db-universal'
import { requireAuth } from '@/app/api/middleware'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth) return auth

  const db = await getUniversalDb()

  // Return all sources — pipeline scripts write to this table after each run
  const sources = await db.all('SELECT * FROM bmh_data_sources ORDER BY label ASC')

  return NextResponse.json({ sources })
}
