export const dynamic = 'force-dynamic'

import { getDb } from '@/lib/db'
import { HOLDING_COMPANIES } from '@/lib/properties'
import Link from 'next/link'
import { PageRefresher } from '@/components/ui/PageRefresher'

export default async function PropertiesPage() {
  const db = getDb()

  const properties = db.prepare(`
    SELECT p.*, h.name as company_name
    FROM properties p
    JOIN holding_companies h ON p.holding_company_id = h.id
    ORDER BY p.holding_company_id, p.address
  `).all() as Record<string, unknown>[]

  const loanSummary = db.prepare(`
    SELECT holding_company_id,
      COUNT(*) as loan_count,
      SUM(monthly_payment) as total_monthly,
      SUM(outstanding_balance) as total_balance
    FROM loans WHERE status = 'active'
    GROUP BY holding_company_id
  `).all() as Record<string, unknown>[]

  const insuranceSummary = db.prepare(`
    SELECT holding_company_id,
      COUNT(*) as policy_count
    FROM insurance_policies WHERE status = 'active'
    GROUP BY holding_company_id
  `).all() as Record<string, unknown>[]

  const propertyLoans = db.prepare(`
    SELECT property_id,
      COUNT(*) as loan_count,
      SUM(monthly_payment) as total_monthly
    FROM loans WHERE status = 'active' AND property_id IS NOT NULL
    GROUP BY property_id
  `).all() as Record<string, unknown>[]

  const alerts = db.prepare(`
    SELECT COUNT(*) as count FROM loans
    WHERE status = 'active' AND maturity_date IS NOT NULL
    AND maturity_date <= date('now', '+90 days')
  `).get() as { count: number }

  const insuranceAlerts = db.prepare(`
    SELECT COUNT(*) as count FROM insurance_policies
    WHERE status = 'active' AND expiration_date IS NOT NULL
    AND expiration_date <= date('now', '+60 days')
  `).get() as { count: number }

  const totalAlerts = alerts.count + insuranceAlerts.count

  const totalValue = properties.reduce((sum, p) => sum + (Number(p.estimated_value) || 0), 0)
  const totalMonthly = loanSummary.reduce((sum, l) => sum + (Number(l.total_monthly) || 0), 0)
  const totalBalance = loanSummary.reduce((sum, l) => sum + (Number(l.total_balance) || 0), 0)

  const loansByCompany = Object.fromEntries(loanSummary.map(l => [l.holding_company_id, l]))
  const insuranceByCompany = Object.fromEntries(insuranceSummary.map(i => [i.holding_company_id, i]))
  const loansByProperty = Object.fromEntries(propertyLoans.map(l => [l.property_id, l]))

  const grouped = HOLDING_COMPANIES.map(hc => ({
    ...hc,
    properties: properties.filter(p => p.holding_company_id === hc.id),
    loanInfo: loansByCompany[hc.id] as Record<string, unknown> | undefined,
    insuranceInfo: insuranceByCompany[hc.id] as Record<string, unknown> | undefined,
  }))

  const TYPE_LABELS: Record<string, string> = {
    'commercial': 'Commercial',
    'single-family': 'Single-family',
    'multi-family': 'Multi-family',
    'vacant-lot': 'Vacant Lot',
    'short-term-rental': 'STR',
    'mid-term-rental': 'MTR',
  }

  const STATUS_COLORS: Record<string, string> = {
    active: 'var(--green)',
    sold: 'var(--text-muted)',
    vacant: 'var(--yellow)',
    'in-progress': 'var(--blue)',
    flip: 'var(--orange)',
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1400 }}>
      <PageRefresher />

      <div style={{ marginBottom: 24 }}>
        <div className="label" style={{ marginBottom: 4 }}>Mission Control</div>
        <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.5px' }}>Property Portfolio</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 6 }}>
          All properties across {HOLDING_COMPANIES.length} holding companies.
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 28 }}>
        {[
          { label: 'Total Properties', value: properties.filter(p => p.status !== 'sold').length.toString(), color: 'var(--blue)' },
          { label: 'Est. Portfolio Value', value: `$${(totalValue / 1_000_000).toFixed(1)}M`, color: 'var(--green)' },
          { label: 'Monthly Obligations', value: `$${totalMonthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: 'var(--yellow)' },
          {
            label: 'Alerts',
            value: totalAlerts.toString(),
            color: totalAlerts > 0 ? 'var(--red)' : 'var(--text-muted)',
          },
        ].map((card, i) => (
          <div key={i} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-faint)',
            borderTop: `2px solid ${card.color}`, borderRadius: 6, padding: '14px 16px',
          }}>
            <div className="label" style={{ marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'monospace', color: card.color }}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Total Debt Summary */}
      {totalBalance > 0 && (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-faint)',
          borderRadius: 6, padding: '12px 16px', marginBottom: 20,
          display: 'flex', gap: 24, alignItems: 'center',
        }}>
          <div>
            <div className="label" style={{ marginBottom: 4 }}>Total Outstanding Debt</div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'monospace', color: 'var(--red)' }}>
              ${totalBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </div>
          <div style={{ height: 30, width: 1, background: 'var(--border-subtle)' }} />
          <div>
            <div className="label" style={{ marginBottom: 4 }}>Active Loans</div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
              {loanSummary.reduce((sum, l) => sum + (Number(l.loan_count) || 0), 0)}
            </div>
          </div>
          <div style={{ height: 30, width: 1, background: 'var(--border-subtle)' }} />
          <div>
            <div className="label" style={{ marginBottom: 4 }}>Insurance Policies</div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
              {insuranceSummary.reduce((sum, i) => sum + (Number(i.policy_count) || 0), 0)}
            </div>
          </div>
        </div>
      )}

      {/* Holdings grouped by LLC */}
      {grouped.map(group => {
        const activeProps = group.properties.filter(p => p.status !== 'sold')
        const groupValue = group.properties.reduce((s, p) => s + (Number(p.estimated_value) || 0), 0)

        return (
          <div key={group.id} style={{ marginBottom: 28 }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 12, paddingBottom: 8,
              borderBottom: `2px solid ${group.color}30`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', background: group.color,
                }} />
                <span style={{ fontSize: 16, fontWeight: 600 }}>{group.name}</span>
                <span style={{
                  fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)',
                  padding: '2px 6px', background: 'var(--bg-elevated)', borderRadius: 3,
                }}>
                  {group.abbr}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                  {activeProps.length} properties
                </span>
                {groupValue > 0 && (
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: group.color }}>
                    ${(groupValue / 1_000_000).toFixed(1)}M
                  </span>
                )}
                {group.loanInfo && (
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                    ${Number(group.loanInfo.total_monthly || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo
                  </span>
                )}
              </div>
            </div>

            {group.properties.length === 0 ? (
              <div style={{
                padding: '16px', textAlign: 'center', color: 'var(--text-muted)',
                fontSize: 12, border: '1px dashed var(--border-faint)', borderRadius: 5,
              }}>
                No properties loaded yet. Run the seed script or add via API.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {group.properties.map(prop => {
                  const propLoans = loansByProperty[prop.id as string] as Record<string, unknown> | undefined
                  return (
                    <Link
                      key={prop.id as string}
                      href={`/properties/${prop.id}`}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        background: 'var(--bg-card)', border: '1px solid var(--border-faint)',
                        borderLeft: `3px solid ${STATUS_COLORS[prop.status as string] || 'var(--border-default)'}`,
                        borderRadius: 5, padding: '10px 14px',
                        textDecoration: 'none', transition: 'border-color 0.15s',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                          {prop.address as string}
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                          {(prop.property_type as string) && (
                            <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                              {TYPE_LABELS[prop.property_type as string] || prop.property_type as string}
                            </span>
                          )}
                          {(prop.notes as string) && (
                            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                              {prop.notes as string}
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexShrink: 0 }}>
                        {Number(prop.estimated_value) > 0 && (
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary)' }}>
                              ${Number(prop.estimated_value).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </div>
                            <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                              EST VALUE
                            </div>
                          </div>
                        )}
                        {propLoans && Number(propLoans.total_monthly) > 0 && (
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 600, color: 'var(--yellow)' }}>
                              ${Number(propLoans.total_monthly).toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo
                            </div>
                            <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                              {propLoans.loan_count as number} LOAN{Number(propLoans.loan_count) !== 1 ? 'S' : ''}
                            </div>
                          </div>
                        )}
                        <span style={{
                          fontSize: 9, fontFamily: 'monospace', textTransform: 'uppercase',
                          letterSpacing: '0.06em', padding: '2px 6px', borderRadius: 3,
                          color: STATUS_COLORS[prop.status as string] || 'var(--text-muted)',
                          background: `color-mix(in srgb, ${STATUS_COLORS[prop.status as string] || 'var(--text-muted)'} 15%, transparent)`,
                          border: `1px solid color-mix(in srgb, ${STATUS_COLORS[prop.status as string] || 'var(--text-muted)'} 30%, transparent)`,
                        }}>
                          {prop.status as string}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
