/**
 * BMH Deal Detail — /bmh/deals/:id
 * Entity: Buy My House Boise
 * Author: Kai (Developer Agent) | 2026-04-23
 *
 * Full property record view. Shows all deal fields, signal tags with source labels,
 * outreach history, and the StageControl component for pipeline advancement.
 * Stages 8-10 are Clint Robertson's domain — advance button is disabled there.
 */

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { StageControl } from '@/components/bmh/StageControl'

// Full deal shape returned from /api/bmh/deals/:id
interface BmhDeal {
  id: string
  address: string
  city: string
  state: string
  zip: string | null
  price: number | null
  dom: number | null
  property_type: string | null
  bedrooms: number | null
  bathrooms: number | null
  sqft: number | null
  mss: number | null
  priority: 'A' | 'B' | 'C'
  pipeline_stage: number
  last_stage_advance_at: string | null
  signals: Array<{ label: string; tier: number; source: string }>
  outreach_history: Array<{ date: string; method: string; outcome: string; agent?: string }>
  skip_traced: number
  data_source: string | null
  source_label: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// Priority display colors — Ada spec
const PRIORITY_COLOR: Record<string, string> = {
  A: 'var(--bmh-priority-a)',
  B: 'var(--bmh-priority-b)',
  C: 'var(--bmh-priority-c)',
}

// Signal tier pill background colors — Ada spec
const SIGNAL_TIER_BG: Record<number, string> = {
  1: '#EF4444',  // Tier 1: red — urgent/high-value signal
  2: '#F59E0B',  // Tier 2: amber — moderate signal
  3: '#6B7280',  // Tier 3: gray — monitoring signal
}

async function fetchDeal(id: string, token: string): Promise<BmhDeal | null> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3333'}/api/bmh/deals/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (res.status === 404) return null
  if (!res.ok) return null
  return res.json() as Promise<BmhDeal>
}

export default async function DealDetailPage({ params }: { params: { id: string } }) {
  const token = process.env.NEXT_PUBLIC_GATEWAY_TOKEN || ''
  const deal = await fetchDeal(params.id, token)

  // 404 if deal not found
  if (!deal) notFound()

  return (
    <div style={{ padding: '28px 32px', maxWidth: 900, minHeight: '100%' }}>

      {/* ── Breadcrumb ────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 'var(--sp-4)', fontSize: 12, color: 'var(--text-muted)' }}>
        <Link href="/bmh" style={{ color: 'var(--bmh-accent)', textDecoration: 'none' }}>BMH Dashboard</Link>
        {' → '}
        <span>Deal Detail</span>
      </div>

      {/* ── Property Header ───────────────────────────────────────────────── */}
      <div style={{ marginBottom: 'var(--sp-6)' }}>
        {/* Address — Geist Mono, large, per Ada spec */}
        <h1 style={{
          fontFamily: 'var(--font-geist-mono)',
          fontSize: 24, fontWeight: 600,
          color: 'var(--text-primary)', marginBottom: 8,
        }}>
          {deal.address}
        </h1>
        <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
          {deal.city}, {deal.state} {deal.zip || ''}
        </div>

        {/* Priority badge + MSS badge */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{
            background: PRIORITY_COLOR[deal.priority] + '22',
            color: PRIORITY_COLOR[deal.priority],
            fontSize: 11, fontWeight: 700,
            padding: '3px 10px', borderRadius: 4,
            letterSpacing: '0.06em',
          }}>
            PRIORITY {deal.priority}
          </span>
          {deal.mss !== null && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 36, height: 36, borderRadius: '50%',
              background: 'var(--bmh-priority-a)',
              fontFamily: 'var(--font-geist-mono)', fontSize: 14, fontWeight: 700,
              color: '#fff',
            }}
              title={`Motivated Seller Score: ${deal.mss}/13`}
            >
              {deal.mss}
            </span>
          )}
          {deal.skip_traced === 1 && (
            <span style={{
              background: 'rgba(34,197,94,0.15)', color: '#22C55E',
              fontSize: 11, padding: '3px 8px', borderRadius: 4,
            }}>
              Skip Traced
            </span>
          )}
        </div>
      </div>

      {/* ── Property Details Grid ─────────────────────────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 'var(--sp-4)', marginBottom: 'var(--sp-6)',
      }}>
        {[
          { label: 'List Price',    value: deal.price    ? `$${deal.price.toLocaleString()}` : '—' },
          { label: 'Days on Market', value: deal.dom?.toString() ?? '—' },
          { label: 'Property Type', value: deal.property_type ?? '—' },
          { label: 'Bedrooms',      value: deal.bedrooms?.toString() ?? '—' },
          { label: 'Bathrooms',     value: deal.bathrooms?.toString() ?? '—' },
          { label: 'Sq Ft',         value: deal.sqft?.toLocaleString() ?? '—' },
        ].map(field => (
          <div key={field.label} style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-faint)',
            borderRadius: 6, padding: 'var(--sp-4)',
          }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              {field.label}
            </div>
            <div style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: 16, fontWeight: 600, color: 'var(--text-primary)',
            }}>
              {field.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Signal Tags ───────────────────────────────────────────────────── */}
      {deal.signals.length > 0 && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-faint)',
          borderRadius: 8, padding: 'var(--sp-5)',
          marginBottom: 'var(--sp-6)',
        }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--sp-4)' }}>
            Motivated Seller Signals
          </h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {deal.signals.map((sig, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Signal pill — tier color background, source shown below per Ada spec */}
                <span style={{
                  background: SIGNAL_TIER_BG[sig.tier] || '#6B7280',
                  color: '#fff',
                  fontSize: 12, fontWeight: 500,
                  padding: '4px 10px', borderRadius: 4,
                }}>
                  {sig.label}
                </span>
                {/* Source label shown inline below pill — preferred over tooltip per Ada spec */}
                <span style={{ fontSize: 10, color: 'var(--text-muted)', paddingLeft: 2 }}>
                  {sig.source}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Pipeline Stage Control ────────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-faint)',
        borderRadius: 8, padding: 'var(--sp-5)',
        marginBottom: 'var(--sp-6)',
      }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--sp-4)' }}>
          Pipeline Stage
        </h3>
        {/* StageControl is a client component — handles confirm dialog and PUT call */}
        <StageControl
          dealId={deal.id}
          currentStage={deal.pipeline_stage}
          token={process.env.NEXT_PUBLIC_GATEWAY_TOKEN}
        />
        {deal.last_stage_advance_at && (
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
            Last advanced: <span style={{ fontFamily: 'var(--font-geist-mono)' }}>{deal.last_stage_advance_at}</span>
          </div>
        )}
      </div>

      {/* ── Outreach History ──────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-faint)',
        borderRadius: 8, padding: 'var(--sp-5)',
        marginBottom: 'var(--sp-6)',
      }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--sp-4)' }}>
          Outreach History
        </h3>
        {deal.outreach_history.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No outreach recorded yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {deal.outreach_history.map((event, i) => (
              <div key={i} style={{
                display: 'flex', gap: 12, alignItems: 'flex-start',
                padding: '8px 0',
                borderBottom: i < deal.outreach_history.length - 1 ? '1px solid var(--border-faint)' : 'none',
              }}>
                <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 12, color: 'var(--text-muted)', minWidth: 90 }}>
                  {event.date}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 60 }}>{event.method}</span>
                <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{event.outcome}</span>
                {event.agent && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{event.agent}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Notes ─────────────────────────────────────────────────────────── */}
      {deal.notes && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-faint)',
          borderRadius: 8, padding: 'var(--sp-5)',
          marginBottom: 'var(--sp-6)',
        }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Notes</h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{deal.notes}</p>
        </div>
      )}

      {/* ── Metadata ──────────────────────────────────────────────────────── */}
      <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 16 }}>
        <span>ID: <span style={{ fontFamily: 'var(--font-geist-mono)' }}>{deal.id}</span></span>
        <span>Source: {deal.source_label || deal.data_source || '—'}</span>
        <span>Added: <span style={{ fontFamily: 'var(--font-geist-mono)' }}>{deal.created_at}</span></span>
      </div>
    </div>
  )
}
