import { NextRequest, NextResponse } from 'next/server'
import { getUniversalDb } from '@/lib/db-universal'
import { requireAuth } from '../middleware'

export async function GET(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth) return auth
  const db = await getUniversalDb()
  const agents = await db.all('SELECT * FROM agent_heartbeats ORDER BY agent_id')
  return NextResponse.json(agents)
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth) return auth

  const db = await getUniversalDb()
  const body = await req.json()

  await db.run(`
    INSERT INTO agent_heartbeats
      (agent_id, agent_name, emoji, role, last_seen, status, current_task,
       current_entity, model, heartbeat_count, active_goals, pending_proactive,
       error_count_24h, tasks_completed_24h, updated_at)
    VALUES (?,?,?,?,CURRENT_TIMESTAMP,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(agent_id) DO UPDATE SET
      last_seen=CURRENT_TIMESTAMP, status=excluded.status,
      current_task=excluded.current_task, current_entity=excluded.current_entity,
      model=excluded.model, heartbeat_count=heartbeat_count+1,
      active_goals=excluded.active_goals, pending_proactive=excluded.pending_proactive,
      error_count_24h=excluded.error_count_24h,
      tasks_completed_24h=excluded.tasks_completed_24h,
      updated_at=CURRENT_TIMESTAMP
  `, body.agent_id, body.agent_name, body.emoji || null, body.role || null,
    body.status || 'active', body.current_task || null, body.current_entity || null,
    body.model || null, 0, body.active_goals || 0, body.pending_proactive || 0,
    body.error_count_24h || 0, body.tasks_completed_24h || 0)

  // Log blocked/error status to activity feed as actionable alerts;
  // normal heartbeats are tracked in agent_heartbeats only (no activity row).
  if (body.status === 'blocked' || body.error_count_24h > 0) {
    const agentName = body.agent_name || body.agent_id
    const emoji = body.emoji || ''
    const action = body.status === 'blocked' ? 'blocked' : 'error'
    const detail = `${emoji} ${agentName} — ${body.current_task || 'Unknown task'}`
    const tags = JSON.stringify([
      action,
      'system',
      ...(body.current_entity ? ['entity:' + body.current_entity] : []),
    ])
    await db.run(`
      INSERT INTO activity (agent, entity, action, detail, tags)
      VALUES (?, ?, ?, ?, ?)
    `, body.agent_id,
      body.current_entity || 'Global',
      action,
      detail,
      tags)
  }

  return NextResponse.json({ ok: true })
}
