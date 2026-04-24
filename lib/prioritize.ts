import type { Task } from './types'

interface ScoredTask extends Task {
  priority_score: number
  priority_reason: string
}

export function scoreTasks(tasks: Task[]): ScoredTask[] {
  const now = Date.now()

  return tasks
    .filter(t => t.status !== 'completed')
    .map(task => {
      let score = 0
      const reasons: string[] = []

      const pMap: Record<string, number> = { critical: 100, high: 75, medium: 50, low: 25 }
      score += pMap[task.priority] || 50

      if (task.due_at) {
        const hoursUntil = (new Date(task.due_at).getTime() - now) / (1000 * 60 * 60)
        if (hoursUntil < 0)       { score += 80; reasons.push('overdue') }
        else if (hoursUntil < 24) { score += 60; reasons.push('due today') }
        else if (hoursUntil < 72) { score += 30; reasons.push('due this week') }
      }

      if (task.status === 'approval_gated') { score += 40; reasons.push('needs approval') }
      if (task.status === 'blocked')         { score -= 20; reasons.push('blocked') }
      if (task.status === 'review')          { score += 50; reasons.push('needs review') }

      const hoursSinceActivity = (now - new Date(task.last_activity_at).getTime()) / (1000 * 60 * 60)
      if (hoursSinceActivity > 48) { score -= 10; reasons.push('stale') }

      return {
        ...task,
        priority_score: Math.max(0, Math.min(200, score)),
        priority_reason: reasons.join(' · ') || 'standard',
      }
    })
    .sort((a, b) => b.priority_score - a.priority_score)
}
