import { NextRequest, NextResponse } from 'next/server'
import { getUniversalDb } from '@/lib/db-universal'
import { requireAuth } from '../../middleware'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req)
  if (auth) return auth

  const { id } = await params
  const db = await getUniversalDb()
  const idea = await db.get('SELECT * FROM ideas WHERE id = ?', id)

  if (!idea) {
    return NextResponse.json({ error: 'Idea not found' }, { status: 404 })
  }

  return NextResponse.json(idea)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req)
  if (auth) return auth

  const { id } = await params
  const db = await getUniversalDb()
  const body = await req.json()

  const existing = await db.get('SELECT * FROM ideas WHERE id = ?', id)
  if (!existing) {
    return NextResponse.json({ error: 'Idea not found' }, { status: 404 })
  }

  const updatable = ['entity', 'title', 'description', 'context', 'objective',
    'next_steps', 'submitted_by', 'assigned_to', 'status', 'priority'] as const

  const sets: string[] = []
  const values: unknown[] = []

  for (const field of updatable) {
    if (body[field] !== undefined) {
      sets.push(`${field} = ?`)
      values.push(body[field])
    }
  }

  if (body.status === 'approved' || body.status === 'rejected') {
    sets.push('reviewed_at = ?')
    values.push(new Date().toISOString())
  }

  if (sets.length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  values.push(id)
  await db.run(`UPDATE ideas SET ${sets.join(', ')} WHERE id = ?`, ...values)

  const updated = await db.get('SELECT * FROM ideas WHERE id = ?', id)
  return NextResponse.json({ ok: true, idea: updated })
}
