'use client'

import { useState } from 'react'

export type ApprovalAction = 'approved' | 'rejected' | 'deferred' | 'acknowledged'

export function ApprovalButton({
  approvalId,
  action,
  onApproved,
}: {
  approvalId: string
  action: ApprovalAction
  onApproved?: (action: ApprovalAction) => void
}) {
  const token = process.env.NEXT_PUBLIC_GATEWAY_TOKEN
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      await fetch(`/api/approvals/${approvalId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: action }),
      })

      if (onApproved) {
        onApproved(action)
      } else {
        window.location.reload()
      }
    } finally {
      setLoading(false)
    }
  }

  const styles: Record<string, React.CSSProperties> = {
    approved: {
      background: 'rgba(45,212,160,0.08)',
      color: 'var(--green)',
      border: '1px solid rgba(45,212,160,0.15)',
    },
    rejected: {
      background: 'rgba(224,82,82,0.06)',
      color: 'var(--red)',
      border: '1px solid rgba(224,82,82,0.15)',
    },
    deferred: {
      background: 'var(--bg-elevated)',
      color: 'var(--text-muted)',
      border: '1px solid var(--border-faint)',
    },
    acknowledged: {
      background: 'rgba(138,138,168,0.08)',
      color: 'var(--text-secondary)',
      border: '1px solid rgba(138,138,168,0.15)',
    },
  }

  const labels: Record<string, string> = {
    approved: 'Approve',
    rejected: 'Reject',
    deferred: 'Modify',
    acknowledged: 'Acknowledge',
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      style={{
        padding: '5px 10px', borderRadius: 6, fontSize: 11,
        cursor: loading ? 'wait' : 'pointer',
        fontFamily: 'monospace',
        opacity: loading ? 0.6 : 1,
        transition: 'background 0.2s, box-shadow 0.2s, opacity 0.2s',
        ...styles[action],
      }}
    >
      {loading ? '...' : labels[action]}
    </button>
  )
}
