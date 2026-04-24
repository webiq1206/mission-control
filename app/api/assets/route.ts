import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(req: NextRequest) {
  const db = getDb()
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

  const assets = db.prepare(query).all(...params)

  // Parse tags JSON
  const parsed = assets.map((a: any) => ({
    ...a,
    tags: (() => { try { return JSON.parse(a.tags || '[]') } catch { return [] } })()
  }))

  return NextResponse.json({ assets: parsed, total: parsed.length })
}

export async function POST(req: NextRequest) {
  const db = getDb()
  const body = await req.json()

  const {
    id, entity, category, title, description,
    url, file_path, created_by, status = 'active',
    tags = [], task_id
  } = body

  if (!id || !entity || !category || !title) {
    return NextResponse.json({ error: 'id, entity, category, title required' }, { status: 400 })
  }

  const tagsJson = JSON.stringify(Array.isArray(tags) ? tags : [])

  db.prepare(`
    INSERT INTO assets (id, entity, category, title, description, url, file_path, created_by, status, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      entity=excluded.entity, category=excluded.category, title=excluded.title,
      description=excluded.description, url=excluded.url, file_path=excluded.file_path,
      created_by=excluded.created_by, status=excluded.status, tags=excluded.tags,
      updated_at=CURRENT_TIMESTAMP
  `).run(id, entity, category, title, description || null, url || null, file_path || null, created_by || null, status, tagsJson)

  // Link to task if provided
  if (task_id) {
    const assetUrl = `/assets#${id}`
    db.prepare(`
      UPDATE tasks SET deliverable_url = ?, deliverable_asset_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(assetUrl, id, task_id)
  }

  // Log activity
  db.prepare(`
    INSERT INTO activity (agent, entity, action, detail, tags)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    created_by || 'system',
    entity,
    `Asset registered: ${title}`,
    `Category: ${category} | File: ${file_path || url || 'N/A'}`,
    JSON.stringify(['asset', category])
  )

  const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(id) as any
  return NextResponse.json({ asset, success: true })
}
