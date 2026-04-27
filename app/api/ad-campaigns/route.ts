import { NextRequest, NextResponse } from 'next/server'
import { getUniversalDb } from '@/lib/db-universal'
import { requireAuth } from '../middleware'

export async function GET(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth) return auth

  const db = await getUniversalDb()
  const { searchParams } = new URL(req.url)
  const entity = searchParams.get('entity')
  const status = searchParams.get('status')

  let query = 'SELECT * FROM ad_campaigns WHERE 1=1'
  const params: unknown[] = []

  if (entity && entity !== 'All') {
    query += ' AND entity = ?'
    params.push(entity)
  }
  if (status) {
    query += ' AND status = ?'
    params.push(status)
  }

  query += ' ORDER BY last_updated DESC'

  const campaigns = await db.all(query, ...params)
  return NextResponse.json(campaigns)
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth) return auth

  const db = await getUniversalDb()
  const body = await req.json()

  await db.runNamed(`
    INSERT INTO ad_campaigns
      (id, entity, platform, account_id, account_name, campaign_name, status, objective,
       spend, impressions, reach, clicks, ctr, cpc, leads, cpl, conversions, roas, frequency,
       date_start, date_stop, last_updated)
    VALUES
      (@id, @entity, @platform, @account_id, @account_name, @campaign_name, @status, @objective,
       @spend, @impressions, @reach, @clicks, @ctr, @cpc, @leads, @cpl, @conversions, @roas, @frequency,
       @date_start, @date_stop, @last_updated)
    ON CONFLICT(id) DO UPDATE SET
      entity=excluded.entity,
      platform=excluded.platform,
      account_id=excluded.account_id,
      account_name=excluded.account_name,
      campaign_name=excluded.campaign_name,
      status=excluded.status,
      objective=excluded.objective,
      spend=excluded.spend,
      impressions=excluded.impressions,
      reach=excluded.reach,
      clicks=excluded.clicks,
      ctr=excluded.ctr,
      cpc=excluded.cpc,
      leads=excluded.leads,
      cpl=excluded.cpl,
      conversions=excluded.conversions,
      roas=excluded.roas,
      frequency=excluded.frequency,
      date_start=excluded.date_start,
      date_stop=excluded.date_stop,
      last_updated=excluded.last_updated
  `, {
    id: body.id || `camp-${Date.now()}`,
    entity: body.entity,
    platform: body.platform || 'meta',
    account_id: body.account_id || null,
    account_name: body.account_name || null,
    campaign_name: body.campaign_name,
    status: body.status || 'active',
    objective: body.objective || null,
    spend: body.spend || 0,
    impressions: body.impressions || 0,
    reach: body.reach || 0,
    clicks: body.clicks || 0,
    ctr: body.ctr || 0,
    cpc: body.cpc || 0,
    leads: body.leads || 0,
    cpl: body.cpl || 0,
    conversions: body.conversions || 0,
    roas: body.roas || 0,
    frequency: body.frequency || 0,
    date_start: body.date_start || null,
    date_stop: body.date_stop || null,
    last_updated: new Date().toISOString(),
  })

  return NextResponse.json({ ok: true })
}
