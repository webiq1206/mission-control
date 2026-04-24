export const dynamic = 'force-dynamic'

import React from 'react'
import { getDb } from '@/lib/db'
import { getHoldingCompany } from '@/lib/properties'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import Link from 'next/link'
import { currencyFormatter, percentageFormatter, dayFormatter, getOrdinal } from '@/lib/formatters'
import { DocumentIcon } from '@heroicons/react/24/outline'
// Note: this is a Server Component — no React hooks permitted here

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const db = getDb()

  const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(id) as Record<string, unknown> | undefined
  if (!property) notFound()

  const holdingCompany = getHoldingCompany(property.holding_company_id as string)
  const hcColor = holdingCompany?.color || 'var(--text-muted)'

  const loans = db.prepare(`
    SELECT * FROM loans
    WHERE property_id = ? AND status = 'active'
    ORDER BY due_day, lender
  `).all(id) as (Record<string, unknown> & { payment_status: string, last_payment_date: string | null; last_payment_amount: number | null })[]

  const companyLoans = db.prepare(`
    SELECT * FROM loans
    WHERE holding_company_id = ? AND property_id IS NULL AND status = 'active'
    AND (collateral_address LIKE ? OR collateral_address LIKE ? )
    ORDER BY due_day, lender
  `).all(
    property.holding_company_id,
    `%${(property.address as string).split(',')[0]}%`,
    `%${(property.address as string).split(' ').slice(0, 3).join(' ')}%`
  ) as (Record<string, unknown> & { payment_status: string, last_payment_date: string | null; last_payment_amount: number | null })[]

  const allLoans = [...loans, ...companyLoans]

  const insurance = db.prepare(`
    SELECT * FROM insurance_policies
    WHERE property_id = ? AND status = 'active'
    ORDER BY expiration_date
  `).all(id) as Record<string, unknown>[]

  const allInsurance = insurance

  const totalMonthlyDebt = allLoans.reduce((s, l) => s + (Number(l.monthly_payment) || 0), 0)
  const totalOutstanding = allLoans.reduce((s, l) => s + (Number(l.outstanding_balance || l.principal_amount) || 0), 0)
  const totalInsuranceCost = allInsurance.reduce((s, p) => {
    const amt = Number(p.premium_amount) || 0
    if (p.premium_frequency === 'annual') return s + amt / 12
    if (p.premium_frequency === 'semi-annual') return s + amt / 6
    return s + amt
  }, 0)

  const now = new Date()

  // Plain function — Server Component, hooks not permitted
  // dueDay null guard: all arithmetic is gated behind `if (dueDay !== null && typeof dueDay === 'number')`
  // Return type explicitly declared as ReactNode — allLoans contains Record<string,unknown> which causes inferred return to be unknown
  function getLoanPaymentStatusBadge(loan: typeof allLoans[number]): React.ReactNode {
    const dueDay = loan.due_day
    const lastPaymentDate = loan.last_payment_date ? new Date(loan.last_payment_date) : null
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    if (lastPaymentDate && lastPaymentDate.getMonth() === currentMonth && lastPaymentDate.getFullYear() === currentYear) {
      return (
        <span
          style={{
            fontSize: 9, fontFamily: 'monospace', textTransform: 'uppercase',
            padding: '2px 6px', borderRadius: 3, fontWeight: 600,
            color: 'var(--blue)', background: 'rgba(59,130,246,0.1)',
          }}
        >
          Paid
        </span>
      )
    }

    if (loan.payment_status === 'past_due') {
      return (
        <span
          style={{
            fontSize: 9, fontFamily: 'monospace', textTransform: 'uppercase',
            padding: '2px 6px', borderRadius: 3, fontWeight: 600,
            color: 'var(--red)', background: 'rgba(224,82,82,0.1)',
          }}
        >
          Past Due
        </span>
      )
    }

    // Guard: ensure dueDay is a valid number before any arithmetic
    if (dueDay !== null && dueDay !== undefined && typeof Number(dueDay) === 'number' && !isNaN(Number(dueDay))) {
      const dueDayNum = Number(dueDay)
      const today = now.getDate()
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
      let daysUntilDue = 0
      if (dueDayNum > today) {
        daysUntilDue = dueDayNum - today
      } else {
        // If due day is in the past this month, calculate days until next month's due day
        daysUntilDue = (daysInMonth - today) + dueDayNum
      }
      
      if (daysUntilDue <= 5 && daysUntilDue >= 0) {
        return (
          <span
            style={{
              fontSize: 9, fontFamily: 'monospace', textTransform: 'uppercase',
              padding: '2px 6px', borderRadius: 3, fontWeight: 600,
              color: 'var(--yellow)', background: 'rgba(229,185,60,0.1)',
            }}
          >
            Due Soon ({daysUntilDue}d)
          </span>
        )
      }
    }

    return (
      <span
        style={{
          fontSize: 9, fontFamily: 'monospace', textTransform: 'uppercase',
          padding: '2px 6px', borderRadius: 3, fontWeight: 600,
          color: 'var(--green)', background: 'rgba(45,212,160,0.1)',
        }}
      >
        Current
      </span>
    )
  }

  function daysUntil(dateStr: string | null): number | null {
    if (!dateStr) return null
    return Math.ceil((new Date(dateStr).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  }

  function formatDate(dateStr: unknown): string {
    if (!dateStr) return '—'
    try { return format(new Date(dateStr as string), 'MMM d, yyyy') }
    catch { return dateStr as string }
  }

  function formatRate(rate: unknown): string {
    if (!rate) return '—'
    const n = Number(rate)
    return n < 1 ? `${(n * 100).toFixed(2)}%` : `${n.toFixed(2)}%`
  }

  function formatMoney(val: unknown): string {
    if (!val && val !== 0) return '—'
    return `$${Number(val).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
  }

  const TYPE_LABELS: Record<string, string> = {
    'commercial': 'Commercial', 'single-family': 'Single-family',
    'multi-family': 'Multi-family', 'vacant-lot': 'Vacant Lot',
    'short-term-rental': 'STR', 'mid-term-rental': 'MTR',
  }

  const LOAN_TYPE_LABELS: Record<string, string> = {
    'mortgage': 'Mortgage', 'deed-of-trust': 'Deed of Trust',
    'private-money': 'Private Money', 'sba': 'SBA',
    'line-of-credit': 'LOC', 'title-loan': 'Title Loan',
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1400 }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 6, alignItems: 'center' }}>
        <Link href="/properties" style={{
          fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none',
          fontFamily: 'monospace',
        }}>
          Properties
        </Link>
        <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>/</span>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
          {property.address as string}
        </span>
      </div>

      {/* Property Header */}
      <div style={{
        marginBottom: 28, paddingBottom: 20,
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: hcColor, flexShrink: 0 }} />
            <span className="label">{(holdingCompany?.abbr || property.holding_company_id) as string}</span>
            <span style={{
              fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
              padding: '2px 6px', borderRadius: 3,
              background: `${hcColor}15`, color: hcColor,
              border: `1px solid ${hcColor}30`,
            }}>
              {property.status as string}
            </span>
            {(property.property_type as string) && (
              <span style={{
                fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
                padding: '2px 6px', borderRadius: 3,
                background: 'var(--bg-elevated)', color: 'var(--text-muted)',
              }}>
                {TYPE_LABELS[property.property_type as string] || property.property_type as string}
              </span>
            )}
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.5px', marginBottom: 6 }}>{property.address as string}</h1>
          {(property.notes as string) && (
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{property.notes as string}</p>
          )}
        </div>
        <Link href="/properties" style={{
          padding: '7px 14px', borderRadius: 5, fontSize: 12,
          border: '1px solid var(--border-default)', background: 'var(--bg-elevated)',
          color: 'var(--text-primary)', textDecoration: 'none', fontFamily: 'monospace',
        }}>
          Back to Portfolio
        </Link>
      </div>

      {/* Property Details Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'Est. Value', value: formatMoney(property.estimated_value), color: 'var(--green)' },
          { label: 'Sq. Ft.', value: property.sq_ft ? Number(property.sq_ft).toLocaleString() : '—', color: 'var(--text-primary)' },
          { label: 'Beds / Baths', value: `${property.bedrooms ?? '—'} / ${property.bathrooms ?? '—'}`, color: 'var(--text-primary)' },
          { label: 'Year Built', value: property.year_built ? String(property.year_built) : '—', color: 'var(--text-primary)' },
          { label: 'Holding Company', value: holdingCompany?.name || '—', color: hcColor },
          { label: 'LLC', value: holdingCompany?.abbr || '—', color: hcColor },
        ].map((item, i) => (
          <div key={i} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-faint)',
            borderRadius: 5, padding: '10px 12px',
          }}>
            <div className="label" style={{ marginBottom: 4 }}>{item.label}</div>
            <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'monospace', color: item.color }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* Financial Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 28 }}>
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-faint)',
          borderTop: '2px solid var(--red)', borderRadius: 6, padding: '14px 16px',
        }}>
          <div className="label" style={{ marginBottom: 8 }}>Total Debt</div>
          <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'monospace', color: 'var(--red)' }}>
            {formatMoney(totalOutstanding)}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
            {allLoans.length} active loan{allLoans.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-faint)',
          borderTop: '2px solid var(--yellow)', borderRadius: 6, padding: '14px 16px',
        }}>
          <div className="label" style={{ marginBottom: 8 }}>Monthly Obligations</div>
          <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'monospace', color: 'var(--yellow)' }}>
            {formatMoney(totalMonthlyDebt)}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
            Loan payments only
          </div>
        </div>
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-faint)',
          borderTop: '2px solid var(--blue)', borderRadius: 6, padding: '14px 16px',
        }}>
          <div className="label" style={{ marginBottom: 8 }}>Insurance Cost (Mo.)</div>
          <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'monospace', color: 'var(--blue)' }}>
            {totalInsuranceCost > 0 ? formatMoney(totalInsuranceCost) : '—'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
            {allInsurance.length} active polic{allInsurance.length !== 1 ? 'ies' : 'y'}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {(() => {
        const alertItems: { text: string; severity: string; date: string }[] = []
        for (const loan of allLoans) {
          const d = daysUntil(loan.maturity_date as string | null)
          if (d !== null && d <= 90) {
            alertItems.push({
              text: d <= 0
                ? `MATURED: ${loan.lender} loan matured ${formatDate(loan.maturity_date)}`
                : `${loan.lender} loan matures in ${d} days (${formatDate(loan.maturity_date)})`,
              severity: d <= 0 ? 'critical' : d <= 30 ? 'critical' : 'warning',
              date: loan.maturity_date as string,
            })
          }
        }
        for (const pol of allInsurance) {
          const d = daysUntil(pol.expiration_date as string | null)
          if (d !== null && d <= 60) {
            alertItems.push({
              text: d <= 0
                ? `EXPIRED: ${pol.provider} ${pol.coverage_type} policy expired ${formatDate(pol.expiration_date)}`
                : `${pol.provider} ${pol.coverage_type} expires in ${d} days (${formatDate(pol.expiration_date)})`,
              severity: d <= 0 ? 'critical' : d <= 14 ? 'critical' : 'warning',
              date: pol.expiration_date as string,
            })
          }
        }

        if (alertItems.length === 0) return null

        return (
          <div style={{ marginBottom: 28 }}>
            <div className="label" style={{ marginBottom: 10, color: 'var(--red)' }}>
              Needs Attention — {alertItems.length} alert{alertItems.length !== 1 ? 's' : ''}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {alertItems.map((alert, i) => (
                <div key={i} style={{
                  background: alert.severity === 'critical' ? 'rgba(224,82,82,0.06)' : 'rgba(229,185,60,0.06)',
                  border: `1px solid ${alert.severity === 'critical' ? 'rgba(224,82,82,0.2)' : 'rgba(229,185,60,0.2)'}`,
                  borderLeft: `3px solid ${alert.severity === 'critical' ? 'var(--red)' : 'var(--yellow)'}`,
                  borderRadius: 5, padding: '8px 12px',
                  fontSize: 12, color: alert.severity === 'critical' ? 'var(--red)' : 'var(--yellow)',
                }}>
                  {alert.text}
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Loans Table */}
      <div style={{ marginBottom: 28 }}>
        <div className="label" style={{ marginBottom: 10 }}>
          Loans &amp; Notes — {allLoans.length} active
        </div>
        {allLoans.length === 0 ? (
          <div style={{
            padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12,
            border: '1px dashed var(--border-faint)', borderRadius: 6,
          }}>
            No loans tied to this property yet.
          </div>
        ) : (
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-faint)',
            borderRadius: 6, overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {['Lender', 'Type', 'Principal', 'Balance', 'Rate', 'Monthly', 'Due Day', 'Status', 'Last Payment', 'Maturity', 'Documents'].map(h => (
                    <th key={h} style={{
                      padding: '8px 10px', textAlign: 'left', fontFamily: 'monospace',
                      fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase',
                      color: 'var(--text-muted)', fontWeight: 600,
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allLoans.map((loan, i) => {
                  const d = daysUntil(loan.maturity_date as string | null)
                  const maturityWarning = d !== null && d <= 90
                  const lastPaymentDate = loan.last_payment_date ? format(new Date(loan.last_payment_date), 'MMM d, yyyy') : '—'

                  return (
                    <tr key={loan.id as string} style={{
                      borderBottom: i < allLoans.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    }}>
                      <td style={{ padding: '8px 10px', fontWeight: 500 }}>{loan.lender as string}</td>
                      <td style={{ padding: '8px 10px', color: 'var(--text-secondary)' }}>
                        {LOAN_TYPE_LABELS[loan.loan_type as string] || (loan.loan_type as string) || '—'}
                      </td>
                      <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>
                        {/* Cast unknown DB fields to number before formatting — SQL schema guarantees numeric type */}
                        {currencyFormatter.format(Number(loan.principal_amount) || 0)}
                      </td>
                      <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: 600 }}>
                        {currencyFormatter.format(Number(loan.outstanding_balance) || Number(loan.principal_amount) || 0)}
                      </td>
                      <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>
                        {percentageFormatter.format(Number(loan.interest_rate) || 0)}
                      </td>
                      <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: 'var(--yellow)', fontWeight: 600 }}>
                        {currencyFormatter.format(Number(loan.monthly_payment) || 0)}
                      </td>
                      <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>
                        {/* Null guard: due_day may be null if not set on this loan */}
                        {loan.due_day != null ? `${dayFormatter.format(Number(loan.due_day))} ${getOrdinal(Number(loan.due_day))}` : '—'}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        {getLoanPaymentStatusBadge(loan)}
                      </td>
                      <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                        {lastPaymentDate}
                        {loan.last_payment_amount ? ` (${currencyFormatter.format(loan.last_payment_amount)})` : ''}
                      </td>
                      <td style={{
                        padding: '8px 10px', fontFamily: 'monospace',
                        color: maturityWarning ? 'var(--red)' : 'var(--text-secondary)',
                        fontWeight: maturityWarning ? 600 : 400,
                      }}>
                        {formatDate(loan.maturity_date)}
                        {d !== null && d <= 90 && d > 0 && (
                          <span style={{ fontSize: 9, marginLeft: 4 }}>({d}d)</span>
                        )}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        {/* Explicit string cast: drive_doc_url is unknown from DB record, narrowed to string for href */}
                        {typeof loan.drive_doc_url === 'string' && loan.drive_doc_url ? (
                          <a href={loan.drive_doc_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue)' }}>
                            <DocumentIcon className="w-4 h-4" />
                          </a>
                        ) : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Insurance Table */}
      <div style={{ marginBottom: 28 }}>
        <div className="label" style={{ marginBottom: 10 }}>
          Insurance Policies — {allInsurance.length} active
        </div>
        {allInsurance.length === 0 ? (
          <div style={{
            padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12,
            border: '1px dashed var(--border-faint)', borderRadius: 6,
          }}>
            No insurance policies linked to this property yet. Nora will sync from Google Drive.
          </div>
        ) : (
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-faint)',
            borderRadius: 6, overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {['Coverage', 'Provider', 'Policy #', 'Premium', 'Frequency', 'Effective', 'Expires', 'Status'].map(h => (
                    <th key={h} style={{
                      padding: '8px 10px', textAlign: 'left', fontFamily: 'monospace',
                      fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase',
                      color: 'var(--text-muted)', fontWeight: 600,
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allInsurance.map((pol, i) => {
                  const d = daysUntil(pol.expiration_date as string | null)
                  const expiryWarning = d !== null && d <= 60
                  return (
                    <tr key={pol.id as string} style={{
                      borderBottom: i < allInsurance.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    }}>
                      <td style={{ padding: '8px 10px', fontWeight: 500, textTransform: 'capitalize' }}>
                        {(pol.coverage_type as string) || '—'}
                      </td>
                      <td style={{ padding: '8px 10px' }}>{(pol.provider as string) || '—'}</td>
                      <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                        {(pol.policy_number as string) || '—'}
                      </td>
                      <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: 600 }}>
                        {formatMoney(pol.premium_amount)}
                      </td>
                      <td style={{ padding: '8px 10px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                        {(pol.premium_frequency as string) || '—'}
                      </td>
                      <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>
                        {formatDate(pol.effective_date)}
                      </td>
                      <td style={{
                        padding: '8px 10px', fontFamily: 'monospace',
                        color: expiryWarning ? 'var(--red)' : 'var(--text-secondary)',
                        fontWeight: expiryWarning ? 600 : 400,
                      }}>
                        {formatDate(pol.expiration_date)}
                        {d !== null && d <= 60 && d > 0 && (
                          <span style={{ fontSize: 9, marginLeft: 4 }}>({d}d)</span>
                        )}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{
                          fontSize: 9, fontFamily: 'monospace', textTransform: 'uppercase',
                          padding: '2px 6px', borderRadius: 3,
                          color: pol.status === 'active' ? 'var(--green)' : 'var(--red)',
                          background: pol.status === 'active' ? 'rgba(45,212,160,0.1)' : 'rgba(224,82,82,0.1)',
                        }}>
                          {pol.status as string}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Documents / Drive Links */}
      {(() => {
        const docs: { label: string; url: string }[] = []
        if (property.drive_folder_url) docs.push({ label: 'Property Folder (Drive)', url: property.drive_folder_url as string })
        for (const loan of allLoans) {
          if (loan.drive_doc_url) docs.push({ label: `Loan Doc: ${loan.lender}`, url: loan.drive_doc_url as string })
        }
        for (const pol of allInsurance) {
          if (pol.drive_doc_url) docs.push({ label: `Insurance: ${pol.provider} (${pol.coverage_type})`, url: pol.drive_doc_url as string })
        }
        if (docs.length === 0) return null

        return (
          <div style={{ marginBottom: 28 }}>
            <div className="label" style={{ marginBottom: 10 }}>Documents</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {docs.map((doc, i) => (
                <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer" style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border-faint)',
                  borderRadius: 5, padding: '8px 12px', textDecoration: 'none',
                  fontSize: 12, color: 'var(--blue)', display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span style={{ fontSize: 14 }}>&#128196;</span>
                  {doc.label}
                </a>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Additional Insured */}
      {(() => {
        let insured: string[] = []
        try {
          insured = JSON.parse((property.additional_insured as string) || '[]')
        } catch { /* ignore */ }
        if (insured.length === 0) return null

        return (
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Additional Insured</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {insured.map((name, i) => (
                <span key={i} style={{
                  fontSize: 11, fontFamily: 'monospace', padding: '4px 8px',
                  background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                  borderRadius: 4, color: 'var(--text-secondary)',
                }}>
                  {name}
                </span>
              ))}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
