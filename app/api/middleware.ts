import { NextRequest, NextResponse } from 'next/server'

export function requireAuth(req: NextRequest): NextResponse | null {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (token !== process.env.GATEWAY_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
