import { NextRequest, NextResponse } from 'next/server'
import { getUniversalDb } from '@/lib/db-universal'
import { requireAuth } from '../../middleware'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req)
  if (auth) return auth

  const { id } = await params
  const db = await getUniversalDb()

  const loan = await db.get(`
    SELECT l.*, p.address as property_address, h.name as company_name
    FROM loans l
    LEFT JOIN properties p ON l.property_id = p.id
    LEFT JOIN holding_companies h ON l.holding_company_id = h.id
    WHERE l.id = ?
  `, id)

  if (!loan) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(loan)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req)
  if (auth) return auth

  const { id } = await params
  const body = await req.json()
  const db = await getUniversalDb()

  const existing = await db.get('SELECT id FROM loans WHERE id = ?', id)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const fields = [
    'property_id', 'holding_company_id', 'lender', 'loan_type', 'payment_type',
    'paid_from_account', 'collateral_address', 'payment_terms', 'principal_amount',
    'outstanding_balance', 'interest_rate', 'monthly_payment', 'issue_date',
    'first_payment_date', 'due_day', 'maturity_date', 'loan_term_years',
    'drive_doc_url', 'notes', 'status',
    'payment_status', 'last_payment_date', 'last_payment_amount',
  ]

  const updates: string[] = []
  const values: unknown[] = []

  for (const field of fields) {
    if (field in body) {
      updates.push(`${field} = ?`)
      values.push(body[field])
    }
  }

  if (updates.length === 0) return NextResponse.json({ ok: true, unchanged: true })

  updates.push('updated_at = CURRENT_TIMESTAMP')
  values.push(id)

  await db.run(`UPDATE loans SET ${updates.join(', ')} WHERE id = ?`, ...values)
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req)
  if (auth) return auth

  const { id } = await params
  const db = await getUniversalDb()
  await db.run('DELETE FROM loans WHERE id = ?', id)
  return NextResponse.json({ ok: true })
}
