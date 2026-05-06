import { NextRequest, NextResponse } from 'next/server'
import { getUniversalDb } from '@/lib/db-universal'
import { AGENTS } from '@/lib/entities'
import { detectIntent } from '@/lib/llm'
import { requireAuth } from '../middleware'

const ENTITY_REF_PATTERN = /\[(approval|task|priority|idea|recommendation):([^\]]+)\]/g

interface ActivityRow {
  id: number
  agent: string
  entity?: string
  action: string
  detail?: string
  task_id?: string
  tags?: string
}

type UniversalDb = Awaited<ReturnType<typeof getUniversalDb>>

async function resolveActivityContext(db: UniversalDb, activityId: string) {
  const row = await db.get<ActivityRow>('SELECT * FROM activity WHERE id = ?', activityId)
  if (!row?.detail) return null

  const refs: { type: string; id: string }[] = []
  let match: RegExpExecArray | null
  const re = new RegExp(ENTITY_REF_PATTERN.source, ENTITY_REF_PATTERN.flags)
  while ((match = re.exec(row.detail)) !== null) {
    refs.push({ type: match[1], id: match[2] })
  }

  return { activity: row, refs }
}

export async function POST(req: NextRequest) {
  const authError = requireAuth(req)
  if (authError) return authError
  const db = await getUniversalDb()
  const body = await req.json()
  let { itemType, itemId, command, entitySlug } = body
  const confirmed = body.confirmed === true

  if (!command) {
    return NextResponse.json({ error: 'command is required' }, { status: 400 })
  }

  const lower = command.toLowerCase().trim()

  try {
    // --- Resolve activity references ---
    let activityContext: Awaited<ReturnType<typeof resolveActivityContext>> = null
    const originalItemType = itemType

    if (itemType === 'activity') {
      activityContext = await resolveActivityContext(db, itemId)
      if (activityContext?.refs.length) {
        const ref = activityContext.refs[0]
        itemType = ref.type
        itemId = ref.id
        if (!entitySlug && activityContext.activity.entity) {
          entitySlug = activityContext.activity.entity
        }
      }
    }

    // --- Status commands ---
    const approveMatch = /^(approve|accept|go ahead|proceed|lgtm|yes)\b/.test(lower)
    const rejectMatch = /^(reject|decline|deny|no|cancel)\b/.test(lower)
    const blockMatch = /^(block|pause|hold)\b/.test(lower)
    const completeMatch = /^(complete|done|finish|mark.?done|mark.?complete)\b/.test(lower)

    if (approveMatch && itemType === 'approval') {
      await db.run('UPDATE approvals SET status = ?, decided_by = ?, decided_at = ? WHERE id = ?',
        'approved', 'jared', new Date().toISOString(), itemId)
      await logActivity(db, 'jared', entitySlug, 'approval_approved', `Approved: ${itemId}`, itemId)
      return NextResponse.json({ message: 'Approval granted' })
    }

    if (rejectMatch && itemType === 'approval') {
      const reason = command.replace(/^(reject|decline|deny|no|cancel)[:\s—–-]*/i, '').trim()
      await db.run('UPDATE approvals SET status = ?, decided_by = ?, decided_at = ? WHERE id = ?',
        'rejected', 'jared', new Date().toISOString(), itemId)
      await logActivity(db, 'jared', entitySlug, 'approval_rejected', `Rejected: ${itemId}${reason ? ` — ${reason}` : ''}`, itemId)
      return NextResponse.json({ message: 'Approval rejected' })
    }

    if (approveMatch && itemType === 'recommendation') {
      await db.run('UPDATE ad_recommendations SET status = ?, decision = ? WHERE id = ?',
        'approved', 'Approved by Jared', itemId)
      await logActivity(db, 'jared', entitySlug, 'recommendation_approved', `Approved recommendation: ${itemId}`, itemId)
      return NextResponse.json({ message: 'Recommendation approved' })
    }

    if (rejectMatch && itemType === 'recommendation') {
      const reason = command.replace(/^(reject|decline|deny|no|cancel)[:\s—–-]*/i, '').trim()
      await db.run('UPDATE ad_recommendations SET status = ?, decision = ? WHERE id = ?',
        'rejected', reason || 'Rejected by Jared', itemId)
      return NextResponse.json({ message: 'Recommendation rejected' })
    }

    // --- Priority commands ---
    if (itemType === 'priority') {
      const progressMatch = lower.match(/(?:progress|update|set)\s*(?:to)?\s*(\d+)\s*%?/)
      if (progressMatch) {
        await db.run('UPDATE priorities SET progress_pct = ? WHERE id = ?',
          parseInt(progressMatch[1]), itemId)
        return NextResponse.json({ message: `Progress updated to ${progressMatch[1]}%` })
      }

      const statusMatch = lower.match(/(?:mark|set|change|move)\s*(?:as|to)?\s*(active|blocked|paused|completed)/)
      if (statusMatch) {
        await db.run('UPDATE priorities SET status = ? WHERE id = ?', statusMatch[1], itemId)
        return NextResponse.json({ message: `Status changed to ${statusMatch[1]}` })
      }

      const blockerMatch = lower.match(/(?:add\s+blocker|blocker)[:\s]+(.+)/i)
      if (blockerMatch) {
        const existing = await db.get<Record<string, string>>('SELECT blockers FROM priorities WHERE id = ?', itemId)
        const updated = existing?.blockers ? `${existing.blockers}; ${blockerMatch[1]}` : blockerMatch[1]
        await db.run('UPDATE priorities SET blockers = ? WHERE id = ?', updated, itemId)
        return NextResponse.json({ message: 'Blocker added' })
      }
    }

    // --- Task-specific commands ---
    if (itemType === 'task') {
      if (approveMatch) {
        await db.run('UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?',
          'approved', new Date().toISOString(), itemId)
        return NextResponse.json({ message: 'Task approved' })
      }
      if (rejectMatch) {
        await db.run('UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?',
          'blocked', new Date().toISOString(), itemId)
        return NextResponse.json({ message: 'Task rejected and blocked' })
      }
      if (completeMatch) {
        await db.run('UPDATE tasks SET status = ?, updated_at = ?, completed_at = ? WHERE id = ?',
          'completed', new Date().toISOString(), new Date().toISOString(), itemId)
        return NextResponse.json({ message: 'Task marked complete' })
      }
      if (blockMatch) {
        await db.run('UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?',
          'blocked', new Date().toISOString(), itemId)
        return NextResponse.json({ message: 'Task blocked' })
      }

      const assignMatch = lower.match(/(?:assign|reassign|give)\s*(?:to)?\s+(\w+)/)
      if (assignMatch) {
        const agentName = assignMatch[1]
        const agent = AGENTS.find(a => a.id === agentName || a.name.toLowerCase() === agentName)
        if (agent) {
          await db.run('UPDATE tasks SET assigned_agent = ?, updated_at = ? WHERE id = ?',
            agent.id, new Date().toISOString(), itemId)
          return NextResponse.json({ message: `Reassigned to ${agent.name}` })
        }
      }

      const priorityMatch = lower.match(/(critical|high|medium|low)\s*priority|priority\s*(critical|high|medium|low)/)
      if (priorityMatch) {
        const priority = priorityMatch[1] || priorityMatch[2]
        await db.run('UPDATE tasks SET priority = ?, updated_at = ? WHERE id = ?',
          priority, new Date().toISOString(), itemId)
        return NextResponse.json({ message: `Priority set to ${priority}` })
      }
    }

    // --- Create task from any item ---
    const createTaskMatch = lower.match(/^(?:create\s+(?:a\s+)?task|add\s+(?:a\s+)?(?:follow[- ]?up|task))[:\s]*(.*)/)
    if (createTaskMatch) {
      const taskText = createTaskMatch[1].trim() || `Follow-up from ${itemType}: ${itemId}`
      const id = `TSK-NL-${Date.now()}`
      const now = new Date().toISOString()
      await db.run(`
        INSERT INTO tasks (id, title, entity, status, priority, assigned_agent, description, source, created_at, updated_at, last_activity_at)
        VALUES (?, ?, ?, 'backlog', 'medium', 'hank', ?, 'nl_command', ?, ?, ?)
      `, id, taskText, entitySlug || 'Global', `Created from ${itemType} ${itemId} via NL command`, now, now, now)
      await logActivity(db, 'jared', entitySlug, 'task_created', `Created task: ${taskText}`, id)
      return NextResponse.json({ message: `Task created: "${taskText}"` })
    }

    // --- Modify commands for approvals (cost, scope) ---
    if (itemType === 'approval') {
      const costMatch = lower.match(/(?:modify|change|update|set)\s+(?:cost|budget|estimate)\s+(?:to\s+)?(.+)/i)
      if (costMatch) {
        await db.run('UPDATE approvals SET cost_estimate = ? WHERE id = ?', costMatch[1].trim(), itemId)
        return NextResponse.json({ message: `Cost estimate updated to ${costMatch[1].trim()}` })
      }
    }

    // --- Idea commands ---
    if (itemType === 'idea') {
      if (approveMatch) {
        await db.run('UPDATE ideas SET status = ?, reviewed_at = ? WHERE id = ?',
          'approved', new Date().toISOString(), itemId)
        await logActivity(db, 'jared', entitySlug, 'idea_approved', `Approved idea: ${itemId}`)
        return NextResponse.json({ message: 'Idea approved' })
      }
      if (rejectMatch) {
        await db.run('UPDATE ideas SET status = ?, reviewed_at = ? WHERE id = ?',
          'rejected', new Date().toISOString(), itemId)
        await logActivity(db, 'jared', entitySlug, 'idea_rejected', `Rejected idea: ${itemId}`)
        return NextResponse.json({ message: 'Idea rejected' })
      }

      const ideaTaskMatch = lower.match(/^(?:create\s+(?:a\s+)?task|convert)[:\s]*(.*)/)
      if (ideaTaskMatch) {
        const idea = await db.get<Record<string, string>>('SELECT * FROM ideas WHERE id = ?', itemId)
        if (idea) {
          const taskId = `TSK-IDEA-${Date.now()}`
          const now = new Date().toISOString()
          const desc = [idea.context, idea.objective, idea.next_steps].filter(Boolean).join('\n\n')
          await db.run(`
            INSERT INTO tasks (id, title, entity, status, priority, assigned_agent, description, source, created_at, updated_at, last_activity_at)
            VALUES (?, ?, ?, 'backlog', ?, 'hank', ?, 'idea', ?, ?, ?)
          `, taskId, idea.title, idea.entity || entitySlug || 'Global', idea.priority || 'medium',
            desc || idea.description || `Created from idea ${itemId}`, now, now, now)

          await db.run('UPDATE ideas SET status = ?, reviewed_at = ? WHERE id = ?',
            'converted', now, itemId)

          await logActivity(db, 'jared', entitySlug, 'idea_converted', `Converted idea "${idea.title}" to task ${taskId}`, taskId)
          return NextResponse.json({ message: `Task created: "${idea.title}" (${taskId})` })
        }
      }
    }

    // --- LLM Intent Detection fallback ---
    const intent = await detectIntent({
      command,
      itemType: originalItemType,
      itemId: body.itemId,
      entitySlug,
      activityDetail: activityContext?.activity?.detail,
      resolvedRef: activityContext?.refs?.[0] ?? null,
    })

    if (intent && intent.action !== 'note') {
      const destructive = ['reject', 'block'].includes(intent.action)
      if (destructive && !confirmed) {
        return NextResponse.json({
          message: intent.description || `${intent.action} ${intent.targetType} ${intent.targetId}?`,
          requiresConfirmation: true,
          pendingAction: intent,
        })
      }

      return await executeIntent(db, intent, entitySlug, command)
    }

    // --- Default: log as a note/instruction ---
    await logActivity(db, 'jared', entitySlug, 'note', `[${originalItemType}:${body.itemId}] ${command}`)
    return NextResponse.json({ message: 'Logged as an instruction' })

  } catch (e: unknown) {
    console.error('NL command error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Command failed' }, { status: 500 })
  }
}

interface IntentResult {
  action: string
  targetType: string
  targetId: string
  description?: string
  params?: Record<string, string>
}

async function executeIntent(
  db: UniversalDb,
  intent: IntentResult,
  entitySlug: string | undefined,
  originalCommand: string,
): Promise<NextResponse> {
  const { action, targetType, targetId, params } = intent
  const now = new Date().toISOString()

  if (targetType === 'approval') {
    if (action === 'approve') {
      await db.run('UPDATE approvals SET status = ?, decided_by = ?, decided_at = ?, decision_note = ? WHERE id = ?',
        'approved', 'jared', now, params?.note || originalCommand, targetId)
      await logActivity(db, 'jared', entitySlug, 'approval_approved', `Approved: ${targetId}`, targetId)
      return NextResponse.json({ message: `Approval ${targetId} granted` })
    }
    if (action === 'reject') {
      await db.run('UPDATE approvals SET status = ?, decided_by = ?, decided_at = ?, decision_note = ? WHERE id = ?',
        'rejected', 'jared', now, params?.reason || originalCommand, targetId)
      await logActivity(db, 'jared', entitySlug, 'approval_rejected', `Rejected: ${targetId}`, targetId)
      return NextResponse.json({ message: `Approval ${targetId} rejected` })
    }
  }

  if (targetType === 'task') {
    if (action === 'complete') {
      await db.run('UPDATE tasks SET status = ?, updated_at = ?, completed_at = ? WHERE id = ?',
        'completed', now, now, targetId)
      return NextResponse.json({ message: `Task ${targetId} marked complete` })
    }
    if (action === 'approve') {
      await db.run('UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?',
        'approved', now, targetId)
      return NextResponse.json({ message: `Task ${targetId} approved` })
    }
    if (action === 'block') {
      await db.run('UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?',
        'blocked', now, targetId)
      return NextResponse.json({ message: `Task ${targetId} blocked` })
    }
    if (action === 'assign' && params?.agent) {
      const agent = AGENTS.find(a => a.id === params.agent || a.name.toLowerCase() === params.agent!.toLowerCase())
      if (agent) {
        await db.run('UPDATE tasks SET assigned_agent = ?, updated_at = ? WHERE id = ?',
          agent.id, now, targetId)
        return NextResponse.json({ message: `Task ${targetId} assigned to ${agent.name}` })
      }
    }
  }

  if (targetType === 'priority') {
    if (action === 'update_progress' && params?.value) {
      await db.run('UPDATE priorities SET progress_pct = ? WHERE id = ?',
        parseInt(params.value), targetId)
      return NextResponse.json({ message: `Progress on ${targetId} updated to ${params.value}%` })
    }
    if (['block', 'complete'].includes(action)) {
      const status = action === 'complete' ? 'completed' : 'blocked'
      await db.run('UPDATE priorities SET status = ? WHERE id = ?', status, targetId)
      return NextResponse.json({ message: `Priority ${targetId} set to ${status}` })
    }
  }

  if (targetType === 'idea') {
    if (action === 'approve') {
      await db.run('UPDATE ideas SET status = ?, reviewed_at = ? WHERE id = ?',
        'approved', now, targetId)
      await logActivity(db, 'jared', entitySlug, 'idea_approved', `Approved idea: ${targetId}`)
      return NextResponse.json({ message: `Idea ${targetId} approved` })
    }
    if (action === 'reject') {
      await db.run('UPDATE ideas SET status = ?, reviewed_at = ? WHERE id = ?',
        'rejected', now, targetId)
      await logActivity(db, 'jared', entitySlug, 'idea_rejected', `Rejected idea: ${targetId}`)
      return NextResponse.json({ message: `Idea ${targetId} rejected` })
    }
  }

  if (targetType === 'recommendation') {
    if (action === 'approve') {
      await db.run('UPDATE ad_recommendations SET status = ?, decision = ? WHERE id = ?',
        'approved', 'Approved by Jared', targetId)
      await logActivity(db, 'jared', entitySlug, 'recommendation_approved', `Approved recommendation: ${targetId}`)
      return NextResponse.json({ message: `Recommendation ${targetId} approved` })
    }
    if (action === 'reject') {
      await db.run('UPDATE ad_recommendations SET status = ?, decision = ? WHERE id = ?',
        'rejected', params?.reason || 'Rejected by Jared', targetId)
      return NextResponse.json({ message: `Recommendation ${targetId} rejected` })
    }
  }

  if (action === 'create_task') {
    const title = params?.title || `Follow-up from ${targetType}: ${targetId}`
    const id = `TSK-NL-${Date.now()}`
    await db.run(`
      INSERT INTO tasks (id, title, entity, status, priority, assigned_agent, description, source, created_at, updated_at, last_activity_at)
      VALUES (?, ?, ?, 'backlog', 'medium', 'hank', ?, 'nl_command', ?, ?, ?)
    `, id, title, entitySlug || 'Global', `Created via smart instruct from ${targetType} ${targetId}`, now, now, now)
    await logActivity(db, 'jared', entitySlug, 'task_created', `Created task: ${title}`, id)
    return NextResponse.json({ message: `Task created: "${title}"` })
  }

  await logActivity(db, 'jared', entitySlug, 'note', `[llm-intent:${action}] ${originalCommand}`)
  return NextResponse.json({ message: 'Logged as an instruction' })
}

async function logActivity(
  db: UniversalDb,
  agent: string,
  entity: string | undefined,
  action: string,
  detail: string,
  taskId?: string,
) {
  const validTaskId = taskId?.startsWith('TSK') ? taskId : null
  await db.run(`
    INSERT INTO activity (agent, entity, action, detail, task_id, tags)
    VALUES (?, ?, ?, ?, ?, ?)
  `, agent, entity || 'Global', action, detail, validTaskId, JSON.stringify(['nl_command', action]))
}
