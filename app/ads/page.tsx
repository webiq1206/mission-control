export const dynamic = 'force-dynamic'

import { getDb } from '@/lib/db'
import { ENTITIES } from '@/lib/entities'
import { PageRefresher } from '@/components/ui/PageRefresher'
import Link from 'next/link'
import { format, formatDistanceToNow } from 'date-fns'
import { ClickableCampaignCard } from '@/components/ui/ClickableCampaignCard'
import { ClickableRecommendationCard } from '@/components/ui/ClickableRecommendationCard'

type Campaign = Record<string, unknown>
type Recommendation = Record<string, unknown>

const STATUS_COLORS: Record<string, string> = {
  active: 'var(--green)',
  paused: 'var(--amber)',
  draft: 'var(--text-muted)',
  completed: 'var(--blue)',
  archived: '#3a3a50',
}

function timeAgo(ts: string) {
  try { return formatDistanceToNow(new Date(ts), { addSuffix: true }) }
  catch { return ts }
}

export default async function AdsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; show_all?: string }>
}) {
  const params = await searchParams
  const activeTab = params.tab || 'active'
  const showAll = params.show_all === '1'

  const db = getDb()

  const dateFilter = showAll ? '' : `WHERE COALESCE(date_stop, last_updated) >= date('now', '-90 days')`

  const campaigns = db.prepare(`
    SELECT * FROM ad_campaigns ${dateFilter} ORDER BY last_updated DESC
  `).all() as Campaign[]

  const recommendations = db.prepare(`
    SELECT * FROM ad_recommendations ORDER BY created_at DESC LIMIT 20
  `).all() as Recommendation[]

  const lastSynced = db.prepare(`
    SELECT MAX(last_updated) as ts FROM ad_campaigns
  `).get() as { ts: string | null }

  const visibleCampaigns = activeTab === 'active'
    ? campaigns.filter(c => c.status === 'active' || c.status === 'ACTIVE')
    : activeTab === 'paused'
    ? campaigns.filter(c => c.status === 'paused' || c.status === 'PAUSED')
    : campaigns

  const byEntity = ENTITIES.map(entity => ({
    entity,
    campaigns: visibleCampaigns.filter(c => c.entity === entity.label || c.entity === entity.slug),
  })).filter(e => e.campaigns.length > 0)

  const totalActive = campaigns.filter(c => c.status === 'active' || c.status === 'ACTIVE').length
  const totalBudget = campaigns.reduce((sum, c) => sum + ((c.budget_monthly as number) || 0), 0)
  const totalSpend = campaigns.reduce((sum, c) => sum + ((c.spend as number) || (c.spend_mtd as number) || 0), 0)
  const totalLeads = campaigns.reduce((sum, c) => sum + ((c.leads as number) || 0), 0)
  const avgCpl = totalLeads > 0 ? totalSpend / totalLeads : 0

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1400 }}>
      <PageRefresher />

      {/* Header */}
      <div style={{
        marginBottom: 28, paddingBottom: 20,
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      }}>
        <div>
          <div className="label" style={{ marginBottom: 6 }}>Advertising</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>Ad Campaigns</h1>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--green)' }}>
              {totalActive} active
            </span>
            {totalSpend > 0 && (
              <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                ${totalSpend.toLocaleString(undefined, {maximumFractionDigits: 0})} spend
              </span>
            )}
            {totalLeads > 0 && (
              <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--blue)' }}>
                {totalLeads} leads
              </span>
            )}
            {avgCpl > 0 && (
              <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                ${avgCpl.toFixed(0)} CPL
              </span>
            )}
            {lastSynced.ts && (
              <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                synced: {new Date(lastSynced.ts).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {[
            { tab: 'active', label: `Active (${campaigns.filter(c => c.status === 'active' || c.status === 'ACTIVE').length})` },
            { tab: 'paused', label: `Paused (${campaigns.filter(c => c.status === 'paused' || c.status === 'PAUSED').length})` },
            { tab: 'all', label: `All (${campaigns.length})` },
          ].map(t => (
            <Link key={t.tab} href={`/ads?tab=${t.tab}${showAll ? '&show_all=1' : ''}`} style={{
              padding: '5px 12px', borderRadius: 6, fontSize: 11, fontFamily: 'var(--font-mono)',
              textDecoration: 'none',
              border: `1px solid ${activeTab === t.tab ? 'var(--blue-border)' : 'var(--border-faint)'}`,
              background: activeTab === t.tab ? 'var(--blue-bg)' : 'transparent',
              color: activeTab === t.tab ? 'var(--blue)' : 'var(--text-muted)',
              fontWeight: activeTab === t.tab ? 600 : 400,
            }}>{t.label}</Link>
          ))}
          <Link href={`/ads?tab=${activeTab}${showAll ? '' : '&show_all=1'}`} style={{
            padding: '5px 12px', borderRadius: 6, fontSize: 11, fontFamily: 'var(--font-mono)',
            textDecoration: 'none', marginLeft: 4,
            border: '1px solid var(--border-faint)',
            color: 'var(--text-muted)',
          }}>{showAll ? 'Last 90d' : 'All time'}</Link>
        </div>
      </div>

      {/* No campaigns state */}
      {campaigns.length === 0 && (
        <div style={{
          padding: '40px', textAlign: 'center',
          background: 'var(--bg-card)', border: '1px dashed var(--border-subtle)',
          borderRadius: 8, color: 'var(--text-muted)',
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>No ad campaigns yet</div>
          <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>
            Agents can POST to /api/ad-campaigns to register campaigns.
          </div>
        </div>
      )}

      {/* Campaigns by Entity */}
      {byEntity.map(({ entity, campaigns: entityCampaigns }) => (
        <div key={entity.slug} style={{ marginBottom: 32 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
            paddingBottom: 10, borderBottom: `1px solid ${entity.color}20`,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: entity.color }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: entity.color }}>{entity.abbr}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{entity.label}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
              {entityCampaigns.length} campaign{entityCampaigns.length !== 1 ? 's' : ''}
            </span>
            <Link href={`/entities/${entity.slug}`} style={{
              marginLeft: 'auto', fontSize: 11, color: entity.color,
              textDecoration: 'none', fontFamily: 'monospace',
              padding: '3px 8px', borderRadius: 4,
              border: `1px solid ${entity.color}30`,
              background: `${entity.color}08`,
            }}>
              View Entity →
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 10 }}>
            {entityCampaigns.map(campaign => {
              const campaignStatusColor = STATUS_COLORS[campaign.status as string] || '#555'
              return (
              <ClickableCampaignCard key={campaign.id as string} data={campaign}>
                <div style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderLeft: `3px solid ${entity.color}`,
                  borderRadius: 6,
                  padding: '14px 16px',
                  transition: 'border-color 0.15s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{(campaign.campaign_name || campaign.name) as string}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {campaign.platform as string}{(campaign.objective as string) ? ` · ${campaign.objective as string}` : ''}{(campaign.days_running as number) > 0 ? ` · ${campaign.days_running}d running` : ''}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 10, fontFamily: 'monospace', padding: '2px 7px', borderRadius: 10,
                      background: `color-mix(in srgb, ${campaignStatusColor} 9.4%, transparent)`,
                      color: campaignStatusColor,
                      border: `1px solid color-mix(in srgb, ${campaignStatusColor} 18.8%, transparent)`,
                      whiteSpace: 'nowrap', flexShrink: 0,
                    }}>
                      {campaign.status as string}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 8 }}>
                    {((campaign.spend as number) > 0 || (campaign.spend_30d as number) > 0 || (campaign.budget_monthly as number) > 0) && (
                      <div style={{ background: 'var(--bg-elevated)', borderRadius: 4, padding: '7px 8px' }}>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: 3 }}>
                          {(campaign.spend_30d as number) > 0 ? 'SPEND 30D' : (campaign.spend_mtd as number) > 0 ? 'SPEND MTD' : 'LIFETIME'}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace' }}>
                          ${((campaign.spend_30d || campaign.spend_mtd || campaign.spend || campaign.budget_monthly) as number).toLocaleString(undefined, {maximumFractionDigits: 0})}
                        </div>
                      </div>
                    )}
                    {((campaign.leads as number) > 0 || (campaign.leads_30d as number) > 0 || (campaign.leads_mtd as number) > 0) && (
                      <div style={{ background: 'var(--bg-elevated)', borderRadius: 4, padding: '7px 8px' }}>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: 3 }}>LEADS</div>
                        <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace' }}>
                          {((campaign.leads_30d || campaign.leads_mtd || campaign.leads) as number).toLocaleString()}
                        </div>
                      </div>
                    )}
                    {(campaign.cpl as number) > 0 && (
                      <div style={{ background: 'var(--bg-elevated)', borderRadius: 4, padding: '7px 8px' }}>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: 3 }}>CPL</div>
                        <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace' }}>${(campaign.cpl as number).toFixed(0)}</div>
                      </div>
                    )}
                    {(campaign.impressions as number) > 0 && (
                      <div style={{ background: 'var(--bg-elevated)', borderRadius: 4, padding: '7px 8px' }}>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: 3 }}>IMPR</div>
                        <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace' }}>
                          {(campaign.impressions as number) >= 1000 ? `${((campaign.impressions as number)/1000).toFixed(1)}K` : campaign.impressions as number}
                        </div>
                      </div>
                    )}
                    {(campaign.ctr as number) > 0 && (
                      <div style={{ background: 'var(--bg-elevated)', borderRadius: 4, padding: '7px 8px' }}>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: 3 }}>CTR</div>
                        <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace' }}>{(campaign.ctr as number).toFixed(2)}%</div>
                      </div>
                    )}
                    {(campaign.cpc as number) > 0 && (
                      <div style={{ background: 'var(--bg-elevated)', borderRadius: 4, padding: '7px 8px' }}>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: 3 }}>CPC</div>
                        <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace' }}>${(campaign.cpc as number).toFixed(2)}</div>
                      </div>
                    )}
                    {(campaign.roas as number) > 0 && (
                      <div style={{ background: 'var(--bg-elevated)', borderRadius: 4, padding: '7px 8px' }}>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: 3 }}>ROAS</div>
                        <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace' }}>{(campaign.roas as number).toFixed(2)}x</div>
                      </div>
                    )}
                  </div>

                  {(campaign.notes as string) && (
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 6 }}>
                      {campaign.notes as string}
                    </div>
                  )}

                  <div style={{ fontSize: 10, color: 'var(--text-faint)', fontFamily: 'monospace' }}>
                    Updated {timeAgo(campaign.last_updated as string)}
                  </div>
                </div>
              </ClickableCampaignCard>
              )
            })}
          </div>
        </div>
      ))}

      {/* AI Recommendations */}
      {recommendations.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <div className="label" style={{ marginBottom: 12 }}>AI Recommendations</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recommendations.map(rec => (
              <ClickableRecommendationCard key={rec.id as string} data={rec}>
                <div style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderLeft: `3px solid ${rec.status === 'approved' ? 'var(--green)' : rec.status === 'rejected' ? 'var(--red)' : 'var(--orange)'}`,
                  borderRadius: 6,
                  padding: '12px 14px',
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  transition: 'border-color 0.15s',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                      <span style={{
                        fontSize: 10, fontFamily: 'monospace', padding: '1px 5px', borderRadius: 3,
                        background: 'var(--bg-elevated)', color: 'var(--text-muted)',
                      }}>
                        {rec.recommendation_type as string}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{rec.entity as string}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>{rec.title as string}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{rec.description as string}</div>
                    {(rec.projected_impact as string) && (
                      <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 4 }}>
                        ↑ {rec.projected_impact as string}
                      </div>
                    )}
                  </div>
                  <span style={{
                    fontSize: 10, fontFamily: 'monospace', padding: '2px 7px', borderRadius: 10,
                    background: rec.status === 'approved' ? 'rgba(45,212,160,0.08)' : rec.status === 'rejected' ? 'rgba(224,82,82,0.08)' : 'rgba(224,138,60,0.08)',
                    color: rec.status === 'approved' ? 'var(--green)' : rec.status === 'rejected' ? 'var(--red)' : 'var(--orange)',
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}>
                    {rec.status as string}
                  </span>
                </div>
              </ClickableRecommendationCard>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
