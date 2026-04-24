'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ActivityEntry, AgentHeartbeat } from '@/lib/types'
import { AGENTS, ENTITIES } from '@/lib/entities'
import { EntityBadge } from '@/components/ui/EntityBadge'

function getActionBadge(action: string): { label: string; bg: string; color: string } {
  switch (action) {
    case 'blocked':
      return { label: 'BLOCKED', bg: 'var(--red-bg)', color: 'var(--red)' }
    case 'task_completed':
      return { label: 'COMPLETED', bg: 'var(--green-bg)', color: 'var(--green)' }
    case 'task_in_progress':
      return { label: 'EXECUTING', bg: 'var(--blue-bg)', color: 'var(--blue)' }
    case 'task_created':
      return { label: 'TASK CREATED', bg: 'var(--blue-bg)', color: 'var(--blue)' }
    case 'task_assigned':
      return { label: 'ASSIGNED', bg: 'var(--amber-bg)', color: 'var(--amber)' }
    case 'approval_requested':
      return { label: 'APPROVAL REQ', bg: 'var(--amber-bg)', color: 'var(--amber)' }
    case 'approval_approved':
      return { label: 'APPROVED', bg: 'var(--green-bg)', color: 'var(--green)' }
    case 'approval_rejected':
      return { label: 'REJECTED', bg: 'var(--red-bg)', color: 'var(--red)' }
    case 'approval_acknowledged':
      return { label: 'ACKNOWLEDGED', bg: 'var(--slate-bg)', color: 'var(--slate)' }
    case 'recommendation_approved':
      return { label: 'REC APPROVED', bg: 'var(--green-bg)', color: 'var(--green)' }
    case 'note':
      return { label: 'NOTE', bg: 'var(--purple-bg)', color: 'var(--purple)' }
    case 'error':
      return { label: 'ERROR', bg: 'var(--red-bg)', color: 'var(--red)' }
    case 'system':
      return { label: 'SYSTEM', bg: 'rgba(85,85,85,0.1)', color: 'var(--text-muted)' }
    case 'asset_registered':
      return { label: 'ASSET', bg: 'var(--purple-bg)', color: 'var(--purple)' }
    default:
      return { label: action.toUpperCase().replace(/_/g, ' '), bg: 'rgba(85,85,85,0.1)', color: 'var(--text-secondary)' }
  }
}

const TASK_ACTIONS = new Set(['task_created', 'task_in_progress', 'task_completed', 'task_assigned'])
const APPROVAL_ACTIONS = new Set(['approval_approved', 'approval_rejected', 'approval_requested', 'approval_acknowledged', 'recommendation_approved'])
const ALERT_ACTIONS = new Set(['blocked', 'error'])

const FILTER_TABS = [
  { label: 'All',       key: 'all' },
  { label: 'Tasks',     key: 'tasks' },
  { label: 'Approvals', key: 'approvals' },
  { label: 'Alerts',    key: 'alerts' },
]

function matchesFilter(item: ActivityEntry, filter: string): boolean {
  if (filter === 'all') return true
  if (filter === 'tasks') return TASK_ACTIONS.has(item.action)
  if (filter === 'approvals') return APPROVAL_ACTIONS.has(item.action)
  if (filter === 'alerts') return ALERT_ACTIONS.has(item.action) || item.tags?.includes('review-needed')
  return true
}

function resolveAgent(agentId: string) {
  return AGENTS.find(a => a.id === agentId || a.name.toLowerCase() === agentId?.toLowerCase()) ?? null
}

function timeAgo(ts: string) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000
  if (diff < 60) return `${Math.floor(diff)}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  return `${Math.floor(diff / 3600)}h`
}

function isHeartbeatOnly(item: ActivityEntry): boolean {
  const action = item.action?.toLowerCase()
  const detail = item.detail?.toLowerCase() || ''
  if (action === 'heartbeat') return true
  if (action === 'system' && detail.includes('heartbeat')) return true
  return false
}

function cleanDisplayText(text: string): string {
  if (!text) return ''
  return text.replace(/\/Users\/[^\s]+/g, (match) => {
    const filename = match.split('/').pop() || match
    return filename
  })
}

function hasRawFilePath(text: string): boolean {
  return /\/Users\//.test(text) || /\.openclaw\//.test(text)
}

function extractFilename(text: string): string | null {
  const match = text.match(/\/Users\/[^\s]+/)
  if (!match) return null
  return match[0].split('/').pop() || null
}

const STATUS_DOT: Record<string, string> = {
  active:  'var(--green)',
  idle:    'var(--text-secondary)',
  blocked: 'var(--red)',
  error:   'var(--red)',
  offline: 'var(--text-faint)',
}

function AgentStatusStrip({ agents }: { agents: AgentHeartbeat[] }) {
  if (agents.length === 0) return null
  return (
    <div style={{
      padding: '8px 12px',
      borderBottom: '1px solid var(--border-faint)',
      display: 'flex',
      flexWrap: 'wrap',
      gap: 4,
    }}>
      {agents.map(agent => {
        const dotColor = STATUS_DOT[agent.status] || STATUS_DOT.idle
        const isActive = agent.status === 'active'
        return (
          <div
            key={agent.agent_id}
            title={`${agent.agent_name} (${agent.role})\n${agent.status} — ${agent.current_task || 'No active task'}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '3px 6px', borderRadius: 4,
              background: isActive ? 'var(--green-bg)' : 'var(--bg-inset)',
              border: `1px solid ${isActive ? 'var(--green-border)' : 'var(--border-invisible)'}`,
            }}
          >
            <span style={{
              width: 5, height: 5, borderRadius: '50%', background: dotColor, flexShrink: 0,
              boxShadow: isActive ? `0 0 4px ${dotColor}` : 'none',
            }} />
            <span style={{ fontSize: 10 }}>{agent.emoji}</span>
            <span style={{
              fontSize: 9, fontFamily: 'var(--font-mono)',
              color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              maxWidth: 60,
            }}>
              {agent.agent_name}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function ActivityFeed() {
  const [items, setItems] = useState<ActivityEntry[]>([])
  const [agents, setAgents] = useState<AgentHeartbeat[]>([])
  const [filter, setFilter] = useState('all')
  const bottomRef = useRef<HTMLDivElement>(null)

  const fetchAgents = useCallback(async () => {
    try {
      const token = process.env.NEXT_PUBLIC_GATEWAY_TOKEN
      const res = await fetch(`/api/agents`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json() as AgentHeartbeat[]
        setAgents(data.sort((a, b) => {
          const order: Record<string, number> = { active: 0, blocked: 1, error: 2, idle: 3, offline: 4 }
          return (order[a.status] ?? 5) - (order[b.status] ?? 5)
        }))
      }
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    fetchAgents()
    const id = setInterval(fetchAgents, 10_000)
    return () => clearInterval(id)
  }, [fetchAgents])

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_GATEWAY_TOKEN
    const es = new EventSource(`/api/activity/stream?token=${token}`)
    es.onmessage = (e) => {
      const entry = JSON.parse(e.data) as ActivityEntry
      entry.tags = typeof entry.tags === 'string' ? JSON.parse(entry.tags as unknown as string) : entry.tags
      setItems(prev => [entry, ...prev].slice(0, 150))
    }
    es.onerror = () => es.close()
    return () => es.close()
  }, [])

  const visibleItems = items.filter(i => !isHeartbeatOnly(i))
  const filtered = visibleItems.filter(i => matchesFilter(i, filter))
  const alertCount = visibleItems.filter(i => ALERT_ACTIONS.has(i.action) || i.tags?.includes('review-needed')).length

  return (
    <aside style={{
      width: 300,
      flexShrink: 0,
      borderLeft: '1px solid var(--border-faint)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
      background: 'var(--bg-sidebar)',
      backdropFilter: 'blur(24px) saturate(1.1)',
      WebkitBackdropFilter: 'blur(24px) saturate(1.1)',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 14px 10px',
        borderBottom: '1px solid var(--border-faint)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div className="label">LIVE ACTIVITY</div>
          <div className="meta" style={{ marginTop: 3 }}>
            Agents online and recent work.
          </div>
        </div>
        {visibleItems.length > 0 && (
          <span className="meta" style={{
            background: 'var(--bg-inset)', padding: '2px 7px', borderRadius: 5,
            border: '1px solid var(--border-faint)',
          }}>
            {visibleItems.length}
          </span>
        )}
      </div>

      <AgentStatusStrip agents={agents} />

      {/* Filter Tabs */}
      <div style={{
        display: 'flex', gap: 4, padding: '8px 14px',
        borderBottom: '1px solid var(--border-faint)',
        flexWrap: 'wrap',
      }}>
        {FILTER_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            style={{
              padding: '3px 8px', borderRadius: 4,
              fontSize: 10, fontFamily: 'var(--font-mono)',
              border: filter === tab.key ? '1px solid var(--border-default)' : '1px solid transparent',
              cursor: 'pointer',
              background: filter === tab.key ? 'var(--bg-inset)' : 'transparent',
              color: filter === tab.key ? 'var(--text-primary)' : 'var(--text-muted)',
              transition: 'all var(--t-fast)',
            }}
          >
            {tab.label}
          </button>
        ))}
        {alertCount > 0 && (
          <span style={{
            padding: '3px 8px', borderRadius: 4,
            fontSize: 10, fontFamily: 'var(--font-mono)',
            background: 'var(--red-bg)', color: 'var(--red)',
            border: '1px solid var(--red-border)',
          }}>
            {alertCount} alert{alertCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Feed */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {filtered.length === 0 ? (
          <div style={{
            padding: 'var(--sp-6) var(--sp-4)', textAlign: 'center', color: 'var(--text-muted)',
            fontSize: 11, lineHeight: 1.6,
          }}>
            {items.length === 0
              ? 'Waiting for activity…'
              : `No ${filter === 'all' ? '' : filter + ' '}activity yet.`}
          </div>
        ) : (
          filtered.map((item) => {
            const badge = getActionBadge(item.action)
            const agent = resolveAgent(item.agent)
            const rawDetail = item.detail || item.action
            const displayText = cleanDisplayText(rawDetail)

            return (
              <div
                key={item.id}
                className="fade-in"
                style={{
                  padding: '8px 14px',
                  borderBottom: '1px solid var(--border-invisible)',
                  borderLeft: `2px solid ${badge.color}40`,
                  transition: 'background var(--t-fast)',
                }}
              >
                {/* Top row */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  marginBottom: 4, flexWrap: 'wrap',
                }}>
                  <span style={{
                    fontSize: 8, fontFamily: 'var(--font-mono)', fontWeight: 600,
                    letterSpacing: '0.06em', padding: '1px 5px', borderRadius: 3,
                    background: badge.bg, color: badge.color,
                    border: `1px solid ${badge.color}30`,
                    lineHeight: '14px',
                  }}>
                    {badge.label}
                  </span>
                  {item.entity && <EntityBadge entity={item.entity} />}
                  <span style={{
                    marginLeft: 'auto', fontSize: 9, fontFamily: 'var(--font-mono)',
                    color: 'var(--text-faint)', flexShrink: 0,
                  }}>
                    {timeAgo(item.created_at)}
                  </span>
                </div>

                {/* Agent */}
                <div style={{
                  fontSize: 10, color: 'var(--text-muted)', marginBottom: 2,
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  {agent ? (
                    <>{agent.emoji} <span style={{ fontWeight: 500 }}>{agent.name}</span></>
                  ) : (
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{item.agent}</span>
                  )}
                </div>

                {/* Detail */}
                <p style={{
                  fontSize: 11, color: 'var(--text-body)', lineHeight: 1.5,
                  margin: 0, wordBreak: 'break-word',
                }}>
                  {displayText}
                </p>

                {/* Show file path expandable if original had one */}
                {hasRawFilePath(rawDetail) && (
                  <details style={{ marginTop: 3 }}>
                    <summary style={{ fontSize: 9, color: 'var(--blue)', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>
                      View file path
                    </summary>
                    <div style={{ fontSize: 9, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', marginTop: 2, wordBreak: 'break-all' }}>
                      {rawDetail}
                    </div>
                  </details>
                )}
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>
    </aside>
  )
}
