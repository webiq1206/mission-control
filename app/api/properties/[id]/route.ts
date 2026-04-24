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

  const rawProperty = db.prepare('SELECT * FROM properties WHERE id = ?').get(id) as Record<string, unknown> | undefined
  if (!rawProperty) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const property = parseJsonArrayFields(rawProperty, ['additional_insured'])

  const loans = db.prepare(
    'SELECT * FROM loans WHERE property_id = ? ORDER BY due_day, lender'
  ).all(id)

  const rawInsurance = db.prepare(
    'SELECT * FROM insurance_policies WHERE property_id = ? ORDER BY expiration_date'
  ).all(id) as Record<string, unknown>[]
  const insurance = parseJsonArrayFields(rawInsurance, ['additional_insured'])

  const holdingCompany = db.prepare(
    'SELECT * FROM holding_companies WHERE id = ?'
  ).get(rawProperty.holding_company_id)

  return NextResponse.json({ property, loans, insurance, holdingCompany })
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

  const existing = db.prepare('SELECT id FROM properties WHERE id = ?').get(id)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const fields = [
    'holding_company_id', 'address', 'city', 'state', 'zip', 'property_type',
    'notes', 'bedrooms', 'bathrooms', 'sq_ft', 'year_built', 'estimated_value',
    'additional_insured', 'status', 'drive_folder_url',
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

  db.prepare(`UPDATE properties SET ${updates.join(', ')} WHERE id = ?`).run(...values)
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req)
  if (auth) return auth

  const { id } = await params
  const db = getDb()
  db.prepare('DELETE FROM properties WHERE id = ?').run(id)
  return NextResponse.json({ ok: true })
}
