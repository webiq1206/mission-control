import { NextRequest, NextResponse } from 'next/server'
import { getDb, parseJsonArrayFields } from '@/lib/db'
import { requireAuth } from '../../middleware'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req)
  if (auth) return auth

  const { id } = await params
  const db = getDb()

  const rawPolicy = db.prepare(`
    SELECT ip.*, p.address as property_address, h.name as company_name
    FROM insurance_policies ip
    LEFT JOIN properties p ON ip.property_id = p.id
    LEFT JOIN holding_companies h ON ip.holding_company_id = h.id
    WHERE ip.id = ?
  `).get(id) as Record<string, unknown> | undefined

  if (!rawPolicy) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const policy = parseJsonArrayFields(rawPolicy, ['additional_insured'])
  return NextResponse.json(policy)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req)
  if (auth) return auth

  const { id } = await params
  const body = await req.json()
  const db = getDb()

  const existing = db.prepare('SELECT id FROM insurance_policies WHERE id = ?').get(id)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const fields = [
    'property_id', 'holding_company_id', 'coverage_type', 'provider',
    'policy_number', 'premium_amount', 'premium_frequency', 'effective_date',
    'expiration_date', 'renewal_date', 'additional_insured', 'drive_doc_url',
    'notes', 'status',
  ]

  const updates: string[] = []
  const values: unknown[] = []

  for (const field of fields) {
    if (field in body) {
      updates.push(`${field} = ?`)
      values.push(field === 'additional_insured' ? JSON.stringify(body[field]) : body[field])
    }
  }

  if (updates.length === 0) return NextResponse.json({ ok: true, unchanged: true })

  updates.push('updated_at = CURRENT_TIMESTAMP')
  values.push(id)

  db.prepare(`UPDATE insurance_policies SET ${updates.join(', ')} WHERE id = ?`).run(...values)
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req)
  if (auth) return auth

  const { id } = await params
  getDb().prepare('DELETE FROM insurance_policies WHERE id = ?').run(id)
  return NextResponse.json({ ok: true })
}
