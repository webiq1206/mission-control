import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../middleware'
import fs from 'fs'
import nodePath from 'path'

const BASE_DIR = process.env.OPENCLAW_ROOT || '/Users/jaredbrost/.openclaw'

export async function GET(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth) return auth

  const filePath = new URL(req.url).searchParams.get('path')
  if (!filePath) {
    return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 })
  }

  if (!filePath.startsWith('workspace-') || filePath.includes('..')) {
    return NextResponse.json({ error: 'Invalid path: must be under workspace-*' }, { status: 403 })
  }

  const absolute = nodePath.resolve(BASE_DIR, filePath)
  if (!absolute.startsWith(nodePath.resolve(BASE_DIR))) {
    return NextResponse.json({ error: 'Path traversal blocked' }, { status: 403 })
  }

  try {
    const content = fs.readFileSync(absolute, 'utf-8')
    const filename = nodePath.basename(absolute)
    return NextResponse.json({ content, filename })
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
}
