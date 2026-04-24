const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.resolve('./mc.db'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS ad_campaigns (
  id TEXT PRIMARY KEY,
  entity TEXT NOT NULL,
  platform TEXT DEFAULT 'meta',
  account_id TEXT,
  account_name TEXT,
  campaign_name TEXT NOT NULL,
  status TEXT,
  objective TEXT,
  spend REAL DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr REAL DEFAULT 0,
  cpc REAL DEFAULT 0,
  leads INTEGER DEFAULT 0,
  cpl REAL DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  roas REAL DEFAULT 0,
  frequency REAL DEFAULT 0,
  date_start TEXT,
  date_stop TEXT,
  last_updated TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ad_recommendations (
  id TEXT PRIMARY KEY,
  campaign_id TEXT,
  entity TEXT NOT NULL,
  category TEXT,
  priority TEXT DEFAULT 'medium',
  title TEXT NOT NULL,
  context TEXT,
  expected_impact TEXT,
  implementation TEXT,
  manual_steps TEXT,
  status TEXT DEFAULT 'pending',
  decision TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
`);

console.log('Tables created');

const insertCampaign = db.prepare(`
  INSERT OR REPLACE INTO ad_campaigns
  (id, entity, platform, campaign_name, status, spend, impressions, reach, clicks, ctr, cpc, leads, cpl, frequency, date_start, date_stop, last_updated)
  VALUES (@id, @entity, @platform, @campaign_name, @status, @spend, @impressions, @reach, @clicks, @ctr, @cpc, @leads, @cpl, @frequency, @date_start, @date_stop, @last_updated)
`);

insertCampaign.run({
  id: 'camp-tl-001',
  entity: 'Timber + Love',
  platform: 'meta',
  campaign_name: 'Design|Build: Tailored leads campaign',
  status: 'active',
  spend: 3840.00,
  impressions: 187420,
  reach: 52129,
  clicks: 2241,
  ctr: 1.19,
  cpc: 1.71,
  leads: 72,
  cpl: 53.33,
  frequency: 3.59,
  date_start: '2024-01-15',
  date_stop: null,
  last_updated: new Date().toISOString()
});

insertCampaign.run({
  id: 'camp-tlr-001',
  entity: 'Timber and Love Realty',
  platform: 'meta',
  campaign_name: 'Realty: New Listings',
  status: 'active',
  spend: 620.00,
  impressions: 18430,
  reach: 923,
  clicks: 312,
  ctr: 1.69,
  cpc: 1.99,
  leads: 5,
  cpl: 124.00,
  frequency: 19.97,
  date_start: '2024-02-01',
  date_stop: null,
  last_updated: new Date().toISOString()
});

insertCampaign.run({
  id: 'camp-bmh-001',
  entity: 'Buy My House Boise',
  platform: 'meta',
  campaign_name: 'Buy My House Lead Campaign (v3)',
  status: 'off',
  spend: 2190.00,
  impressions: 143600,
  reach: 31753,
  clicks: 1876,
  ctr: 1.31,
  cpc: 1.17,
  leads: 4,
  cpl: 547.50,
  frequency: 4.52,
  date_start: '2023-10-01',
  date_stop: '2024-01-15',
  last_updated: new Date().toISOString()
});

console.log('Campaigns seeded');

const insertRec = db.prepare(`
  INSERT OR REPLACE INTO ad_recommendations
  (id, campaign_id, entity, category, priority, title, context, expected_impact, implementation, manual_steps, status)
  VALUES (@id, @campaign_id, @entity, @category, @priority, @title, @context, @expected_impact, @implementation, @manual_steps, @status)
`);

insertRec.run({
  id: 'rec-001',
  campaign_id: 'camp-tlr-001',
  entity: 'Timber and Love Realty',
  category: 'targeting',
  priority: 'critical',
  title: 'Realty campaign frequency is dangerously high — audience burned out',
  context: 'The Realty: New Listings campaign has a frequency of 19.97 — meaning the average person has seen this ad nearly 20 times. Industry best practice caps effective frequency at 3-5. Beyond that, CPL skyrockets and brand perception suffers. This is why you are getting 5 leads at $124 CPL.',
  expected_impact: 'Expanding audience or refreshing creative should drop CPL from $124 toward $40-60 range and reduce wasted spend.',
  implementation: 'Expand audience targeting radius, add new interest segments, or refresh creative to break audience fatigue. Consider pausing and resetting to a lookalike audience.',
  manual_steps: '1. Go to Meta Ads Manager > Campaigns > Realty: New Listings\n2. Click into the Ad Set\n3. In the Audience section, expand the geographic radius (e.g., from 10mi to 25mi around Boise)\n4. Add additional interest targeting: "Real estate investing", "First-time home buyer", "Home improvement"\n5. In the Ads section, duplicate your current best ad and update the creative (new image or headline)\n6. Set the old ads to Paused\n7. Reset budget to $20/day on the new audience\n8. Monitor for 7 days — frequency should drop below 3.0',
  status: 'pending'
});

insertRec.run({
  id: 'rec-002',
  campaign_id: 'camp-tl-001',
  entity: 'Timber + Love',
  category: 'budget',
  priority: 'high',
  title: 'T+L lead campaign CPL trending up — optimize budget allocation',
  context: 'Design|Build campaign is delivering 72 leads at $53 CPL, which is strong for high-ticket custom construction. However, the $3,840 spend suggests the audience is getting close to saturation at 3.59 frequency. Increasing budget now without audience expansion will push CPL higher.',
  expected_impact: 'Segmenting into separate ad sets by audience type (homeowners vs. land owners vs. renovators) can reduce CPL by 15-25% by showing the right message to each segment.',
  implementation: 'Break the single ad set into 3 audience segments with dedicated creative for each. Test a lookalike audience based on current lead list.',
  manual_steps: '1. Export current lead list from GHL (T+L sub-account) as CSV\n2. Upload to Meta Ads Manager > Audiences > Create Custom Audience > Customer List\n3. Create Lookalike Audience from that custom audience (1-3% similarity)\n4. Duplicate the Design|Build campaign\n5. In the duplicate, create 3 ad sets:\n   - Ad Set A: Homeowners 35-65, HHI $150K+, interest in home renovation\n   - Ad Set B: Lookalike audience from your lead list\n   - Ad Set C: Retargeting (website visitors last 30 days)\n6. Allocate 40% budget to Set B, 40% to Set C, 20% to Set A\n7. Run for 14 days and compare CPL across sets',
  status: 'pending'
});

insertRec.run({
  id: 'rec-003',
  campaign_id: 'camp-bmh-001',
  entity: 'Buy My House Boise',
  category: 'structure',
  priority: 'high',
  title: 'BMH campaign off with $547 CPL — needs complete rebuild before reactivation',
  context: 'Buy My House Lead Campaign v3 was turned off, and for good reason: 4 leads at $547 CPL is catastrophically above target (should be $50-80 for motivated seller leads). The campaign structure, targeting, and creative all need an overhaul before reactivating. Restarting the same campaign would burn more budget.',
  expected_impact: 'A rebuilt campaign with motivated seller-specific creative, proper audience targeting (homeowners with equity, pre-foreclosure signals), and a direct response offer should achieve $60-90 CPL range.',
  implementation: 'Build a new BMH campaign from scratch with distressed seller targeting, strong direct-response creative, and a clear offer (cash offer in 24 hours).',
  manual_steps: '1. Do NOT reactivate the v3 campaign\n2. In Meta Ads Manager, create a NEW campaign: Leads objective\n3. Campaign name: "BMH: Motivated Seller Leads v4"\n4. Ad Set targeting:\n   - Location: Boise metro + 30mi radius\n   - Age: 35-75\n   - Homeowners only (under Detailed Targeting > Home Ownership)\n   - Add: "Financial stress", "Life events: Recently moved", "Divorce"\n5. Create 2 ads:\n   - Ad A: Problem-aware — "Need to sell your house fast? We buy as-is"\n   - Ad B: Offer-focused — "Get a cash offer in 24 hours. No repairs. No fees."\n6. Use a direct lead form (not website) to reduce friction\n7. Set daily budget at $30/day\n8. Review leads daily for first 2 weeks — qualify immediately via Sandy',
  status: 'pending'
});

insertRec.run({
  id: 'rec-004',
  campaign_id: null,
  entity: 'Multi-Entity',
  category: 'creative',
  priority: 'medium',
  title: 'No video creative running across any entity — missing highest-CTR format',
  context: 'All three entities are running static image ads only. Meta consistently reports video ads achieve 2-3x higher CTR than static images, especially for high-consideration purchases like custom builds and home sales. Adding even one short video (15-30 seconds) per entity would provide significant performance lift.',
  expected_impact: 'Video creative typically improves CTR by 1.5-2.5x. For T+L at 1.19% CTR, a video ad could reach 2-3% CTR, lowering CPC from $1.71 toward $0.70-0.90 and improving overall CPL.',
  implementation: 'Create one 15-30 second video per entity. For T+L: a build process reel or client testimonial. For BMH: a simple direct-response talking head video. For Realty: a listing walkthrough.',
  manual_steps: '1. For T+L: Pull 3-5 existing project photos from Buildertrend or Instagram. Use CapCut or Reels editor to create a 20-second before/after slideshow with music. Export as 1080x1080 or 9:16 for Stories.\n2. For BMH: Record a 30-second selfie-style video: "Hey, I\'m Clint from Buy My House Boise. If you need to sell fast, we make it simple..." — no production needed, authentic works best.\n3. Upload both videos to Meta Ads Manager > new ad in each active campaign\n4. Duplicate your best-performing static ad, replace the creative with video, keep all other settings identical\n5. Run both static and video side by side for 14 days\n6. Pause whichever has higher CPL after 14 days',
  status: 'pending'
});

console.log('Recommendations seeded');
db.close();
console.log('Done');
