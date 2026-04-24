export const dynamic = 'force-dynamic'

import { getDb } from '@/lib/db'
import { HOLDING_COMPANIES } from '@/lib/properties'
import { LoansDashboard } from '@/components/loans/LoansDashboard'

export default async function LoansPage() {
  const db = getDb()

  const loans = db.prepare(`
    SELECT l.*, p.address as property_address, h.name as company_name
    FROM loans l
    LEFT JOIN properties p ON l.property_id = p.id
    LEFT JOIN holding_companies h ON l.holding_company_id = h.id
    WHERE l.status = 'active'
    ORDER BY h.name, l.due_day, l.lender
  `).all() as Record<string, unknown>[]

  const properties = db.prepare(`
    SELECT p.id, p.address, p.holding_company_id, h.name as company_name, h.id as hc_id
    FROM properties p
    JOIN holding_companies h ON p.holding_company_id = h.id
    WHERE p.status != 'sold'
    ORDER BY h.name, p.address
  `).all() as { id: string; address: string; holding_company_id: string; company_name: string; hc_id: string }[]

  const holdingCompanies = HOLDING_COMPANIES

  const totalMonthly = loans.reduce((s, l) => s + (Number(l.monthly_payment) || 0), 0)
  const totalBalance = loans.reduce((s, l) => s + (Number(l.outstanding_balance || l.principal_amount) || 0), 0)
  const pastDueCount = loans.filter(l => l.payment_status === 'past_due').length
  const dueSoonCount = loans.filter(l => {
    if (l.payment_status === 'paid_this_month' || l.payment_status === 'past_due') return false
    if (!l.due_day) return false
    const today = new Date().getDate()
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
    const due = parseInt(String(l.due_day), 10)
    if (isNaN(due)) return false
    for (let i = 0; i <= 5; i++) {
      if (((today - 1 + i) % daysInMonth) + 1 === due) return true
    }
    return false
  }).length

  return (
    <LoansDashboard
      initialLoans={loans}
      properties={properties}
      holdingCompanies={holdingCompanies as typeof HOLDING_COMPANIES[number][]}
      stats={{ totalMonthly, totalBalance, pastDueCount, dueSoonCount, totalCount: loans.length }}
    />
  )
}
