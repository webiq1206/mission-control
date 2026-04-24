import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb()
  const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(params.id) as any
  if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({
    ...asset,
    tags: (() => { try { return JSON.parse(asset.tags || '[]') } catch { return [] } })()
  })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb()
  const body = await req.json()
  const fields = ['title','description','url','file_path','status','tags','category','entity']
  const updates: string[] = []
  const vals: any[] = []

  for (const f of fields) {
    if (body[f] !== undefined) {
      updates.push(`${f} = ?`)
      vals.push(f === 'tags' ? JSON.stringify(body[f]) : body[f])
    }
  }

  if (!updates.length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  updates.push('updated_at = CURRENT_TIMESTAMP')
  vals.push(params.id)

  db.prepare(`UPDATE assets SET ${updates.join(', ')} WHERE id = ?`).run(...vals)
  const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(params.id) as any
  return NextResponse.json({ asset, success: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb()
  db.prepare('DELETE FROM assets WHERE id = ?').run(params.id)
  return NextResponse.json({ success: true })
}
