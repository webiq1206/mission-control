'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { onApprovalAction } from '@/lib/approval-events'

const NAV = [
  { href: '/',           label: 'Overview'    },
  { href: '/kanban',     label: 'Kanban'      },
  { href: '/approvals',  label: 'Approvals'   },
  { href: '/agents',     label: 'Agents'      },
  { href: '/entities',   label: 'Entities'    },
  { href: '/ads',        label: 'Ads'         },
  { href: '/properties', label: 'Properties'  },
  { href: '/loans',      label: 'Loans'       },
  { href: '/priorities', label: 'Priorities'  },
  { href: '/reports',    label: 'Reports'     },
  { href: '/assets',     label: 'Assets'      },
  { href: '/ideas',      label: 'Ideas'       },
  { href: '/calendar',   label: 'Calendar'    },
  { href: '/memory',     label: 'Memory'      },
  { href: '/logs',       label: 'Logs'        },
]

const ENTITY_NAV = [
  { slug: 'timber-and-love',        label: 'Timber + Love',       color: 'var(--entity-tl)',  bg: 'var(--entity-tl-bg)' },
  { slug: 'buy-my-house-boise',     label: 'Buy My House Boise',  color: 'var(--entity-bmh)', bg: 'var(--entity-bmh-bg)' },
  { slug: 'friday-coffee-house',    label: 'Friday Coffee House', color: 'var(--entity-fch)', bg: 'var(--entity-fch-bg)' },
  { slug: 'timber-and-love-realty', label: 'T+L Realty',          color: 'var(--entity-tlr)', bg: 'var(--entity-tlr-bg)' },
  { slug: 'boise-boys',             label: 'Boise Boys',          color: 'var(--entity-bb)',  bg: 'var(--entity-bb-bg)' },
  { slug: 'stay-with-us',           label: 'Stay With Us',        color: 'var(--entity-swu)', bg: 'var(--entity-swu-bg)' },
  { slug: 'additional-ventures',    label: 'Additional Ventures', color: 'var(--entity-av)',  bg: 'var(--entity-av-bg)' },
]

const LLC_NAV = [
  { id: 'hanks-homes',        label: 'Hanks Homes',        color: 'var(--blue)' },
  { id: 'tl-holdings',        label: 'T+L Holdings',        color: 'var(--amber)' },
  { id: 'invest-in-boise',    label: 'Invest in Boise',    color: 'var(--green)' },
  { id: 'warm-springs-villa', label: 'Warm Springs Villa', color: 'var(--purple)' },
  { id: 'timber-and-love',    label: 'Timber and Love',    color: 'var(--red)' },
]

export function Sidebar() {
  const path = usePathname()
  const [counts, setCounts] = useState({ approvals: 0, ideas: 0 })
  const [emergencyStop, setEmergencyStop] = useState(false)
  // BMH deal sourcing section collapse state — closed by default
  const [bmhOpen, setBmhOpen] = useState(false)

  const token = process.env.NEXT_PUBLIC_GATEWAY_TOKEN

  useEffect(() => {
    async function load() {
      try {
        const [sys, apr, ideas] = await Promise.all([
          fetch('/api/system', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
          fetch('/api/approvals', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
          fetch('/api/ideas?status=new', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        ])
        setEmergencyStop(sys.emergency_stop === 'true')
        setCounts({
          approvals: Array.isArray(apr) ? apr.filter((a: {status: string}) => a.status === 'pending').length : 0,
          ideas: Array.isArray(ideas) ? ideas.length : 0,
        })
      } catch { /* ignore fetch errors during SSR */ }
    }
    load()
    const t = setInterval(load, 15000)
    const unsubApproval = onApprovalAction(() => { void load() })
    return () => {
      clearInterval(t)
      unsubApproval()
    }
  }, [token])

  async function toggleEmergencyStop() {
    await fetch('/api/system', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ emergency_stop: (!emergencyStop).toString() })
    })
    setEmergencyStop(!emergencyStop)
  }

  return (
    <aside
      style={{
        width: 220,
        borderRight: '1px solid var(--border-faint)',
        background: 'var(--bg-sidebar)',
        backdropFilter: 'blur(24px) saturate(1.1)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.1)',
      }}
      className="flex flex-col h-full shrink-0"
    >
      {/* Brand header */}
      <div style={{
        padding: '18px 16px 16px',
        borderBottom: '1px solid var(--border-faint)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4,
        }}>
          <div style={{
            width: 26, height: 26, borderRadius: 7,
            background: 'linear-gradient(135deg, var(--blue-bg), var(--purple-bg))',
            border: '1px solid var(--border-faint)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, flexShrink: 0,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
          }}>
            🦞
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
              Mission Control
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'monospace', letterSpacing: '0.06em' }}>
              Timber + Love
            </div>
          </div>
        </div>
      </div>

      {/* Main Nav */}
      <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>

        {/* Primary nav */}
        <div style={{ marginBottom: 16 }}>
          {NAV.map(item => {
            const active = path === item.href || (item.href !== '/' && path.startsWith(item.href))
            const badge =
              item.label === 'Approvals' && counts.approvals > 0 ? counts.approvals :
              item.label === 'Ideas' && counts.ideas > 0 ? counts.ideas : null
            const badgeColor = item.label === 'Ideas' ? 'var(--amber)' : 'var(--orange)'

            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  height: 38,
                  padding: '0 12px 0 14px',
                  borderRadius: 8,
                  fontSize: 13,
                  marginBottom: 1,
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: active ? 'var(--blue-bg)' : 'transparent',
                  borderLeft: active ? '2px solid var(--blue)' : '2px solid transparent',
                  textDecoration: 'none',
                  transition: 'background 0.2s, color 0.2s, box-shadow 0.2s',
                  fontWeight: active ? 500 : 400,
                  boxShadow: active ? '0 0 12px color-mix(in srgb, var(--blue) 6%, transparent)' : 'none',
                }}
              >
                {item.label}
                {badge && (
                  <span style={{
                    background: badgeColor, color: '#000',
                    borderRadius: 10, fontSize: 10, fontWeight: 700,
                    padding: '1px 6px', fontFamily: 'monospace',
                  }}>
                    {badge}
                  </span>
                )}
              </Link>
            )
          })}
        </div>

        {/* BMH Deal Sourcing Section — collapsible, Ada spec: left-border accent #2563EB */}
        <div style={{ borderTop: '1px solid var(--border-faint)', paddingTop: 'var(--sp-2)' }}>
          <button
            onClick={() => setBmhOpen(!bmhOpen)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', width: '100%',
              background: 'none', border: 'none',
              color: 'var(--text-muted)', cursor: 'pointer',
              fontSize: 9, fontFamily: 'var(--font-geist-sans)',
              letterSpacing: '0.14em', textTransform: 'uppercase',
            }}
          >
            <span style={{ color: 'var(--bmh-accent)' }}>🏠</span>
            <span>BMH Deals</span>
            <span style={{ marginLeft: 'auto', fontSize: 10 }}>{bmhOpen ? '▾' : '▸'}</span>
          </button>
          {bmhOpen && (
            <div style={{ borderLeft: '2px solid var(--bmh-accent)', marginLeft: 16, paddingLeft: 8, marginBottom: 4 }}>
              {([
                { href: '/bmh',              label: 'Dashboard'   },
                { href: '/bmh/data-health',  label: 'Data Health' },
                { href: '/bmh/outreach',     label: 'Outreach'    },
              ] as { href: string; label: string }[]).map(item => {
                // Exact match for /bmh, prefix match for sub-routes
                const active = item.href === '/bmh' ? path === '/bmh' : path.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      display: 'block', padding: '5px 10px',
                      fontSize: 12, fontFamily: 'var(--font-geist-sans)',
                      textDecoration: 'none', borderRadius: 4,
                      color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                      background: active ? 'var(--bg-hover)' : 'transparent',
                      fontWeight: active ? 500 : 400,
                      marginBottom: 1,
                    }}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Entity Links */}
        <div style={{ paddingTop: 10, borderTop: '1px solid var(--border-faint)' }}>
          <div style={{
            fontSize: 9, fontFamily: 'monospace', textTransform: 'uppercase',
            letterSpacing: '0.14em', color: 'var(--text-muted)',
            margin: '0 0 8px 16px',
          }}>
            Entities
          </div>
          {ENTITY_NAV.map(entity => {
            const active = path.startsWith(`/entities/${entity.slug}`)
            return (
              <Link
                key={entity.slug}
                href={`/entities/${entity.slug}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  height: 34,
                  padding: '0 12px 0 14px',
                  borderRadius: 8,
                  fontSize: 12,
                  marginBottom: 1,
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: active ? entity.bg : 'transparent',
                  borderLeft: active ? `2px solid ${entity.color}` : '2px solid transparent',
                  textDecoration: 'none',
                  transition: 'background 0.2s, color 0.2s',
                  fontWeight: active ? 500 : 400,
                }}
              >
                <div style={{
                  width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                  background: entity.color,
                  opacity: active ? 1 : 0.45,
                  boxShadow: active ? `0 0 8px color-mix(in srgb, ${entity.color} 38%, transparent)` : 'none',
                  transition: 'opacity 0.2s, box-shadow 0.2s',
                }} />
                {entity.label}
              </Link>
            )
          })}
        </div>

        {/* LLC / Holding Company Links */}
        <div style={{ paddingTop: 10, borderTop: '1px solid var(--border-faint)', marginTop: 10 }}>
          <div style={{
            fontSize: 9, fontFamily: 'monospace', textTransform: 'uppercase',
            letterSpacing: '0.14em', color: 'var(--text-muted)',
            margin: '0 0 8px 16px',
          }}>
            Holding Cos
          </div>
          {LLC_NAV.map(llc => (
            <Link
              key={llc.id}
              href={`/properties?llc=${llc.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                height: 34,
                padding: '0 12px 0 14px',
                borderRadius: 8,
                fontSize: 12,
                marginBottom: 1,
                color: 'var(--text-secondary)',
                background: 'transparent',
                borderLeft: '2px solid transparent',
                textDecoration: 'none',
                transition: 'background 0.2s, color 0.2s',
              }}
            >
              <div style={{
                width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                background: llc.color,
                opacity: 0.4,
              }} />
              {llc.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Guardrail State */}
      <div style={{
        margin: '8px',
        padding: '14px 14px',
        borderRadius: 10,
        border: `1px solid ${emergencyStop ? 'var(--red-border)' : 'var(--border-faint)'}`,
        background: emergencyStop ? 'var(--red-bg)' : 'var(--bg-card)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: emergencyStop ? '0 0 16px color-mix(in srgb, var(--red) 6%, transparent)' : 'var(--shadow-card)',
      }}>
        <div style={{
          fontSize: 9, fontFamily: 'monospace', textTransform: 'uppercase',
          letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: 10,
        }}>
          Guardrail State
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>Emergency stop</span>
          <span style={{
            fontSize: 10, fontFamily: 'monospace', padding: '2px 7px', borderRadius: 6,
            background: emergencyStop ? 'var(--red-bg)' : 'var(--green-bg)',
            color: emergencyStop ? 'var(--red)' : 'var(--green)',
            border: `1px solid ${emergencyStop ? 'var(--red-border)' : 'var(--green-border)'}`,
          }}>
            {emergencyStop ? 'ACTIVE' : 'Ready'}
          </span>
        </div>
        <p style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 12 }}>
          {emergencyStop
            ? 'All agent activity paused. Approval still lives with Jared.'
            : 'If triggered, all agent activity pauses until explicitly cleared.'}
        </p>
        <button
          onClick={toggleEmergencyStop}
          style={{
            width: '100%', padding: '7px', borderRadius: 8, fontSize: 11,
            fontFamily: 'monospace', cursor: 'pointer',
            border: emergencyStop ? 'none' : '1px solid var(--border-faint)',
            background: emergencyStop
              ? 'linear-gradient(135deg, var(--red), color-mix(in srgb, var(--red) 72%, black))'
              : 'var(--glass-bg)',
            color: emergencyStop ? 'var(--text-on-color)' : 'var(--text-secondary)',
            fontWeight: emergencyStop ? 700 : 400,
            transition: 'opacity 0.2s, box-shadow 0.2s, background 0.2s',
            boxShadow: emergencyStop ? '0 2px 12px color-mix(in srgb, var(--red) 20%, transparent)' : 'none',
          }}
        >
          {emergencyStop ? 'Clear Emergency Stop' : 'Trigger Emergency Stop'}
        </button>
      </div>
    </aside>
  )
}
