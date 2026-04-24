/**
 * POST /api/bmh/leads
 * GET  /api/bmh/leads
 * Entity: Buy My House Boise
 * Author: Kai (Developer Agent) — 2026-04-23
 *
 * POST: Accepts inbound motivated seller lead from buymyhouse.co form.
 *   - Validates: address required, phone or email required (at least one)
 *   - Stores in bmh_leads table
 *   - Logs to activity_feed
 *   - Returns: { id, status: "received", message, estimated_response_hours }
 *
 * GET: Returns all leads (paginated, filterable by status)
 *   - Query params: status, limit (default 50), offset (default 0)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAuth } from '@/app/api/middleware'

export const dynamic = 'force-dynamic'

// ── POST /api/bmh/leads ────────────────────────────────────────────────────────
// Accepts a motivated seller lead submission. Validates, stores, logs.
export async function POST(req: NextRequest) {
  // POST submissions from buymyhouse.co can be unauthenticated (public form)
  // so we skip requireAuth here. MC-internal reads (GET) are auth-gated.
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const address = typeof body.address === 'string' ? body.address.trim() : ''
  const phone   = typeof body.phone   === 'string' ? body.phone.trim()   : ''
  const email   = typeof body.email   === 'string' ? body.email.trim()   : ''
  const source  = typeof body.source  === 'string' ? body.source.trim()  : 'direct'
  const notes   = typeof body.notes   === 'string' ? body.notes.trim()   : ''

  // Validate: address required
  if (!address) {
    return NextResponse.json({ error: 'address is required' }, { status: 400 })
  }
  // Validate: at least phone or email required
  if (!phone && !email) {
    return NextResponse.json({ error: 'phone or email is required' }, { status: 400 })
  }

  const db = getDb()

  // Generate a deterministic-ish ID: BMH-LEAD-timestamp-random
  const id = `BMH-LEAD-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`

  // Insert into bmh_leads
  db.prepare(`
    INSERT INTO bmh_leads (id, address, phone, email, source, notes, status)
    VALUES (?, ?, ?, ?, ?, ?, 'received')
  `).run(id, address, phone || null, email || null, source, notes || null)

  // Log to activity_feed (if table exists — graceful fallback if not)
  try {
    db.prepare(`
      INSERT INTO activity_feed (id, entity, type, summary, created_at)
      VALUES (?, 'BMH', 'lead_received', ?, datetime('now'))
    `).run(
      `AF-BMH-LEAD-${Date.now()}`,
      `New BMH lead received: ${address}`
    )
  } catch {
    // activity_feed table may not exist in all environments — not a blocking error
  }

  return NextResponse.json({
    id,
    status: 'received',
    message: "We'll be in touch within 24 hours.",
    estimated_response_hours: 24,
  }, { status: 201 })
}

// ── GET /api/bmh/leads ─────────────────────────────────────────────────────────
// Returns paginated list of inbound leads. Auth-gated (MC internal only).
export async function GET(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth) return auth

  const db = getDb()
  const url = new URL(req.url)

  // Optional status filter: received | reviewed | converted | dead
  const status = url.searchParams.get('status')
  const limit  = Math.min(parseInt(url.searchParams.get('limit')  ?? '50', 10), 200)
  const offset = parseInt(url.searchParams.get('offset') ?? '0', 10)

  // Build query with optional status filter
  const whereClause = status ? 'WHERE status = ?' : ''
  const params: (string | number)[] = status
    ? [status, limit, offset]
    : [limit, offset]

  const leads = db.prepare(`
    SELECT * FROM bmh_leads
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params)

  // Total count for pagination
  const totalRow = db.prepare(
    `SELECT COUNT(*) as cnt FROM bmh_leads ${whereClause}`
  ).get(...(status ? [status] : [])) as { cnt: number }

  return NextResponse.json({
    leads,
    total: totalRow.cnt,
    limit,
    offset,
  })
}
