'use client'

import { useState, Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'

interface Props {
  report: Record<string, unknown>
}

export function ReportDetailPanel({ report }: Props) {
  const [open, setOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const content = (report.content_html as string) || (report.content_md as string) || ''
  const isHtml = content.trim().startsWith('<!DOCTYPE') || content.trim().startsWith('<html')

  const statusColor: Record<string, string> = {
    sent: 'var(--green)',
    failed: 'var(--red)',
    not_sent: 'var(--text-muted)',
  }
  const status = report.status as string
  const reportStatusTint = statusColor[status] || 'var(--text-muted)'

  async function downloadPdf() {
    if (!isHtml) return
    setDownloading(true)
    try {
      const token = process.env.NEXT_PUBLIC_GATEWAY_TOKEN
      const res = await fetch('/api/reports/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ html: content }),
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${(report.title as string).replace(/\s+/g, '_')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <>
      <div onClick={() => setOpen(true)} style={{ cursor: 'pointer' }} className="card light-shadow-on-hover" role="button">
        <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{report.title as string}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, display: 'flex', gap: 8, alignItems: 'center' }}>
                <span>To: {report.recipient as string}</span>
                <span style={{ opacity: 0.3 }}>&middot;</span>
                <span>{report.entity_scope as string}</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="badge" style={{
              background: `color-mix(in srgb, ${reportStatusTint} 8.2%, transparent)`,
              color: reportStatusTint,
              border: `1px solid color-mix(in srgb, ${reportStatusTint} 18.8%, transparent)`,
              fontSize: 10,
            }}>
              {status}
            </span>
            <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-faint)' }}>
              {report.sent_at as string}
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
                  <Dialog.Panel className="pointer-events-auto w-screen max-w-2xl">
                    <div className="flex h-full flex-col" style={{ background: 'var(--bg-card)', backdropFilter: 'blur(24px)', boxShadow: '-4px 0 40px rgba(0,0,0,0.5)', borderLeft: '1px solid var(--border-faint)' }}>
                      {/* Header */}
                      <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-faint)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <Dialog.Title style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                            {report.title as string}
                          </Dialog.Title>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontFamily: 'monospace' }}>
                            To: {report.recipient as string} &middot; {report.sent_at as string}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          {isHtml && (
                            <button onClick={downloadPdf} disabled={downloading} className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: 11 }}>
                              <ArrowDownTrayIcon style={{ width: 14, height: 14 }} />
                              {downloading ? 'PDF...' : 'PDF'}
                            </button>
                          )}
                          <button onClick={() => setOpen(false)} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-faint)', borderRadius: 6, padding: 6, cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}>
                            <XMarkIcon style={{ width: 16, height: 16 }} />
                          </button>
                        </div>
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        {isHtml ? (
                          <iframe
                            srcDoc={content}
                            style={{ width: '100%', height: '100%', border: 'none', background: '#ffffff' }}
                            title="Report Content"
                          />
                        ) : (
                          <div style={{ padding: '20px 24px', overflowY: 'auto', height: '100%' }}>
                            <div style={{ fontSize: 12, lineHeight: 1.7, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                              {content || 'No content available.'}
                            </div>
                          </div>
                        )}
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
