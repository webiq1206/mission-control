import { NextRequest, NextResponse } from 'next/server'
import { getUniversalDb } from '@/lib/db-universal'
import { requireAuth } from '../middleware'

/**
 * Deliverable Standard validator — enforces SHARED-CRIT-2026-04-29-DELIVERABLE-STANDARD.
 *
 * Every deliverable to Jared MUST be:
 *   1. Created in Claude (Desktop app or ACP session)         → claude_session_id
 *   2. Saved against a Mission Control task                   → mc_task_id
 *   3. Registered in Assets                                   → asset_id
 *   4. Uploaded to Google Drive                               → drive_url (drive.google.com)
 *   5. Emailed from hank@timberandlove.com (CC jb@)           → email_message_id
 *
 * A POST that misses any field → 422 + task stays open.
 * A successful POST writes the audit row, marks the task complete, and links the asset.
 *
 * GET returns recent deliverables and their compliance status (used by Hank's
 * heartbeat audit to surface violations from the last 24h).
 */

const DRIVE_RE = /https:\/\/(drive|docs)\.google\.com\//
const HANK_FROM_RE = /(^|<)hank@timberandlove\.com(>|$)/i

async function ensureSchema(db: Awaited<ReturnType<typeof getUniversalDb>>) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS deliverable_audits (
      id TEXT PRIMARY KEY,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      mc_task_id TEXT NOT NULL,
      asset_id TEXT NOT NULL,
      claude_session_id TEXT NOT NULL,
      drive_url TEXT NOT NULL,
      email_message_id TEXT NOT NULL,
      email_from TEXT NOT NULL,
      created_by TEXT,
      entity TEXT,
      title TEXT,
      compliant INTEGER NOT NULL DEFAULT 1,
      violations TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_deliverable_audits_task ON deliverable_audits(mc_task_id);
    CREATE INDEX IF NOT EXISTS idx_deliverable_audits_compliant ON deliverable_audits(compliant);
  `)
}

interface DeliverableBody {
  id?: string
  mc_task_id?: string
  asset_id?: string
  claude_session_id?: string
  drive_url?: string
  email_message_id?: string
  email_from?: string
  created_by?: string
  entity?: string
  title?: string
}

function validate(body: DeliverableBody): string[] {
  const violations: string[] = []
  if (!body.mc_task_id) violations.push('mc_task_id required (Mission Control task ref)')
  if (!body.asset_id) violations.push('asset_id required (POST /api/assets must run first)')
  if (!body.claude_session_id) violations.push('claude_session_id required (proof of Claude source — Desktop app or ACP session)')
  if (!body.drive_url) violations.push('drive_url required')
  else if (!DRIVE_RE.test(body.drive_url)) violations.push('drive_url must be a drive.google.com or docs.google.com URL')
  if (!body.email_message_id) violations.push('email_message_id required (proof email was sent)')
  if (!body.email_from) violations.push('email_from required')
  else if (!HANK_FROM_RE.test(body.email_from)) violations.push('email_from must be hank@timberandlove.com (admin@ retired for Jared communications)')
  return violations
}

export async function POST(req: NextRequest) {
  const authError = requireAuth(req)
  if (authError) return authError
  const db = await getUniversalDb()
  await ensureSchema(db)

  const body = (await req.json()) as DeliverableBody
  const violations = validate(body)
  if (violations.length) {
    return NextResponse.json(
      {
        error: 'deliverable_standard_violation',
        rule: 'SHARED-CRIT-2026-04-29-DELIVERABLE-STANDARD',
        violations,
      },
      { status: 422 }
    )
  }

  // Confirm referenced asset exists.
  const asset = (await db.get('SELECT id FROM assets WHERE id = ?', body.asset_id!)) as
    | { id: string }
    | null
  if (!asset) {
    return NextResponse.json(
      { error: 'asset_not_found', asset_id: body.asset_id, hint: 'POST /api/assets first' },
      { status: 422 }
    )
  }

  // Confirm referenced task exists.
  const task = (await db.get('SELECT id, status FROM tasks WHERE id = ?', body.mc_task_id!)) as
    | { id: string; status: string }
    | null
  if (!task) {
    return NextResponse.json(
      { error: 'task_not_found', mc_task_id: body.mc_task_id },
      { status: 422 }
    )
  }

  const id = body.id || `DLV-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  await db.run(
    `INSERT INTO deliverable_audits
       (id, mc_task_id, asset_id, claude_session_id, drive_url, email_message_id, email_from,
        created_by, entity, title, compliant, violations)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NULL)`,
    id,
    body.mc_task_id!,
    body.asset_id!,
    body.claude_session_id!,
    body.drive_url!,
    body.email_message_id!,
    body.email_from!,
    body.created_by || null,
    body.entity || null,
    body.title || null
  )

  // Mark task complete with full deliverable linkage.
  await db.run(
    `UPDATE tasks
       SET status = 'completed',
           deliverable_url = ?,
           deliverable_asset_id = ?,
           completed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP,
           last_activity_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    body.drive_url!,
    body.asset_id!,
    body.mc_task_id!
  )

  return NextResponse.json({ ok: true, id, task_id: body.mc_task_id, asset_id: body.asset_id })
}

export async function GET(req: NextRequest) {
  const authError = requireAuth(req)
  if (authError) return authError
  const db = await getUniversalDb()
  await ensureSchema(db)

  const { searchParams } = new URL(req.url)
  const sinceHours = parseInt(searchParams.get('since_hours') || '24', 10)
  const compliant = searchParams.get('compliant')

  let q = `SELECT * FROM deliverable_audits WHERE created_at >= datetime('now', ?)`
  const params: unknown[] = [`-${sinceHours} hours`]
  if (compliant === '0' || compliant === '1') {
    q += ' AND compliant = ?'
    params.push(parseInt(compliant, 10))
  }
  q += ' ORDER BY created_at DESC LIMIT 200'

  const rows = await db.all(q, ...params)
  return NextResponse.json({ deliverables: rows, total: rows.length })
}
