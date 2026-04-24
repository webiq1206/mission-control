import Database from 'better-sqlite3'
import path from 'path'
import { runBmhMigration } from './migrations/bmh-schema'

const DB_PATH = process.env.DB_PATH || './mc.db'
let _db: Database.Database | null = null

/**
 * Safely converts a value that may be a JSON string, array, null, or undefined
 * into an actual array. Handles the SQLite TEXT→JSON mismatch.
 */
export function safeJsonArray<T = string>(val: unknown): T[] {
  if (Array.isArray(val)) return val
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val)
      return Array.isArray(parsed) ? parsed : []
    } catch { return [] }
  }
  return []
}

/**
 * Parses specified fields on a row (or array of rows) from JSON strings into arrays.
 * Use after reading from SQLite to convert TEXT columns that store JSON arrays.
 */
export function parseJsonArrayFields<T extends Record<string, unknown>>(
  rows: T | T[],
  fields: string[],
): T | T[] {
  function parseRow(row: T): T {
    const result = { ...row }
    for (const field of fields) {
      if (field in result) {
        (result as Record<string, unknown>)[field] = safeJsonArray(result[field])
      }
    }
    return result
  }
  if (Array.isArray(rows)) return rows.map(parseRow)
  return parseRow(rows)
}

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(path.resolve(DB_PATH))
    _db.pragma('journal_mode = WAL')
    _db.pragma('foreign_keys = ON')
    initSchema(_db)
  }
  return _db
}

function initSchema(db: Database.Database) {
  db.exec(`
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

    INSERT OR IGNORE INTO system_state (key, value) VALUES
      ('emergency_stop', 'false'),
      ('dead_mans_switch_enabled', 'true'),
      ('dead_mans_switch_hours', '48'),
      ('last_agent_activity', CURRENT_TIMESTAMP),
      ('guardail_state', 'ready');

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

    INSERT OR IGNORE INTO priorities (id, title, entity, assigned_agents, sort_order) VALUES
      ('P1', 'BMH Deal Sourcing Engine', 'Buy My House Boise', '["hank","kai","quinn"]', 1),
      ('P2', 'tasks.timberandlove.com Build', 'Timber + Love', '["hank","kai","sam"]', 2),
      ('P3', 'vacationrentaloahu.co Next.js Migration', 'Stay With Us', '["hank","kai"]', 3),
      ('P4', 'T&L Builder Research and Expansion', 'Timber + Love', '["hank","larry"]', 4),
      ('P5', 'T&L Realty Lead Generation Build', 'Timber and Love Realty', '["hank","quinn","priya","zoe"]', 5),
      ('P6', 'Boise Boys Content and Media Strategy', 'Boise Boys', '["hank","priya","zoe"]', 6),
      ('P7', 'Full Operational Ownership', 'Multi-Entity', '["hank","larry","nora","maya","sam","kai","ada","priya","omar","zoe","quinn"]', 7);

    INSERT OR IGNORE INTO agent_heartbeats
      (agent_id, agent_name, emoji, role, status)
    VALUES
      ('hank',  'Hank',  '🦞', 'CEO / Orchestrator',      'idle'),
      ('larry', 'Larry', '🧠', 'R&D',                     'idle'),
      ('nora',  'Nora',  '💼', 'Bookkeeper',              'idle'),
      ('maya',  'Maya',  '🗂️', 'Project Manager',         'idle'),
      ('sam',   'Sam',   '💻', 'IT',                      'idle'),
      ('kai',   'Kai',   '🛠️', 'Developer',               'idle'),
      ('ada',   'Ada',   '🎨', 'UI/UX Designer',          'idle'),
      ('priya', 'Priya', '✍️', 'Content Creator',         'idle'),
      ('omar',  'Omar',  '📈', 'Sales Manager',           'idle'),
      ('zoe',   'Zoe',   '📱', 'Social Media Manager',    'idle'),
      ('quinn', 'Quinn', '🚀', 'Digital Marketing',       'idle');

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

    INSERT OR IGNORE INTO holding_companies (id, name, ein, bank_account) VALUES
      ('hanks-homes',       'Hanks Homes LLC',        '81-1620577', 'CapEd 0929 / 8780-0110'),
      ('tl-holdings',       'T&L Holdings Inc',       '83-1555301', 'CapEd 2024 / 5330-0110'),
      ('invest-in-boise',   'Invest in Boise Inc',    '81-0826864', 'CapEd 9690 / 9690-0110'),
      ('warm-springs-villa', 'Warm Springs Villa LLC', '86-2542231', 'CapEd 3030'),
      ('timber-and-love',   'Timber + Love Inc',    '81-2888628', 'CapEd 3224 / 3940-0110');

    CREATE INDEX IF NOT EXISTS idx_tasks_entity   ON tasks(entity);
    CREATE INDEX IF NOT EXISTS idx_tasks_status   ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
    CREATE INDEX IF NOT EXISTS idx_activity_agent ON activity(agent);
    CREATE INDEX IF NOT EXISTS idx_activity_time  ON activity(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);

    CREATE INDEX IF NOT EXISTS idx_properties_holding ON properties(holding_company_id);
    CREATE INDEX IF NOT EXISTS idx_loans_property ON loans(property_id);
    CREATE INDEX IF NOT EXISTS idx_loans_holding ON loans(holding_company_id);
    CREATE INDEX IF NOT EXISTS idx_loans_maturity ON loans(maturity_date);
    CREATE INDEX IF NOT EXISTS idx_insurance_property ON insurance_policies(property_id);
    CREATE INDEX IF NOT EXISTS idx_insurance_expiration ON insurance_policies(expiration_date);

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

    CREATE INDEX IF NOT EXISTS idx_ad_campaigns_entity ON ad_campaigns(entity);
    CREATE INDEX IF NOT EXISTS idx_ad_campaigns_status ON ad_campaigns(status);
    CREATE INDEX IF NOT EXISTS idx_ad_recs_entity ON ad_recommendations(entity);
    CREATE INDEX IF NOT EXISTS idx_ad_recs_status ON ad_recommendations(status);
    CREATE INDEX IF NOT EXISTS idx_ad_recs_priority ON ad_recommendations(priority);
  `)

  // Migrations for existing databases
  const cols = db.prepare("PRAGMA table_info(approvals)").all() as { name: string }[]
  const colNames = cols.map(c => c.name)
  if (!colNames.includes('deliverables')) {
    db.exec("ALTER TABLE approvals ADD COLUMN deliverables TEXT DEFAULT '[]'")
  }
  if (!colNames.includes('approval_category')) {
    db.exec("ALTER TABLE approvals ADD COLUMN approval_category TEXT")
  }

  const ideaCols = db.prepare("PRAGMA table_info(ideas)").all() as { name: string }[]
  const ideaColNames = ideaCols.map(c => c.name)
  if (!ideaColNames.includes('context')) {
    db.exec("ALTER TABLE ideas ADD COLUMN context TEXT")
  }
  if (!ideaColNames.includes('objective')) {
    db.exec("ALTER TABLE ideas ADD COLUMN objective TEXT")
  }
  if (!ideaColNames.includes('next_steps')) {
    db.exec("ALTER TABLE ideas ADD COLUMN next_steps TEXT")
  }

  // Loans payment tracking migration
  const loanCols = db.prepare("PRAGMA table_info(loans)").all() as { name: string }[]
  const loanColNames = loanCols.map(c => c.name)
  if (!loanColNames.includes('payment_status')) {
    db.exec("ALTER TABLE loans ADD COLUMN payment_status TEXT DEFAULT 'current'")
  }
  if (!loanColNames.includes('last_payment_date')) {
    db.exec("ALTER TABLE loans ADD COLUMN last_payment_date TEXT")
  }
  if (!loanColNames.includes('last_payment_amount')) {
    db.exec("ALTER TABLE loans ADD COLUMN last_payment_amount REAL")
  }

  // ── BMH Deal Sourcing Module migration (2026-04-23)
  // Adds bmh_deals, bmh_pipeline_stages, bmh_data_sources, bmh_outreach_sequences
  runBmhMigration(db)
}
