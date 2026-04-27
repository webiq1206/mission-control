import { NextRequest, NextResponse } from 'next/server'
import { getUniversalDb, parseJsonArrayFields } from '@/lib/db-universal'
import { requireAuth } from '../middleware'
import { nanoid } from 'nanoid'

export async function GET(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth) return auth

  const db = await getUniversalDb()
  const { searchParams } = new URL(req.url)
  const entity = searchParams.get('entity')
  const status = searchParams.get('status')
  const agent  = searchParams.get('agent')
  const limit  = parseInt(searchParams.get('limit') || '100')

  let query = 'SELECT * FROM tasks WHERE 1=1'
  const params: unknown[] = []

  if (entity) { query += ' AND entity = ?'; params.push(entity) }
  if (status) { query += ' AND status = ?'; params.push(status) }
  if (agent)  { query += ' AND assigned_agent = ?'; params.push(agent) }

  query += " ORDER BY CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 END, updated_at DESC LIMIT ?"
  params.push(limit)

  const rawTasks = await db.all(query, ...params) as Record<string, unknown>[]
  const tasks = parseJsonArrayFields(rawTasks, ['dependencies', 'tags'])
  return NextResponse.json(tasks)
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth) return auth

  const db = await getUniversalDb()
  const body = await req.json()

  const task = {
    id:              body.id || `TSK-${Date.now()}-${nanoid(4)}`,
    title:           body.title,
    entity:          body.entity,
    status:          body.status || 'backlog',
    priority:        body.priority || 'medium',
    assigned_agent:  body.assigned_agent || null,
    description:     body.description || null,
    objective:       body.objective || null,
    dod:             body.dod || null,
    expected_output: body.expected_output || null,
    dependencies:    JSON.stringify(body.dependencies || []),
    tags:            JSON.stringify(body.tags || []),
    source:          body.source || 'agent',
    due_at:          body.due_at || null,
    last_activity_at: new Date().toISOString(),
  }

  await db.run(`
    INSERT INTO tasks (id,title,entity,status,priority,assigned_agent,description,
      objective,dod,expected_output,dependencies,tags,source,due_at,last_activity_at)
    VALUES (@id,@title,@entity,@status,@priority,@assigned_agent,@description,
      @objective,@dod,@expected_output,@dependencies,@tags,@source,@due_at,@last_activity_at)
    ON CONFLICT(id) DO UPDATE SET
      title=excluded.title, status=excluded.status, priority=excluded.priority,
      assigned_agent=excluded.assigned_agent, description=excluded.description,
      objective=excluded.objective, dod=excluded.dod, expected_output=excluded.expected_output,
      dependencies=excluded.dependencies, tags=excluded.tags,
      updated_at=CURRENT_TIMESTAMP, last_activity_at=excluded.last_activity_at
  `, task)

  return NextResponse.json({ ok: true, id: task.id })
}
