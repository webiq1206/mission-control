import { NextRequest, NextResponse } from 'next/server'
import { getUniversalDb } from '@/lib/db-universal'
import { requireAuth } from '../../middleware'
import { sendDeadMansSwitchAlert } from '@/lib/telegram'

export async function POST(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth) return auth

  const db = await getUniversalDb()
  const rows = await db.all('SELECT * FROM system_state') as { key: string; value: string }[]
  const state: Record<string, string> = Object.fromEntries(rows.map(r => [r.key, r.value]))

  if (state.dead_mans_switch_enabled !== 'true') {
    return NextResponse.json({ ok: true, triggered: false, reason: 'disabled' })
  }

  if (state.emergency_stop === 'true') {
    return NextResponse.json({ ok: true, triggered: false, reason: 'emergency_stop_active' })
  }

  const lastActivity = new Date(state.last_agent_activity)
  const hoursSince = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60)
  const switchHours = parseInt(state.dead_mans_switch_hours || '48')

  if (hoursSince > switchHours) {
    await sendDeadMansSwitchAlert(hoursSince)

    await db.run(`
      INSERT INTO system_state (key, value, updated_at, updated_by)
      VALUES ('dead_mans_switch_last_alert', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'system')
      ON CONFLICT(key) DO UPDATE SET value = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    `)

    return NextResponse.json({ ok: true, triggered: true, hours_since: hoursSince })
  }

  return NextResponse.json({ ok: true, triggered: false, hours_since: hoursSince })
}
