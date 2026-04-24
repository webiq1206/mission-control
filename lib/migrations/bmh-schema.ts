/**
 * BMH Deal Sourcing Module — Database Schema Migration
 * Entity: Buy My House Boise
 * Author: Kai (Developer Agent)
 * Date: 2026-04-23
 *
 * Creates 4 tables for the BMH deal sourcing engine in Mission Control:
 * - bmh_deals: motivated seller property records with MSS scoring and pipeline tracking
 * - bmh_pipeline_stages: stage definitions (stages 1-7 = agent domain, 8-10 = Clint domain)
 * - bmh_data_sources: health status for data ingestion sources (PropStream, Zillow, etc.)
 * - bmh_outreach_sequences: outreach campaign sequences with approval-gate compliance
 */

import Database from 'better-sqlite3'

export function runBmhMigration(db: Database.Database): void {
  // ── BMH Deals table ──────────────────────────────────────────────────────────
  // Core record for each motivated seller property. MSS = Motivated Seller Score (1-13).
  // signals and outreach_history stored as JSON text arrays (SQLite TEXT column pattern).
  db.exec(`
    CREATE TABLE IF NOT EXISTS bmh_deals (
      id TEXT PRIMARY KEY,
      address TEXT NOT NULL,
      city TEXT DEFAULT 'Boise',
      state TEXT DEFAULT 'ID',
      zip TEXT,
      price INTEGER,
      dom INTEGER,                        -- Days on market
      property_type TEXT,                 -- SFR, MFR, Land, etc.
      bedrooms INTEGER,
      bathrooms REAL,
      sqft INTEGER,
      mss INTEGER,                        -- Motivated Seller Score 1-13 (higher = more motivated)
      priority TEXT CHECK(priority IN ('A','B','C')) DEFAULT 'C',  -- A=urgent surface, B=weekly review, C=monitor
      pipeline_stage INTEGER DEFAULT 1,   -- 1-10; stages 8-10 are Clint Robertson domain (read-only via API)
      last_stage_advance_at TEXT,         -- ISO datetime of last stage advance
      signals TEXT DEFAULT '[]',          -- JSON array: [{label, tier, source}] — tier 1/2/3
      outreach_history TEXT DEFAULT '[]', -- JSON array: [{date, method, outcome, agent}]
      skip_traced INTEGER DEFAULT 0,      -- Boolean: 1 = owner contact info obtained
      data_source TEXT DEFAULT 'propstream',
      source_label TEXT,                  -- Human-readable source name shown in UI
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `)

  // ── BMH Pipeline Stages ───────────────────────────────────────────────────────
  // Defines the 10-stage pipeline. Stages 8-10 are Clint Robertson's domain —
  // API blocks stage advances to 8+ without clint_context flag in request body.
  db.exec(`
    CREATE TABLE IF NOT EXISTS bmh_pipeline_stages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stage_number INTEGER UNIQUE NOT NULL,
      label TEXT NOT NULL,
      agent_owned INTEGER DEFAULT 1,  -- 1 = agent can advance; 0 = Clint domain (read-only in API)
      description TEXT
    );
  `)

  // ── BMH Data Sources ──────────────────────────────────────────────────────────
  // Tracks health/status of each data ingestion source.
  // Updated by pipeline scripts (PropStream nightly, etc.) after each run.
  db.exec(`
    CREATE TABLE IF NOT EXISTS bmh_data_sources (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      last_run_at TEXT,
      records_updated INTEGER DEFAULT 0,
      status TEXT CHECK(status IN ('ok','warning','error')) DEFAULT 'ok',
      error_message TEXT
    );
  `)

  // ── BMH Outreach Sequences ───────────────────────────────────────────────────
  // Approval-gated outreach campaigns. No sequence activates without Jared's
  // MC approval (status must transition to 'approved' via the approvals system).
  db.exec(`
    CREATE TABLE IF NOT EXISTS bmh_outreach_sequences (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      target_count INTEGER DEFAULT 0,
      last_sent_at TEXT,
      status TEXT CHECK(status IN ('draft','pending_approval','approved','active','paused')) DEFAULT 'draft',
      approval_id TEXT,  -- links to approvals table (Jared must approve before activation)
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `)

  // ── BMH Indexes ───────────────────────────────────────────────────────────────
  // BMH Leads table (Ada architecture direction 2026-04-23)
  // Captures inbound motivated sellers from the buymyhouse.co lead capture form.
  // Separate from bmh_deals (which tracks outbound/sourced properties).
  // A lead becomes a deal only when Clint reviews and converts it.
  db.exec(`
    CREATE TABLE IF NOT EXISTS bmh_leads (
      id TEXT PRIMARY KEY,
      address TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      source TEXT DEFAULT 'direct',
      notes TEXT,
      status TEXT DEFAULT 'received'
        CHECK(status IN ('received','reviewed','converted','dead')),
      converted_deal_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `)

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_bmh_deals_priority ON bmh_deals(priority);
    CREATE INDEX IF NOT EXISTS idx_bmh_deals_stage ON bmh_deals(pipeline_stage);
    CREATE INDEX IF NOT EXISTS idx_bmh_deals_mss ON bmh_deals(mss DESC);
    CREATE INDEX IF NOT EXISTS idx_bmh_deals_created ON bmh_deals(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_bmh_leads_status ON bmh_leads(status);
    CREATE INDEX IF NOT EXISTS idx_bmh_leads_created ON bmh_leads(created_at DESC);
  `)

  // ── Seed Pipeline Stages (if empty) ─────────────────────────────────────────
  // 10-stage pipeline: stages 1-7 are agent-operated, stages 8-10 are Clint's domain.
  const stageCount = (db.prepare('SELECT COUNT(*) as cnt FROM bmh_pipeline_stages').get() as { cnt: number }).cnt
  if (stageCount === 0) {
    const insertStage = db.prepare(`
      INSERT OR IGNORE INTO bmh_pipeline_stages (stage_number, label, agent_owned, description) VALUES (?, ?, ?, ?)
    `)
    // Stages 1-7: agent domain (system can advance these via API)
    const agentStages: [number, string, number, string][] = [
      [1, 'Identified',      1, 'Property identified as motivated seller candidate via data ingestion'],
      [2, 'Skip Traced',     1, 'Owner contact information obtained via skip trace'],
      [3, 'Contacted',       1, 'Initial outreach sent (SMS/mail/cold call)'],
      [4, 'Engaged',         1, 'Owner has responded and expressed interest'],
      [5, 'Offer Sent',      1, 'Cash offer submitted to owner'],
      [6, 'Negotiating',     1, 'Offer under negotiation — counteroffers in progress'],
      [7, 'Under Contract',  1, 'Purchase agreement signed — due diligence phase'],
      // Stages 8-10: Clint Robertson domain (read-only in API without clint_context flag)
      [8, 'Closing',         0, 'Clint domain — closing process in progress (title, escrow, final walk)'],
      [9, 'Closed',          0, 'Clint domain — deal closed successfully'],
      [10, 'Dead',           0, 'Clint domain — deal failed or fell through'],
    ]
    for (const [num, label, owned, desc] of agentStages) {
      insertStage.run(num, label, owned, desc)
    }
  }

  // ── Seed Data Sources (if empty) ─────────────────────────────────────────────
  // Four primary data ingestion sources. Status updated by pipeline scripts after each run.
  const sourceCount = (db.prepare('SELECT COUNT(*) as cnt FROM bmh_data_sources').get() as { cnt: number }).cnt
  if (sourceCount === 0) {
    const insertSource = db.prepare(`
      INSERT OR IGNORE INTO bmh_data_sources (id, label, status) VALUES (?, ?, 'ok')
    `)
    insertSource.run('propstream', 'PropStream')
    insertSource.run('zillow', 'Zillow')
    insertSource.run('realtor-com', 'Realtor.com')
    insertSource.run('county-records', 'County Records')
  }
}
