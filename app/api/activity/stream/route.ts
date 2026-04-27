import { getUniversalDb } from '@/lib/db-universal'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const headerToken = req.headers.get('authorization')?.replace('Bearer ', '')
  const queryToken = new URL(req.url).searchParams.get('token')
  if (headerToken !== process.env.GATEWAY_TOKEN && queryToken !== process.env.GATEWAY_TOKEN) {
    return new Response('Unauthorized', { status: 401 })
  }

  const encoder = new TextEncoder()
  let lastId = 0

  const stream = new ReadableStream({
    async start(controller) {
      const db = await getUniversalDb()

      // Seed: last 30 non-heartbeat entries
      const seedRows = await db.all("SELECT * FROM activity WHERE action != 'heartbeat' ORDER BY id DESC LIMIT 30")
      const seed = seedRows.reverse()
      for (const row of seed) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(row)}\n\n`))
        lastId = Math.max(lastId, (row as Record<string, unknown>).id as number)
      }

      // Start past any heartbeat rows already in the table
      const maxRow = await db.get('SELECT MAX(id) as max_id FROM activity') as { max_id: number | null } | undefined
      if (maxRow?.max_id) lastId = Math.max(lastId, maxRow.max_id)

      const interval = setInterval(() => {
        void (async () => {
        try {
          const rows = await db.all('SELECT * FROM activity WHERE id > ? ORDER BY id ASC', lastId) as Record<string, unknown>[]
          for (const row of rows) {
            lastId = Math.max(lastId, row.id as number)
            if (row.action === 'heartbeat') continue
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(row)}\n\n`))
          }
        } catch {
          clearInterval(interval)
          controller.close()
        }
        })();
      }, 800)

      req.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    }
  })
}
