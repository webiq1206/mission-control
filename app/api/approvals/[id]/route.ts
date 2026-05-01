import { NextRequest, NextResponse } from 'next/server'
import { getUniversalDb, parseJsonArrayFields } from '@/lib/db-universal'
import { requireAuth } from '../../middleware'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(req)
  if (auth) return auth

  const db = await getUniversalDb()
  const { id } = await params
  const rawApproval = await db.get('SELECT * FROM approvals WHERE id = ?', id) as Record<string, unknown> | undefined
  if (!rawApproval) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const approval = parseJsonArrayFields(rawApproval, ['deliverables'])

  let task = null
  if (rawApproval.task_id) {
    const rawTask = await db.get('SELECT id, title, status, priority, entity, assigned_agent FROM tasks WHERE id = ?', rawApproval.task_id as string) as Record<string, unknown> | undefined
    if (rawTask) task = parseJsonArrayFields(rawTask, ['dependencies', 'tags'])
  }

  const rawAssets = await db.all('SELECT * FROM assets WHERE entity = ? ORDER BY created_at DESC LIMIT 10', rawApproval.entity as string) as Record<string, unknown>[]
  const assets = rawAssets.length > 0 ? parseJsonArrayFields(rawAssets, ['tags']) : []

  return NextResponse.json({ approval, task, assets })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(req)
  if (auth) return auth

  const body = await req.json()
  const { id } = await params
  const db = await getUniversalDb()

  // Support both action-based and direct status updates
  let newStatus = body.status
  if (body.action) {
    switch (body.action) {
      case 'approve': newStatus = 'approved'; break
      case 'reject':  newStatus = 'rejected'; break
      case 'dismiss': newStatus = 'dismissed'; break
      case 'archive': newStatus = 'archived'; break
      case 'resolve': newStatus = 'resolved'; break
      default: newStatus = body.action
    }
  }

  await db.run(`
    UPDATE approvals SET
      status = ?, decided_by = 'jared', decided_at = CURRENT_TIMESTAMP,
      decision_note = ?
    WHERE id = ?
  `, newStatus, body.note || null, id)

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(req)
  if (auth) return auth

  const { id } = await params
  const db = await getUniversalDb()
  await db.run(
    `UPDATE approvals SET status = 'archived', decided_by = 'jared', decided_at = CURRENT_TIMESTAMP WHERE id = ?`,
    id
  )
  return NextResponse.json({ ok: true })
}
