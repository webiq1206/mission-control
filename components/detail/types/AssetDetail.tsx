'use client'

import { DetailPanel } from '../DetailPanel'
import { CommandBar } from '../CommandBar'
import { ActionBar, type ActionDef } from '../ActionBar'

interface AssetData {
  id: string
  title: string
  category?: string
  description?: string
  entity?: string
  url?: string
  created_at?: string
}

export function AssetDetailPanel({
  open,
  onClose,
  data,
  onUpdate,
}: {
  open: boolean
  onClose: () => void
  data: AssetData
  onUpdate?: () => void
}) {
  async function handleAction(actionId: string) {
    if (actionId === 'create-task') {
      await fetch('/api/nl-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemType: 'asset', itemId: data.id,
          command: `create task Update asset: ${data.title}`,
          entitySlug: data.entity,
        }),
      })
      onUpdate?.()
    }
  }

  const actions: ActionDef[] = [
    { id: 'create-task', label: 'Create Task', color: 'var(--blue)', icon: '+' },
  ]

  return (
    <DetailPanel
      open={open}
      onClose={onClose}
      title={data.title}
      subtitle={data.category || 'Asset'}
      typeBadge="Asset"
      typeColor="#06B6D4"
      entityLabel={data.entity || undefined}
      footer={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <ActionBar actions={actions} onAction={handleAction} />
          <CommandBar itemType="asset" itemId={data.id} entitySlug={data.entity} onCommandComplete={onUpdate} />
        </div>
      }
    >
      <section style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>What is this</div>
        <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6 }}>
          A{data.category && <> <strong>{data.category}</strong></>} asset
          {data.entity && <> for <strong>{data.entity}</strong></>}.
          {data.url && <> Available at <a href={data.url} target="_blank" rel="noopener" style={{ color: 'var(--blue)' }}>{data.url}</a>.</>}
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

      {data.url && (
        <section>
          <div style={{ fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>Link</div>
          <a href={data.url} target="_blank" rel="noopener" className="glass-card" style={{
            display: 'block', padding: 16, borderRadius: 8, textDecoration: 'none',
            color: 'var(--blue)', fontSize: 13,
          }}>
            {data.url}
          </a>
        </section>
      )}
    </DetailPanel>
  )
}
