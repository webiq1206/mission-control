-- migrate-status-unification.sql — Plan: Persistent Dismissed Registry
--
-- Adds surface_blocked + dismissed_at to approvals and tasks so the brief
-- scripts can filter at the database layer (not just the markdown registry).
--
-- Idempotent: each ALTER guarded by a SQL try/catch via SELECT-based check
-- since SQLite doesn't support ADD COLUMN IF NOT EXISTS.
--
-- Canonical Status enum (per Plan):
--   active | in-progress | blocked | resolved | dismissed | archived
-- approvals.status historically uses: pending | approved | rejected | executing
-- tasks.status historically uses: backlog | in-progress | blocked | completed |
--   cancelled | review | approval-requested | etc.
-- We keep existing values; surface_blocked is the dedicated 0/1 filter flag
-- so the registry can suppress without rewriting status semantics.

-- approvals.surface_blocked / dismissed_at / dismissed_by
-- (use BEGIN/COMMIT to keep the migration atomic per table)

ALTER TABLE approvals ADD COLUMN surface_blocked INTEGER NOT NULL DEFAULT 0;
ALTER TABLE approvals ADD COLUMN dismissed_at    DATETIME;
ALTER TABLE approvals ADD COLUMN dismissed_by    TEXT;
ALTER TABLE approvals ADD COLUMN dismissed_note  TEXT;
CREATE INDEX IF NOT EXISTS idx_approvals_surface_blocked ON approvals(surface_blocked);

ALTER TABLE tasks ADD COLUMN surface_blocked INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN dismissed_at    DATETIME;
ALTER TABLE tasks ADD COLUMN dismissed_by    TEXT;
ALTER TABLE tasks ADD COLUMN dismissed_note  TEXT;
CREATE INDEX IF NOT EXISTS idx_tasks_surface_blocked ON tasks(surface_blocked);
