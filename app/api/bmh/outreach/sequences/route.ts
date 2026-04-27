/**
 * GET /api/bmh/outreach/sequences
 * Entity: Buy My House Boise
 * Returns all outreach sequences with their approval status.
 *
 * COMPLIANCE NOTE: No sequence may be activated without Jared's explicit approval
 * in Mission Control (status must be 'approved'). The UI enforces this by hiding
 * any launch/activate control when status != 'approved'. This route only reads
 * sequence state — it does not activate sequences.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUniversalDb } from '@/lib/db-universal'
import { requireAuth } from '@/app/api/middleware'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth) return auth

  const db = await getUniversalDb()

  // Return all sequences sorted by most recently updated first
  const sequences = await db.all('SELECT * FROM bmh_outreach_sequences ORDER BY updated_at DESC')

  return NextResponse.json(sequences)
}
