-- LifeOS schema — single source of truth for all persistent structured state.
-- Field contract: docs/01-architecture.md. Applied idempotently at startup
-- (src/lib/db/index.ts); every table exists from Stage 1 even if first used later.
--
-- Conventions:
--   * Dates/times are TEXT ISO-8601. created_at / generated_at are UTC
--     (datetime('now')); user-facing dates (due, habit_log.date, transactions.date,
--     …) are Europe/Zurich local: 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:MM'.
--   * Booleans are INTEGER 0/1.
--   * Enums that are design decisions get CHECK constraints; values expected to
--     grow over time (semester, health metric names, categories) stay open TEXT.

CREATE TABLE IF NOT EXISTS projects (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  domain     TEXT NOT NULL CHECK (domain IN ('academic','personal','professional')),
  status     TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','done')),
  deadline   TEXT,
  notes      TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS courses (
  id              INTEGER PRIMARY KEY,
  name            TEXT NOT NULL,
  professor       TEXT,
  professor_email TEXT,
  credits         REAL,
  room            TEXT,
  status          TEXT NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled','completed','dropped')),
  schedule_days   TEXT,             -- JSON array, subset of ["Mon".."Fri"]
  time_label      TEXT,             -- display string, e.g. "Wed 08:00–12:00"
  start_hour      REAL,             -- 24h number, 8.5 = 08:30
  end_hour        REAL,
  term_start      TEXT,
  term_end        TEXT,
  semester        TEXT,             -- 'F26', 'S27', … (open — new semesters arrive)
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- One store for everything actionable; pages are filtered views (settled decision #9).
CREATE TABLE IF NOT EXISTS tasks (
  id         INTEGER PRIMARY KEY,
  title      TEXT NOT NULL,
  domain     TEXT NOT NULL CHECK (domain IN ('academic','personal','professional')),
  type       TEXT NOT NULL DEFAULT 'task' CHECK (type IN ('task','assignment','exam','meeting')),
  due        TEXT,                  -- nullable; 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:MM' (Zurich)
  done       INTEGER NOT NULL DEFAULT 0,
  course_id  INTEGER REFERENCES courses(id) ON DELETE SET NULL,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  notes      TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tasks_due    ON tasks (done, due);
CREATE INDEX IF NOT EXISTS idx_tasks_domain ON tasks (domain);

CREATE TABLE IF NOT EXISTS contacts (
  id                     INTEGER PRIMARY KEY,
  name                   TEXT NOT NULL,
  company                TEXT,
  role                   TEXT,
  how_met                TEXT,      -- Conference / Intro / Work / Online / University
  linkedin               TEXT,
  last_contacted         TEXT,      -- 'YYYY-MM-DD'
  followup_interval_days INTEGER,
  notes                  TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now'))
  -- next_followup = last_contacted + interval, computed app-side (Stage 4) in
  -- src/lib/professional/followup.ts — never stored, so it can't go stale.
);

-- Per-contact interaction log (Stage 4, decision #30). Logging an interaction writes
-- a row here AND advances contacts.last_contacted, so the follow-up queue reshuffles.
-- No channel/kind enum: a kind that is never filtered on is a field to maintain
-- (decision #25's reasoning); `note` carries "coffee at Sprüngli" for free.
CREATE TABLE IF NOT EXISTS contact_interactions (
  id         INTEGER PRIMARY KEY,
  contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  date       TEXT NOT NULL,          -- 'YYYY-MM-DD' (Zurich): when it happened, not when logged
  note       TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_contact_interactions ON contact_interactions (contact_id, date DESC);

CREATE TABLE IF NOT EXISTS learning_items (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'concept' CHECK (type IN ('concept','course','paper','book','module','video')),
  status     TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','in_progress','done','dropped')),
  link       TEXT,
  started    TEXT,
  completed  TEXT,
  notes      TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS habits (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  time_of_day TEXT NOT NULL DEFAULT 'anytime' CHECK (time_of_day IN ('morning','anytime','evening')),
  active      INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS habit_log (
  id       INTEGER PRIMARY KEY,
  habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  date     TEXT NOT NULL,            -- 'YYYY-MM-DD' (Zurich)
  done     INTEGER NOT NULL DEFAULT 1,
  UNIQUE (habit_id, date)
);
CREATE INDEX IF NOT EXISTS idx_habit_log_date ON habit_log (date);

-- Long/narrow so new metrics need no migration; multiple rows per day are valid
-- (e.g. kcal per meal). Targets live in config.
CREATE TABLE IF NOT EXISTS health_metrics (
  id         INTEGER PRIMARY KEY,
  date       TEXT NOT NULL,          -- 'YYYY-MM-DD' (Zurich)
  metric     TEXT NOT NULL,          -- sleep_score | hrv | steps | kcal | protein | carbs | fat | …
  value      REAL NOT NULL,
  source     TEXT,                   -- manual | csv | phone_relay | device name
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_health_metrics_date ON health_metrics (date, metric);

-- amount_chf is bank-signed: debits negative, credits positive. Spend math sums
-- -amount over mapped categories, so refunds net out and income never counts.
CREATE TABLE IF NOT EXISTS transactions (
  id             INTEGER PRIMARY KEY,
  date           TEXT NOT NULL,      -- 'YYYY-MM-DD'
  amount_chf     REAL NOT NULL,
  category       TEXT,
  merchant       TEXT,
  note           TEXT,
  source         TEXT,               -- manual | csv:<bank>
  batch_id       INTEGER REFERENCES import_batches(id) ON DELETE SET NULL,
  dedupe_key     TEXT,               -- 'ubs:<txn no>' for UBS; date|amount|merchant fallback for banks without a stable id; NULL for manual
  budget_line_id INTEGER REFERENCES budget_lines(id),  -- manual override; NULL = derive via category_map
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions (date);
-- idx_transactions_dedupe (partial unique on dedupe_key) is created in the
-- startup migration (src/lib/db/index.ts) after the guarded column adds, so it
-- works on both fresh and pre-Stage-2 databases.

-- The user's standing budget (docs/06-stage2-brief.md §5). Tiers behave
-- differently: 'fixed' is committed spend, 'variable' is what the user actually
-- decides day to day, 'annual' amounts are PER YEAR and get smoothed /12 for
-- monthly views.
CREATE TABLE IF NOT EXISTS budget_lines (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  tier       TEXT NOT NULL CHECK (tier IN ('fixed','variable','annual')),
  amount_chf REAL NOT NULL,
  carryover  INTEGER NOT NULL DEFAULT 0,   -- 1 = unspent balance accrues month to month
  sort_order INTEGER NOT NULL DEFAULT 0,
  active     INTEGER NOT NULL DEFAULT 1,
  notes      TEXT
);

-- Transaction-level category -> budget line. UBS supplies leaves; the budget is
-- stated at the parent. Categories like 'transfer'/'income' are deliberately
-- absent: they roll into no line and never count as spend.
CREATE TABLE IF NOT EXISTS category_map (
  category       TEXT PRIMARY KEY,
  budget_line_id INTEGER NOT NULL REFERENCES budget_lines(id) ON DELETE CASCADE
);

-- CSV import provenance, so a bad import can be undone wholesale.
CREATE TABLE IF NOT EXISTS import_batches (
  id          INTEGER PRIMARY KEY,
  filename    TEXT NOT NULL,
  source      TEXT NOT NULL,               -- 'ubs'
  row_count   INTEGER NOT NULL,
  imported_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS budgets (
  id         INTEGER PRIMARY KEY,
  month      TEXT NOT NULL,          -- 'YYYY-MM'
  category   TEXT,                   -- NULL = overall monthly budget
  amount_chf REAL NOT NULL,
  UNIQUE (month, category)
);

CREATE TABLE IF NOT EXISTS bills (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  due_day    INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  amount_chf REAL,
  active     INTEGER NOT NULL DEFAULT 1
);

-- Per-month paid log for bills (docs/01-architecture.md "plus a per-month paid log").
CREATE TABLE IF NOT EXISTS bill_payments (
  id      INTEGER PRIMARY KEY,
  bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  month   TEXT NOT NULL,             -- 'YYYY-MM'
  paid_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (bill_id, month)
);

-- Written by scripts/ (Stage 5), rendered by the app. generated_at is always shown.
CREATE TABLE IF NOT EXISTS briefs (
  id           INTEGER PRIMARY KEY,
  date         TEXT NOT NULL,        -- 'YYYY-MM-DD' the brief is for
  kind         TEXT NOT NULL CHECK (kind IN ('email_todos','world','ai_research','german_word')),
  content_md   TEXT NOT NULL,
  generated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (date, kind)
);

-- Raw captures from the app quick-box and the phone relay (Stage 5).
CREATE TABLE IF NOT EXISTS inbox (
  id          INTEGER PRIMARY KEY,
  text        TEXT NOT NULL,
  -- 'phone_relay' means "captured on the phone", not "via a relay": decision #33
  -- replaced the Notion mailbox with an iOS Shortcut writing to a synced file. The
  -- value is kept rather than migrated — the CHECK constraint would need rebuilding
  -- for a cosmetic rename, and the UI already renders it as "phone".
  source      TEXT NOT NULL DEFAULT 'app' CHECK (source IN ('app','phone_relay')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  processed   INTEGER NOT NULL DEFAULT 0,
  parsed_json TEXT                   -- what the capture became, once processed
);
CREATE INDEX IF NOT EXISTS idx_inbox_processed ON inbox (processed);

-- Lightweight notes/reminders/ideas (docs/03-pages/personal.md §4; also the target of
-- inbox "process → note" and the Academic Reminders / Professional Ideas rail cards).
CREATE TABLE IF NOT EXISTS notes (
  id         INTEGER PRIMARY KEY,
  text       TEXT NOT NULL,
  domain     TEXT CHECK (domain IN ('academic','personal','professional')),  -- NULL = unfiled
  kind       TEXT NOT NULL DEFAULT 'note' CHECK (kind IN ('note','reminder','idea')),
  reviewed   INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Editable key/value config (health targets, budget defaults, …) — prefer editable
-- config over hardcoded values.
CREATE TABLE IF NOT EXISTS config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
