/**
 * BMH Deal Dashboard — /bmh
 * Entity: Buy My House Boise
 * Author: Kai (Developer Agent) | 2026-04-23
 *
 * Primary view for the BMH deal sourcing engine in Mission Control.
 * Shows: KPI bar (4 metrics), Priority A deals table, pipeline stage lane.
 * All data fetched server-side. No client state needed on this page.
 */

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { headers } from 'next/headers'

// KPI response shape from /api/bmh/dashboard/kpis
interface BmhKpis {
  total_deals: number
  priority_a_count: number
  pipeline_active_count: number
  deals_added_this_week: number
}

// Deal row shape for the Priority A table
interface BmhDeal {
  id: string
  address: string
  city: string
  state: string
  price: number | null
  dom: number | null
  property_type: string | null
  bedrooms: number | null
  bathrooms: number | null
  mss: number | null
  priority: 'A' | 'B' | 'C'
  pipeline_stage: number
  signals: Array<{ label: string; tier: number; source: string }>
  skip_traced: number
}

// Stage lane shape from /api/bmh/pipeline/stages
interface PipelineStage {
  stage_number: number
  label: string
  agent_owned: number
  count: number
}

async function fetchKpis(token: string): Promise<BmhKpis> {
  // Server-side fetch — base URL must be absolute for Next.js server components
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3333'}/api/bmh/dashboard/kpis`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) return { total_deals: 0, priority_a_count: 0, pipeline_active_count: 0, deals_added_this_week: 0 }
  return res.json() as Promise<BmhKpis>
}

async function fetchPriorityADeals(token: string): Promise<BmhDeal[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3333'}/api/bmh/deals?priority=A&sort=mss_desc&limit=10`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json() as Promise<BmhDeal[]>
}

async function fetchPipelineStages(token: string): Promise<PipelineStage[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3333'}/api/bmh/pipeline/stages`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json() as Promise<PipelineStage[]>
}

// Priority badge color lookup — matches Ada design spec
const PRIORITY_COLOR: Record<string, string> = {
  A: 'var(--bmh-priority-a)',
  B: 'var(--bmh-priority-b)',
  C: 'var(--bmh-priority-c)',
}

// Signal tier background colors — Ada spec
const SIGNAL_TIER_COLOR: Record<number, string> = {
  1: '#EF4444',
  2: '#F59E0B',
  3: '#6B7280',
}

export default async function BmhDashboardPage() {
  const token = process.env.NEXT_PUBLIC_GATEWAY_TOKEN || ''

  // Parallel fetch all three data sources
  const [kpis, priorityADeals, stages] = await Promise.all([
    fetchKpis(token),
    fetchPriorityADeals(token),
    fetchPipelineStages(token),
  ])

  // Split stages into agent domain (1-7) and Clint domain (8-10) for visual separation
  const agentStages = stages.filter(s => s.agent_owned === 1)
  const clintStages = stages.filter(s => s.agent_owned === 0)

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200, minHeight: '100%' }}>

      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 'var(--sp-6)' }}>
        <div className="label" style={{ marginBottom: 6 }}>
          <Link href="/entities/buy-my-house-boise" style={{ color: 'var(--bmh-accent)', textDecoration: 'none' }}>
            Buy My House Boise
          </Link>
        </div>
        <h1 className="h1">Deal Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
          Motivated seller pipeline · PropStream-sourced · MSS-ranked
        </p>
      </div>

      {/* ── KPI Bar ─────────────────────────────────────────────────────────── */}
      {/* 4 metric cards — stacks to 2×2 on mobile */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 'var(--sp-4)',
        marginBottom: 'var(--sp-8)',
      }}
        className="bmh-kpi-grid"
      >
        {[
          { label: 'Total Deals',        value: kpis.total_deals,           note: 'in system' },
          { label: 'Priority A',         value: kpis.priority_a_count,      note: 'urgent surface' },
          { label: 'Pipeline Active',    value: kpis.pipeline_active_count, note: 'stages 1–7' },
          { label: 'Added This Week',    value: kpis.deals_added_this_week, note: 'last 7 days' },
        ].map(kpi => (
          <div key={kpi.label} style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-faint)',
            borderRadius: 8,
            padding: 'var(--sp-5)',
          }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              {kpi.label}
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-geist-mono)', color: 'var(--text-primary)', lineHeight: 1 }}>
              {kpi.value}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              {kpi.note}
            </div>
          </div>
        ))}
      </div>

      {/* ── Pipeline Stage Lanes ─────────────────────────────────────────────── */}
      <div style={{ marginBottom: 'var(--sp-8)' }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--sp-4)' }}>
          Pipeline Stages
        </h2>

        {/* Agent domain stages (1-7) */}
        <div style={{ marginBottom: 'var(--sp-3)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Agent Domain · Stages 1–7
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {agentStages.map(stage => (
              <div key={stage.stage_number} style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-faint)',
                borderRadius: 6,
                padding: '8px 12px',
                minWidth: 90,
              }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                  {stage.stage_number}. {stage.label}
                </div>
                <div style={{
                  fontSize: 20, fontWeight: 700,
                  fontFamily: 'var(--font-geist-mono)',
                  color: stage.count > 0 ? 'var(--bmh-stage-active)' : 'var(--text-muted)',
                }}>
                  {stage.count}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Clint domain stages (8-10) — visually muted */}
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Clint Domain · Stages 8–10
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {clintStages.map(stage => (
              <div key={stage.stage_number} style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-faint)',
                borderRadius: 6,
                padding: '8px 12px',
                minWidth: 90,
                opacity: 0.6,
              }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                  {stage.stage_number}. {stage.label}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-geist-mono)', color: 'var(--text-muted)' }}>
                  {stage.count}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Priority A Deals Table ──────────────────────────────────────────── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-4)' }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            Priority A Deals
          </h2>
          <Link href="/bmh/deals" style={{
            fontSize: 12, color: 'var(--bmh-accent)', textDecoration: 'none',
            border: '1px solid var(--bmh-accent)', borderRadius: 4, padding: '4px 10px',
          }}>
            View all deals →
          </Link>
        </div>

        {priorityADeals.length === 0 ? (
          // Empty state — shown until PropStream data is ingested
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-faint)',
            borderRadius: 8, padding: 'var(--sp-8)', textAlign: 'center',
          }}>
            <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
              No Priority A deals found.
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
              Ingest data via PropStream pipeline to populate deals.
            </div>
          </div>
        ) : (
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-faint)',
            borderRadius: 8,
            overflow: 'hidden',
          }}>
            {/* Table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 80px 60px 60px 70px 80px 1fr',
              gap: 8,
              padding: '10px 16px',
              borderBottom: '1px solid var(--border-faint)',
              fontSize: 11, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              <span>Address</span>
              <span>Price</span>
              <span>DOM</span>
              <span>MSS</span>
              <span>Priority</span>
              <span>Stage</span>
              <span>Signals</span>
            </div>

            {/* Deal rows */}
            {priorityADeals.map((deal, idx) => (
              <Link
                key={deal.id}
                href={`/bmh/deals/${deal.id}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 80px 60px 60px 70px 80px 1fr',
                  gap: 8,
                  padding: '12px 16px',
                  borderBottom: idx < priorityADeals.length - 1 ? '1px solid var(--border-faint)' : 'none',
                  textDecoration: 'none',
                  background: 'transparent',
                  transition: 'background 0.15s',
                }}
                className="table-row-hover"
              >
                {/* Address — Geist Mono per Ada spec */}
                <span style={{
                  fontFamily: 'var(--font-geist-mono)',
                  fontSize: 13, color: 'var(--text-primary)', fontWeight: 500,
                }}>
                  {deal.address}, {deal.city}
                </span>

                {/* Price */}
                <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                  {deal.price ? `$${(deal.price / 1000).toFixed(0)}k` : '—'}
                </span>

                {/* DOM */}
                <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 12, color: deal.dom && deal.dom > 60 ? '#F59E0B' : 'var(--text-secondary)' }}>
                  {deal.dom ?? '—'}
                </span>

                {/* MSS badge — circle with number */}
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'var(--bmh-priority-a)',
                  fontFamily: 'var(--font-geist-mono)', fontSize: 11, fontWeight: 700,
                  color: '#fff',
                }}>
                  {deal.mss ?? '—'}
                </span>

                {/* Priority badge */}
                <span style={{
                  display: 'inline-flex', alignItems: 'center',
                  padding: '2px 8px', borderRadius: 4,
                  background: PRIORITY_COLOR[deal.priority] + '22',
                  color: PRIORITY_COLOR[deal.priority],
                  fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
                }}>
                  {deal.priority}
                </span>

                {/* Pipeline stage */}
                <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                  {deal.pipeline_stage}/10
                </span>

                {/* Top 3 signal pills */}
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {deal.signals.slice(0, 3).map((sig, i) => (
                    <span key={i} style={{
                      background: SIGNAL_TIER_COLOR[sig.tier] || '#6B7280',
                      color: '#fff', fontSize: 10, fontWeight: 500,
                      padding: '2px 6px', borderRadius: 3,
                    }}
                      title={`Source: ${sig.source}`}
                    >
                      {sig.label}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Mobile responsive style — KPI bar stacks to 2×2 */}
      <style>{`
        @media (max-width: 768px) {
          .bmh-kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        .table-row-hover:hover { background: var(--bg-hover) !important; }
      `}</style>
    </div>
  )
}
