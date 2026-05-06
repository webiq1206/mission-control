import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAuth } from '../middleware'

export async function GET(req: NextRequest) {
  const authError = requireAuth(req)
  if (authError) return authError
  try {
    const db = getDb()
    const exists = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='agent_intelligence_scores'"
    ).get()
    if (!exists) {
      return NextResponse.json({ rows: [], message: 'agent_intelligence_scores not yet populated' })
    }
    const rows = db.prepare(`
      SELECT agent, date, as_of, window_days, reflection_count, outcome_count,
             memory_load_rate, memory_reference_rate, repeat_failure_rate,
             proactive_suggestion_rate, rule_compliance_rate, lesson_quality_score
      FROM agent_intelligence_scores
      WHERE (agent, date) IN (
        SELECT agent, MAX(date) FROM agent_intelligence_scores GROUP BY agent
      )
      ORDER BY agent
    `).all()
    return NextResponse.json({ rows })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
