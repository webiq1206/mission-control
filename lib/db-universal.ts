/**
 * Universal async DB interface.
 * - Production (TURSO_DATABASE_URL set): uses @libsql/client → TursoDb
 * - Local dev: wraps better-sqlite3 in Promise shims so all callers are identical
 *
 * Usage in API routes:
 *   import { getUniversalDb } from '@/lib/db-universal'
 *   const db = await getUniversalDb()
 *   const rows = await db.all('SELECT * FROM tasks WHERE entity = ?', entity)
 *
 * Entity: Global
 * Author: Kai
 */

import { safeJsonArray, parseJsonArrayFields } from './db'
export { safeJsonArray, parseJsonArrayFields }

export interface UniversalDb {
  all<T = Record<string, unknown>>(sql: string, ...args: unknown[]): Promise<T[]>
  get<T = Record<string, unknown>>(sql: string, ...args: unknown[]): Promise<T | null>
  run(sql: string, ...args: unknown[]): Promise<{ changes: number; lastInsertRowid: number }>
  runNamed(sql: string, params: Record<string, unknown>): Promise<{ changes: number }>
  exec(sql: string): Promise<void>
}

// ── Local dev wrapper ─────────────────────────────────────────────────────────

class SqliteUniversalDb implements UniversalDb {
  // We dynamically import better-sqlite3 to avoid bundling issues
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private db: any

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(db: any) {
    this.db = db
  }

  async all<T = Record<string, unknown>>(sql: string, ...args: unknown[]): Promise<T[]> {
    return this.db.prepare(sql).all(...args) as T[]
  }

  async get<T = Record<string, unknown>>(sql: string, ...args: unknown[]): Promise<T | null> {
    return (this.db.prepare(sql).get(...args) as T) ?? null
  }

  async run(sql: string, ...args: unknown[]): Promise<{ changes: number; lastInsertRowid: number }> {
    const info = this.db.prepare(sql).run(...args)
    return { changes: info.changes, lastInsertRowid: Number(info.lastInsertRowid) }
  }

  async runNamed(sql: string, params: Record<string, unknown>): Promise<{ changes: number }> {
    const info = this.db.prepare(sql).run(params)
    return { changes: info.changes }
  }

  async exec(sql: string): Promise<void> {
    this.db.exec(sql)
  }
}

// ── Turso production wrapper ──────────────────────────────────────────────────

class TursoUniversalDb implements UniversalDb {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private turso: any

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(turso: any) {
    this.turso = turso
  }

  async all<T = Record<string, unknown>>(sql: string, ...args: unknown[]): Promise<T[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.turso as any).all(sql, ...args) as Promise<T[]>
  }

  async get<T = Record<string, unknown>>(sql: string, ...args: unknown[]): Promise<T | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.turso as any).get(sql, ...args) as Promise<T | null>
  }

  async run(sql: string, ...args: unknown[]): Promise<{ changes: number; lastInsertRowid: number }> {
    return this.turso.run(sql, ...args)
  }

  async runNamed(sql: string, params: Record<string, unknown>): Promise<{ changes: number }> {
    return this.turso.runNamed(sql, params)
  }

  async exec(sql: string): Promise<void> {
    return this.turso.exec(sql)
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────

let _universalDb: UniversalDb | null = null

export async function getUniversalDb(): Promise<UniversalDb> {
  if (_universalDb) return _universalDb

  if (process.env.TURSO_DATABASE_URL) {
    // Production (Turso cloud OR local libsql file via file:// URL)
    const { getTursoDb } = await import('./db-turso')
    const turso = getTursoDb()
    // Initialize schema on first connect
    await initTursoSchema(turso)
    _universalDb = new TursoUniversalDb(turso)
  } else if (process.env.REPL_ID) {
    // Replit: use @libsql/client with a persistent local file
    // /home/runner persists between Replit deployments
    const dbPath = process.env.LIBSQL_DB_PATH || '/home/runner/data/mc.db'
    // Ensure directory exists
    const { mkdirSync } = await import('fs')
    const { dirname } = await import('path')
    try { mkdirSync(dirname(dbPath), { recursive: true }) } catch {}
    const { createTursoDb } = await import('./db-turso')
    const turso = createTursoDb(`file:${dbPath}`, '')
    await initTursoSchema(turso)
    _universalDb = new TursoUniversalDb(turso)
  } else {
    // Local dev: use better-sqlite3 via existing getDb()
    const { getDb } = await import('./db')
    _universalDb = new SqliteUniversalDb(getDb())
  }

  return _universalDb
}

// ── Turso schema initializer ──────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function initTursoSchema(turso: any): Promise<void> {
  // Run schema creation in batches to avoid statement limits
  const statements = TURSO_SCHEMA.split(';').map(s => s.trim()).filter(s => s.length > 0)

  // Batch in groups of 20 to respect Turso limits
  for (let i = 0; i < statements.length; i += 20) {
    const batch = statements.slice(i, i + 20).map((sql: string) => ({ sql, args: [] as never[] }))
    try {
      await turso.client.batch(batch, 'write')
    } catch {
      // Some statements may fail if table already exists — execute individually
      for (const stmt of batch) {
        try {
          await turso.client.execute(stmt)
        } catch {
          // Ignore errors for already-existing tables/indexes
        }
      }
    }
  }

  // Add missing columns (migrations)
  await runTursoMigrations(turso)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runTursoMigrations(turso: any): Promise<void> {
  const migrations = [
    // approvals columns
    { table: 'approvals', col: 'deliverables', def: "TEXT DEFAULT '[]'" },
    { table: 'approvals', col: 'approval_category', def: 'TEXT' },
    // ideas columns
    { table: 'ideas', col: 'context', def: 'TEXT' },
    { table: 'ideas', col: 'objective', def: 'TEXT' },
    { table: 'ideas', col: 'next_steps', def: 'TEXT' },
    // loans columns
    { table: 'loans', col: 'payment_status', def: "TEXT DEFAULT 'current'" },
    { table: 'loans', col: 'last_payment_date', def: 'TEXT' },
    { table: 'loans', col: 'last_payment_amount', def: 'REAL' },
  ]

  for (const m of migrations) {
    try {
      await turso.client.execute({
        sql: `ALTER TABLE ${m.table} ADD COLUMN ${m.col} ${m.def}`,
        args: [],
      })
    } catch {
      // Column already exists — OK
    }
  }
}

// ── Full schema DDL (Turso-compatible) ────────────────────────────────────────
// Note: Turso uses libSQL which supports most SQLite syntax.
// PRAGMA statements are NOT supported — removed here.
// datetime('now') is supported.

const TURSO_SCHEMA = `
CREATE TABLE IF NOT EXISTS tasks (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  entity       TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'backlog',
  priority     TEXT NOT NULL DEFAULT 'medium',
  assigned_agent TEXT,
  description  TEXT,
  objective    TEXT,
  dod          TEXT,
  expected_output TEXT,
  dependencies TEXT DEFAULT '[]',
  tags         TEXT DEFAULT '[]',
  source       TEXT DEFAULT 'manual',
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  due_at       DATETIME,
  started_at   DATETIME,
  completed_at DATETIME,
  approval_requested_at DATETIME,
  approved_by  TEXT,
  approved_at  DATETIME,
  last_activity_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activity (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  agent       TEXT NOT NULL,
  entity      TEXT,
  action      TEXT NOT NULL,
  detail      TEXT,
  task_id     TEXT REFERENCES tasks(id),
  tags        TEXT DEFAULT '[]',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agent_heartbeats (
  agent_id            TEXT PRIMARY KEY,
  agent_name          TEXT,
  emoji               TEXT,
  role                TEXT,
  last_seen           DATETIME,
  status              TEXT DEFAULT 'idle',
  current_task        TEXT,
  current_entity      TEXT,
  model               TEXT,
  heartbeat_count     INTEGER DEFAULT 0,
  active_goals        INTEGER DEFAULT 0,
  pending_proactive   INTEGER DEFAULT 0,
  error_count_24h     INTEGER DEFAULT 0,
  tasks_completed_24h INTEGER DEFAULT 0,
  updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS approvals (
  id              TEXT PRIMARY KEY,
  task_id         TEXT REFERENCES tasks(id),
  type            TEXT NOT NULL,
  requested_by    TEXT NOT NULL,
  entity          TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  cost_estimate   TEXT,
  urgency         TEXT DEFAULT 'normal',
  status          TEXT DEFAULT 'pending',
  decided_by      TEXT,
  decided_at      DATETIME,
  decision_note   TEXT,
  deliverables    TEXT DEFAULT '[]',
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at      DATETIME
);

CREATE TABLE IF NOT EXISTS entity_kpis (
  entity          TEXT PRIMARY KEY,
  kpi_1_label     TEXT,
  kpi_1_value     TEXT,
  kpi_1_trend     TEXT,
  kpi_2_label     TEXT,
  kpi_2_value     TEXT,
  kpi_2_trend     TEXT,
  kpi_3_label     TEXT,
  kpi_3_value     TEXT,
  health_status   TEXT DEFAULT 'unknown',
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assets (
  id          TEXT PRIMARY KEY,
  entity      TEXT NOT NULL,
  category    TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  url         TEXT,
  file_path   TEXT,
  created_by  TEXT,
  status      TEXT DEFAULT 'draft',
  tags        TEXT DEFAULT '[]',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ideas (
  id           TEXT PRIMARY KEY,
  entity       TEXT,
  title        TEXT NOT NULL,
  description  TEXT,
  submitted_by TEXT DEFAULT 'jared',
  assigned_to  TEXT,
  status       TEXT DEFAULT 'new',
  priority     TEXT DEFAULT 'medium',
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  reviewed_at  DATETIME
);

CREATE TABLE IF NOT EXISTS reports (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  recipient     TEXT NOT NULL,
  entity_scope  TEXT NOT NULL,
  content_md    TEXT NOT NULL,
  sent_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  sent_by       TEXT DEFAULT 'jared',
  status        TEXT DEFAULT 'sent'
);

CREATE TABLE IF NOT EXISTS system_state (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_by  TEXT
);

CREATE TABLE IF NOT EXISTS priorities (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  entity      TEXT NOT NULL,
  status      TEXT DEFAULT 'active',
  assigned_agents TEXT DEFAULT '[]',
  description TEXT,
  progress_pct INTEGER DEFAULT 0,
  blockers    TEXT,
  next_action TEXT,
  sort_order  INTEGER DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS holding_companies (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  ein          TEXT,
  bank_account TEXT,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS properties (
  id                 TEXT PRIMARY KEY,
  holding_company_id TEXT NOT NULL REFERENCES holding_companies(id),
  address            TEXT NOT NULL,
  city               TEXT,
  state              TEXT,
  zip                TEXT,
  property_type      TEXT,
  notes              TEXT,
  bedrooms           INTEGER,
  bathrooms          INTEGER,
  sq_ft              INTEGER,
  year_built         INTEGER,
  estimated_value    REAL,
  additional_insured TEXT DEFAULT '[]',
  status             TEXT DEFAULT 'active',
  drive_folder_url   TEXT,
  created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loans (
  id                 TEXT PRIMARY KEY,
  property_id        TEXT REFERENCES properties(id),
  holding_company_id TEXT NOT NULL REFERENCES holding_companies(id),
  lender             TEXT NOT NULL,
  loan_type          TEXT,
  payment_type       TEXT,
  paid_from_account  TEXT,
  collateral_address TEXT,
  payment_terms      TEXT,
  principal_amount   REAL,
  outstanding_balance REAL,
  interest_rate      REAL,
  monthly_payment    REAL,
  issue_date         TEXT,
  first_payment_date TEXT,
  due_day            TEXT,
  maturity_date      TEXT,
  loan_term_years    REAL,
  drive_doc_url      TEXT,
  notes              TEXT,
  status             TEXT DEFAULT 'active',
  created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS insurance_policies (
  id                 TEXT PRIMARY KEY,
  property_id        TEXT REFERENCES properties(id),
  holding_company_id TEXT NOT NULL REFERENCES holding_companies(id),
  coverage_type      TEXT,
  provider           TEXT,
  policy_number      TEXT,
  premium_amount     REAL,
  premium_frequency  TEXT,
  effective_date     TEXT,
  expiration_date    TEXT,
  renewal_date       TEXT,
  additional_insured TEXT DEFAULT '[]',
  drive_doc_url      TEXT,
  notes              TEXT,
  status             TEXT DEFAULT 'active',
  created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS bmh_deals (
  id TEXT PRIMARY KEY,
  address TEXT NOT NULL,
  city TEXT DEFAULT 'Boise',
  state TEXT DEFAULT 'ID',
  zip TEXT,
  price INTEGER,
  dom INTEGER,
  property_type TEXT,
  bedrooms INTEGER,
  bathrooms REAL,
  sq_ft INTEGER,
  year_built INTEGER,
  mss_score INTEGER DEFAULT 0,
  signals TEXT DEFAULT '[]',
  source TEXT,
  source_id TEXT,
  status TEXT DEFAULT 'new',
  pipeline_stage TEXT DEFAULT 'new_lead',
  assigned_to TEXT DEFAULT 'kai',
  outreach_count INTEGER DEFAULT 0,
  last_outreach_at DATETIME,
  outreach_history TEXT DEFAULT '[]',
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bmh_pipeline_stages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner TEXT DEFAULT 'agent',
  sort_order INTEGER DEFAULT 0,
  color TEXT DEFAULT 'gray',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bmh_data_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,
  status TEXT DEFAULT 'inactive',
  last_sync_at DATETIME,
  records_synced INTEGER DEFAULT 0,
  error_message TEXT,
  config TEXT DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bmh_outreach_sequences (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  steps TEXT DEFAULT '[]',
  status TEXT DEFAULT 'draft',
  approval_status TEXT DEFAULT 'pending',
  approved_by TEXT,
  approved_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bmh_leads (
  id TEXT PRIMARY KEY,
  deal_id TEXT REFERENCES bmh_deals(id),
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT DEFAULT 'ID',
  zip TEXT,
  lead_source TEXT,
  status TEXT DEFAULT 'new',
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS team_members (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  email        TEXT,
  role         TEXT,
  entity       TEXT,
  status       TEXT DEFAULT 'active',
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tasks_entity   ON tasks(entity);
CREATE INDEX IF NOT EXISTS idx_tasks_status   ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_activity_agent ON activity(agent);
CREATE INDEX IF NOT EXISTS idx_activity_time  ON activity(created_at);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
CREATE INDEX IF NOT EXISTS idx_properties_holding ON properties(holding_company_id);
CREATE INDEX IF NOT EXISTS idx_loans_property ON loans(property_id);
CREATE INDEX IF NOT EXISTS idx_loans_holding ON loans(holding_company_id);
CREATE INDEX IF NOT EXISTS idx_insurance_property ON insurance_policies(property_id);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_entity ON ad_campaigns(entity);
CREATE INDEX IF NOT EXISTS idx_ad_recs_entity ON ad_recommendations(entity);
CREATE INDEX IF NOT EXISTS idx_ad_recs_status ON ad_recommendations(status)
`
