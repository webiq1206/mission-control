'use client'

import { useState, Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface CalendarEvent {
  summary?: string
  start?: { dateTime?: string; date?: string }
  end?: { dateTime?: string; date?: string }
  location?: string
  description?: string
  calendarId?: string
}

export function CalendarEventDetail({ event }: { event: CalendarEvent }) {
  const [open, setOpen] = useState(false)

  const startStr = event.start?.dateTime || event.start?.date || ''
  const endStr = event.end?.dateTime || event.end?.date || ''

  function formatFull(str: string, hasTime: boolean) {
    if (!str) return '—'
    const d = new Date(str)
    if (!hasTime) return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    return d.toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  const hasTime = !!event.start?.dateTime

  return (
    <>
      <div onClick={() => setOpen(true)} style={{ cursor: 'pointer' }} title="Click to view event details" className="card light-shadow-on-hover" role="button">
        <div style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{event.summary || 'Untitled'}</div>
              {event.location && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{event.location}</div>
              )}
            </div>
            <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-secondary)', flexShrink: 0 }}>
              {formatFull(startStr, hasTime).split(',').slice(0, 2).join(',')}
            </span>
          </div>
        </div>
      </div>

      <Transition.Root show={open} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setOpen(false)}>
          <Transition.Child as={Fragment} enter="ease-in-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in-out duration-300" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0" style={{ backdropFilter: 'blur(8px)', background: 'rgba(6,9,13,0.75)' }} />
          </Transition.Child>
          <div className="fixed inset-0 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
              <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
                <Transition.Child as={Fragment} enter="transform transition ease-in-out duration-400" enterFrom="translate-x-full" enterTo="translate-x-0" leave="transform transition ease-in-out duration-400" leaveFrom="translate-x-0" leaveTo="translate-x-full">
                  <Dialog.Panel className="pointer-events-auto w-screen max-w-md">
                    <div className="flex h-full flex-col overflow-y-auto" style={{ background: 'var(--bg-card)', backdropFilter: 'blur(24px)', boxShadow: '-4px 0 40px rgba(0,0,0,0.5)', borderLeft: '1px solid var(--border-faint)' }}>
                      <div style={{ padding: '22px 24px 18px', borderBottom: '1px solid var(--border-faint)' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                              <span style={{
                                fontSize: 10, fontFamily: 'monospace', fontWeight: 600, padding: '2px 8px', borderRadius: 5,
                                background: 'rgba(74,158,255,0.10)', color: 'var(--blue)', border: '1px solid rgba(74,158,255,0.20)',
                              }}>Calendar Event</span>
                            </div>
                            <Dialog.Title style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                              {event.summary || 'Untitled Event'}
                            </Dialog.Title>
                          </div>
                          <button onClick={() => setOpen(false)} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-faint)', borderRadius: 6, padding: 6, cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}>
                            <XMarkIcon style={{ width: 18, height: 18 }} />
                          </button>
                        </div>
                      </div>
                      <div style={{ flex: 1, padding: '20px 24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                          <div>
                            <div className="label" style={{ marginBottom: 6 }}>When</div>
                            <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                              {formatFull(startStr, hasTime)}
                            </div>
                            {endStr && (
                              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                                to {formatFull(endStr, hasTime)}
                              </div>
                            )}
                          </div>

                          {event.location && (
                            <div>
                              <div className="label" style={{ marginBottom: 6 }}>Location</div>
                              <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{event.location}</div>
                            </div>
                          )}

                          {event.calendarId && (
                            <div>
                              <div className="label" style={{ marginBottom: 6 }}>Calendar</div>
                              <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{event.calendarId}</div>
                            </div>
                          )}

                          {event.description && (
                            <div>
                              <div className="label" style={{ marginBottom: 6 }}>Description</div>
                              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                {event.description}
                              </div>
                            </div>
                          )}

                          {!event.description && !event.location && (
                            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                              No additional details for this event.
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
    </>
  )
}
