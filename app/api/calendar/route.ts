import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../middleware'
import { execSync } from 'child_process'

export async function GET(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth) return auth

  const gogAccount = process.env.GOG_ACCOUNT || 'hank@timberandlove.com'
  const days = new URL(req.url).searchParams.get('days') || '7'

  try {
    const output = execSync(
      `gog calendar events --account=${gogAccount} --days=${days} --json --results-only --no-input`,
      { timeout: 15000, encoding: 'utf-8' }
    )
    const events = JSON.parse(output)
    return NextResponse.json(events)
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to fetch calendar events', detail: String(err) },
      { status: 500 }
    )
  }
}
