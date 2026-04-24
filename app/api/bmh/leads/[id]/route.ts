/**
 * GET /api/bmh/leads/[id]
 * Entity: Buy My House Boise
 * Author: Kai (Developer Agent) — 2026-04-23
 *
 * Returns a single BMH lead record plus any associated offer data.
 * If no offer has been generated yet: returns { status: "pending", estimated_response_hours: 24 }.
 * Used by the post-submission confirmation page on buymyhouse.co.
 *
 * No auth required for GET — leads are identified by their unique ID,
 * which is never guessable (includes random suffix). MC-internal edits
 * would use a separate PATCH route (not built here).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

interface BmhLead {
  id: string
  address: string
  phone: string | null
  email: string | null
  source: string
  notes: string | null
  status: 'received' | 'reviewed' | 'converted' | 'dead'
  converted_deal_id: string | null
  created_at: string
  updated_at: string
}

// ── GET /api/bmh/leads/[id] ────────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params

  if (!id) {
    return NextResponse.json({ error: 'Lead ID required' }, { status: 400 })
  }

  const db = getDb()
  const lead = db.prepare('SELECT * FROM bmh_leads WHERE id = ?').get(id) as BmhLead | undefined

  if (!lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  // If lead has been converted to a deal, attach deal summary
  let dealSummary = null
  if (lead.converted_deal_id) {
    const deal = db.prepare(
      'SELECT id, address, pipeline_stage, priority, mss FROM bmh_deals WHERE id = ?'
    ).get(lead.converted_deal_id) as Record<string, unknown> | undefined

    if (deal) {
      dealSummary = {
        id: deal.id,
        address: deal.address,
        pipeline_stage: deal.pipeline_stage,
        priority: deal.priority,
      }
    }
  }

  // Offer state: we don't have a separate offers table yet — derive from lead status.
  // "received" = still pending review; "reviewed" = Clint has seen it; "converted" = deal created.
  const offerState =
    lead.status === 'converted' ? { status: 'in_progress', deal: dealSummary } :
    lead.status === 'reviewed'  ? { status: 'pending',     estimated_response_hours: 24 } :
    { status: 'pending', estimated_response_hours: 24 }

  return NextResponse.json({
    lead: {
      id: lead.id,
      address: lead.address,
      source: lead.source,
      status: lead.status,
      created_at: lead.created_at,
    },
    offer: offerState,
  })
}
