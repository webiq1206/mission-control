'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface StatusData {
  backlog: number
  in_progress: number
  completed: number
  needs_attention: number
  pending_approvals: number
}

export function GlobalStatusBar() {
  const [data, setData] = useState<StatusData | null>(null)
  const token = process.env.NEXT_PUBLIC_GATEWAY_TOKEN

  useEffect(() => {
    async function load() {
      try {
        const [tasksRes, approvalsRes] = await Promise.all([
          fetch('/api/tasks', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/approvals', { headers: { Authorization: `Bearer ${token}` } }),
        ])
        const tasks = await tasksRes.json()
        const approvals = await approvalsRes.json()
        const taskList = Array.isArray(tasks) ? tasks : (tasks.tasks || [])
        const approvalList = Array.isArray(approvals) ? approvals : []
        setData({
          backlog: taskList.filter((t: { status: string }) => t.status === 'backlog').length,
          in_progress: taskList.filter((t: { status: string }) =>
            ['in_progress', 'executing', 'approved'].includes(t.status)).length,
          completed: taskList.filter((t: { status: string }) => t.status === 'completed').length,
          needs_attention: taskList.filter((t: { status: string }) => t.status === 'blocked').length,
          pending_approvals: approvalList.filter((a: { status: string }) => a.status === 'pending').length,
        })
      } catch { /* silent */ }
    }
    load()
    const t = setInterval(load, 30_000)
    return () => clearInterval(t)
  }, [token])

  if (!data) return null

  const chips = [
    { label: 'Backlog', value: data.backlog, color: 'var(--text-muted)', bg: 'transparent', href: '/kanban' },
    { label: 'In Progress', value: data.in_progress, color: 'var(--blue)', bg: 'var(--blue-bg)', href: '/kanban' },
    { label: 'Completed', value: data.completed, color: 'var(--green)', bg: 'var(--green-bg)', href: '/kanban' },
    ...(data.needs_attention > 0 ? [{ label: 'Needs Attention', value: data.needs_attention, color: 'var(--red)', bg: 'var(--red-bg)', href: '/kanban' }] : []),
    ...(data.pending_approvals > 0 ? [{ label: 'Awaiting Your Decision', value: data.pending_approvals, color: 'var(--amber)', bg: 'var(--amber-bg)', href: '/approvals' }] : []),
  ]

  return (
    <div style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'rgba(11,11,16,0.90)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border-faint)',
      padding: '8px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.12em', marginRight: 4 }}>
        STATUS
      </span>
      {chips.map(chip => (
        <Link key={chip.label} href={chip.href} style={{ textDecoration: 'none' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 10px',
            borderRadius: 20,
            background: chip.bg,
            border: `1px solid ${chip.color}30`,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              fontWeight: 700,
              color: chip.color,
              lineHeight: 1,
            }}>
              {chip.value}
            </span>
            <span style={{
              fontSize: 10,
              color: chip.color,
              opacity: 0.8,
              fontWeight: 500,
            }}>
              {chip.label}
            </span>
          </div>
        </Link>
      ))}
    </div>
  )
}
