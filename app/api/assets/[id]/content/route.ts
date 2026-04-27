import { NextRequest, NextResponse } from 'next/server'
import { getUniversalDb } from '@/lib/db-universal'
import fs from 'fs'

// Next.js 15: params is a Promise — must be awaited before use
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = await getUniversalDb()
  const asset = await db.get('SELECT * FROM assets WHERE id = ?', id) as any
  if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const fp = asset.file_path
  if (!fp) return NextResponse.json({ error: 'No file path' }, { status: 404 })

  if (!fs.existsSync(fp)) return NextResponse.json({ error: 'File not found on disk', path: fp }, { status: 404 })

  const content = fs.readFileSync(fp, 'utf8')
  return new NextResponse(content, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  })
}
