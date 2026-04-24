export interface ReportPriority {
  title: string
  entity: string
  status: string
  progress_pct: number
  next_action?: string | null
  blockers?: string | null
}

export interface ReportTask {
  title: string
  entity: string
  status: string
  priority: string
  assigned_agent?: string | null
}

export interface ReportApproval {
  title: string
  entity: string
  type: string
  urgency: string
  description: string
  cost_estimate?: string | null
}

export interface ReportAgent {
  agent_name: string
  emoji: string
  role: string
  status: string
  current_task?: string | null
  last_seen?: string | null
  minutes_ago?: number | null
}

export interface ReportInput {
  title: string
  date: string
  recipient: string
  entityScope: string
  priorities?: ReportPriority[]
  tasksByEntity?: Record<string, ReportTask[]>
  approvals?: ReportApproval[]
  agents?: ReportAgent[]
  customNote?: string
}

const ENTITY_COLORS: Record<string, string> = {
  'Timber + Love': '#D4A853',
  'Buy My House Boise': '#EF4444',
  'Friday Coffee House': '#8B5CF6',
  'Timber and Love Realty': '#3B82F6',
  'Boise Boys': '#22C55E',
  'Stay With Us': '#06B6D4',
  'Additional Ventures': '#F97316',
  'Multi-Entity': '#A78BFA',
}

function entityColor(entity: string): string {
  return ENTITY_COLORS[entity] || '#64748b'
}

function statusColor(status: string): string {
  switch (status) {
    case 'active': case 'executing': case 'online': return '#10b981'
    case 'blocked': return '#ef4444'
    case 'paused': case 'idle': return '#f59e0b'
    case 'proposed': case 'pending': return '#3b82f6'
    default: return '#64748b'
  }
}

function priorityLabel(p: string): { text: string; bg: string; fg: string } {
  switch (p) {
    case 'critical': return { text: 'CRITICAL', bg: '#fef2f2', fg: '#dc2626' }
    case 'high': return { text: 'HIGH', bg: '#fffbeb', fg: '#d97706' }
    case 'medium': return { text: 'MED', bg: '#eff6ff', fg: '#2563eb' }
    case 'low': return { text: 'LOW', bg: '#f8fafc', fg: '#64748b' }
    default: return { text: p.toUpperCase(), bg: '#f8fafc', fg: '#64748b' }
  }
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function progressBar(pct: number): string {
  const clampedPct = Math.max(0, Math.min(100, pct))
  const barColor = clampedPct >= 75 ? '#10b981' : clampedPct >= 40 ? '#3b82f6' : '#f59e0b'
  return `
    <div style="display:flex;align-items:center;gap:10px;margin-top:6px;">
      <div style="flex:1;height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden;">
        <div style="width:${clampedPct}%;height:100%;background:${barColor};border-radius:3px;transition:width 0.3s;"></div>
      </div>
      <span style="font-size:12px;font-weight:600;color:${barColor};min-width:36px;text-align:right;">${clampedPct}%</span>
    </div>`
}

function sectionHeader(title: string): string {
  return `
    <div style="margin:32px 0 16px;padding-bottom:8px;border-bottom:2px solid #0f172a;">
      <h2 style="margin:0;font-size:16px;font-weight:700;color:#0f172a;letter-spacing:0.5px;text-transform:uppercase;">${esc(title)}</h2>
    </div>`
}

function buildPrioritiesSection(priorities: ReportPriority[]): string {
  if (!priorities.length) return ''
  let html = sectionHeader('Strategic Priorities')
  html += '<div style="display:flex;flex-direction:column;gap:12px;">'
  for (const p of priorities) {
    const sc = statusColor(p.status)
    html += `
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;border-left:4px solid ${entityColor(p.entity)};">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div style="flex:1;">
            <div style="font-size:14px;font-weight:600;color:#0f172a;margin-bottom:2px;">${esc(p.title)}</div>
            <div style="font-size:11px;color:#64748b;">${esc(p.entity)}</div>
          </div>
          <span style="font-size:10px;font-weight:600;padding:3px 10px;border-radius:12px;background:${sc}15;color:${sc};text-transform:uppercase;letter-spacing:0.5px;">${esc(p.status)}</span>
        </div>
        ${progressBar(p.progress_pct)}
        ${p.next_action || p.blockers ? `
          <div style="margin-top:10px;display:flex;gap:16px;flex-wrap:wrap;">
            ${p.next_action ? `<div style="font-size:11px;color:#475569;"><span style="font-weight:600;color:#0f172a;">Next:</span> ${esc(p.next_action)}</div>` : ''}
            ${p.blockers ? `<div style="font-size:11px;color:#ef4444;"><span style="font-weight:600;">Blocker:</span> ${esc(p.blockers)}</div>` : ''}
          </div>` : ''}
      </div>`
  }
  html += '</div>'
  return html
}

function buildTasksSection(tasksByEntity: Record<string, ReportTask[]>): string {
  const entities = Object.keys(tasksByEntity).filter(e => tasksByEntity[e].length > 0)
  if (!entities.length) return ''

  let html = sectionHeader('Active Tasks')
  for (const entity of entities) {
    const tasks = tasksByEntity[entity]
    const ec = entityColor(entity)
    html += `
      <div style="margin-bottom:20px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
          <div style="width:10px;height:10px;border-radius:50%;background:${ec};"></div>
          <h3 style="margin:0;font-size:13px;font-weight:600;color:#0f172a;">${esc(entity)}</h3>
          <span style="font-size:11px;color:#94a3b8;">${tasks.length} task${tasks.length !== 1 ? 's' : ''}</span>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead>
            <tr style="border-bottom:1px solid #e2e8f0;">
              <th style="text-align:left;padding:8px 12px;font-weight:600;color:#64748b;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">Priority</th>
              <th style="text-align:left;padding:8px 12px;font-weight:600;color:#64748b;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">Task</th>
              <th style="text-align:left;padding:8px 12px;font-weight:600;color:#64748b;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">Status</th>
              <th style="text-align:left;padding:8px 12px;font-weight:600;color:#64748b;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">Agent</th>
            </tr>
          </thead>
          <tbody>`
    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i]
      const pl = priorityLabel(t.priority)
      const sc = statusColor(t.status)
      const rowBg = i % 2 === 0 ? '#ffffff' : '#f8fafc'
      html += `
            <tr style="background:${rowBg};border-bottom:1px solid #f1f5f9;">
              <td style="padding:8px 12px;"><span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:4px;background:${pl.bg};color:${pl.fg};">${pl.text}</span></td>
              <td style="padding:8px 12px;color:#1e293b;font-weight:500;">${esc(t.title)}</td>
              <td style="padding:8px 12px;"><span style="font-size:10px;font-weight:600;color:${sc};">${esc(t.status)}</span></td>
              <td style="padding:8px 12px;color:#64748b;">${t.assigned_agent ? esc(t.assigned_agent) : '—'}</td>
            </tr>`
    }
    html += '</tbody></table></div>'
  }
  return html
}

function buildApprovalsSection(approvals: ReportApproval[]): string {
  if (!approvals.length) return ''
  let html = sectionHeader('Pending Approvals')
  html += '<div style="display:flex;flex-direction:column;gap:10px;">'
  for (const a of approvals) {
    const isUrgent = a.urgency === 'urgent'
    const borderColor = isUrgent ? '#ef4444' : '#e2e8f0'
    html += `
      <div style="background:${isUrgent ? '#fef2f2' : '#f8fafc'};border:1px solid ${borderColor};border-radius:8px;padding:14px 16px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
          <div style="font-size:13px;font-weight:600;color:#0f172a;">${esc(a.title)}</div>
          <div style="display:flex;gap:6px;">
            ${isUrgent ? '<span style="font-size:9px;font-weight:700;padding:2px 8px;border-radius:4px;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;text-transform:uppercase;">Urgent</span>' : ''}
            <span style="font-size:9px;font-weight:600;padding:2px 8px;border-radius:4px;background:#f1f5f9;color:#475569;text-transform:uppercase;">${esc(a.type)}</span>
          </div>
        </div>
        <div style="font-size:11px;color:#64748b;margin-bottom:4px;">${esc(a.entity)}</div>
        <div style="font-size:12px;color:#475569;line-height:1.5;">${esc(a.description)}</div>
        ${a.cost_estimate ? `<div style="margin-top:8px;font-size:12px;font-weight:600;color:#0f172a;">Est. Cost: ${esc(a.cost_estimate)}</div>` : ''}
      </div>`
  }
  html += '</div>'
  return html
}

function buildAgentsSection(agents: ReportAgent[]): string {
  if (!agents.length) return ''
  let html = sectionHeader('Agent Team Status')
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;">'
  for (const a of agents) {
    const dotColor = !a.minutes_ago ? '#94a3b8' : a.minutes_ago < 60 ? '#10b981' : a.minutes_ago < 180 ? '#f59e0b' : '#ef4444'
    const statusText = !a.minutes_ago ? 'Unknown' : a.minutes_ago < 60 ? 'Online' : a.minutes_ago < 180 ? 'Away' : 'Offline'
    html += `
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          <span style="font-size:16px;">${a.emoji}</span>
          <div>
            <div style="font-size:12px;font-weight:600;color:#0f172a;">${esc(a.agent_name)}</div>
            <div style="font-size:10px;color:#64748b;">${esc(a.role)}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:5px;margin-bottom:4px;">
          <div style="width:6px;height:6px;border-radius:50%;background:${dotColor};"></div>
          <span style="font-size:10px;color:${dotColor};font-weight:600;">${statusText}</span>
        </div>
        ${a.current_task ? `<div style="font-size:11px;color:#475569;line-height:1.4;margin-top:4px;border-top:1px solid #e2e8f0;padding-top:6px;">${esc(a.current_task)}</div>` : ''}
      </div>`
  }
  html += '</div>'
  return html
}

export function buildReportHtml(input: ReportInput): string {
  let body = ''

  if (input.priorities?.length) {
    body += buildPrioritiesSection(input.priorities)
  }
  if (input.tasksByEntity && Object.keys(input.tasksByEntity).length) {
    body += buildTasksSection(input.tasksByEntity)
  }
  if (input.approvals?.length) {
    body += buildApprovalsSection(input.approvals)
  }
  if (input.agents?.length) {
    body += buildAgentsSection(input.agents)
  }
  if (input.customNote) {
    body += sectionHeader('Notes')
    body += `<div style="font-size:13px;color:#475569;line-height:1.7;white-space:pre-wrap;">${esc(input.customNote)}</div>`
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(input.title)}</title>
<style>
  @page { size: letter; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif;
    color: #1e293b;
    background: #ffffff;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
  <!-- Header -->
  <div style="background:linear-gradient(135deg, #0f172a 0%, #1e293b 100%);padding:40px 48px 32px;position:relative;overflow:hidden;">
    <div style="position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg, #D4A853, #e5c97a, #D4A853);"></div>
    <div style="position:absolute;top:0;right:0;width:300px;height:300px;background:radial-gradient(circle at center, rgba(212,168,83,0.08) 0%, transparent 70%);"></div>
    <div style="position:relative;">
      <div style="font-size:11px;font-weight:700;color:#D4A853;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;">Timber + Love</div>
      <h1 style="font-size:28px;font-weight:700;color:#ffffff;margin-bottom:16px;letter-spacing:-0.5px;line-height:1.2;">${esc(input.title)}</h1>
      <div style="display:flex;gap:24px;flex-wrap:wrap;">
        <div style="font-size:12px;color:#94a3b8;"><span style="color:#cbd5e1;font-weight:600;">Date</span>&ensp;${esc(input.date)}</div>
        <div style="font-size:12px;color:#94a3b8;"><span style="color:#cbd5e1;font-weight:600;">Prepared for</span>&ensp;${esc(input.recipient)}</div>
        <div style="font-size:12px;color:#94a3b8;"><span style="color:#cbd5e1;font-weight:600;">Scope</span>&ensp;${esc(input.entityScope === 'all' ? 'All Entities' : input.entityScope)}</div>
      </div>
    </div>
  </div>

  <!-- Body -->
  <div style="padding:24px 48px 40px;">
    ${body}
  </div>

  <!-- Footer -->
  <div style="padding:16px 48px 24px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;">
    <div style="font-size:10px;color:#94a3b8;">Generated by <span style="font-weight:600;color:#64748b;">Mission Control</span> · Hank</div>
    <div style="font-size:10px;color:#94a3b8;">${esc(input.date)}</div>
  </div>
</body>
</html>`
}
