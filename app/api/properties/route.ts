import { NextRequest, NextResponse } from 'next/server'
import { getDb, parseJsonArrayFields } from '@/lib/db'
import { requireAuth } from '../middleware'
import { nanoid } from 'nanoid'

export async function GET(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth) return auth

  const db = getDb()
  const holdingCompany = req.nextUrl.searchParams.get('holding_company')
  const status = req.nextUrl.searchParams.get('status')

  let sql = 'SELECT * FROM properties'
  const conditions: string[] = []
  const params: string[] = []

  if (holdingCompany) {
    conditions.push('holding_company_id = ?')
    params.push(holdingCompany)
  }
  if (status) {
    conditions.push('status = ?')
    params.push(status)
  }

  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ')
  sql += ' ORDER BY holding_company_id, address'

  const rawProperties = db.prepare(sql).all(...params) as Record<string, unknown>[]
  const properties = parseJsonArrayFields(rawProperties, ['additional_insured'])
  return NextResponse.json(properties)
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth) return auth

  const body = await req.json()
  if (!body.address || !body.holding_company_id) {
    return NextResponse.json({ error: 'address and holding_company_id are required' }, { status: 400 })
  }

  const id = body.id || nanoid()
  const db = getDb()

  db.prepare(`
    INSERT INTO properties
      (id, holding_company_id, address, city, state, zip, property_type, notes,
       bedrooms, bathrooms, sq_ft, year_built, estimated_value,
       additional_insured, status, drive_folder_url)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET
      holding_company_id=excluded.holding_company_id, address=excluded.address,
      city=excluded.city, state=excluded.state, zip=excluded.zip,
      property_type=excluded.property_type, notes=excluded.notes,
      bedrooms=excluded.bedrooms, bathrooms=excluded.bathrooms,
      sq_ft=excluded.sq_ft, year_built=excluded.year_built,
      estimated_value=excluded.estimated_value,
      additional_insured=excluded.additional_insured,
      status=excluded.status, drive_folder_url=excluded.drive_folder_url,
      updated_at=CURRENT_TIMESTAMP
  `).run(
    id,
    body.holding_company_id,
    body.address,
    body.city || null,
    body.state || null,
    body.zip || null,
    body.property_type || null,
    body.notes || null,
    body.bedrooms ?? null,
    body.bathrooms ?? null,
    body.sq_ft ?? null,
    body.year_built ?? null,
    body.estimated_value ?? null,
    JSON.stringify(body.additional_insured || []),
    body.status || 'active',
    body.drive_folder_url || null
  )

  return NextResponse.json({ id, ok: true })
}
