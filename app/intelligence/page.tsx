export const dynamic = 'force-dynamic'

import { getDb } from '@/lib/db'
import { PageRefresher } from '@/components/ui/PageRefresher'
import { formatDistanceToNow } from 'date-fns'

interface IntelligenceRow {
  agent: string
  date: string
  as_of: string
  window_days: number
  reflection_count: number
  outcome_count: number
  memory_load_rate: number | null
  memory_reference_rate: number | null
  repeat_failure_rate: number | null
  proactive_suggestion_rate: number | null
  rule_compliance_rate: number | null
  lesson_quality_score: number | null
}

const THRESHOLDS = {
  memory_load_rate: 0.6,
  memory_reference_rate: 0.4,
  repeat_failure_rate: 0.3, // higher = worse
  rule_compliance_rate: 0.95,
  lesson_quality_score: 0.5,
}

function pct(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  return `${(n * 100).toFixed(0)}%`
}

function color(v: number | null | undefined, threshold: number, higherIsBetter = true): string {
  if (v === null || v === undefined) return 'var(--text-tertiary, #9ca3af)'
  const ok = higherIsBetter ? v >= threshold : v <= threshold
  return ok ? 'var(--green-500, #10b981)' : 'var(--red-500, #ef4444)'
}

function tableExists(): boolean {
  try {
    const db = getDb()
    const r = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='agent_intelligence_scores'"
    ).get()
    return !!r
  } catch {
    return false
  }
}

export default async function IntelligencePage() {
  if (!tableExists()) {
    return (
      <div style={{ padding: '28px 32px', maxWidth: 1200 }}>
        <PageRefresher />
        <div style={{ marginBottom: 28 }}>
          <div className="label" style={{ marginBottom: 6 }}>Mission Control</div>
          <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.5px' }}>Intelligence</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            The <code>agent_intelligence_scores</code> table has not been populated yet. Run{' '}
            <code>python3 workspace-hank/scripts/score-intelligence.py --post-to-mc</code> (or wait for the daily cron).
          </p>
        </div>
      </div>
    )
  }

  const db = getDb()
  const rows = db.prepare(`
    SELECT * FROM agent_intelligence_scores
    WHERE (agent, date) IN (
      SELECT agent, MAX(date) FROM agent_intelligence_scores GROUP BY agent
    )
    ORDER BY agent
  `).all() as IntelligenceRow[]

  const totalRefl = rows.reduce((a, r) => a + (r.reflection_count || 0), 0)
  const totalOut = rows.reduce((a, r) => a + (r.outcome_count || 0), 0)
  const breaches = rows.flatMap((r) => {
    const out: string[] = []
    if (r.memory_load_rate !== null && r.memory_load_rate < THRESHOLDS.memory_load_rate)
      out.push(`${r.agent}: load ${pct(r.memory_load_rate)} below ${pct(THRESHOLDS.memory_load_rate)}`)
    if (r.memory_reference_rate !== null && r.memory_reference_rate < THRESHOLDS.memory_reference_rate)
      out.push(`${r.agent}: cite ${pct(r.memory_reference_rate)} below ${pct(THRESHOLDS.memory_reference_rate)}`)
    if (r.repeat_failure_rate !== null && r.repeat_failure_rate > THRESHOLDS.repeat_failure_rate)
      out.push(`${r.agent}: repeat-fail ${pct(r.repeat_failure_rate)} above ${pct(THRESHOLDS.repeat_failure_rate)}`)
    if (r.rule_compliance_rate !== null && r.rule_compliance_rate < THRESHOLDS.rule_compliance_rate)
      out.push(`${r.agent}: compliance ${pct(r.rule_compliance_rate)} below ${pct(THRESHOLDS.rule_compliance_rate)}`)
    return out
  })

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200 }}>
      <PageRefresher />

      <div style={{ marginBottom: 28 }}>
        <div className="label" style={{ marginBottom: 6 }}>Mission Control</div>
        <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.5px' }}>Intelligence</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4, lineHeight: 1.6 }}>
          Per-agent memory hygiene and learning metrics from <code>memory-v2</code>. {rows.length} agents · {totalRefl} reflections · {totalOut} outcomes (last {rows[0]?.window_days ?? 7}d).
          {breaches.length > 0 && (
            <span style={{ color: 'var(--red-500, #ef4444)', marginLeft: 8 }}>
              {breaches.length} threshold breach{breaches.length === 1 ? '' : 'es'}
            </span>
          )}
        </p>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid var(--border, #e5e7eb)', borderRadius: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary, #f9fafb)' }}>
              <th style={{ textAlign: 'left', padding: '10px 12px' }}>Agent</th>
              <th style={{ textAlign: 'right', padding: '10px 12px' }}>Refl</th>
              <th style={{ textAlign: 'right', padding: '10px 12px' }}>Out</th>
              <th style={{ textAlign: 'right', padding: '10px 12px' }} title="memory_load_rate">Load</th>
              <th style={{ textAlign: 'right', padding: '10px 12px' }} title="memory_reference_rate">Cite</th>
              <th style={{ textAlign: 'right', padding: '10px 12px' }} title="repeat_failure_rate (lower is better)">Repeat-Fail</th>
              <th style={{ textAlign: 'right', padding: '10px 12px' }} title="proactive_suggestion_rate">Proactive</th>
              <th style={{ textAlign: 'right', padding: '10px 12px' }} title="rule_compliance_rate">Compliance</th>
              <th style={{ textAlign: 'right', padding: '10px 12px' }} title="lesson_quality_score (Mira-evaluated)">Quality</th>
              <th style={{ textAlign: 'right', padding: '10px 12px' }}>As of</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.agent} style={{ borderTop: '1px solid var(--border, #e5e7eb)' }}>
                <td style={{ padding: '10px 12px', fontWeight: 600 }}>{r.agent}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right' }}>{r.reflection_count}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right' }}>{r.outcome_count}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: color(r.memory_load_rate, THRESHOLDS.memory_load_rate, true) }}>
                  {pct(r.memory_load_rate)}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: color(r.memory_reference_rate, THRESHOLDS.memory_reference_rate, true) }}>
                  {pct(r.memory_reference_rate)}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: color(r.repeat_failure_rate, THRESHOLDS.repeat_failure_rate, false) }}>
                  {pct(r.repeat_failure_rate)}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right' }}>{pct(r.proactive_suggestion_rate)}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: color(r.rule_compliance_rate, THRESHOLDS.rule_compliance_rate, true) }}>
                  {pct(r.rule_compliance_rate)}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: color(r.lesson_quality_score, THRESHOLDS.lesson_quality_score, true) }}>
                  {r.lesson_quality_score !== null ? r.lesson_quality_score.toFixed(2) : '—'}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-tertiary, #9ca3af)', fontSize: 11 }}>
                  {r.as_of ? formatDistanceToNow(new Date(r.as_of), { addSuffix: true }) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {breaches.length > 0 && (
        <div style={{ marginTop: 24, padding: '14px 16px', border: '1px solid var(--red-300, #fca5a5)', borderRadius: 8, background: 'var(--red-50, #fef2f2)' }}>
          <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--red-700, #b91c1c)' }}>Threshold breaches</div>
          <ul style={{ paddingLeft: 18, fontSize: 12, lineHeight: 1.7 }}>
            {breaches.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ marginTop: 24, fontSize: 11, color: 'var(--text-tertiary, #9ca3af)' }}>
        Source: <code>workspace-hank/scripts/score-intelligence.py --post-to-mc</code>. Refreshed daily by the <code>memv2-intelligence-score</code> cron (06:30 MT). Underlying JSON snapshots live in <code>memory-v2/_metrics/</code>.
      </div>
    </div>
  )
}
