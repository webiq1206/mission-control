import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAuth } from '../../middleware'
import { ENTITIES } from '@/lib/entities'
import { format } from 'date-fns'
import {
  buildReportHtml,
  type ReportPriority,
  type ReportTask,
  type ReportApproval,
  type ReportAgent,
} from '@/lib/report-html'

export async function POST(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth) return auth

  const body = await req.json()
  const db = getDb()
  const date = format(new Date(), 'MMMM d, yyyy')

  const entityFilter =
    body.entity_scope === 'all'
      ? ENTITIES.map(e => e.label)
      : [body.entity_scope]

  let priorities: ReportPriority[] | undefined
  let tasksByEntity: Record<string, ReportTask[]> | undefined
  let approvals: ReportApproval[] | undefined
  let agents: ReportAgent[] | undefined

  if (body.sections?.priorities) {
    const rows = db
      .prepare(
        `SELECT * FROM priorities WHERE status != 'completed' ORDER BY sort_order`
      )
      .all() as Record<string, unknown>[]

    priorities = rows
      .filter(
        r =>
          body.entity_scope === 'all' ||
          entityFilter.includes(r.entity as string)
      )
      .map(r => ({
        title: r.title as string,
        entity: r.entity as string,
        status: r.status as string,
        progress_pct: (r.progress_pct as number) || 0,
        next_action: r.next_action as string | null,
        blockers: r.blockers as string | null,
      }))
  }

  if (body.sections?.tasks) {
    tasksByEntity = {}
    for (const entity of entityFilter) {
      const rows = db
        .prepare(
          `SELECT * FROM tasks
           WHERE (entity = ? OR entity = ?)
             AND status NOT IN ('completed', 'backlog')
           ORDER BY CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 ELSE 3 END
           LIMIT 15`
        )
        .all(entity, entity.toLowerCase().replace(/\s+/g, '-')) as Record<
        string,
        unknown
      >[]

      if (rows.length > 0) {
        tasksByEntity[entity] = rows.map(t => ({
          title: t.title as string,
          entity: entity,
          status: t.status as string,
          priority: t.priority as string,
          assigned_agent: t.assigned_agent as string | null,
        }))
      }
    }
  }

  if (body.sections?.approvals) {
    const rows = db
      .prepare(
        `SELECT * FROM approvals WHERE status = 'pending' ORDER BY created_at ASC`
      )
      .all() as Record<string, unknown>[]

    if (rows.length > 0) {
      approvals = rows.map(a => ({
        title: a.title as string,
        entity: a.entity as string,
        type: a.type as string,
        urgency: a.urgency as string,
        description: a.description as string,
        cost_estimate: a.cost_estimate as string | null,
      }))
    }
  }

  if (body.sections?.agents) {
    const rows = db
      .prepare('SELECT * FROM agent_heartbeats')
      .all() as Record<string, unknown>[]

    agents = rows.map(a => {
      const minsAgo = a.last_seen
        ? Math.floor(
            (Date.now() - new Date(a.last_seen as string).getTime()) / 60000
          )
        : null
      return {
        agent_name: a.agent_name as string,
        emoji: (a.emoji as string) || '',
        role: a.role as string,
        status: a.status as string,
        current_task: a.current_task as string | null,
        last_seen: a.last_seen as string | null,
        minutes_ago: minsAgo,
      }
    })
  }

  const html = buildReportHtml({
    title: body.title,
    date,
    recipient: body.recipient_name,
    entityScope: body.entity_scope,
    priorities,
    tasksByEntity,
    approvals,
    agents,
    customNote: body.custom_note || undefined,
  })

  return NextResponse.json({ content_html: html })
}
