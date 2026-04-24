'use client'

import { useState } from 'react'
import { DetailPanel } from '../DetailPanel'
import { CommandBar } from '../CommandBar'
import { ActionBar, type ActionDef } from '../ActionBar'

interface RecommendationData {
  id: string
  type?: string
  entity?: string
  title: string
  description?: string
  impact?: string
  status?: string
  decision?: string
}

export function AdRecommendationDetailPanel({
  open,
  onClose,
  data,
  onUpdate,
}: {
  open: boolean
  onClose: () => void
  data: RecommendationData
  onUpdate?: () => void
}) {
  const [status, setStatus] = useState(data.status || 'pending')
  const token = process.env.NEXT_PUBLIC_GATEWAY_TOKEN

  async function handleAction(actionId: string, reason?: string) {
    if (actionId === 'approve') {
      await fetch(`/api/ad-recommendations/${data.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'approved', decision: 'Approved by Jared' }),
      })
      setStatus('approved')
      onUpdate?.()
      return
    }
    if (actionId === 'reject') {
      await fetch(`/api/ad-recommendations/${data.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'rejected', decision: reason || 'Rejected by Jared' }),
      })
      setStatus('rejected')
      onUpdate?.()
      return
    }
    if (actionId === 'create-task') {
      await fetch('/api/nl-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemType: 'recommendation', itemId: data.id,
          command: `create task Implement recommendation: ${data.title}`,
          entitySlug: data.entity,
        }),
      })
      onUpdate?.()
    }
  }

  const isPending = status === 'pending'
  const actions: ActionDef[] = isPending ? [
    { id: 'approve', label: 'Approve', color: 'var(--green)', icon: '✓' },
    { id: 'reject', label: 'Reject', color: 'var(--red)', icon: '✗', requiresConfirm: true, confirmPrompt: 'Why are you rejecting this recommendation?' },
    { id: 'create-task', label: 'Create Task', color: 'rgba(100,140,190,0.3)' },
  ] : [
    { id: 'create-task', label: 'Create Task', color: 'rgba(100,140,190,0.3)' },
  ]

  return (
    <DetailPanel
      open={open}
      onClose={onClose}
      title={data.title}
      subtitle={`AI Recommendation — ${status}`}
      typeBadge="Recommendation"
      typeColor="var(--amber)"
      entityLabel={data.entity || undefined}
      footer={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <ActionBar actions={actions} onAction={handleAction} />
          <CommandBar itemType="recommendation" itemId={data.id} entitySlug={data.entity} onCommandComplete={onUpdate} />
        </div>
      }
    >
      <section style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>What is this</div>
        <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6 }}>
          An AI-generated recommendation{data.type && <> ({data.type})</>}
          {data.entity && <> for <strong>{data.entity}</strong></>}.
          {data.impact && <> Expected impact: <strong>{data.impact}</strong>.</>}
        </div>
      </section>

      {data.description && (
        <section style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>Details</div>
          <div className="glass-card" style={{ padding: 16, borderRadius: 8 }}>
            <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6 }}>{data.description}</div>
          </div>
        </section>
      )}

      {!isPending && (
        <div style={{
          padding: '12px 16px', borderRadius: 8, fontSize: 13,
          background: status === 'approved' ? 'rgba(45,212,160,0.05)' : 'rgba(224,82,82,0.05)',
          border: `1px solid ${status === 'approved' ? 'rgba(45,212,160,0.15)' : 'rgba(224,82,82,0.15)'}`,
          color: status === 'approved' ? 'var(--green)' : 'var(--red)',
        }}>
          {status === 'approved' ? 'Approved. Agents will implement this recommendation.' : 'Rejected. No action will be taken.'}
        </div>
      )}
    </DetailPanel>
  )
}
