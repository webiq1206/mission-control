/**
 * GET  /api/bmh/deals/:id  — Full deal detail by ID
 * PUT  /api/bmh/deals/:id  — Advance pipeline stage
 *
 * Stage advance rules (PUT):
 *   - Stage 1-7: agent may advance freely
 *   - Stage 8-10: Clint Robertson domain — requires { clint_context: true } in body
 *     Returns 403 if clint_context is missing or false
 *   - Confirm dialog must fire in UI before calling PUT (enforced client-side)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDb, safeJsonArray } from '@/lib/db'
import { requireAuth } from '@/app/api/middleware'

export const dynamic = 'force-dynamic'

// Next.js 15: params is a Promise — must be awaited before use
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req)
  if (auth) return auth

  const { id } = await params
  const db = getDb()
  const row = db.prepare('SELECT * FROM bmh_deals WHERE id = ?').get(id) as Record<string, unknown> | undefined

  if (!row) {
    return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
  }

  // Parse JSON text columns into arrays
  return NextResponse.json({
    ...row,
    signals:          safeJsonArray(row.signals),
    outreach_history: safeJsonArray(row.outreach_history),
  })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req)
  if (auth) return auth

  const { id } = await params
  const db = getDb()
  const body = await req.json() as { stage: number; clint_context?: boolean }

  const newStage = body.stage
  if (typeof newStage !== 'number' || newStage < 1 || newStage > 10) {
    return NextResponse.json({ error: 'stage must be an integer between 1 and 10' }, { status: 400 })
  }

  // Clint domain guard: stages 8-10 require explicit clint_context flag
  // This prevents accidental advances into the closing process
  if (newStage >= 8 && !body.clint_context) {
    return NextResponse.json(
      { error: 'Stage 8-10 is Clint Robertson domain. Pass clint_context: true to advance.' },
      { status: 403 }
    )
  }

  // Verify the deal exists before updating
  const existing = db.prepare('SELECT id FROM bmh_deals WHERE id = ?').get(id)
  if (!existing) {
    return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
  }

  // Advance stage and record timestamp for stale-detection
  db.prepare(`
    UPDATE bmh_deals
    SET pipeline_stage = ?,
        last_stage_advance_at = datetime('now'),
        updated_at = datetime('now')
    WHERE id = ?
  `).run(newStage, id)

  // Return the updated deal
  const updated = db.prepare('SELECT * FROM bmh_deals WHERE id = ?').get(id) as Record<string, unknown>
  return NextResponse.json({
    ...updated,
    signals:          safeJsonArray(updated.signals),
    outreach_history: safeJsonArray(updated.outreach_history),
  })
}
