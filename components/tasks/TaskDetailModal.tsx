'use client'

import { useState, useEffect, useRef, Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { format, formatDistanceToNow, isPast } from 'date-fns'
import { AGENTS, ENTITIES } from '@/lib/entities'
import toast from 'react-hot-toast'
import TextareaAutosize from 'react-textarea-autosize'

function safeArray(val: unknown): string[] {
  if (Array.isArray(val)) return val
  if (typeof val === 'string') {
    try { const p = JSON.parse(val); return Array.isArray(p) ? p : [] } catch { return [] }
  }
  return []
}

type Task = {
  id: string
  title: string
  entity: string
  status: string
  priority: string
  assigned_agent: string
  created_at: string
  updated_at: string
  description?: string
  notes?: string
  objective?: string
  dod?: string
  expected_output?: string
  due_at?: string
  tags?: string[]
  dependencies?: string[]
}

type ActivityEntry = {
  id: number
  agent: string
  entity: string
  action: string
  detail: string
  created_at: string
  tags: string[]
}

type Asset = {
  id: string
  entity: string
  category: string
  title: string
  description?: string
  url?: string
  file_path?: string
  created_by?: string
  status: string
  tags?: string
  created_at: string
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'var(--priority-critical)',
  high: 'var(--priority-high)',
  medium: 'var(--priority-medium)',
  low: 'var(--text-muted)',
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  backlog: { label: 'Backlog', color: 'var(--text-muted)' },
  in_progress: { label: 'In Progress', color: 'var(--blue)' },
  blocked: { label: 'Blocked', color: 'var(--red)' },
  approval_gated: { label: 'Awaiting', color: 'var(--amber)' },
  proposed: { label: 'Proposed', color: 'var(--amber)' },
  completed: { label: 'Completed', color: 'var(--green)' },
  approved: { label: 'Approved', color: 'var(--green)' },
  executing: { label: 'In Progress', color: 'var(--blue)' },
  review: { label: 'In Review', color: 'var(--purple)' },
}

export function TaskDetailModal({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const [task, setTask] = useState<Task | null>(null)
  const [activity, setActivity] = useState<ActivityEntry[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const [editedTitle, setEditedTitle] = useState('')
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [editedDescription, setEditedDescription] = useState('')
  const [nlCommand, setNlCommand] = useState('')
  const [nlLoading, setNlLoading] = useState(false)
  const [nlFeedback, setNlFeedback] = useState('')
  const [teamMembers, setTeamMembers] = useState<{id:string,name:string,emoji:string,role:string}[]>([])
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false)
  const token = process.env.NEXT_PUBLIC_GATEWAY_TOKEN
  const authHeaders = { Authorization: `Bearer ${token}` }

  const fetchTaskDetails = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { headers: authHeaders })
      if (!res.ok) throw new Error('Failed to fetch task')
      const data = await res.json()
      const t = data.task
      if (t) {
        t.dependencies = safeArray(t.dependencies)
        t.tags = safeArray(t.tags)
      }
      setTask(t)
      setActivity(data.activity)
      setAssets(data.assets || [])
      setEditedTitle(t.title)
      setEditedDescription(t.description || '')
    } catch (error) {
      console.error('Error fetching task details:', error)
      toast.error('Failed to load task details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTaskDetails()
  }, [taskId])

  useEffect(() => {
    fetch('/api/team-members').then(r => r.json()).then(d => setTeamMembers(d || [])).catch(() => {})
  }, [])

  const parseAndExecuteNLCommand = async (cmd: string) => {
    if (!task || !cmd.trim()) return
    setNlLoading(true)
    setNlFeedback('')
    const lower = cmd.toLowerCase().trim()
    let action = ''
    let patchBody: Record<string, unknown> = { entity: task.entity }
    let feedbackMsg = ''
    try {
      const reassignMatch = lower.match(/(?:reassign|assign|give)(?:\s+to)?\s+(.+)/)
      if (reassignMatch) {
        const nameRaw = reassignMatch[1].trim()
        const agentMatch = AGENTS.find(a => a.id.toLowerCase() === nameRaw || a.name.toLowerCase().includes(nameRaw))
        const memberMatch = teamMembers.find(m => m.id.toLowerCase() === nameRaw || m.name.toLowerCase().includes(nameRaw))
        const assignTo = agentMatch?.id || memberMatch?.id || nameRaw
        patchBody.assigned_agent = assignTo
        action = 'reassigned'
        feedbackMsg = `✓ Reassigned to ${agentMatch?.name || memberMatch?.name || nameRaw}`
      } else {
        const statusMatch = lower.match(/(?:move to|mark as|set(?:\s+status)?(?:\s+to)?|change to)\s+(.+)/)
        if (statusMatch) {
          const statusMap: Record<string,string> = { 'in progress': 'in_progress', 'in-progress': 'in_progress', 'blocked': 'blocked', 'done': 'completed', 'complete': 'completed', 'completed': 'completed', 'backlog': 'backlog', 'approved': 'approved', 'review': 'review', 'executing': 'executing' }
          const rawStatus = statusMatch[1].trim()
          patchBody.status = statusMap[rawStatus] || rawStatus
          action = 'status_changed'
          feedbackMsg = `✓ Status → ${patchBody.status}`
        }
        else if (/(critical|high|medium|low)\s+priority/.test(lower) || /priority\s+(critical|high|medium|low)/.test(lower)) {
          const priMatch = lower.match(/(critical|high|medium|low)/)
          if (priMatch) { patchBody.priority = priMatch[1]; action = 'priority_changed'; feedbackMsg = `✓ Priority → ${priMatch[1]}` }
        }
        else if (lower.startsWith('add subtask')) {
          const subtaskText = cmd.replace(/add subtask:?\s*/i, '').trim()
          const subtaskRes = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify({ title: subtaskText, entity: task.entity, status: 'backlog', priority: 'medium', assigned_agent: task.assigned_agent, description: `Subtask of: ${task.title}` })
          })
          if (subtaskRes.ok) feedbackMsg = `✓ Subtask created: "${subtaskText}"`
          else feedbackMsg = '✗ Failed to create subtask'
          setNlFeedback(feedbackMsg)
          setNlCommand('')
          setNlLoading(false)
          return
        }
        else {
          patchBody = {}
          action = 'note'
          feedbackMsg = '✓ Added as note'
          await fetch('/api/activity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify({ agent: 'jared', entity: task.entity, action: 'note', detail: cmd, tags: JSON.stringify(['note', 'instruction']), task_id: taskId })
          })
          setNlFeedback(feedbackMsg)
          setNlCommand('')
          fetchTaskDetails()
          setNlLoading(false)
          return
        }
      }
      if (Object.keys(patchBody).length > 1) {
        const res = await fetch(`/api/tasks/${taskId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authHeaders }, body: JSON.stringify(patchBody) })
        if (!res.ok) throw new Error('Update failed')
        setNlFeedback(feedbackMsg)
        setNlCommand('')
        fetchTaskDetails()
      }
    } catch (e) {
      setNlFeedback('✗ Could not parse command — logged as note')
    } finally {
      setNlLoading(false)
    }
  }

  const getAgent = (agentId: string) => AGENTS.find(a => a.id === agentId || a.name.toLowerCase() === agentId?.toLowerCase())
  const getEntity = (entitySlug: string) => ENTITIES.find(e => e.slug === entitySlug || e.label === entitySlug)

  const handleStatusChange = async (newStatus: string) => {
    if (!task) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ status: newStatus, entity: task.entity }),
      })
      if (!res.ok) throw new Error('Failed to update status')
      toast.success(`Task status updated to ${STATUS_MAP[newStatus]?.label || newStatus}`)
      fetchTaskDetails()
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update task status.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateNotes = async (newNotes: string) => {
    if (!task) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ notes: newNotes, entity: task.entity }),
      })
      if (!res.ok) throw new Error('Failed to update notes')
      toast.success('Notes updated.')
      fetchTaskDetails()
    } catch (error) {
      console.error('Error updating notes:', error)
      toast.error('Failed to update notes.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateDescription = async (newDescription: string) => {
    if (!task) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ description: newDescription, entity: task.entity }),
      })
      if (!res.ok) throw new Error('Failed to update description')
      toast.success('Description updated.')
      fetchTaskDetails()
    } catch (error) {
      console.error('Error updating description:', error)
      toast.error('Failed to update description.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveTitle = async () => {
    if (!task || editedTitle === task.title) {
      setIsEditingTitle(false)
      return
    }
    setIsSaving(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ title: editedTitle, entity: task.entity }),
      })
      if (!res.ok) throw new Error('Failed to update title')
      toast.success('Title updated.')
      fetchTaskDetails()
    } catch (error) {
      console.error('Error updating title:', error)
      toast.error('Failed to update title.')
    } finally {
      setIsSaving(false)
      setIsEditingTitle(false)
    }
  }

  const renderActionButtons = () => {
    if (!task) return null
    const btnBase: React.CSSProperties = {
      padding: '7px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
      border: 'none', cursor: 'pointer', transition: 'opacity 0.2s, transform 0.15s',
    }

    const action = async (newStatus: string, logDetail?: 'reject_reason' | 'review_requested') => {
        setIsSaving(true)
        let body: any = { status: newStatus, entity: task.entity }
        let successMessage = `Task status updated to ${STATUS_MAP[newStatus]?.label || newStatus}.`

        if (logDetail === 'reject_reason') {
            const reason = prompt('Please enter a reason for rejecting this task:')
            if (!reason) {
                setIsSaving(false)
                return
            }
            body.notes = `Rejected: ${reason}`
            successMessage = 'Task rejected with reason.'
        } else if (logDetail === 'review_requested') {
            const feedback = prompt('Please enter feedback for the requested changes:')
            if (!feedback) {
                setIsSaving(false)
                return
            }
            body.notes = `Review requested: ${feedback}`
            successMessage = 'Review requested with feedback.'
        }

        try {
            const res = await fetch(`/api/tasks/${taskId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...authHeaders },
                body: JSON.stringify(body),
            })
            if (!res.ok) throw new Error('Failed to update task')
            toast.success(successMessage)
            fetchTaskDetails()
        } catch (error) {
            console.error('Error performing action:', error)
            toast.error('Failed to perform task action.')
        } finally {
            setIsSaving(false)
        }
    }

    switch (task.status) {
      case 'backlog':
        return (
          <button onClick={() => action('in_progress')} style={{ ...btnBase, background: 'var(--blue)', color: 'var(--text-primary)', boxShadow: '0 0 10px color-mix(in srgb, var(--blue) 15%, transparent)' }} disabled={isSaving}>
            Mark In Progress
          </button>
        )
      case 'in_progress':
      case 'executing':
      case 'approved':
        return (
          <>
            <button onClick={() => action('completed')} style={{ ...btnBase, background: 'var(--green)', color: 'var(--text-primary)', boxShadow: '0 0 10px color-mix(in srgb, var(--green) 15%, transparent)' }} disabled={isSaving}>
              Complete
            </button>
            <button onClick={() => action('approval_gated', 'review_requested')} style={{ ...btnBase, background: 'var(--amber)', color: 'var(--bg-base)' }} disabled={isSaving}>
              Request Changes
            </button>
            <button onClick={() => action('approved')} style={{ ...btnBase, background: 'var(--blue)', color: 'var(--text-primary)', boxShadow: '0 0 10px color-mix(in srgb, var(--blue) 15%, transparent)' }} disabled={isSaving}>
              Approve
            </button>
          </>
        )
      case 'approval_gated':
      case 'proposed':
        return (
          <>
            <button onClick={() => action('approved')} style={{ ...btnBase, background: 'var(--green)', color: 'var(--text-primary)', boxShadow: '0 0 10px color-mix(in srgb, var(--green) 15%, transparent)' }} disabled={isSaving}>
              Approve
            </button>
            <button onClick={() => action('blocked', 'reject_reason')} style={{ ...btnBase, background: 'var(--red)', color: 'var(--text-primary)' }} disabled={isSaving}>
              Reject
            </button>
            <button onClick={() => action('approval_gated', 'review_requested')} style={{ ...btnBase, background: 'var(--amber)', color: 'var(--bg-base)' }} disabled={isSaving}>
              Request Changes
            </button>
          </>
        )
      case 'blocked':
        return (
          <>
            <button onClick={() => action('in_progress')} style={{ ...btnBase, background: 'var(--blue)', color: 'var(--text-primary)', boxShadow: '0 0 10px color-mix(in srgb, var(--blue) 15%, transparent)' }} disabled={isSaving}>
              Mark In Progress
            </button>
            <button onClick={() => action('completed')} style={{ ...btnBase, background: 'var(--green)', color: 'var(--text-primary)', boxShadow: '0 0 10px color-mix(in srgb, var(--green) 15%, transparent)' }} disabled={isSaving}>
              Complete
            </button>
          </>
        )
      case 'completed':
        return (
          <button onClick={() => action('backlog')} style={{ ...btnBase, background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-faint)' }} disabled={isSaving}>
            Reopen → Backlog
          </button>
        )
      default:
        return null
    }
  }


  if (loading) {
    return (
      <Transition.Root show={true} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => {}}>
          <Transition.Child as={Fragment} enter="ease-in-out duration-500" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in-out duration-500" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 transition-opacity" style={{ backdropFilter: 'blur(8px)', background: 'rgba(6, 9, 13, 0.75)' }} />
          </Transition.Child>
          <div className="fixed inset-0 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
              <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
                <Transition.Child as={Fragment} enter="transform transition ease-in-out duration-500 sm:duration-700" enterFrom="translate-x-full" enterTo="translate-x-0" leave="transform transition ease-in-out duration-500 sm:duration-700" leaveFrom="translate-x-0" leaveTo="translate-x-full">
                  <Dialog.Panel className="pointer-events-auto w-screen max-w-md">
                    <div className="flex h-full flex-col overflow-y-scroll py-6" style={{ background: 'var(--bg-card)', backdropFilter: 'blur(24px)', boxShadow: '-4px 0 40px rgba(0,0,0,0.5)', borderLeft: '1px solid var(--border-faint)' }}>
                      <div className="px-4 sm:px-6">
                        <div className="flex items-start justify-between">
                          <Dialog.Title style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                            Loading Task...
                          </Dialog.Title>
                          <div className="ml-3 flex h-7 items-center">
                            <button type="button" onClick={onClose} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-faint)', borderRadius: 6, padding: 4, cursor: 'pointer', color: 'var(--text-muted)' }}>
                              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="relative mt-6 flex-1 px-4 sm:px-6">
                        <div style={{ height: '100%', border: '1px dashed var(--border-faint)', borderRadius: 'var(--r-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                          Loading...
                        </div>
                      </div>
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
    )
  }

  if (!task) return null

  const entity = getEntity(task.entity)
  const agent = getAgent(task.assigned_agent)
  const priorityColor = PRIORITY_COLORS[task.priority] || 'var(--text-muted)'
  const statusInfo = STATUS_MAP[task.status] || { label: 'Unknown', color: 'var(--text-muted)' }

  return (
    <Transition.Root show={true} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child as={Fragment} enter="ease-in-out duration-500" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in-out duration-500" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 transition-opacity" style={{ backdropFilter: 'blur(8px)', background: 'rgba(6, 9, 13, 0.75)' }} />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <Transition.Child as={Fragment} enter="transform transition ease-in-out duration-500 sm:duration-700" enterFrom="translate-x-full" enterTo="translate-x-0" leave="transform transition ease-in-out duration-500 sm:duration-700" leaveFrom="translate-x-0" leaveTo="translate-x-full">
                <Dialog.Panel className="pointer-events-auto w-screen max-w-md md:max-w-xl">
                  <div className="flex h-full flex-col overflow-y-scroll" style={{ background: 'var(--bg-card)', backdropFilter: 'blur(24px)', boxShadow: '-4px 0 40px rgba(0,0,0,0.5)', borderLeft: '1px solid var(--border-faint)' }}>
                    {/* Header */}
                    <div style={{ padding: '22px 24px 18px', borderBottom: '1px solid var(--border-faint)' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {isEditingTitle ? (
                            <input
                              ref={titleInputRef}
                              type="text"
                              value={editedTitle}
                              onChange={(e) => setEditedTitle(e.target.value)}
                              onBlur={handleSaveTitle}
                              onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                              style={{ fontSize: 22, fontWeight: 600, background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-default)', color: 'var(--text-primary)', outline: 'none', width: '100%', padding: '0 0 4px' }}
                              disabled={isSaving}
                            />
                          ) : (
                            <Dialog.Title
                              style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer', lineHeight: 1.3 }}
                              onClick={() => setIsEditingTitle(true)}
                            >
                              {task.title}
                            </Dialog.Title>
                          )}

                          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            {entity && (
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '2px 8px', borderRadius: 5,
                                fontSize: 10, fontFamily: 'monospace', fontWeight: 600,
                                background: `color-mix(in srgb, ${entity.color} 7%, transparent)`, color: entity.color,
                                border: `1px solid color-mix(in srgb, ${entity.color} 15%, transparent)`,
                              }}>
                                <span style={{ width: 5, height: 5, borderRadius: '50%', background: entity.color }} />
                                {entity.label}
                              </span>
                            )}
                            <div style={{ position: 'relative' }}>
                              <select
                                style={{
                                  appearance: 'none', background: 'var(--bg-elevated)', border: '1px solid var(--border-faint)',
                                  borderRadius: 5, padding: '2px 20px 2px 8px', fontSize: 10, fontFamily: 'monospace',
                                  fontWeight: 600, color: statusInfo.color, cursor: 'pointer', outline: 'none',
                                }}
                                value={task.status}
                                onChange={(e) => handleStatusChange(e.target.value)}
                                disabled={isSaving}
                              >
                                {Object.entries(STATUS_MAP).map(([key, info]) => (
                                  <option key={key} value={key} style={{ color: 'var(--text-primary)', background: 'var(--bg-card)' }}>
                                    {info.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                        <button type="button" onClick={onClose} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-faint)', borderRadius: 6, padding: 6, cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0, marginLeft: 12 }}>
                          <XMarkIcon style={{ width: 18, height: 18 }} />
                        </button>
                      </div>
                    </div>

                    <div style={{ flex: 1, padding: '20px 24px', paddingBottom: 80 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        {/* Meta Row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', paddingBottom: 16, borderBottom: '1px solid var(--border-faint)', fontSize: 12, color: 'var(--text-muted)' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 5,
                            fontSize: 10, fontWeight: 600, fontFamily: 'monospace',
                            background: `color-mix(in srgb, ${priorityColor} 9%, transparent)`, color: priorityColor,
                            border: `1px solid color-mix(in srgb, ${priorityColor} 15%, transparent)`,
                          }}>
                            {task.priority}
                          </span>
                          <div style={{ position: 'relative' }}>
                            <button
                              onClick={() => setShowAssigneeDropdown(v => !v)}
                              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-faint)', borderRadius: 5, padding: '3px 8px', fontSize: 12, cursor: 'pointer', color: 'var(--text-primary)', transition: 'border-color 0.2s' }}
                              title="Change assignee"
                            >
                              {agent ? `${agent.emoji} ${agent.name}` : (teamMembers.find(m => m.id === task.assigned_agent) ? `${teamMembers.find(m => m.id === task.assigned_agent)!.emoji} ${teamMembers.find(m => m.id === task.assigned_agent)!.name}` : `👤 ${task.assigned_agent || 'Unassigned'}`)}
                              {' ▾'}
                            </button>
                            {showAssigneeDropdown && (
                              <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 100, background: 'var(--bg-card)', border: '1px solid var(--border-faint)', borderRadius: 8, minWidth: 200, maxHeight: 280, overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', marginTop: 4 }}>
                                <div style={{ padding: '6px 10px', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-faint)' }}>Agents</div>
                                {AGENTS.map(a => (
                                  <button key={a.id} onClick={() => { fetch(`/api/tasks/${taskId}`, { method: 'PATCH', headers: {'Content-Type':'application/json', ...authHeaders}, body: JSON.stringify({assigned_agent: a.id, entity: task.entity}) }).then(() => { setShowAssigneeDropdown(false); fetchTaskDetails() }) }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', transition: 'background 0.15s' }}>{a.emoji} {a.name} <span style={{fontSize:10,color:'var(--text-muted)'}}>{a.role}</span></button>
                                ))}
                                <div style={{ padding: '6px 10px', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-faint)', borderTop: '1px solid var(--border-faint)' }}>Team Members</div>
                                {teamMembers.map(m => (
                                  <button key={m.id} onClick={() => { fetch(`/api/tasks/${taskId}`, { method: 'PATCH', headers: {'Content-Type':'application/json', ...authHeaders}, body: JSON.stringify({assigned_agent: m.id, entity: task.entity}) }).then(() => { setShowAssigneeDropdown(false); fetchTaskDetails() }) }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', transition: 'background 0.15s' }}>{m.emoji} {m.name} <span style={{fontSize:10,color:'var(--text-muted)'}}>{m.role}</span></button>
                                ))}
                              </div>
                            )}
                          </div>
                          <span>Created: {format(new Date(task.created_at), 'MMM d, yyyy')}</span>
                          {task.updated_at && (
                            <span>Updated: {formatDistanceToNow(new Date(task.updated_at), { addSuffix: true })}</span>
                          )}
                          {task.due_at && (
                            <span style={{ color: isPast(new Date(task.due_at)) ? 'var(--red)' : 'var(--text-muted)' }}>
                              Due: {format(new Date(task.due_at), 'MMM d, yyyy')}
                            </span>
                          )}
                        </div>

                        {/* NL Command Bar */}
                        <div style={{ padding: '14px', background: 'var(--bg-card)', borderRadius: 'var(--r-md)', border: '1px solid var(--border-faint)' }}>
                          <div style={{ fontSize: 10, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>Command</div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <input
                              type="text"
                              value={nlCommand}
                              onChange={e => setNlCommand(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && parseAndExecuteNLCommand(nlCommand)}
                              placeholder='e.g. "reassign to Quinn", "move to blocked", "high priority", "add subtask: write email"'
                              style={{ flex: 1, padding: '8px 10px', borderRadius: 6, background: 'var(--glass-bg)', border: '1px solid var(--border-faint)', color: 'var(--text-primary)', fontSize: 12, outline: 'none', transition: 'border-color 0.2s' }}
                            />
                            <button
                              onClick={() => parseAndExecuteNLCommand(nlCommand)}
                              disabled={nlLoading || !nlCommand.trim()}
                              style={{ padding: '8px 14px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: nlLoading ? 'var(--bg-elevated)' : 'var(--blue)', color: 'var(--text-primary)', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', opacity: !nlCommand.trim() ? 0.5 : 1, boxShadow: nlLoading ? 'none' : '0 0 10px color-mix(in srgb, var(--blue) 12%, transparent)' }}
                            >{nlLoading ? '...' : 'Run'}</button>
                          </div>
                          {nlFeedback && <div style={{ marginTop: 6, fontSize: 11, color: nlFeedback.startsWith('✓') ? 'var(--green)' : 'var(--red)', fontFamily: 'monospace' }}>{nlFeedback}</div>}
                        </div>

                        {/* Action Buttons Row */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingBottom: 16, borderBottom: '1px solid var(--border-faint)' }}>
                          {renderActionButtons()}
                        </div>

                        {/* Description Section */}
                        <div>
                          <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Description</h3>
                          {isEditingDescription ? (
                            <TextareaAutosize
                              value={editedDescription}
                              onChange={(e) => setEditedDescription(e.target.value)}
                              onBlur={() => { handleUpdateDescription(editedDescription); setIsEditingDescription(false) }}
                              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.blur() } }}
                              style={{ width: '100%', background: 'var(--glass-bg)', border: '1px solid var(--border-faint)', borderRadius: 6, padding: 10, fontSize: 13, color: 'var(--text-secondary)', outline: 'none', resize: 'none' }}
                              minRows={3}
                              maxRows={10}
                              disabled={isSaving}
                            />
                          ) : (
                            <div
                              style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, padding: 10, borderRadius: 6, cursor: 'pointer', transition: 'background 0.15s', background: 'transparent' }}
                              onClick={() => setIsEditingDescription(true)}
                            >
                              {task.description || "No description provided. Click to add."}
                            </div>
                          )}
                        </div>

                        {task.objective && (
                          <div>
                            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Objective</h3>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{task.objective}</p>
                          </div>
                        )}
                        {task.dod && (
                          <div>
                            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Definition of Done</h3>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{task.dod}</p>
                          </div>
                        )}
                        {task.expected_output && (
                          <div>
                            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Expected Output</h3>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{task.expected_output}</p>
                          </div>
                        )}

                        {/* Notes Section */}
                        <div>
                          <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Notes</h3>
                          <TextareaAutosize
                            value={task.notes || ''}
                            onChange={(e) => setTask(prev => prev ? { ...prev, notes: e.target.value } : null)}
                            onBlur={(e) => handleUpdateNotes(e.target.value)}
                            style={{ width: '100%', background: 'var(--glass-bg)', border: '1px solid var(--border-faint)', borderRadius: 6, padding: 10, fontSize: 13, color: 'var(--text-secondary)', outline: 'none', resize: 'none' }}
                            minRows={3}
                            maxRows={10}
                            placeholder="Add notes for this task..."
                            disabled={isSaving}
                          />
                        </div>

                        {/* Deliverables / Assets Section */}
                        {assets.length > 0 && (
                          <div>
                            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>
                              Deliverables
                              <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>
                                {assets.length} item{assets.length !== 1 ? 's' : ''} for {task.entity}
                              </span>
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {assets.map(asset => {
                                const statusColor = asset.status === 'published' ? 'var(--green)'
                                  : asset.status === 'approved' ? 'var(--green)'
                                  : asset.status === 'review' ? 'var(--amber)'
                                  : asset.status === 'draft' ? 'var(--text-muted)'
                                  : 'var(--text-muted)'
                                return (
                                  <div key={asset.id} style={{
                                    padding: '12px 14px', borderRadius: 8,
                                    background: 'var(--bg-card)', border: '1px solid var(--border-faint)',
                                    display: 'flex', alignItems: 'flex-start', gap: 12,
                                  }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                        <span style={{
                                          fontSize: 9, fontFamily: 'monospace', padding: '2px 6px', borderRadius: 4,
                                          color: statusColor, background: `color-mix(in srgb, ${statusColor} 7%, transparent)`, border: `1px solid color-mix(in srgb, ${statusColor} 12%, transparent)`,
                                          textTransform: 'uppercase',
                                        }}>
                                          {asset.status}
                                        </span>
                                        <span style={{ fontSize: 9, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                                          {asset.category}
                                        </span>
                                      </div>
                                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>
                                        {asset.title}
                                      </div>
                                      {asset.description && (
                                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                          {asset.description}
                                        </div>
                                      )}
                                      {asset.created_by && (
                                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, fontFamily: 'monospace' }}>
                                          by {asset.created_by} · {formatDistanceToNow(new Date(asset.created_at), { addSuffix: true })}
                                        </div>
                                      )}
                                    </div>
                                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                      {asset.url && (
                                        <a
                                          href={asset.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          style={{
                                            padding: '4px 10px', borderRadius: 5, fontSize: 10, fontFamily: 'monospace',
                                            background: 'var(--bg-elevated)', border: '1px solid var(--border-faint)',
                                            color: 'var(--blue)', textDecoration: 'none', cursor: 'pointer',
                                          }}
                                        >
                                          View
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* Activity History Section */}
                        <div>
                          <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>Activity History</h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {activity.length === 0 ? (
                              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No recent activity for this task.</p>
                            ) : (
                              activity.map((entry) => {
                                const agentMeta = getAgent(entry.agent)
                                return (
                                  <div key={entry.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13 }}>
                                    <div style={{ flexShrink: 0, fontSize: 16 }}>{agentMeta?.emoji || '👤'}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ color: 'var(--text-primary)' }}>
                                        <span style={{ fontWeight: 500 }}>{agentMeta?.name || entry.agent}</span>
                                        <span style={{
                                          marginLeft: 8, display: 'inline-flex', alignItems: 'center',
                                          padding: '1px 6px', borderRadius: 4,
                                          fontSize: 10, fontFamily: 'monospace', fontWeight: 600,
                                          background: 'color-mix(in srgb, var(--blue) 10%, transparent)', color: 'var(--blue)',
                                          border: '1px solid color-mix(in srgb, var(--blue) 15%, transparent)',
                                        }}>
                                          {entry.action.replace(/_/g, ' ')}
                                        </span>
                                      </div>
                                      <p style={{ color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.5 }}>{entry.detail}</p>
                                      <p style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 2, fontFamily: 'monospace' }}>
                                        {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                                      </p>
                                    </div>
                                  </div>
                                )
                              })
                            )}
                          </div>
                        </div>

                        {/* Dependencies & Tags */}
                        {(Array.isArray(task.dependencies) && task.dependencies.length > 0 || Array.isArray(task.tags) && task.tags.length > 0) && (
                          <div>
                            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Details</h3>
                            {Array.isArray(task.dependencies) && task.dependencies.length > 0 && (
                              <div style={{ marginBottom: 10 }}>
                                <span style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 13 }}>Dependencies:</span>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                                  {task.dependencies.map((dep, i) => (
                                    <span key={i} style={{ padding: '3px 8px', borderRadius: 5, fontSize: 11, color: 'var(--text-secondary)', background: 'var(--bg-elevated)', border: '1px solid var(--border-faint)' }}>
                                      {dep}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {Array.isArray(task.tags) && task.tags.length > 0 && (
                              <div>
                                <span style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 13 }}>Tags:</span>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                                  {task.tags.map((tag, i) => (
                                    <span key={i} style={{ padding: '3px 8px', borderRadius: 5, fontSize: 11, color: 'var(--text-secondary)', background: 'var(--bg-elevated)', border: '1px solid var(--border-faint)' }}>
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}
