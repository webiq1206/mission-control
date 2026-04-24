import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import fs from 'fs'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb()
  const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(params.id) as any
  if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const fp = asset.file_path
  if (!fp) return NextResponse.json({ error: 'No file path' }, { status: 404 })

  if (!fs.existsSync(fp)) return NextResponse.json({ error: 'File not found on disk', path: fp }, { status: 404 })

  const content = fs.readFileSync(fp, 'utf8')
  return new NextResponse(content, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  })
}
