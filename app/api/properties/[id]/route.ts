import { NextRequest, NextResponse } from 'next/server'
import { getUniversalDb, parseJsonArrayFields } from '@/lib/db-universal'
import { requireAuth } from '../../middleware'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req)
  if (auth) return auth

  const { id } = await params
  const db = await getUniversalDb()

  const rawProperty = await db.get('SELECT * FROM properties WHERE id = ?', id) as Record<string, unknown> | undefined
  if (!rawProperty) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const property = parseJsonArrayFields(rawProperty, ['additional_insured'])

  const loans = await db.all('SELECT * FROM loans WHERE property_id = ? ORDER BY due_day, lender', id)

  const rawInsurance = await db.all('SELECT * FROM insurance_policies WHERE property_id = ? ORDER BY expiration_date', id) as Record<string, unknown>[]
  const insurance = parseJsonArrayFields(rawInsurance, ['additional_insured'])

  const holdingCompany = await db.get('SELECT * FROM holding_companies WHERE id = ?', rawProperty.holding_company_id)

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
  const db = await getUniversalDb()

  const existing = await db.get('SELECT id FROM properties WHERE id = ?', id)
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

  await db.run(`UPDATE properties SET ${updates.join(', ')} WHERE id = ?`, ...values)
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
  await db.run('DELETE FROM properties WHERE id = ?', id)
  return NextResponse.json({ ok: true })
}
