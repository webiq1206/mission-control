import { NextRequest, NextResponse } from 'next/server'
import { getUniversalDb } from '@/lib/db-universal'
import { requireAuth } from '../middleware'

export async function GET(req: NextRequest) {
  const authError = requireAuth(req)
  if (authError) return authError
  const db = await getUniversalDb()
  try {
    const members = await db.all('SELECT * FROM team_members ORDER BY name')
    return NextResponse.json(members)
  } catch {
    return NextResponse.json([])
  }
}
