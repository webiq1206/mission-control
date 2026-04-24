'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { EntityBadge, getEntityColor } from '@/components/ui/EntityBadge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ENTITIES } from '@/lib/entities'

const CATEGORY_ICONS: Record<string, string> = {
  deliverable: '📦', report: '📊', content: '✍️', design: '🎨',
  strategy: '🧠', research: '🔍', copy: '📝', brief: '📋',
  spec: '⚙️', other: '📁',
}

interface Asset {
  id: string
  entity: string
  category: string
  title: string
  description?: string
  url?: string
  file_path?: string
  created_by?: string
  status: string
  tags: string[]
  created_at: string
}

function extractFilename(path: string): string {
  return path.split('/').pop() || path
}

export default function AssetsPage() {
  return <Suspense><AssetsContent /></Suspense>
}

function AssetsContent() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [expandedEntities, setExpandedEntities] = useState<Set<string>>(new Set())
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<Asset | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    fetch('/api/assets')
      .then(r => r.json())
      .then(d => {
        const items = d.assets || []
        setAssets(items)
        const entityParam = searchParams.get('entity')
        if (entityParam) {
          const match = ENTITIES.find(e => e.slug === entityParam || e.label === entityParam)
          if (match) setExpandedEntities(new Set([match.label]))
        } else if (items.length > 0) {
          const firstEntity = items[0]?.entity
          if (firstEntity) setExpandedEntities(new Set([firstEntity]))
        }
        const assetId = searchParams.get('id')
        if (assetId) {
          const match = items.find((a: Asset) => a.id === assetId)
          if (match) setSelected(match)
        }
        setLoading(false)
      })
  }, [])

  const categories = ['all', ...Array.from(new Set(assets.map(a => a.category))).sort()]
  const statuses = ['all', ...Array.from(new Set(assets.map(a => a.status))).sort()]

  const filtered = assets.filter(a => {
    if (filterCategory !== 'all' && a.category !== filterCategory) return false
    if (filterStatus !== 'all' && a.status !== filterStatus) return false
    if (search && !a.title.toLowerCase().includes(search.toLowerCase()) &&
        !a.description?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const byEntity: Record<string, Asset[]> = {}
  for (const a of filtered) {
    const key = a.entity || 'Untagged'
    if (!byEntity[key]) byEntity[key] = []
    byEntity[key].push(a)
  }

  const sortedEntities = ENTITIES.map(e => e.label).filter(label => byEntity[label])
  const extraEntities = Object.keys(byEntity).filter(k => !sortedEntities.includes(k))
  const allEntityKeys = [...sortedEntities, ...extraEntities]

  function toggleEntity(entity: string) {
    setExpandedEntities(prev => {
      const next = new Set(prev)
      if (next.has(entity)) next.delete(entity)
      else next.add(entity)
      return next
    })
  }

  return (
    <div style={{ display: 'flex', height: '100%', gap: 'var(--sp-4)' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', maxWidth: 1200 }}>
        {/* Header */}
        <div style={{ marginBottom: 'var(--sp-6)' }}>
          <div className="label" style={{ marginBottom: 6 }}>Mission Control</div>
          <h1 className="h1">Assets</h1>
          <p className="body-xs" style={{ marginTop: 4 }}>
            {assets.length} deliverables across all entities
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 'var(--sp-3)', marginBottom: 'var(--sp-6)', flexWrap: 'wrap' }}>
          <input
            placeholder="Search assets..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 200 }}
          />
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
            {categories.map(c => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            {statuses.map(s => <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s}</option>)}
          </select>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--sp-10)', color: 'var(--text-muted)' }}>Loading assets...</div>
        ) : allEntityKeys.length === 0 ? (
          <div className="card" style={{ padding: 'var(--sp-8)', textAlign: 'center' }}>
            <div className="body-sm" style={{ color: 'var(--text-muted)' }}>
              No assets found. Assets appear here when agents create deliverables — briefs, copy, designs, reports, and more.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            {allEntityKeys.map(entityKey => {
              const items = byEntity[entityKey]
              const isOpen = expandedEntities.has(entityKey)
              const entityColor = getEntityColor(entityKey)

              const byCategory: Record<string, Asset[]> = {}
              for (const a of items) {
                const cat = a.category || 'other'
                if (!byCategory[cat]) byCategory[cat] = []
                byCategory[cat].push(a)
              }

              return (
                <div key={entityKey} className="card" style={{ overflow: 'hidden' }}>
                  {/* Entity header */}
                  <div
                    onClick={() => toggleEntity(entityKey)}
                    style={{
                      padding: 'var(--sp-4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      cursor: 'pointer',
                      borderLeft: `3px solid ${entityColor}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{isOpen ? '▼' : '▶'}</span>
                      <EntityBadge entity={entityKey} showFull />
                      <span className="meta">— {items.length} asset{items.length !== 1 ? 's' : ''}</span>
                    </div>
                    {/* Category pills */}
                    <div style={{ display: 'flex', gap: 'var(--sp-1)', flexWrap: 'wrap' }}>
                      {Object.entries(byCategory).map(([cat, catItems]) => (
                        <span key={cat} style={{
                          fontSize: 10, fontFamily: 'var(--font-mono)',
                          padding: '1px 6px', borderRadius: 4,
                          background: 'var(--bg-inset)', color: 'var(--text-secondary)',
                          border: '1px solid var(--border-faint)',
                        }}>
                          {cat} {catItems.length}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Expanded content */}
                  {isOpen && (
                    <div style={{ padding: '0 var(--sp-4) var(--sp-4)' }}>
                      {Object.entries(byCategory).sort().map(([cat, catItems]) => (
                        <div key={cat} style={{ marginTop: 'var(--sp-4)' }}>
                          <div className="label" style={{ marginBottom: 'var(--sp-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>{CATEGORY_ICONS[cat] || '📁'}</span>
                            {cat.toUpperCase()} ({catItems.length})
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--sp-3)' }}>
                            {catItems.map(asset => (
                              <div
                                key={asset.id}
                                className="card-inset"
                                onClick={() => setSelected(selected?.id === asset.id ? null : asset)}
                                style={{
                                  cursor: 'pointer',
                                  border: selected?.id === asset.id ? '1px solid var(--blue)' : undefined,
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                  <StatusBadge status={asset.status} />
                                </div>
                                <div className="h4" style={{ marginBottom: 4 }}>{asset.title}</div>
                                {asset.description && (
                                  <div className="body-xs line-clamp-2" style={{ marginBottom: 6 }}>{asset.description}</div>
                                )}
                                <div className="meta" style={{ marginBottom: 4 }}>
                                  {asset.created_by || '—'} · {new Date(asset.created_at).toLocaleDateString()}
                                </div>
                                {asset.file_path && (
                                  <div style={{ marginTop: 4 }}>
                                    <span className="meta">File: {extractFilename(asset.file_path)}</span>
                                    {expandedPaths.has(asset.id) ? (
                                      <div className="meta" style={{ marginTop: 2, wordBreak: 'break-all', color: 'var(--text-faint)' }}>
                                        {asset.file_path}
                                      </div>
                                    ) : (
                                      <span
                                        onClick={(e) => { e.stopPropagation(); setExpandedPaths(prev => new Set([...prev, asset.id])) }}
                                        className="meta"
                                        style={{ color: 'var(--blue)', cursor: 'pointer', marginLeft: 6 }}
                                      >
                                        View path
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <div style={{
          width: 360, flexShrink: 0,
          background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--r-lg)', padding: 'var(--sp-5)', overflowY: 'auto',
          position: 'sticky', top: 0, maxHeight: 'calc(100vh - 2rem)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-4)' }}>
            <span style={{ fontSize: 20 }}>{CATEGORY_ICONS[selected.category] || '📁'}</span>
            <button onClick={() => setSelected(null)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}>×</button>
          </div>
          <div className="h3" style={{ marginBottom: 'var(--sp-2)' }}>{selected.title}</div>
          <EntityBadge entity={selected.entity} showFull style={{ marginBottom: 'var(--sp-4)' }} />
          {selected.description && (
            <p className="body-sm" style={{ lineHeight: 1.6, marginBottom: 'var(--sp-4)' }}>{selected.description}</p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', marginBottom: 'var(--sp-4)' }}>
            <div className="meta"><strong style={{ color: 'var(--text-secondary)' }}>Agent:</strong> {selected.created_by || '—'}</div>
            <div className="meta"><strong style={{ color: 'var(--text-secondary)' }}>Category:</strong> {selected.category}</div>
            <div className="meta"><strong style={{ color: 'var(--text-secondary)' }}>Status:</strong> {selected.status}</div>
            <div className="meta"><strong style={{ color: 'var(--text-secondary)' }}>Created:</strong> {new Date(selected.created_at).toLocaleString()}</div>
            {selected.file_path && (
              <details>
                <summary className="meta" style={{ cursor: 'pointer', color: 'var(--blue)' }}>View file path</summary>
                <div className="meta" style={{ marginTop: 4, wordBreak: 'break-all', color: 'var(--text-faint)' }}>{selected.file_path}</div>
              </details>
            )}
          </div>
          {selected.file_path && (
            <a href={`/api/assets/${selected.id}/content`}
              className="btn btn-primary" style={{ display: 'block', textAlign: 'center', width: '100%' }}>
              Open File
            </a>
          )}
        </div>
      )}
    </div>
  )
}
