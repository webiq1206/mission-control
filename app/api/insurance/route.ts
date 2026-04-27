import { NextRequest, NextResponse } from 'next/server'
import { getUniversalDb, parseJsonArrayFields } from '@/lib/db-universal'
import { requireAuth } from '../middleware'
import { nanoid } from 'nanoid'

export async function GET(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth) return auth

  const db = await getUniversalDb()
  const propertyId = req.nextUrl.searchParams.get('property_id')
  const holdingCompanyId = req.nextUrl.searchParams.get('holding_company_id')
  const status = req.nextUrl.searchParams.get('status')

  let sql = `
    SELECT ip.*, p.address as property_address, h.name as company_name
    FROM insurance_policies ip
    LEFT JOIN properties p ON ip.property_id = p.id
    LEFT JOIN holding_companies h ON ip.holding_company_id = h.id
  `
  const conditions: string[] = []
  const params: string[] = []

  if (propertyId) {
    conditions.push('ip.property_id = ?')
    params.push(propertyId)
  }
  if (holdingCompanyId) {
    conditions.push('ip.holding_company_id = ?')
    params.push(holdingCompanyId)
  }
  if (status) {
    conditions.push('ip.status = ?')
    params.push(status)
  }

  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ')
  sql += ' ORDER BY ip.expiration_date'

  const rawPolicies = await db.all(sql, ...params) as Record<string, unknown>[]
  const policies = parseJsonArrayFields(rawPolicies, ['additional_insured'])
  return NextResponse.json(policies)
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth) return auth

  const body = await req.json()
  if (!body.holding_company_id) {
    return NextResponse.json({ error: 'holding_company_id is required' }, { status: 400 })
  }

  const id = body.id || nanoid()
  const db = await getUniversalDb()

  await db.run(`
    INSERT INTO insurance_policies
      (id, property_id, holding_company_id, coverage_type, provider,
       policy_number, premium_amount, premium_frequency, effective_date,
       expiration_date, renewal_date, additional_insured, drive_doc_url,
       notes, status)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET
      property_id=excluded.property_id,
      holding_company_id=excluded.holding_company_id,
      coverage_type=excluded.coverage_type, provider=excluded.provider,
      policy_number=excluded.policy_number,
      premium_amount=excluded.premium_amount,
      premium_frequency=excluded.premium_frequency,
      effective_date=excluded.effective_date,
      expiration_date=excluded.expiration_date,
      renewal_date=excluded.renewal_date,
      additional_insured=excluded.additional_insured,
      drive_doc_url=excluded.drive_doc_url,
      notes=excluded.notes, status=excluded.status,
      updated_at=CURRENT_TIMESTAMP
  `, id,
    body.property_id || null,
    body.holding_company_id,
    body.coverage_type || null,
    body.provider || null,
    body.policy_number || null,
    body.premium_amount ?? null,
    body.premium_frequency || null,
    body.effective_date || null,
    body.expiration_date || null,
    body.renewal_date || null,
    JSON.stringify(body.additional_insured || []),
    body.drive_doc_url || null,
    body.notes || null,
    body.status || 'active'
  )

  return NextResponse.json({ id, ok: true })
}
