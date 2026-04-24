import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../middleware'
import puppeteer, { type Browser } from 'puppeteer'

let _browser: Browser | null = null

async function getBrowser(): Promise<Browser> {
  if (_browser && _browser.connected) return _browser
  _browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })
  return _browser
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth) return auth

  const body = await req.json()
  const html = body.html || body.content_html
  if (!html) {
    return NextResponse.json({ error: 'html is required' }, { status: 400 })
  }

  const browser = await getBrowser()
  const page = await browser.newPage()

  try {
    await page.setContent(html, { waitUntil: 'networkidle0' })

    const pdfBuffer = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    })

    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="report.pdf"',
      },
    })
  } finally {
    await page.close()
  }
}
