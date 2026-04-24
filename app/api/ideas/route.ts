import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAuth } from '../middleware'
import { nanoid } from 'nanoid'

export async function GET(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth) return auth

  const db = getDb()
  const { searchParams } = new URL(req.url)
  const entity = searchParams.get('entity')
  const status = searchParams.get('status')
  const submitted_by = searchParams.get('submitted_by')
  const limit = parseInt(searchParams.get('limit') || '100')

  let query = 'SELECT * FROM ideas WHERE 1=1'
  const params: unknown[] = []

  if (entity) { query += ' AND entity = ?'; params.push(entity) }
  if (status) { query += ' AND status = ?'; params.push(status) }
  if (submitted_by) { query += ' AND submitted_by = ?'; params.push(submitted_by) }

  query += ' ORDER BY created_at DESC LIMIT ?'
  params.push(limit)

  const ideas = db.prepare(query).all(...params)
  return NextResponse.json(ideas)
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth) return auth

  const db = getDb()
  const body = await req.json()

  if (!body.title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  const idea = {
    id:           body.id || `IDEA-${Date.now()}-${nanoid(4)}`,
    entity:       body.entity || null,
    title:        body.title,
    description:  body.description || null,
    context:      body.context || null,
    objective:    body.objective || null,
    next_steps:   body.next_steps || null,
    submitted_by: body.submitted_by || 'jared',
    assigned_to:  body.assigned_to || null,
    status:       body.status || 'new',
    priority:     body.priority || 'medium',
  }

  db.prepare(`
    INSERT INTO ideas (id, entity, title, description, context, objective, next_steps,
      submitted_by, assigned_to, status, priority)
    VALUES (@id, @entity, @title, @description, @context, @objective, @next_steps,
      @submitted_by, @assigned_to, @status, @priority)
    ON CONFLICT(id) DO UPDATE SET
      entity=excluded.entity, title=excluded.title, description=excluded.description,
      context=excluded.context, objective=excluded.objective, next_steps=excluded.next_steps,
      submitted_by=excluded.submitted_by, assigned_to=excluded.assigned_to,
      status=excluded.status, priority=excluded.priority
  `).run(idea)

  db.prepare(`
    INSERT INTO activity (agent, entity, action, detail, tags)
    VALUES (?, ?, 'idea_submitted', ?, ?)
  `).run(
    idea.submitted_by,
    idea.entity || 'Global',
    `New idea: ${idea.title}`,
    JSON.stringify(['idea', 'submitted'])
  )

  return NextResponse.json({ ok: true, id: idea.id })
}
