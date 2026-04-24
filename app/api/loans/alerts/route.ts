import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAuth } from '../../middleware'

/**
 * GET /api/loans/alerts
 * Returns loans that are:
 *   - payment_status = 'past_due'
 *   - payment_status = 'current' but due within 5 days (based on due_day)
 *   - maturity_date within 90 days
 *
 * Response: { alerts: LoanAlert[], count: number }
 */
export async function GET(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth) return auth

  const db = getDb()

  // Loans marked past_due explicitly
  const pastDue = db.prepare(`
    SELECT l.*, p.address as property_address, h.name as company_name,
           'past_due' as alert_type,
           'Payment overdue' as alert_message
    FROM loans l
    LEFT JOIN properties p ON l.property_id = p.id
    LEFT JOIN holding_companies h ON l.holding_company_id = h.id
    WHERE l.status = 'active'
      AND l.payment_status = 'past_due'
    ORDER BY l.lender
  `).all() as Record<string, unknown>[]

  // Loans due within 5 days (using due_day as day-of-month integer/text)
  // We compute current day and check if due_day is within next 5 days
  const today = new Date()
  const currentDay = today.getDate()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  
  // Days that fall within next 5 calendar days (wrapping month boundary)
  const dueSoonDays: number[] = []
  for (let i = 0; i <= 5; i++) {
    const d = ((currentDay - 1 + i) % daysInMonth) + 1
    dueSoonDays.push(d)
  }

  // Get all active loans with due_day set, not already past_due, not paid_this_month
  const activeLoansDue = db.prepare(`
    SELECT l.*, p.address as property_address, h.name as company_name
    FROM loans l
    LEFT JOIN properties p ON l.property_id = p.id
    LEFT JOIN holding_companies h ON l.holding_company_id = h.id
    WHERE l.status = 'active'
      AND l.payment_status NOT IN ('past_due', 'paid_this_month')
      AND l.due_day IS NOT NULL
    ORDER BY l.due_day, l.lender
  `).all() as Record<string, unknown>[]

  const dueSoon = activeLoansDue.filter(loan => {
    const dueDay = parseInt(String(loan.due_day), 10)
    if (isNaN(dueDay)) return false
    return dueSoonDays.includes(dueDay)
  }).map(loan => ({
    ...loan,
    alert_type: 'due_soon',
    alert_message: `Payment due on the ${loan.due_day}${getOrdinal(Number(loan.due_day))}`,
  }))

  // Loans maturing within 90 days
  const maturingSoon = db.prepare(`
    SELECT l.*, p.address as property_address, h.name as company_name,
           'maturity' as alert_type,
           'Loan maturing within 90 days' as alert_message,
           CAST(julianday(l.maturity_date) - julianday('now') AS INTEGER) as days_until_maturity
    FROM loans l
    LEFT JOIN properties p ON l.property_id = p.id
    LEFT JOIN holding_companies h ON l.holding_company_id = h.id
    WHERE l.status = 'active'
      AND l.maturity_date IS NOT NULL
      AND l.maturity_date <= date('now', '+90 days')
    ORDER BY l.maturity_date
  `).all() as Record<string, unknown>[]

  // Combine and deduplicate (a loan could appear in multiple categories)
  const seenIds = new Set<string>()
  const allAlerts: Record<string, unknown>[] = []

  for (const loan of [...pastDue, ...dueSoon, ...maturingSoon]) {
    const key = `${loan.id}-${loan.alert_type}`
    if (!seenIds.has(key)) {
      seenIds.add(key)
      allAlerts.push(loan)
    }
  }

  return NextResponse.json({
    alerts: allAlerts,
    count: allAlerts.length,
    breakdown: {
      past_due: pastDue.length,
      due_soon: dueSoon.length,
      maturing_soon: maturingSoon.length,
    }
  })
}

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return s[(v - 20) % 10] || s[v] || s[0]
}
