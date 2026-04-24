'use client'
import { useState, useEffect, useRef } from 'react'
import { ENTITIES } from '@/lib/entities'
import { ReportDetailPanel } from '@/components/ui/ReportDetailPanel'
import {
  DocumentTextIcon,
  ArrowDownTrayIcon,
  PaperAirplaneIcon,
  ClockIcon,
  SparklesIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline'

const TEMPLATES = [
  { name: 'Weekly Portfolio Summary', entity_scope: 'all', sections: { priorities: true, tasks: true, approvals: true, agents: true }, description: 'Full overview across all entities' },
  { name: 'T+L Project Status', entity_scope: 'Timber + Love', sections: { tasks: true, priorities: true, approvals: false, agents: false }, description: 'Timber + Love project focus' },
  { name: 'BMH Pipeline Report', entity_scope: 'Buy My House Boise', sections: { tasks: true, priorities: true, approvals: false, agents: false }, description: 'Buy My House deal pipeline' },
  { name: 'Stay With Us Status', entity_scope: 'Stay With Us', sections: { tasks: true, priorities: true, approvals: false, agents: false }, description: 'Stay With Us operations' },
  { name: 'Exec Briefing', entity_scope: 'all', sections: { priorities: true, tasks: false, approvals: false, agents: true }, description: 'High-level priorities + team' },
]

type Sections = { priorities: boolean; tasks: boolean; approvals: boolean; agents: boolean }

export default function ReportsPage() {
  const token = process.env.NEXT_PUBLIC_GATEWAY_TOKEN
  const [tab, setTab] = useState<'build' | 'history'>('build')
  const [title, setTitle] = useState('Weekly Portfolio Summary')
  const [recipient, setRecipient] = useState('luke')
  const [entityScope, setEntityScope] = useState('all')
  const [sections, setSections] = useState<Sections>({ priorities: true, tasks: true, approvals: true, agents: true })
  const [customNote, setCustomNote] = useState('')
  const [preview, setPreview] = useState('')
  const [generating, setGenerating] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [sending, setSending] = useState(false)
  const [history, setHistory] = useState<Record<string, unknown>[]>([])
  const [activeTemplate, setActiveTemplate] = useState(0)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (tab === 'history') {
      fetch('/api/reports', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => { if (Array.isArray(data)) setHistory(data) })
    }
  }, [tab, token])

  const recipientNames: Record<string, string> = {
    luke: 'Luke Caldwell', adam: 'Adam Markowich', both: 'Luke & Adam', jared: 'Jared Brost',
  }

  function applyTemplate(t: typeof TEMPLATES[0], idx: number) {
    setTitle(t.name)
    setEntityScope(t.entity_scope)
    setSections(t.sections as Sections)
    setActiveTemplate(idx)
    setPreview('')
  }

  async function generate() {
    setGenerating(true)
    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, recipient_name: recipientNames[recipient], entity_scope: entityScope, sections, custom_note: customNote }),
      })
      const data = await res.json()
      setPreview(data.content_html || '')
    } finally {
      setGenerating(false)
    }
  }

  async function downloadPdf() {
    if (!preview) return
    setDownloading(true)
    try {
      const res = await fetch('/api/reports/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ html: preview }),
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  async function sendReport() {
    setSending(true)
    try {
      await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, recipient, entity_scope: entityScope, content_html: preview, send_email: true }),
      })
      setTab('history')
    } finally {
      setSending(false)
    }
  }

  function toggleSection(key: keyof Sections) {
    setSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="label" style={{ marginBottom: 4 }}>Mission Control</div>
          <h1>Reports</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>Generate and distribute professional portfolio reports</p>
        </div>
        <div style={{ display: 'flex', gap: 4, background: 'var(--glass-bg)', borderRadius: 'var(--r-md)', padding: 3, border: '1px solid var(--border-faint)' }}>
          {(['build', 'history'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={tab === t ? 'btn btn-ghost' : 'btn'} style={{
              padding: '6px 14px', fontSize: 12, borderRadius: 6,
              background: tab === t ? 'var(--bg-elevated)' : 'transparent',
              color: tab === t ? 'var(--text-primary)' : 'var(--text-muted)',
              border: tab === t ? '1px solid var(--border-default)' : '1px solid transparent',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {t === 'build' ? <DocumentDuplicateIcon style={{ width: 14, height: 14 }} /> : <ClockIcon style={{ width: 14, height: 14 }} />}
              {t === 'build' ? 'Build Report' : 'History'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'build' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 24, marginTop: 24 }}>
          {/* Left: Configuration Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Templates */}
            <div className="card" style={{ padding: 16 }}>
              <div className="label" style={{ marginBottom: 10 }}>Quick Templates</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {TEMPLATES.map((t, i) => (
                  <button key={t.name} onClick={() => applyTemplate(t, i)} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    borderRadius: 'var(--r-md)', cursor: 'pointer', textAlign: 'left',
                    background: activeTemplate === i ? 'var(--blue-bg)' : 'var(--glass-bg)',
                    border: activeTemplate === i ? '1px solid color-mix(in srgb, var(--blue) 25%, transparent)' : '1px solid var(--border-faint)',
                    transition: 'all 0.15s ease',
                  }}>
                    <DocumentTextIcon style={{
                      width: 18, height: 18, flexShrink: 0,
                      color: activeTemplate === i ? 'var(--blue)' : 'var(--text-muted)',
                    }} />
                    <div>
                      <div style={{
                        fontSize: 12, fontWeight: 500,
                        color: activeTemplate === i ? 'var(--blue)' : 'var(--text-primary)',
                      }}>{t.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{t.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Configuration */}
            <div className="card" style={{ padding: 16 }}>
              <div className="label" style={{ marginBottom: 12 }}>Configuration</div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Report Title</label>
                <input value={title} onChange={e => setTitle(e.target.value)} style={{ fontSize: 13 }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Recipient</label>
                  <select value={recipient} onChange={e => setRecipient(e.target.value)} style={{ fontSize: 13 }}>
                    <option value="luke">Luke Caldwell</option>
                    <option value="adam">Adam Markowich</option>
                    <option value="both">Both</option>
                    <option value="jared">Jared (preview)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Entity Scope</label>
                  <select value={entityScope} onChange={e => setEntityScope(e.target.value)} style={{ fontSize: 13 }}>
                    <option value="all">All Entities</option>
                    {ENTITIES.map(e => (
                      <option key={e.slug} value={e.label}>{e.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Include Sections</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {(['priorities', 'tasks', 'approvals', 'agents'] as const).map(s => (
                    <label key={s} style={{
                      display: 'flex', alignItems: 'center', gap: 8, fontSize: 12,
                      color: sections[s] ? 'var(--text-primary)' : 'var(--text-muted)',
                      cursor: 'pointer', padding: '6px 8px', borderRadius: 6,
                      background: sections[s] ? 'var(--bg-elevated)' : 'transparent',
                      border: '1px solid',
                      borderColor: sections[s] ? 'var(--border-default)' : 'transparent',
                      transition: 'all 0.15s ease',
                    }}>
                      <input type="checkbox" checked={sections[s]} onChange={() => toggleSection(s)}
                        style={{ accentColor: 'var(--blue)', width: 14, height: 14 }} />
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Custom Note</label>
                <textarea value={customNote} onChange={e => setCustomNote(e.target.value)} rows={2}
                  placeholder="Optional note to include in the report..."
                  style={{ fontSize: 12, resize: 'vertical' }} />
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={generate} disabled={generating} className="btn btn-primary" style={{
                width: '100%', justifyContent: 'center', padding: '10px 16px',
                opacity: generating ? 0.7 : 1, fontSize: 13,
              }}>
                <SparklesIcon style={{ width: 16, height: 16 }} />
                {generating ? 'Generating...' : 'Generate Report'}
              </button>

              {preview && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button onClick={downloadPdf} disabled={downloading} className="btn btn-ghost" style={{
                    justifyContent: 'center', padding: '8px 12px', fontSize: 12,
                    opacity: downloading ? 0.7 : 1,
                  }}>
                    <ArrowDownTrayIcon style={{ width: 14, height: 14 }} />
                    {downloading ? 'Creating PDF...' : 'Download PDF'}
                  </button>
                  <button onClick={sendReport} disabled={sending} className="btn btn-success" style={{
                    justifyContent: 'center', padding: '8px 12px', fontSize: 12,
                    opacity: sending ? 0.7 : 1,
                  }}>
                    <PaperAirplaneIcon style={{ width: 14, height: 14 }} />
                    {sending ? 'Sending...' : 'Send Email'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right: Preview */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="label" style={{ marginBottom: 10 }}>Report Preview</div>
            <div className="card" style={{
              flex: 1, overflow: 'hidden', position: 'relative',
              background: preview ? '#ffffff' : 'var(--bg-card)',
              minHeight: 600,
            }}>
              {preview ? (
                <iframe
                  ref={iframeRef}
                  srcDoc={preview}
                  style={{
                    width: '100%', height: '100%', border: 'none',
                    position: 'absolute', inset: 0,
                    background: '#ffffff',
                  }}
                  title="Report Preview"
                />
              ) : (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  height: '100%', minHeight: 500, gap: 12, padding: 40,
                }}>
                  <DocumentTextIcon style={{ width: 48, height: 48, color: 'var(--text-muted)', opacity: 0.5 }} />
                  <div style={{ fontSize: 14, color: 'var(--text-muted)', textAlign: 'center' }}>
                    Select a template and click <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Generate Report</span> to preview
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)', textAlign: 'center', maxWidth: 300 }}>
                    Reports are generated as professionally designed documents, ready to download as PDF or send via email.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* History Tab */
        <div style={{ marginTop: 24 }}>
          {history.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center' }}>
              <ClockIcon style={{ width: 40, height: 40, color: 'var(--text-muted)', margin: '0 auto 12px', opacity: 0.5 }} />
              <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>No reports sent yet</div>
              <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 4 }}>Generated reports will appear here after sending</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {history.map(r => (
                <ReportDetailPanel key={r.id as string} report={r} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
