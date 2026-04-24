import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAuth } from '../../middleware'
import type { PropertyAlert } from '@/lib/types'

export async function GET(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth) return auth

  const db = getDb()
  const now = new Date()
  const alerts: PropertyAlert[] = []

  const loans = db.prepare(`
    SELECT l.*, p.address as property_address, h.name as company_name
    FROM loans l
    LEFT JOIN properties p ON l.property_id = p.id
    LEFT JOIN holding_companies h ON l.holding_company_id = h.id
    WHERE l.status = 'active' AND l.maturity_date IS NOT NULL
    ORDER BY l.maturity_date
  `).all() as Record<string, unknown>[]

  for (const loan of loans) {
    const maturity = new Date(loan.maturity_date as string)
    const daysUntil = Math.ceil((maturity.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntil <= 90) {
      alerts.push({
        id: `loan-maturity-${loan.id}`,
        severity: daysUntil <= 0 ? 'critical' : daysUntil <= 30 ? 'critical' : 'warning',
        type: daysUntil <= 0 ? 'past-due' : 'loan-maturity',
        title: daysUntil <= 0
          ? `MATURED: ${loan.lender} loan`
          : `Loan maturing in ${daysUntil} days`,
        detail: `${loan.lender} — ${loan.collateral_address || loan.property_address || 'Company-level'} — $${Number(loan.monthly_payment || 0).toLocaleString()}/mo`,
        date: loan.maturity_date as string,
        days_until: daysUntil,
        related_property_id: (loan.property_id as string) || null,
        related_property_address: (loan.property_address as string) || (loan.collateral_address as string) || null,
        holding_company: (loan.company_name as string) || null,
      })
    }
  }

  const policies = db.prepare(`
    SELECT ip.*, p.address as property_address, h.name as company_name
    FROM insurance_policies ip
    LEFT JOIN properties p ON ip.property_id = p.id
    LEFT JOIN holding_companies h ON ip.holding_company_id = h.id
    WHERE ip.status = 'active' AND ip.expiration_date IS NOT NULL
    ORDER BY ip.expiration_date
  `).all() as Record<string, unknown>[]

  for (const policy of policies) {
    const expiry = new Date(policy.expiration_date as string)
    const daysUntil = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntil <= 60) {
      alerts.push({
        id: `insurance-exp-${policy.id}`,
        severity: daysUntil <= 0 ? 'critical' : daysUntil <= 14 ? 'critical' : 'warning',
        type: daysUntil <= 0 ? 'past-due' : 'insurance-expiration',
        title: daysUntil <= 0
          ? `EXPIRED: ${policy.provider} ${policy.coverage_type} policy`
          : `Insurance expiring in ${daysUntil} days`,
        detail: `${policy.provider || 'Unknown'} — ${policy.coverage_type || ''} — ${policy.property_address || 'Company-level'}`,
        date: policy.expiration_date as string,
        days_until: daysUntil,
        related_property_id: (policy.property_id as string) || null,
        related_property_address: (policy.property_address as string) || null,
        holding_company: (policy.company_name as string) || null,
      })
    }
  }

  alerts.sort((a, b) => a.days_until - b.days_until)

  return NextResponse.json(alerts)
}
