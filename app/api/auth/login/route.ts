import { NextRequest, NextResponse } from 'next/server'

const PASSWORD = 'l0veandtimber'
const COOKIE_NAME = 'mc_auth'
const COOKIE_VALUE = 'authenticated'

export async function POST(request: NextRequest) {
  const { password } = await request.json()

  if (password !== PASSWORD) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(COOKIE_NAME, COOKIE_VALUE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  })

  return response
}
