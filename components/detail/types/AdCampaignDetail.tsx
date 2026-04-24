'use client'

import { DetailPanel } from '../DetailPanel'
import { CommandBar } from '../CommandBar'
import { ActionBar, type ActionDef } from '../ActionBar'

interface CampaignData {
  id: string
  name: string
  entity?: string
  platform?: string
  campaign_type?: string
  status?: string
  monthly_budget?: number
  total_spend?: number
  total_leads?: number
  cpl?: number
  roas?: number
  notes?: string
  updated_at?: string
}

export function AdCampaignDetailPanel({
  open,
  onClose,
  data,
  onUpdate,
}: {
  open: boolean
  onClose: () => void
  data: CampaignData
  onUpdate?: () => void
}) {
  async function handleAction(actionId: string) {
    if (actionId === 'create-task') {
      await fetch('/api/nl-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemType: 'campaign', itemId: data.id,
          command: `create task Review campaign performance: ${data.name}`,
          entitySlug: data.entity || undefined,
        }),
      })
      onUpdate?.()
    }
  }

  const actions: ActionDef[] = [
    { id: 'create-task', label: 'Create Task', color: 'var(--blue)', icon: '+' },
  ]

  const cpl = data.cpl ? `$${data.cpl.toFixed(2)}` : '—'
  const roas = data.roas ? `${data.roas.toFixed(2)}x` : '—'

  return (
    <DetailPanel
      open={open}
      onClose={onClose}
      title={data.name}
      subtitle={`${data.platform || 'Ad'} Campaign — ${data.status || 'unknown'}`}
      typeBadge="Campaign"
      typeColor="#8B5CF6"
      entityLabel={data.entity || undefined}
      footer={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <ActionBar actions={actions} onAction={handleAction} />
          <CommandBar itemType="campaign" itemId={data.id} entitySlug={data.entity} onCommandComplete={onUpdate} />
        </div>
      }
    >
      <section style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>What is this</div>
        <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6 }}>
          A <strong>{data.platform || 'digital'}</strong> ad campaign
          {data.entity && <> for <strong>{data.entity}</strong></>}
          {data.campaign_type && <> ({data.campaign_type})</>}.
          Status: <strong>{data.status || 'unknown'}</strong>.
        </div>
      </section>

      <section style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>Performance</div>
        <div className="glass-card" style={{ padding: 16, borderRadius: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <div>
              <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Budget</div>
              <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'monospace', color: 'var(--text-primary)', marginTop: 2 }}>
                ${data.monthly_budget?.toLocaleString() || '—'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Spend</div>
              <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'monospace', color: 'var(--yellow)', marginTop: 2 }}>
                ${data.total_spend?.toLocaleString() || '—'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Leads</div>
              <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'monospace', color: 'var(--green)', marginTop: 2 }}>
                {data.total_leads ?? '—'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', textTransform: 'uppercase' }}>CPL</div>
              <div style={{ fontSize: 16, fontWeight: 600, fontFamily: 'monospace', color: 'var(--text-primary)', marginTop: 2 }}>{cpl}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', textTransform: 'uppercase' }}>ROAS</div>
              <div style={{ fontSize: 16, fontWeight: 600, fontFamily: 'monospace', color: 'var(--text-primary)', marginTop: 2 }}>{roas}</div>
            </div>
          </div>
        </div>
      </section>

      {data.notes && (
        <section>
          <div style={{ fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>Notes</div>
          <div className="glass-card" style={{ padding: 16, borderRadius: 8 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{data.notes}</div>
          </div>
        </section>
      )}
    </DetailPanel>
  )
}
