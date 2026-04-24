'use client'

import React, { useState } from 'react'

export type ApprovalType = 'access' | 'financial' | 'content' | 'decision' | 'deployment' | string

interface FollowThroughProps {
  approvalId: string
  approvalType: ApprovalType
  title: string
  description: string
  costEstimate?: string
}

const panelStyle: React.CSSProperties = {
  marginTop: 12,
  padding: '14px 16px',
  borderRadius: 8,
  background: 'var(--bg-card)',
  border: '1px solid var(--border-faint)',
  fontSize: 12,
  lineHeight: 1.6,
}

const labelStyle: React.CSSProperties = {
  fontSize: 9,
  fontFamily: 'monospace',
  letterSpacing: '0.08em',
  color: 'var(--text-muted)',
  marginBottom: 8,
  textTransform: 'uppercase' as const,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '7px 10px',
  borderRadius: 6,
  border: '1px solid var(--border-faint)',
  background: 'var(--glass-bg)',
  color: 'var(--text-primary)',
  fontSize: 12,
  fontFamily: 'monospace',
  resize: 'vertical' as const,
  marginTop: 4,
  boxSizing: 'border-box' as const,
  outline: 'none',
  transition: 'border-color 0.2s',
}

const saveButtonStyle: React.CSSProperties = {
  marginTop: 8,
  padding: '6px 14px',
  borderRadius: 6,
  border: '1px solid rgba(45,212,160,0.2)',
  background: 'rgba(45,212,160,0.08)',
  color: 'var(--green)',
  fontSize: 11,
  fontFamily: 'monospace',
  cursor: 'pointer',
  transition: 'background 0.2s',
}

function AccessFollowThrough({ approvalId }: { approvalId: string }) {
  const [location, setLocation] = useState('')
  const [saved, setSaved] = useState(false)
  const token = process.env.NEXT_PUBLIC_GATEWAY_TOKEN

  async function save() {
    await fetch(`/api/approvals/${approvalId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        status: 'approved',
        note: `ACCESS GRANTED — Credentials at: ${location}`,
      }),
    })
    setSaved(true)
  }

  return (
    <div style={panelStyle}>
      <div style={labelStyle}>Access granted — next steps</div>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>
        Access approved. Record where the credentials or access details live so Jared can retrieve them without asking.
      </div>
      {!saved ? (
        <>
          <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Credential location / retrieval instructions:
          </label>
          <textarea
            style={{ ...inputStyle, minHeight: 56 }}
            placeholder="e.g. 1Password vault › T&L Shared › Buildertrend API Key"
            value={location}
            onChange={e => setLocation(e.target.value)}
          />
          <button style={saveButtonStyle} onClick={save} disabled={!location.trim()}>
            Save location
          </button>
        </>
      ) : (
        <div style={{ color: 'var(--green)', fontSize: 11 }}>Location recorded.</div>
      )}
    </div>
  )
}

function FinancialFollowThrough({
  approvalId,
  costEstimate,
}: {
  approvalId: string
  costEstimate?: string
}) {
  const [docLink, setDocLink] = useState('')
  const [saved, setSaved] = useState(false)
  const token = process.env.NEXT_PUBLIC_GATEWAY_TOKEN

  async function save() {
    await fetch(`/api/approvals/${approvalId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        status: 'approved',
        note: `FINANCIAL APPROVED — Cost: ${costEstimate || 'see description'}${docLink ? ` | Comparison doc: ${docLink}` : ''}`,
      }),
    })
    setSaved(true)
  }

  return (
    <div style={panelStyle}>
      <div style={labelStyle}>Financial approval confirmed</div>
      {costEstimate && (
        <div style={{ color: 'var(--yellow)', marginBottom: 8, fontSize: 12 }}>
          Approved spend: <strong>{costEstimate}</strong>
        </div>
      )}
      <div style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>
        Spend approved. Agents may now execute. Optionally link the comparison doc for audit trail.
      </div>
      {!saved ? (
        <>
          <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Comparison doc link (optional):
          </label>
          <input
            type="text"
            style={inputStyle}
            placeholder="https://docs.google.com/..."
            value={docLink}
            onChange={e => setDocLink(e.target.value)}
          />
          <button style={saveButtonStyle} onClick={save}>
            Confirm and record
          </button>
        </>
      ) : (
        <div style={{ color: 'var(--green)', fontSize: 11 }}>Financial approval recorded.</div>
      )}
    </div>
  )
}

function ContentFollowThrough({ approvalId }: { approvalId: string }) {
  const [filePath, setFilePath] = useState('')
  const [saved, setSaved] = useState(false)
  const token = process.env.NEXT_PUBLIC_GATEWAY_TOKEN

  async function save() {
    await fetch(`/api/approvals/${approvalId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        status: 'approved',
        note: `CONTENT APPROVED — Draft at: ${filePath}`,
      }),
    })
    setSaved(true)
  }

  return (
    <div style={panelStyle}>
      <div style={labelStyle}>Content approved — locate draft</div>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>
        Content approved for publication. Record the draft file path or URL so Jared can review before it goes live.
      </div>
      {!saved ? (
        <>
          <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Draft file path or URL:
          </label>
          <input
            type="text"
            style={inputStyle}
            placeholder="e.g. workspace-priya/drafts/instagram-post-2026-04-02.md"
            value={filePath}
            onChange={e => setFilePath(e.target.value)}
          />
          <button style={saveButtonStyle} onClick={save} disabled={!filePath.trim()}>
            Mark ready for review
          </button>
        </>
      ) : (
        <div style={{ color: 'var(--green)', fontSize: 11 }}>Draft location recorded. Ready for Jared review.</div>
      )}
    </div>
  )
}

function DecisionFollowThrough({ approvalId }: { approvalId: string }) {
  const [decisionText, setDecisionText] = useState('')
  const [saved, setSaved] = useState(false)
  const token = process.env.NEXT_PUBLIC_GATEWAY_TOKEN

  async function save() {
    await fetch(`/api/approvals/${approvalId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        status: 'approved',
        note: `DECISION RECORDED: ${decisionText}`,
      }),
    })
    setSaved(true)
  }

  return (
    <div style={panelStyle}>
      <div style={labelStyle}>Decision approved — record outcome</div>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>
        Decision approved. Record the outcome or rationale for the audit trail.
      </div>
      {!saved ? (
        <>
          <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Decision outcome / rationale:
          </label>
          <textarea
            style={{ ...inputStyle, minHeight: 64 }}
            placeholder="e.g. Chose Option A — lower cost, faster timeline, reversible."
            value={decisionText}
            onChange={e => setDecisionText(e.target.value)}
          />
          <button style={saveButtonStyle} onClick={save} disabled={!decisionText.trim()}>
            Record decision
          </button>
        </>
      ) : (
        <div style={{ color: 'var(--green)', fontSize: 11 }}>Decision recorded.</div>
      )}
    </div>
  )
}

function DeploymentFollowThrough({ approvalId }: { approvalId: string }) {
  const [env, setEnv] = useState<'staging' | 'production' | ''>('')
  const [confirmed, setConfirmed] = useState(false)
  const [saved, setSaved] = useState(false)
  const token = process.env.NEXT_PUBLIC_GATEWAY_TOKEN

  async function save() {
    await fetch(`/api/approvals/${approvalId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        status: 'approved',
        note: `DEPLOYMENT APPROVED — Target env: ${env.toUpperCase()} | Checklist confirmed: yes`,
      }),
    })
    setSaved(true)
  }

  const checklistItems = [
    'Sam has confirmed infrastructure readiness',
    'Hank code review is complete',
    'Staging has been verified',
    'No critical bugs in the active build',
  ]

  return (
    <div style={panelStyle}>
      <div style={labelStyle}>Deployment approved — confirm environment</div>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 10 }}>
        Deployment approved. Confirm target environment and checklist before agents execute.
      </div>
      {!saved ? (
        <>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Target environment:
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['staging', 'production'] as const).map(e => (
                <button
                  key={e}
                  onClick={() => setEnv(e)}
                  style={{
                    padding: '5px 12px', borderRadius: 6, fontSize: 11, fontFamily: 'monospace',
                    cursor: 'pointer',
                    border: env === e ? '1px solid var(--green)' : '1px solid var(--border-faint)',
                    background: env === e ? 'rgba(45,212,160,0.08)' : 'var(--glass-bg)',
                    color: env === e ? 'var(--green)' : 'var(--text-muted)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {e.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Deployment checklist:
            </label>
            {checklistItems.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ color: 'var(--green)', fontSize: 11 }}>✓</span>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{item}</span>
              </div>
            ))}
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginBottom: 8 }}>
            <input
              type="checkbox"
              checked={confirmed}
              onChange={e => setConfirmed(e.target.checked)}
              style={{ accentColor: 'var(--green)' }}
            />
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              I confirm all checklist items are satisfied
            </span>
          </label>

          <button
            style={saveButtonStyle}
            onClick={save}
            disabled={!env || !confirmed}
          >
            Confirm deployment
          </button>
        </>
      ) : (
        <div style={{ color: 'var(--green)', fontSize: 11 }}>
          Deployment to {env.toUpperCase()} confirmed and recorded.
        </div>
      )}
    </div>
  )
}

export function ApprovalFollowThrough({
  approvalId,
  approvalType,
  title,
  description,
  costEstimate,
}: FollowThroughProps) {
  switch (approvalType) {
    case 'access':
      return <AccessFollowThrough approvalId={approvalId} />

    case 'financial':
      return (
        <FinancialFollowThrough
          approvalId={approvalId}
          costEstimate={costEstimate}
        />
      )

    case 'content':
      return <ContentFollowThrough approvalId={approvalId} />

    case 'decision':
      return <DecisionFollowThrough approvalId={approvalId} />

    case 'deployment':
      return <DeploymentFollowThrough approvalId={approvalId} />

    default:
      return (
        <div style={{ ...panelStyle, color: 'var(--green)', fontSize: 11 }}>
          Approved. No additional follow-through required for type: <code style={{ fontFamily: 'monospace', background: 'var(--bg-elevated)', padding: '1px 4px', borderRadius: 3 }}>{approvalType}</code>.
        </div>
      )
  }
}
