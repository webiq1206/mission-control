'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { PageRefresher } from '@/components/ui/PageRefresher'
import { format } from 'date-fns'
import { HoldingCompanyId, HOLDING_COMPANIES } from '@/lib/properties'
import { currencyFormatter, percentageFormatter, dayFormatter } from '@/lib/formatters'
import { ChevronUpDownIcon, PlusIcon, DocumentIcon, PencilIcon, TrashIcon, CircleStackIcon, CurrencyDollarIcon, CalendarDaysIcon, GlobeAltIcon, BanknotesIcon } from '@heroicons/react/24/outline'
import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { XMarkIcon } from '@heroicons/react/20/solid'

interface Loan {
  id: string;
  property_id: string | null;
  holding_company_id: HoldingCompanyId;
  lender: string;
  loan_type: string | null;
  payment_type: string | null;
  paid_from_account: string | null;
  collateral_address: string | null;
  payment_terms: string | null;
  principal_amount: number | null;
  outstanding_balance: number | null;
  interest_rate: number | null;
  monthly_payment: number | null;
  issue_date: string | null;
  first_payment_date: string | null;
  due_day: number | null;
  maturity_date: string | null;
  loan_term_years: number | null;
  drive_doc_url: string | null;
  notes: string | null;
  status: string;
  payment_status: 'current' | 'paid_this_month' | 'past_due';
  last_payment_date: string | null;
  last_payment_amount: number | null;
  created_at: string;
  updated_at: string;
  property_address?: string;
  company_name?: string;
}

interface Property {
  id: string;
  address: string;
  holding_company_id: HoldingCompanyId;
  company_name: string;
  hc_id: HoldingCompanyId;
}

interface Stats {
  totalMonthly: number;
  totalBalance: number;
  pastDueCount: number;
  dueSoonCount: number;
  totalCount: number;
}

interface LoansDashboardProps {
  initialLoans: Loan[];
  properties: Property[];
  holdingCompanies: typeof HOLDING_COMPANIES[number][];
  stats: Stats;
}

const LOAN_TYPE_OPTIONS = [
  { value: 'mortgage', label: 'Mortgage' },
  { value: 'deed-of-trust', label: 'Deed of Trust' },
  { value: 'private-money', label: 'Private Money' },
  { value: 'sba', label: 'SBA Loan' },
  { value: 'line-of-credit', label: 'Line of Credit' },
  { value: 'construction', label: 'Construction Loan' },
  { value: 'title-loan', label: 'Title Loan' },
  { value: 'other', label: 'Other' },
]

const PAYMENT_STATUS_OPTIONS = [
  { value: 'current', label: 'Current' },
  { value: 'paid_this_month', label: 'Paid This Month' },
  { value: 'past_due', label: 'Past Due' },
]

export function LoansDashboard({
  initialLoans,
  properties,
  holdingCompanies,
  stats,
}: LoansDashboardProps) {
  const [loans, setLoans] = useState<Loan[]>(initialLoans)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentLoan, setCurrentLoan] = useState<Partial<Loan> | null>(null)
  const [filterHoldingCompany, setFilterHoldingCompany] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | null>(null)

  const token = process.env.NEXT_PUBLIC_GATEWAY_TOKEN

  const filteredLoans = useMemo(() => {
    let filtered = loans
    if (filterHoldingCompany) {
      filtered = filtered.filter(loan => loan.holding_company_id === filterHoldingCompany)
    }
    if (filterStatus) {
      filtered = filtered.filter(loan => loan.payment_status === filterStatus)
    }
    return filtered
  }, [loans, filterHoldingCompany, filterStatus])

  const openModal = (loan?: Loan) => {
    setCurrentLoan(loan || { holding_company_id: holdingCompanies[0]?.id || '' })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setCurrentLoan(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentLoan || !currentLoan.lender || !currentLoan.holding_company_id) {
      toast.error('Lender and Holding Company are required')
      return
    }

    const isNew = !currentLoan.id
    const method = isNew ? 'POST' : 'PATCH'
    const url = isNew ? '/api/loans' : `/api/loans/${currentLoan.id}`

    const paymentDueDayInt = typeof currentLoan.due_day === 'string' ? parseInt(currentLoan.due_day, 10) : currentLoan.due_day

    const loanData = {
      ...currentLoan,
      due_day: isNaN(paymentDueDayInt as number) ? null : paymentDueDayInt,
      interest_rate: typeof currentLoan.interest_rate === 'string' ? parseFloat(currentLoan.interest_rate) : currentLoan.interest_rate,
      monthly_payment: typeof currentLoan.monthly_payment === 'string' ? parseFloat(currentLoan.monthly_payment) : currentLoan.monthly_payment,
      principal_amount: typeof currentLoan.principal_amount === 'string' ? parseFloat(currentLoan.principal_amount) : currentLoan.principal_amount,
      outstanding_balance: typeof currentLoan.outstanding_balance === 'string' ? parseFloat(currentLoan.outstanding_balance) : currentLoan.outstanding_balance,
      last_payment_amount: typeof currentLoan.last_payment_amount === 'string' ? parseFloat(currentLoan.last_payment_amount) : currentLoan.last_payment_amount,
    }

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(loanData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save loan')
      }

      const result = await response.json()
      if (isNew) {
        const newLoanWithDetails = {
          ...loanData as Loan,
          id: result.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          property_address: properties.find(p => p.id === loanData.property_id)?.address,
          company_name: holdingCompanies.find(h => h.id === loanData.holding_company_id)?.name,
        }
        setLoans(prev => [...prev, newLoanWithDetails])
        toast.success('Loan added successfully!')
      } else {
        setLoans(prev => prev.map(l => l.id === currentLoan.id ? { ...l, ...loanData as Omit<Loan, 'id'> } : l))
        toast.success('Loan updated successfully!')
      }
      closeModal()
    } catch (error: any) {
      toast.error(error.message || 'An unexpected error occurred')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this loan?')) return

    try {
      const response = await fetch(`/api/loans/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete loan')
      }

      setLoans(prev => prev.filter(loan => loan.id !== id))
      toast.success('Loan deleted successfully!')
    } catch (error: any) {
      toast.error(error.message || 'An unexpected error occurred')
    }
  }

  const getPaymentStatusBadge = useCallback((paymentStatus: Loan['payment_status']) => {
    let color = 'var(--text-muted)'
    let bgColor = 'var(--bg-elevated)'
    switch (paymentStatus) {
      case 'current':
        color = 'var(--green)'
        bgColor = 'rgba(45,212,160,0.1)'
        break
      case 'paid_this_month':
        color = 'var(--blue)'
        bgColor = 'rgba(59,130,246,0.1)'
        break
      case 'past_due':
        color = 'var(--red)'
        bgColor = 'rgba(224,82,82,0.1)'
        break
    }
    return (
      <span
        style={{
          fontSize: 9, fontFamily: 'monospace', textTransform: 'uppercase',
          padding: '2px 6px', borderRadius: 3, fontWeight: 600,
          color: color, background: bgColor,
        }}
      >
        {paymentStatus.replace(/_/g, ' ')}
      </span>
    )
  }, [])

  const getLoanAlertBadge = useCallback((loan: Loan) => {
    const now = new Date()
    const dueDay = loan.due_day
    const lastPaymentDate = loan.last_payment_date ? new Date(loan.last_payment_date) : null
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    // Check if paid this month
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

    // Check for past due
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

    // Check if due soon (within 5 days)
    if (dueDay !== null) {
      const today = now.getDate()
      const daysUntilDue = dueDay > today ? dueDay - today : dueDay + (new Date(currentYear, currentMonth + 1, 0).getDate() - today)
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

    return getPaymentStatusBadge(loan.payment_status)
  }, [getPaymentStatusBadge])

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1400 }}>
      <PageRefresher />

      <div style={{ marginBottom: 24 }}>
        <div className="label" style={{ marginBottom: 4 }}>Mission Control</div>
        <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.5px' }}>All Loans & Notes</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 6 }}>
          Centralized tracking for all debt obligations across the portfolio. Managed by Nora.
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 28 }}>
        {[
          { label: 'Total Loans', value: stats.totalCount.toString(), color: 'var(--blue)' },
          { label: 'Total Outstanding Debt', value: currencyFormatter.format(stats.totalBalance), color: 'var(--red)' },
          { label: 'Total Monthly Payments', value: currencyFormatter.format(stats.totalMonthly), color: 'var(--yellow)' },
          {
            label: 'Alerts',
            value: (stats.pastDueCount + stats.dueSoonCount).toString(),
            color: (stats.pastDueCount + stats.dueSoonCount) > 0 ? 'var(--red)' : 'var(--text-muted)',
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

      {/* Filters and Add Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <select
            value={filterHoldingCompany || ''}
            onChange={e => setFilterHoldingCompany(e.target.value || null)}
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border-faint)',
              borderRadius: 5, padding: '8px 12px', fontSize: 12, color: 'var(--text-primary)',
              appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
            }}>
            <option value="">All Holding Companies</option>
            {holdingCompanies.map(hc => (
              <option key={hc.id} value={hc.id}>{hc.name}</option>
            ))}
          </select>
          <select
            value={filterStatus || ''}
            onChange={e => setFilterStatus(e.target.value || null)}
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border-faint)',
              borderRadius: 5, padding: '8px 12px', fontSize: 12, color: 'var(--text-primary)',
              appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
            }}>
            <option value="">All Payment Statuses</option>
            {PAYMENT_STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => openModal()}
          style={{
            background: 'linear-gradient(135deg, var(--blue), color-mix(in srgb, var(--blue) 72%, black))',
            color: 'var(--text-on-color)', padding: '8px 16px', borderRadius: 6,
            fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, boxShadow: 'var(--shadow-lg)',
          }}>
          <PlusIcon className="w-4 h-4" /> Add New Loan
        </button>
      </div>

      {/* Loans Table */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-faint)',
        borderRadius: 6, overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {[ 'Lender', 'Property', 'Holding Co', 'Monthly Pmt', 'Due Day', 'Status', 'Last Payment', 'Maturity', 'Actions' ].map(h => (
                <th key={h} style={{
                  padding: '10px 12px', textAlign: 'left', fontFamily: 'monospace',
                  fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: 'var(--text-muted)', fontWeight: 600,
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredLoans.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                  No loans found matching your filters.
                </td>
              </tr>
            ) : (
              filteredLoans.map((loan) => (
                <tr key={loan.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 500 }}>{loan.lender}</td>
                  <td style={{ padding: '10px 12px' }}>
                    {loan.property_id ? (
                      <Link href={`/properties/${loan.property_id}`} style={{ color: 'var(--blue)', textDecoration: 'none' }}>
                        {loan.property_address || 'View Property'}
                      </Link>
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td style={{ padding: '10px 12px' }}>{loan.company_name || loan.holding_company_id}</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>{currencyFormatter.format(loan.monthly_payment || 0)} <span style={{fontSize: 9, color: 'var(--text-muted)'}}>{percentageFormatter.format(loan.interest_rate || 0)}</span></td>
                  {/* due_day is number|null — guard null before formatting */}
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>{loan.due_day != null ? dayFormatter.format(loan.due_day) : '—'}</td>
                  <td style={{ padding: '10px 12px' }}>{getLoanAlertBadge(loan)}</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                    {loan.last_payment_date ? format(new Date(loan.last_payment_date), 'MMM d, yyyy') : '—'}
                    {loan.last_payment_amount ? ` (${currencyFormatter.format(loan.last_payment_amount)})` : ''}
                  </td>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>{loan.maturity_date ? format(new Date(loan.maturity_date), 'MMM d, yyyy') : '—'}</td>
                  <td style={{ padding: '10px 12px', display: 'flex', gap: 4 }}>
                    <button onClick={() => openModal(loan)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0.5, color: 'var(--text-secondary)' }} title="Edit Loan">
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(loan.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0.5, color: 'var(--red)' }} title="Delete Loan">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                    {loan.drive_doc_url && (
                      <a href={loan.drive_doc_url} target="_blank" rel="noopener noreferrer" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0.5, color: 'var(--blue)' }} title="View Document">
                        <DocumentIcon className="w-4 h-4" />
                      </a>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Loan Add/Edit Modal */}
      <Transition appear show={isModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={closeModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/30" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel style={{
                  width: '100%', maxWidth: 600, transform: 'translateY(-20px)',
                  background: 'var(--bg-sidebar)', borderRadius: 12, padding: '24px',
                  textAlign: 'left', boxShadow: 'var(--shadow-xl)', transition: 'all 0.3s ease-out',
                  border: '1px solid var(--border-subtle)',
                }}>
                  <Dialog.Title
                    as="h3"
                    style={{
                      fontSize: 18, fontWeight: 600, lineHeight: 1.5,
                      color: 'var(--text-primary)', marginBottom: 20,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}
                  >
                    {currentLoan?.id ? 'Edit Loan' : 'Add New Loan'}
                    <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </Dialog.Title>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="holding_company_id" className="block text-xs font-medium text-gray-400 mb-1">Holding Company <span className="text-red-500">*</span></label>
                      <select
                        id="holding_company_id"
                        value={currentLoan?.holding_company_id || ''}
                        onChange={e => setCurrentLoan(prev => ({ ...prev, holding_company_id: e.target.value as HoldingCompanyId }))}
                        required
                        className="input-field"
                        style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)' }}
                      >
                        <option value="" disabled>Select Holding Company</option>
                        {holdingCompanies.map(hc => (
                          <option key={hc.id} value={hc.id}>{hc.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="property_id" className="block text-xs font-medium text-gray-400 mb-1">Property Address</label>
                      <select
                        id="property_id"
                        value={currentLoan?.property_id || ''}
                        onChange={e => setCurrentLoan(prev => ({ ...prev, property_id: e.target.value || null }))}
                        className="input-field"
                        style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)' }}
                      >
                        <option value="">None (Company-level loan)</option>
                        {properties
                          .filter(p => !currentLoan?.holding_company_id || p.holding_company_id === currentLoan.holding_company_id)
                          .map(p => (
                            <option key={p.id} value={p.id}>{p.address} ({p.company_name})</option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="lender" className="block text-xs font-medium text-gray-400 mb-1">Lender <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        id="lender"
                        value={currentLoan?.lender || ''}
                        onChange={e => setCurrentLoan(prev => ({ ...prev, lender: e.target.value }))}
                        required
                        className="input-field"
                        style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)' }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="loan_type" className="block text-xs font-medium text-gray-400 mb-1">Loan Type</label>
                        <select
                          id="loan_type"
                          value={currentLoan?.loan_type || ''}
                          onChange={e => setCurrentLoan(prev => ({ ...prev, loan_type: e.target.value || null }))}
                          className="input-field"
                          style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)' }}
                        >
                          <option value="">Select type</option>
                          {LOAN_TYPE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="payment_type" className="block text-xs font-medium text-gray-400 mb-1">Payment Type</label>
                        <input
                          type="text"
                          id="payment_type"
                          value={currentLoan?.payment_type || ''}
                          onChange={e => setCurrentLoan(prev => ({ ...prev, payment_type: e.target.value }))}
                          className="input-field"
                          style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)' }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="principal_amount" className="block text-xs font-medium text-gray-400 mb-1">Principal Amount</label>
                        <input
                          type="number"
                          id="principal_amount"
                          step="0.01"
                          value={currentLoan?.principal_amount || ''}
                          onChange={e => setCurrentLoan(prev => ({ ...prev, principal_amount: parseFloat(e.target.value) }))}
                          className="input-field"
                          style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)' }}
                        />
                      </div>
                      <div>
                        <label htmlFor="outstanding_balance" className="block text-xs font-medium text-gray-400 mb-1">Outstanding Balance</label>
                        <input
                          type="number"
                          id="outstanding_balance"
                          step="0.01"
                          value={currentLoan?.outstanding_balance || ''}
                          onChange={e => setCurrentLoan(prev => ({ ...prev, outstanding_balance: parseFloat(e.target.value) }))}
                          className="input-field"
                          style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)' }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label htmlFor="interest_rate" className="block text-xs font-medium text-gray-400 mb-1">Interest Rate (%)</label>
                        <input
                          type="number"
                          id="interest_rate"
                          step="0.001"
                          value={(currentLoan?.interest_rate ? currentLoan.interest_rate * 100 : '') as string}
                          onChange={e => setCurrentLoan(prev => ({ ...prev, interest_rate: parseFloat(e.target.value) / 100 }))}
                          className="input-field"
                          style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)' }}
                        />
                      </div>
                      <div>
                        <label htmlFor="monthly_payment" className="block text-xs font-medium text-gray-400 mb-1">Monthly Payment</label>
                        <input
                          type="number"
                          id="monthly_payment"
                          step="0.01"
                          value={currentLoan?.monthly_payment || ''}
                          onChange={e => setCurrentLoan(prev => ({ ...prev, monthly_payment: parseFloat(e.target.value) }))}
                          className="input-field"
                          style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)' }}
                        />
                      </div>
                      <div>
                        <label htmlFor="due_day" className="block text-xs font-medium text-gray-400 mb-1">Payment Due Day</label>
                        <input
                          type="number"
                          id="due_day"
                          min="1"
                          max="31"
                          value={currentLoan?.due_day || ''}
                          onChange={e => setCurrentLoan(prev => ({ ...prev, due_day: parseInt(e.target.value, 10) }))}
                          className="input-field"
                          style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)' }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="issue_date" className="block text-xs font-medium text-gray-400 mb-1">Issue Date</label>
                        <input
                          type="date"
                          id="issue_date"
                          value={currentLoan?.issue_date ? format(new Date(currentLoan.issue_date), 'yyyy-MM-dd') : ''}
                          onChange={e => setCurrentLoan(prev => ({ ...prev, issue_date: e.target.value || null }))}
                          className="input-field"
                          style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)' }}
                        />
                      </div>
                      <div>
                        <label htmlFor="maturity_date" className="block text-xs font-medium text-gray-400 mb-1">Maturity Date</label>
                        <input
                          type="date"
                          id="maturity_date"
                          value={currentLoan?.maturity_date ? format(new Date(currentLoan.maturity_date), 'yyyy-MM-dd') : ''}
                          onChange={e => setCurrentLoan(prev => ({ ...prev, maturity_date: e.target.value || null }))}
                          className="input-field"
                          style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="loan_term_years" className="block text-xs font-medium text-gray-400 mb-1">Loan Term (Years)</label>
                      <input
                        type="number"
                        id="loan_term_years"
                        step="1"
                        value={currentLoan?.loan_term_years || ''}
                        onChange={e => setCurrentLoan(prev => ({ ...prev, loan_term_years: parseFloat(e.target.value) }))}
                        className="input-field"
                        style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)' }}
                      />
                    </div>

                    <div>
                      <label htmlFor="drive_doc_url" className="block text-xs font-medium text-gray-400 mb-1">Drive Document URL</label>
                      <input
                        type="url"
                        id="drive_doc_url"
                        value={currentLoan?.drive_doc_url || ''}
                        onChange={e => setCurrentLoan(prev => ({ ...prev, drive_doc_url: e.target.value || null }))}
                        className="input-field"
                        style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)' }}
                      />
                    </div>

                    <div>
                      <label htmlFor="payment_status" className="block text-xs font-medium text-gray-400 mb-1">Payment Status</label>
                      <select
                        id="payment_status"
                        value={currentLoan?.payment_status || PAYMENT_STATUS_OPTIONS[0].value}
                        onChange={e => setCurrentLoan(prev => ({ ...prev, payment_status: e.target.value as Loan['payment_status'] }))}
                        className="input-field"
                        style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)' }}
                      >
                        {PAYMENT_STATUS_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="last_payment_date" className="block text-xs font-medium text-gray-400 mb-1">Last Payment Date</label>
                        <input
                          type="date"
                          id="last_payment_date"
                          value={currentLoan?.last_payment_date ? format(new Date(currentLoan.last_payment_date), 'yyyy-MM-dd') : ''}
                          onChange={e => setCurrentLoan(prev => ({ ...prev, last_payment_date: e.target.value || null }))}
                          className="input-field"
                          style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)' }}
                        />
                      </div>
                      <div>
                        <label htmlFor="last_payment_amount" className="block text-xs font-medium text-gray-400 mb-1">Last Payment Amount</label>
                        <input
                          type="number"
                          id="last_payment_amount"
                          step="0.01"
                          value={currentLoan?.last_payment_amount || ''}
                          onChange={e => setCurrentLoan(prev => ({ ...prev, last_payment_amount: parseFloat(e.target.value) }))}
                          className="input-field"
                          style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="notes" className="block text-xs font-medium text-gray-400 mb-1">Notes</label>
                      <textarea
                        id="notes"
                        rows={3}
                        value={currentLoan?.notes || ''}
                        onChange={e => setCurrentLoan(prev => ({ ...prev, notes: e.target.value || null }))}
                        className="input-field"
                        style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)' }}
                      />
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={closeModal}
                        style={{
                          padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 500,
                          background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
                          color: 'var(--text-secondary)', cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        style={{
                          padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                          background: 'var(--blue)', color: 'var(--text-on-color)', border: 'none',
                          cursor: 'pointer', boxShadow: 'var(--shadow-md)',
                        }}
                      >
                        Save Loan
                      </button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  )
}
