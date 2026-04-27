import { NextRequest, NextResponse } from 'next/server'
import { getUniversalDb } from '@/lib/db-universal'
import { requireAuth } from '../../middleware'

const SLUG_TO_NAME: Record<string, string> = {
  'timber-and-love':        'Timber + Love',
  'buy-my-house-boise':     'Buy My House Boise',
  'friday-coffee-house':    'Friday Coffee House',
  'timber-and-love-realty': 'Timber and Love Realty',
  'boise-boys':             'Boise Boys',
  'stay-with-us':           'Stay With Us',
  'additional-ventures':    'Additional Ventures',
  'global':                 'Global',
}

function inferPriority(text: string): string {
  const lower = text.toLowerCase()
  if (/urgent|asap|critical|immediately|emergency/.test(lower)) return 'high'
  if (/soon|this week|by friday|end of week/.test(lower)) return 'medium'
  return 'medium'
}

function inferAgent(text: string): string {
  const lower = text.toLowerCase()
  if (/meta|ads|campaign|facebook|instagram|marketing|seo|google ads/.test(lower)) return 'quinn'
  if (/design|logo|brand|visual|ui|ux|layout|creative|mockup|wireframe/.test(lower)) return 'ada'
  if (/content|copy|blog|email|post|write|script|caption|newsletter/.test(lower)) return 'priya'
  if (/social|instagram|tiktok|schedule|reel|story/.test(lower)) return 'zoe'
  if (/sales|pipeline|ghl|lead|crm|follow.?up|outreach|prospect/.test(lower)) return 'omar'
  if (/code|build|develop|website|replit|fix|integrate|api|bug|feature/.test(lower)) return 'kai'
  if (/server|hosting|dns|deploy|uptime|cron|infrastructure|ssl|domain/.test(lower)) return 'sam'
  if (/research|analyze|competitor|market|intel|report|study/.test(lower)) return 'larry'
  if (/project|milestone|timeline|schedule|track|manage|deadline|plan/.test(lower)) return 'maya'
  if (/finance|budget|expense|invoice|receipt|cost|payment|bill/.test(lower)) return 'nora'
  return 'hank'
}

function extractTitle(text: string): string {
  // Remove filler words and cap at ~60 chars
  const cleaned = text
    .replace(/^(please |can you |could you |i need |we need |make |create |build |add |write |set up |fix )/i, '')
    .trim()
  if (cleaned.length <= 60) return cleaned
  // Cut at last word boundary before 60 chars
  const cut = cleaned.substring(0, 60)
  const lastSpace = cut.lastIndexOf(' ')
  return lastSpace > 30 ? cut.substring(0, lastSpace) + '…' : cut + '…'
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth) return auth

  const db = await getUniversalDb()
  const body = await req.json()

  if (!body.text || !body.entity) {
    return NextResponse.json({ error: 'text and entity are required' }, { status: 400 })
  }

  const entityName = SLUG_TO_NAME[body.entity] || body.entity
  const title = extractTitle(body.text)
  const priority = inferPriority(body.text)
  const assignedAgent = inferAgent(body.text)

  const id = `TSK-NL-${Date.now()}`
  const now = new Date().toISOString()

  await db.run(`
    INSERT INTO tasks (id, title, entity, status, priority, assigned_agent, description, source, created_at, updated_at, last_activity_at)
    VALUES (?, ?, ?, 'backlog', ?, ?, ?, 'natural_language', ?, ?, ?)
  `, id, title, entityName, priority, assignedAgent, body.text, now, now, now)

  // Log to activity
  await db.run(`
    INSERT INTO activity (agent, entity, action, detail, task_id, tags)
    VALUES (?, ?, ?, ?, ?, ?)
  `, 'hank', entityName, 'task_created', `Created: ${title}`, id, JSON.stringify(['task', 'natural_language', assignedAgent]))

  const task = await db.get('SELECT * FROM tasks WHERE id = ?', id)

  return NextResponse.json({ ok: true, task })
}
