import { NextRequest, NextResponse } from 'next/server'
import { getUniversalDb } from '@/lib/db-universal'

export async function GET(req: NextRequest) {
  const db = await getUniversalDb()
  const { searchParams } = new URL(req.url)
  const entity = searchParams.get('entity')
  const category = searchParams.get('category')
  const agent = searchParams.get('agent')
  const status = searchParams.get('status')

  let query = 'SELECT * FROM assets WHERE 1=1'
  const params: string[] = []

  if (entity) { query += ' AND entity = ?'; params.push(entity) }
  if (category) { query += ' AND category = ?'; params.push(category) }
  if (agent) { query += ' AND created_by = ?'; params.push(agent) }
  if (status) { query += ' AND status = ?'; params.push(status) }

  query += ' ORDER BY created_at DESC'

  const assets = await db.all(query, ...params)

  // Parse tags JSON
  const parsed = assets.map((a: any) => ({
    ...a,
    tags: (() => { try { return JSON.parse(a.tags || '[]') } catch { return [] } })()
  }))

  return NextResponse.json({ assets: parsed, total: parsed.length })
}

// Categories where the asset is intended to be delivered to Jared. Raw .md
// files are NEVER acceptable for these — enforces SHARED-CRIT-2026-04-29-
// DELIVERABLE-STANDARD at the storage gate.
const JARED_FACING_CATEGORIES = new Set([
  'deliverable', 'report', 'content', 'design', 'strategy',
  'research', 'copy', 'brief', 'spec',
])

export async function POST(req: NextRequest) {
  const db = await getUniversalDb()
  const body = await req.json()

  const {
    id, entity, category, title, description,
    url, file_path, created_by, status = 'active',
    tags = [], task_id
  } = body

  if (!id || !entity || !category || !title) {
    return NextResponse.json({ error: 'id, entity, category, title required' }, { status: 400 })
  }

  // Deliverable Standard: Jared-facing categories may not point at raw .md.
  if (
    JARED_FACING_CATEGORIES.has(String(category).toLowerCase()) &&
    typeof file_path === 'string' &&
    /\.md$/i.test(file_path) &&
    !/internal-draft/i.test(String(file_path))
  ) {
    return NextResponse.json(
      {
        error: 'deliverable_standard_violation',
        rule: 'SHARED-CRIT-2026-04-29-DELIVERABLE-STANDARD',
        violations: [
          'Jared-facing category cannot point at a raw .md file. ' +
          'Render to PDF/xlsx/HTML/image first via Claude (Desktop app or ACP session), ' +
          'upload to Drive, then register the asset with the rendered file path.',
        ],
      },
      { status: 422 }
    )
  }

  const tagsJson = JSON.stringify(Array.isArray(tags) ? tags : [])

  await db.run(`
    INSERT INTO assets (id, entity, category, title, description, url, file_path, created_by, status, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      entity=excluded.entity, category=excluded.category, title=excluded.title,
      description=excluded.description, url=excluded.url, file_path=excluded.file_path,
      created_by=excluded.created_by, status=excluded.status, tags=excluded.tags,
      updated_at=CURRENT_TIMESTAMP
  `, id, entity, category, title, description || null, url || null, file_path || null, created_by || null, status, tagsJson)

  // Link to task if provided
  if (task_id) {
    const assetUrl = `/assets#${id}`
    await db.run(`
      UPDATE tasks SET deliverable_url = ?, deliverable_asset_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, assetUrl, id, task_id)
  }

  // Log activity
  await db.run(`
    INSERT INTO activity (agent, entity, action, detail, tags)
    VALUES (?, ?, ?, ?, ?)
  `, created_by || 'system',
    entity,
    `Asset registered: ${title}`,
    `Category: ${category} | File: ${file_path || url || 'N/A'}`,
    JSON.stringify(['asset', category])
  )

  const asset = await db.get('SELECT * FROM assets WHERE id = ?', id) as any
  return NextResponse.json({ asset, success: true })
}
