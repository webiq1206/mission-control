import { NextRequest, NextResponse } from 'next/server'
import { getUniversalDb } from '@/lib/db-universal'
import { requireAuth } from '../middleware'

export async function GET(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth) return auth

  const db = await getUniversalDb()
  const rows = await db.all('SELECT * FROM system_state') as { key: string; value: string }[]
  const state: Record<string, string> = Object.fromEntries(rows.map(r => [r.key, r.value]))

  const lastActivity = new Date(state.last_agent_activity)
  const hoursSince = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60)
  const switchHours = parseInt(state.dead_mans_switch_hours || '48')
  state.dead_mans_switch_triggered = (hoursSince > switchHours).toString()
  state.hours_since_activity = hoursSince.toFixed(1)

  return NextResponse.json(state)
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth) return auth

  const body = await req.json()
  const db = await getUniversalDb()

  for (const [key, value] of Object.entries(body)) {
    await db.run(`
      INSERT INTO system_state (key, value, updated_at, updated_by)
      VALUES (?, ?, CURRENT_TIMESTAMP, 'jared')
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value, updated_at = CURRENT_TIMESTAMP, updated_by = 'jared'
    `, key, String(value))
  }

  return NextResponse.json({ ok: true })
}
