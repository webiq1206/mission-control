import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAuth } from '../middleware'
import { execSync } from 'child_process'
import { writeFileSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

export async function GET(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth) return auth
  const reports = getDb().prepare(
    'SELECT * FROM reports ORDER BY sent_at DESC LIMIT 50'
  ).all()
  return NextResponse.json(reports)
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth) return auth

  const db = getDb()
  const body = await req.json()

  const recipients: string[] = []
  if (body.recipient === 'luke' || body.recipient === 'both') {
    recipients.push(process.env.LUKE_EMAIL!)
  }
  if (body.recipient === 'adam' || body.recipient === 'both') {
    recipients.push(process.env.ADAM_EMAIL!)
  }
  if (body.recipient === 'jared') {
    recipients.push(process.env.JARED_EMAIL!)
  }

  let emailStatus = 'not_sent'
  const gogAccount = process.env.GOG_ACCOUNT || 'hank@timberandlove.com'
  const ccEmail = process.env.JARED_EMAIL || 'jb@timberandlove.com'

  const html = body.content_html || ''

  if (body.send_email && recipients.length > 0 && html) {
    const tmpFile = join(tmpdir(), `mc-report-${Date.now()}.html`)
    try {
      writeFileSync(tmpFile, html)
      const toList = recipients.join(',')
      execSync(
        `gog gmail send --account=${gogAccount} --to="${toList}" --cc="${ccEmail}" --subject="${body.title.replace(/"/g, '\\"')}" --body-html="$(cat ${tmpFile})" --force --no-input`,
        { timeout: 30000, encoding: 'utf-8' }
      )
      emailStatus = 'sent'
    } catch {
      emailStatus = 'failed'
    } finally {
      try { unlinkSync(tmpFile) } catch { /* ignore cleanup errors */ }
    }
  }

  // Migrate column if needed
  const cols = db.prepare("PRAGMA table_info(reports)").all() as { name: string }[]
  if (!cols.find(c => c.name === 'content_html')) {
    db.exec("ALTER TABLE reports ADD COLUMN content_html TEXT")
  }

  const id = `RPT-${Date.now()}`
  db.prepare(`
    INSERT INTO reports (id, title, recipient, entity_scope, content_md, content_html, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, body.title, body.recipient, body.entity_scope, '', html, emailStatus)

  return NextResponse.json({ ok: true, id, email_status: emailStatus })
}
