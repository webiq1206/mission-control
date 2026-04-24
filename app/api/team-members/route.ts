import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(req: NextRequest) {
  const db = getDb()
  try {
    const members = db.prepare('SELECT * FROM team_members ORDER BY name').all()
    return NextResponse.json(members)
  } catch {
    return NextResponse.json([])
  }
}
