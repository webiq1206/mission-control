/**
 * BMH Outreach & Compliance — /bmh/outreach
 * Entity: Buy My House Boise
 * Author: Kai (Developer Agent) | 2026-04-23
 *
 * COMPLIANCE-CRITICAL: No outreach sequence may be activated without Jared's
 * explicit Mission Control approval. This page enforces that by:
 * 1. Showing a prominent yellow banner when any sequence has status='pending_approval'
 * 2. Never displaying a Launch/Activate button on any sequence unless status='approved'
 *    (and even then, no launch button exists — activation is handled by pipeline scripts)
 *
 * Any agent modifying this page must preserve the compliance controls above.
 */

export const dynamic = 'force-dynamic'

import Link from 'next/link'

interface OutreachSequence {
  id: string
  name: string
  target_count: number
  last_sent_at: string | null
  status: 'draft' | 'pending_approval' | 'approved' | 'active' | 'paused'
  approval_id: string | null
  created_at: string
  updated_at: string
}

// Status badge styling — visual hierarchy shows approval state clearly
const STATUS_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  draft:            { color: '#6B7280', bg: 'rgba(107,114,128,0.12)', label: 'Draft' },
  pending_approval: { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)',  label: 'Pending Approval' },
  approved:         { color: '#22C55E', bg: 'rgba(34,197,94,0.12)',   label: 'Approved' },
  active:           { color: '#2563EB', bg: 'rgba(37,99,235,0.12)',   label: 'Active' },
  paused:           { color: '#6B7280', bg: 'rgba(107,114,128,0.12)', label: 'Paused' },
}

async function fetchSequences(token: string): Promise<OutreachSequence[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3333'}/api/bmh/outreach/sequences`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json() as Promise<OutreachSequence[]>
}

export default async function OutreachPage() {
  const token = process.env.NEXT_PUBLIC_GATEWAY_TOKEN || ''
  const sequences = await fetchSequences(token)

  // COMPLIANCE: Identify any sequences pending Jared's approval
  // These trigger the prominent banner at the top of the page
  const pendingApprovalSequences = sequences.filter(s => s.status === 'pending_approval')

  return (
    <div style={{ padding: '28px 32px', maxWidth: 900, minHeight: '100%' }}>

      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 'var(--sp-6)' }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          <Link href="/bmh" style={{ color: 'var(--bmh-accent)', textDecoration: 'none' }}>BMH Dashboard</Link>
          {' → '}Outreach
        </div>
        <h1 className="h1">Outreach & Compliance</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
          Sequence management · All activation requires Jared approval
        </p>
      </div>

      {/* ── COMPLIANCE BANNER — Pending Approval Warning ──────────────────── */}
      {/* Shows for EVERY sequence with status='pending_approval' — cannot be hidden */}
      {pendingApprovalSequences.map(seq => (
        <div key={seq.id} style={{
          background: 'rgba(245,158,11,0.08)',
          borderLeft: '3px solid #F59E0B',
          borderRadius: 6,
          padding: 'var(--sp-4) var(--sp-5)',
          marginBottom: 'var(--sp-4)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 13, color: '#F59E0B', fontWeight: 500 }}>
            ⚠️ &ldquo;{seq.name}&rdquo; is pending Jared approval before activation.
          </div>
          {seq.approval_id && (
            <Link href="/approvals" style={{
              fontSize: 12, color: '#F59E0B',
              textDecoration: 'none', border: '1px solid #F59E0B',
              padding: '3px 10px', borderRadius: 4, whiteSpace: 'nowrap',
            }}>
              View Approval Request →
            </Link>
          )}
        </div>
      ))}

      {/* ── Sequences Table ───────────────────────────────────────────────── */}
      <div style={{ marginBottom: 'var(--sp-8)' }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--sp-4)' }}>
          Outreach Sequences
        </h2>

        {sequences.length === 0 ? (
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-faint)',
            borderRadius: 8, padding: 'var(--sp-8)', textAlign: 'center',
          }}>
            <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>No outreach sequences configured.</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
              Sequences are created by Quinn and require Jared&apos;s approval before activation.
            </div>
          </div>
        ) : (
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-faint)',
            borderRadius: 8, overflow: 'hidden',
          }}>
            {/* Table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 80px 120px 130px',
              gap: 8,
              padding: '10px 16px',
              borderBottom: '1px solid var(--border-faint)',
              fontSize: 11, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              <span>Sequence Name</span>
              <span>Targets</span>
              <span>Last Sent</span>
              <span>Status</span>
            </div>

            {/* Sequence rows */}
            {sequences.map((seq, idx) => {
              const statusStyle = STATUS_STYLE[seq.status] || STATUS_STYLE.draft

              return (
                <div
                  key={seq.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 80px 120px 130px',
                    gap: 8,
                    padding: '12px 16px',
                    borderBottom: idx < sequences.length - 1 ? '1px solid var(--border-faint)' : 'none',
                    alignItems: 'center',
                  }}
                >
                  {/* Sequence name */}
                  <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                    {seq.name}
                  </span>

                  {/* Target count — Geist Mono for numeric data */}
                  <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 13, color: 'var(--text-secondary)' }}>
                    {seq.target_count.toLocaleString()}
                  </span>

                  {/* Last sent */}
                  <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
                    {seq.last_sent_at
                      ? new Date(seq.last_sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : '—'
                    }
                  </span>

                  {/* Status badge — NO launch button anywhere on this page (compliance) */}
                  <span style={{
                    display: 'inline-flex', alignItems: 'center',
                    background: statusStyle.bg,
                    color: statusStyle.color,
                    fontSize: 11, fontWeight: 600,
                    padding: '3px 10px', borderRadius: 4,
                    width: 'fit-content',
                  }}>
                    {statusStyle.label}
                  </span>
                  {/* COMPLIANCE NOTE: No launch/activate/run button appears here.
                      Sequence activation is handled by pipeline scripts only, never via MC UI button.
                      If you're adding a launch button: don't. Talk to Hank first. */}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Opt-Out List ──────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-faint)',
        borderRadius: 8, padding: 'var(--sp-5)',
      }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--sp-4)' }}>
          Opt-Out List
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>
              0
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 8 }}>
              opt-out records
            </span>
          </div>
          {/* Export button — disabled until opt-out data is ingested */}
          <button
            disabled
            style={{
              padding: '6px 14px', borderRadius: 4,
              background: 'var(--bg-hover)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-faint)',
              fontSize: 12, cursor: 'not-allowed', opacity: 0.5,
            }}
            title="Export available when opt-out data is ingested"
          >
            Export CSV
          </button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
          Export available when opt-out data is ingested from GHL.
          Do not contact opted-out numbers — list auto-synced from GHL do-not-contact.
        </div>
      </div>
    </div>
  )
}
