import { NextRequest, NextResponse } from 'next/server'
import { getUniversalDb, parseJsonArrayFields } from '@/lib/db-universal'
import { requireAuth } from '../../middleware'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(req)
  if (auth) return auth
  const db = await getUniversalDb()
  const { id } = await params
  const rawTask = await db.get('SELECT * FROM tasks WHERE id = ?', id) as Record<string, unknown> | undefined
  if (!rawTask) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const task = parseJsonArrayFields(rawTask, ['dependencies', 'tags'])
  const titleSnippet = (rawTask.title as string)?.substring(0, 20) || ''
  const rawActivity = await db.all(`SELECT * FROM activity WHERE detail LIKE ? OR task_id = ? ORDER BY created_at DESC LIMIT 20`, '%' + titleSnippet + '%', id) as Record<string, unknown>[]
  const activity = parseJsonArrayFields(rawActivity, ['tags'])
  const entity = rawTask.entity as string
  const rawAssets = entity
    ? await db.all(`SELECT * FROM assets WHERE entity = ? ORDER BY created_at DESC LIMIT 10`, entity) as Record<string, unknown>[]
    : []
  const assets = rawAssets.length > 0 ? parseJsonArrayFields(rawAssets, ['tags']) : []
  return NextResponse.json({ task, activity, assets })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(req)
  if (auth) return auth

  const db = await getUniversalDb()
  const body = await req.json()
  const { id } = await params

  // Deliverable Standard gate: marking a deliverable task complete requires a
  // matching row in deliverable_audits (5-field signature). POST /api/deliverables
  // is the only path that can set status=completed for a deliverable task.
  if (typeof body.status === 'string' && body.status.toLowerCase() === 'completed') {
    const task = (await db.get(
      'SELECT id, tags FROM tasks WHERE id = ?',
      id
    )) as { id: string; tags?: string } | null
    if (task) {
      let tags: string[] = []
      try { tags = JSON.parse(task.tags || '[]') } catch { tags = [] }
      const isDeliverable = tags.some(t => /^(deliverable|report|content|brief|spec|copy|strategy|research|design)$/i.test(t))
      if (isDeliverable && !body.bypass_deliverable_gate) {
        // Best-effort: only check if the deliverable_audits table exists.
        let hasAudit = false
        try {
          const audit = (await db.get(
            'SELECT id FROM deliverable_audits WHERE mc_task_id = ? LIMIT 1',
            id
          )) as { id: string } | null
          hasAudit = !!audit
        } catch {
          hasAudit = true // table doesn't exist yet → don't block (first run)
        }
        if (!hasAudit) {
          return NextResponse.json(
            {
              error: 'deliverable_standard_violation',
              rule: 'SHARED-CRIT-2026-04-29-DELIVERABLE-STANDARD',
              violations: [
                'Cannot mark a deliverable task complete without a /api/deliverables audit row. ' +
                'POST to /api/deliverables with claude_session_id, asset_id, drive_url, email_message_id, email_from=hank@timberandlove.com first.',
              ],
              task_id: id,
            },
            { status: 422 }
          )
        }
      }
    }
  }

  const fields: string[] = []
  const values: unknown[] = []

  const updatable = ['status','priority','assigned_agent','description',
    'objective','dod','expected_output','due_at','started_at','completed_at',
    'approval_requested_at','approved_by','approved_at','parent_id','notes','title']

  for (const field of updatable) {
    if (body[field] !== undefined) {
      fields.push(`${field} = ?`)
      values.push(body[field])
    }
  }

  if (fields.length === 0) return NextResponse.json({ ok: true })

  fields.push('updated_at = CURRENT_TIMESTAMP', 'last_activity_at = CURRENT_TIMESTAMP')
  values.push(id)

  await db.run(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, ...values)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(req)
  if (auth) return auth
  const { id } = await params
  const db = await getUniversalDb()
  await db.run('DELETE FROM tasks WHERE id = ?', id)
  return NextResponse.json({ ok: true })
}
