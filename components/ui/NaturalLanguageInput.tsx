'use client'

import { useState, useRef, useCallback } from 'react'
import TextareaAutosize from 'react-textarea-autosize'

interface NaturalLanguageInputProps {
  placeholder?: string
  onSubmit: (value: string) => Promise<void> | void
  disabled?: boolean
  style?: React.CSSProperties
}

export function NaturalLanguageInput({
  placeholder = 'Type any instruction in plain language...',
  onSubmit,
  disabled = false,
  style,
}: NaturalLanguageInputProps) {
  const [value, setValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = useCallback(async () => {
    const trimmed = value.trim()
    if (!trimmed || submitting) return
    setSubmitting(true)
    try {
      await onSubmit(trimmed)
      setValue('')
    } finally {
      setSubmitting(false)
    }
  }, [value, submitting, onSubmit])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }, [handleSubmit])

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-end',
        gap: 8,
        ...style,
      }}
    >
      <TextareaAutosize
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || submitting}
        minRows={1}
        maxRows={4}
        style={{
          flex: 1,
          background: 'var(--bg-input)',
          border: '1px solid var(--border-faint)',
          borderRadius: 'var(--r-md)',
          color: 'var(--text-primary)',
          padding: '8px 12px',
          fontSize: 13,
          lineHeight: 1.5,
          resize: 'none',
          outline: 'none',
          transition: 'border-color 180ms ease',
          fontFamily: 'inherit',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = 'var(--border-default)'
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'var(--border-faint)'
        }}
      />
      <button
        onClick={handleSubmit}
        disabled={!value.trim() || submitting}
        style={{
          flexShrink: 0,
          width: 34,
          height: 34,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 'var(--r-md)',
          border: '1px solid var(--border-faint)',
          background: value.trim() ? 'var(--blue-bg)' : 'transparent',
          color: value.trim() ? 'var(--blue)' : 'var(--text-muted)',
          cursor: !value.trim() || submitting ? 'not-allowed' : 'pointer',
          transition: 'all 180ms ease',
          fontSize: 16,
          padding: 0,
        }}
      >
        →
      </button>
    </div>
  )
}
