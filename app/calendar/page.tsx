'use client'
import { useState, useEffect } from 'react'
import { CalendarEventDetail } from '@/components/ui/CalendarEventDetail'

interface CalendarEvent {
  summary?: string
  start?: { dateTime?: string; date?: string }
  end?: { dateTime?: string; date?: string }
  location?: string
  description?: string
  calendarId?: string
}

export default function CalendarPage() {
  const token = process.env.NEXT_PUBLIC_GATEWAY_TOKEN
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [days, setDays] = useState('7')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/calendar?days=${days}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setEvents(data)
        else if (data.error) setError(data.error)
        else setEvents([])
        setLoading(false)
      })
      .catch(() => { setError('Failed to load calendar'); setLoading(false) })
  }, [days, token])

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200 }}>
      <div style={{ marginBottom: 24 }}>
        <div className="label" style={{ marginBottom: 4 }}>Mission Control</div>
        <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>Calendar</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          Google Calendar events via hank@timberandlove.com
        </p>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {['3', '7', '14', '30'].map(d => (
          <button key={d} onClick={() => setDays(d)} style={{
            padding: '5px 12px', borderRadius: 6, fontSize: 10, fontFamily: 'monospace',
            border: '1px solid var(--border-faint)', cursor: 'pointer',
            background: days === d ? 'var(--bg-elevated)' : 'transparent',
            color: days === d ? 'var(--text-primary)' : 'var(--text-muted)',
          }}>
            {d} days
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: 20 }}>Loading calendar...</div>
      ) : error ? (
        <div className="card" style={{ padding: '20px', color: 'var(--red)', fontSize: 12 }}>{error}</div>
      ) : events.length === 0 ? (
        <div className="card" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
          No events in the next {days} days.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {events.map((ev, i) => (
            <CalendarEventDetail key={i} event={ev} />
          ))}
        </div>
      )}
    </div>
  )
}
