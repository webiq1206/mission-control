import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAuth } from '../middleware'
import { nanoid } from 'nanoid'

export async function GET(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth) return auth

  const db = getDb()
  const propertyId = req.nextUrl.searchParams.get('property_id')
  const holdingCompanyId = req.nextUrl.searchParams.get('holding_company_id')
  const entity = req.nextUrl.searchParams.get('entity')
  const status = req.nextUrl.searchParams.get('status')
  const paymentStatus = req.nextUrl.searchParams.get('payment_status')

  let sql = `
    SELECT l.*, p.address as property_address, h.name as company_name
    FROM loans l
    LEFT JOIN properties p ON l.property_id = p.id
    LEFT JOIN holding_companies h ON l.holding_company_id = h.id
  `
  const conditions: string[] = []
  const params: string[] = []

  if (propertyId) {
    conditions.push('l.property_id = ?')
    params.push(propertyId)
  }
  if (holdingCompanyId) {
    conditions.push('l.holding_company_id = ?')
    params.push(holdingCompanyId)
  }
  // Support ?entity= as alias for holding_company_id (by name or id)
  if (entity && !holdingCompanyId) {
    conditions.push('(l.holding_company_id = ? OR h.name = ?)')
    params.push(entity, entity)
  }
  if (status) {
    conditions.push('l.status = ?')
    params.push(status)
  }
  if (paymentStatus) {
    conditions.push('l.payment_status = ?')
    params.push(paymentStatus)
  }

  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ')
  sql += ' ORDER BY l.due_day, l.lender'

  const loans = db.prepare(sql).all(...params)
  return NextResponse.json(loans)
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth) return auth

  const body = await req.json()
  if (!body.lender || !body.holding_company_id) {
    return NextResponse.json({ error: 'lender and holding_company_id are required' }, { status: 400 })
  }

  const id = body.id || nanoid()
  const db = getDb()

  db.prepare(`
    INSERT INTO loans
      (id, property_id, holding_company_id, lender, loan_type, payment_type,
       paid_from_account, collateral_address, payment_terms, principal_amount,
       outstanding_balance, interest_rate, monthly_payment, issue_date,
       first_payment_date, due_day, maturity_date, loan_term_years,
       drive_doc_url, notes, status, payment_status, last_payment_date, last_payment_amount)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET
      property_id=excluded.property_id,
      holding_company_id=excluded.holding_company_id,
      lender=excluded.lender, loan_type=excluded.loan_type,
      payment_type=excluded.payment_type,
      paid_from_account=excluded.paid_from_account,
      collateral_address=excluded.collateral_address,
      payment_terms=excluded.payment_terms,
      principal_amount=excluded.principal_amount,
      outstanding_balance=excluded.outstanding_balance,
      interest_rate=excluded.interest_rate,
      monthly_payment=excluded.monthly_payment,
      issue_date=excluded.issue_date,
      first_payment_date=excluded.first_payment_date,
      due_day=excluded.due_day, maturity_date=excluded.maturity_date,
      loan_term_years=excluded.loan_term_years,
      drive_doc_url=excluded.drive_doc_url,
      notes=excluded.notes, status=excluded.status,
      payment_status=excluded.payment_status,
      last_payment_date=excluded.last_payment_date,
      last_payment_amount=excluded.last_payment_amount,
      updated_at=CURRENT_TIMESTAMP
  `).run(
    id,
    body.property_id || null,
    body.holding_company_id,
    body.lender,
    body.loan_type || null,
    body.payment_type || null,
    body.paid_from_account || null,
    body.collateral_address || null,
    body.payment_terms || null,
    body.principal_amount ?? null,
    body.outstanding_balance ?? null,
    body.interest_rate ?? null,
    body.monthly_payment ?? null,
    body.issue_date || null,
    body.first_payment_date || null,
    body.due_day || null,
    body.maturity_date || null,
    body.loan_term_years ?? null,
    body.drive_doc_url || null,
    body.notes || null,
    body.status || 'active',
    body.payment_status || 'current',
    body.last_payment_date || null,
    body.last_payment_amount ?? null,
  )

  return NextResponse.json({ id, ok: true })
}
