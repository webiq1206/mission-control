'use client'
/**
 * StageControl — BMH Deal Pipeline Stage Bar + Advance Button
 * Entity: Buy My House Boise
 *
 * Renders a 10-step horizontal progress bar with an advance button.
 * Stages 8-10 are Clint Robertson's domain — advance button is disabled
 * and shows "Clint Domain — Read Only" instead.
 * Stage advance fires a confirmation dialog before executing the PUT request.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface StageControlProps {
  dealId: string
  currentStage: number  // 1-10
  token: string | undefined
}

// Stage labels for tooltip display on each step
const STAGE_LABELS = [
  '', // index 0 unused (stages are 1-based)
  'Identified',
  'Skip Traced',
  'Contacted',
  'Engaged',
  'Offer Sent',
  'Negotiating',
  'Under Contract',
  'Closing',       // Clint domain
  'Closed',        // Clint domain
  'Dead',          // Clint domain
]

export function StageControl({ dealId, currentStage, token }: StageControlProps) {
  const router = useRouter()
  const [advancing, setAdvancing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Is current stage in Clint's domain? (stages 8-10 are read-only via agent UI)
  const isClintDomain = currentStage >= 8

  // Next stage for advance button label
  const nextStage = currentStage + 1
  const canAdvance = currentStage < 10 && !isClintDomain

  async function handleAdvance() {
    if (!canAdvance) return

    // Confirmation dialog — required before any stage advance (Ada compliance spec)
    const confirmed = window.confirm(
      `Advance deal to Stage ${nextStage}: ${STAGE_LABELS[nextStage]}?\n\nThis will update the pipeline stage and timestamp.`
    )
    if (!confirmed) return

    setAdvancing(true)
    setError(null)

    try {
      const res = await fetch(`/api/bmh/deals/${dealId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ stage: nextStage }),
      })

      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error || `HTTP ${res.status}`)
      }

      // Refresh the page to show updated stage
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Stage advance failed')
    } finally {
      setAdvancing(false)
    }
  }

  return (
    <div>
      {/* 10-step horizontal progress bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {Array.from({ length: 10 }, (_, i) => {
          const stageNum = i + 1
          const isCompleted = stageNum < currentStage
          const isCurrent   = stageNum === currentStage
          const isClint     = stageNum >= 8  // visual distinction for Clint-domain stages

          return (
            <div
              key={stageNum}
              title={`Stage ${stageNum}: ${STAGE_LABELS[stageNum]}`}
              style={{
                flex: 1,
                height: 6,
                borderRadius: 3,
                // Completed = active green, current = slightly brighter, future = dim card bg
                // Clint-domain stages (8-10) shown slightly differently — grayed future
                background: isCompleted
                  ? 'var(--bmh-stage-active)'
                  : isCurrent
                    ? 'var(--bmh-stage-active)'
                    : isClint
                      ? 'rgba(107,114,128,0.2)'  // very dim for Clint domain
                      : 'var(--bg-card)',
                opacity: isCurrent ? 1 : isCompleted ? 0.85 : 0.4,
                border: isCurrent ? '1px solid var(--bmh-stage-active)' : '1px solid transparent',
              }}
            />
          )
        })}
      </div>

      {/* Stage label and step count */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 12,
      }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          Stage {currentStage}/10 — {STAGE_LABELS[currentStage]}
        </span>
        {isClintDomain && (
          <span style={{
            fontSize: 11, color: 'var(--text-muted)',
            background: 'var(--bg-card)', padding: '2px 8px', borderRadius: 4,
          }}>
            Clint Domain
          </span>
        )}
      </div>

      {/* Stage advance button — disabled for Clint-domain stages */}
      {currentStage < 10 && (
        <button
          onClick={handleAdvance}
          disabled={!canAdvance || advancing}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            fontSize: 13,
            fontFamily: 'var(--font-geist-sans)',
            cursor: canAdvance ? 'pointer' : 'default',  // no pointer for Clint domain
            // Clint-domain stages: muted, no border, visually distinct as read-only
            background: isClintDomain ? 'transparent' : 'var(--bg-hover)',
            color: isClintDomain ? 'var(--text-muted)' : 'var(--text-primary)',
            border: isClintDomain ? 'none' : '1px solid var(--border-faint)',
            opacity: advancing ? 0.6 : 1,
          }}
        >
          {isClintDomain
            ? 'Clint Domain — Read Only'
            : advancing
              ? 'Advancing…'
              : `Advance to Stage ${nextStage}: ${STAGE_LABELS[nextStage]}`
          }
        </button>
      )}

      {currentStage === 10 && (
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Pipeline complete
        </span>
      )}

      {/* Error display */}
      {error && (
        <div style={{ marginTop: 8, color: '#EF4444', fontSize: 12 }}>
          {error}
        </div>
      )}
    </div>
  )
}
