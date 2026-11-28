import Database from "better-sqlite3";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { METRIC_KEYS } from "@/lib/health/metrics";
import { seedStage2 } from "./seed-stage2";

// Server-only: imported by route handlers and server components, never by client
// components (docs/01-architecture.md — the client never touches the DB).

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "lifeos.db");
const SCHEMA_PATH = path.join(process.cwd(), "src", "lib", "db", "schema.sql");

// Survive Next.js dev-server hot reloads without leaking connections.
const globalForDb = globalThis as unknown as { lifeosDb?: Database.Database };

function open(): Database.Database {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new Database(DB_PATH);
  // Multiple processes open this file (dev server workers, build, future scripts/) —
  // wait on locks instead of throwing SQLITE_BUSY.
  db.pragma("busy_timeout = 5000");
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(fs.readFileSync(SCHEMA_PATH, "utf8"));
  migrate(db);
  seed(db);
  return db;
}

// Guarded column adds for databases created before Stage 2 — ALTER TABLE is not
// idempotent in SQLite, so check PRAGMA table_info first. Fresh databases get
// these columns from schema.sql and skip straight to the index.
/**
 * Check-then-ALTER is not atomic across processes: `next build` collects page
 * data on a dozen workers at once, every one of them opens the database and
 * runs `migrate()`, and two of them both saw "no such column" before either had
 * added it. SQLite's own error is the only reliable arbiter, so a duplicate is
 * treated as "already done", which is exactly what it means.
 */
function addColumn(db: Database.Database, table: string, column: string, ddl: string) {
  const columns = new Set(
    (db.pragma(`table_info(${table})`) as Array<{ name: string }>).map((c) => c.name)
  );
  if (columns.has(column)) return;
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
  } catch (err) {
    if (!(err instanceof Error && /duplicate column name/i.test(err.message))) throw err;
  }
}

function migrate(db: Database.Database) {
  const txnColumns = new Set(
    (db.pragma("table_info(transactions)") as Array<{ name: string }>).map((c) => c.name)
  );
  if (!txnColumns.has("batch_id")) {
    db.exec("ALTER TABLE transactions ADD COLUMN batch_id INTEGER REFERENCES import_batches(id) ON DELETE SET NULL");
  }
  if (!txnColumns.has("dedupe_key")) {
    db.exec("ALTER TABLE transactions ADD COLUMN dedupe_key TEXT");
  }
  if (!txnColumns.has("budget_line_id")) {
    db.exec("ALTER TABLE transactions ADD COLUMN budget_line_id INTEGER REFERENCES budget_lines(id)");
  }
  db.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_dedupe ON transactions (dedupe_key) WHERE dedupe_key IS NOT NULL"
  );

  // Stage 5: the capture id the iOS Shortcut writes, which ingest dedupes on.
  const inboxColumns = new Set(
    (db.pragma("table_info(inbox)") as Array<{ name: string }>).map((c) => c.name)
  );
  if (!inboxColumns.has("external_id")) {
    db.exec("ALTER TABLE inbox ADD COLUMN external_id TEXT");
  }
  db.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_inbox_external ON inbox (external_id) WHERE external_id IS NOT NULL"
  );

  // 2026-10-05: the course's page on the LMS, linked from the course detail page.
  addColumn(db, "courses", "url", "TEXT");
  // 2026-10-05 (decision #77): the short code every Academic surface names a
  // course by. NULL means "derive it" — `courseCode()` in lib/academic/semester.ts.
  addColumn(db, "courses", "short_name", "TEXT");
  // 2026-11-19 (decision #83): the hub's Week plan. A plan item is a task with a
  // week; a group is a label on its members, not a row of its own.
  addColumn(db, "tasks", "week", "TEXT");
  addColumn(db, "tasks", "plan_group", "TEXT");
  db.exec("CREATE INDEX IF NOT EXISTS idx_tasks_week ON tasks (week) WHERE week IS NOT NULL");

  // 2026-11-28 (decision #99): a logged study session has a title and a
  // description. The table's first version, the same day, called the title
  // `concept` and had no description.
  const studyColumns = new Set(
    (db.pragma("table_info(study_sessions)") as Array<{ name: string }>).map((c) => c.name)
  );
  if (studyColumns.has("concept") && !studyColumns.has("title")) {
    db.exec("ALTER TABLE study_sessions RENAME COLUMN concept TO title");
  }
  addColumn(db, "study_sessions", "description", "TEXT");
  // Decision #102: a logged session can be flagged to go over again.
  addColumn(db, "study_sessions", "review", "INTEGER NOT NULL DEFAULT 0");

  foldFoodCategories(db);
}

// Stage 6 (decision #45): Food & drink collapses from five leaves to three.
// `mensa`, `kiosk` and `coffee` were distinctions the user does not budget by,
// and `nightlife` was filed under Additional expenses although every row in it
// is a pub. Seeded databases get the new taxonomy from seed-stage2.ts; this
// folds the one that already has a year of history in it.
//
// Guarded on the old categories still being present in `category_map`, so it
// runs exactly once and is a no-op on every later startup.
const FOOD_FOLD: Array<[from: string, to: string]> = [
  ["kiosk", "groceries"],
  ["mensa", "restaurants"],
  ["coffee", "restaurants"],
  ["nightlife", "bars"],
];

function foldFoodCategories(db: Database.Database) {
  const gone = FOOD_FOLD.map(([from]) => from);
  const present = db
    .prepare(
      `SELECT COUNT(*) AS n FROM category_map WHERE category IN (${gone.map(() => "?").join(",")})`
    )
    .get(...gone) as { n: number };
  if (present.n === 0) return;

  const foodLine = db.prepare("SELECT id FROM budget_lines WHERE name = ?").get("Food & drink") as
    | { id: number }
    | undefined;
  if (!foodLine) return; // pre-Stage-2 database: nothing to fold yet

  db.transaction(() => {
    for (const [from, to] of FOOD_FOLD) {
      db.prepare("UPDATE transactions SET category = ? WHERE category = ?").run(to, from);
      // Proposals are advice about a taxonomy that no longer exists; rewrite
      // rather than drop, so a merchant still awaiting review keeps its suggestion.
      db.prepare("UPDATE category_proposals SET category = ? WHERE category = ?").run(to, from);
    }

    db.prepare(
      "INSERT OR IGNORE INTO category_map (category, budget_line_id) VALUES ('bars', ?)"
    ).run(foodLine.id);
    db.prepare(
      `DELETE FROM category_map WHERE category IN (${gone.map(() => "?").join(",")})`
    ).run(...gone);

    // budget.rules is user-editable config, so it is rewritten in place rather
    // than reseeded — hand-added rules must survive the fold.
    const row = db.prepare("SELECT value FROM config WHERE key = 'budget.rules'").get() as
      | { value: string }
      | undefined;
    if (row) {
      const remap = new Map(FOOD_FOLD);
      const rules = (JSON.parse(row.value) as Array<{ match: string; category: string }>).map((r) =>
        remap.has(r.category) ? { ...r, category: remap.get(r.category)! } : r
      );
      db.prepare("UPDATE config SET value = ? WHERE key = 'budget.rules'").run(JSON.stringify(rules));
    }

    // budget.baseline carries a per-leaf monthly average, so its food keys move
    // with the leaves. Summed, not recomputed: these numbers are averages the
    // user's own spreadsheet produced, and folding them keeps that provenance —
    // recomputing from a table that still holds uncategorised rows would swap a
    // known figure for a quietly understated one.
    const base = db.prepare("SELECT value FROM config WHERE key = 'budget.baseline'").get() as
      | { value: string }
      | undefined;
    if (base) {
      const b = JSON.parse(base.value) as {
        food: Record<string, number>;
        additional: { avg: number; min: number; max: number };
      };
      const take = (k: string) => b.food[k] ?? 0;
      const bars = take("bars") || 5; // nightlife's share, arriving from Additional
      b.food = {
        groceries: take("groceries") + take("kiosk"),
        restaurants: take("restaurants") + take("mensa") + take("coffee"),
        bars,
        total: take("total") + bars,
      };
      b.additional = { ...b.additional, avg: Math.max(0, b.additional.avg - bars) };
      db.prepare("UPDATE config SET value = ? WHERE key = 'budget.baseline'").run(JSON.stringify(b));
    }
  })();
}

// Seeds from docs: projects (01-architecture.md), habits (03-pages/personal.md §1).
// Only runs against empty tables — never overwrites user data.
function seed(db: Database.Database) {
  // BEGIN IMMEDIATE so concurrent processes serialize on the emptiness check —
  // otherwise two first-run workers could both seed.
  db.transaction(() => {
    const projectCount = db.prepare("SELECT COUNT(*) AS n FROM projects").get() as { n: number };
    if (projectCount.n === 0) {
      const insert = db.prepare(
        "INSERT INTO projects (name, domain, status, notes) VALUES (?, ?, 'active', ?)"
      );
      insert.run("Day job", "professional", "Day job as a project so its tasks filter cleanly");
      insert.run("SousChef", "professional", null);
      insert.run("golf-AI", "professional", "Product idea — golf swing analysis");
    }

    // Which project is the day job (decision #31). Guarded on the key's own absence,
    // NOT nested in the branch above: databases created before Stage 4 already hold
    // the three projects, so that branch never runs again and a nested seed would be
    // a silent no-op. The string "Day job" appears here and nowhere else in the app.
    const dayJobKey = db
      .prepare("SELECT value FROM config WHERE key = 'professional.day_job_project_id'")
      .get() as { value: string } | undefined;
    if (!dayJobKey) {
      const wolf = db
        .prepare("SELECT id FROM projects WHERE domain = 'professional' AND name = 'Day job'")
        .get() as { id: number } | undefined;
      if (wolf) {
        db.prepare("INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)").run(
          "professional.day_job_project_id",
          String(wolf.id)
        );
      }
    }

    const habitCount = db.prepare("SELECT COUNT(*) AS n FROM habits").get() as { n: number };
    if (habitCount.n === 0) {
      const insert = db.prepare("INSERT INTO habits (name, time_of_day) VALUES (?, ?)");
      insert.run("Brush Teeth 2x", "morning");
      insert.run("Make Bed", "morning");
      insert.run("Vitamins", "morning");
      insert.run("Work on German", "anytime");
      insert.run("Workout", "anytime");
      insert.run("Floss", "evening");
    }

    // The Professional "Ideas" rail card seed (docs/03-pages/professional.md §1).
    // Guarded on its own absence rather than on an empty `notes` table — Stage 2
    // already put personal notes there, so a table-level check would never fire.
    const ideaCount = db
      .prepare("SELECT COUNT(*) AS n FROM notes WHERE domain = 'professional' AND kind = 'idea'")
      .get() as { n: number };
    if (ideaCount.n === 0) {
      db.prepare("INSERT INTO notes (text, domain, kind) VALUES (?, 'professional', 'idea')").run(
        "Look into potential golf-AI intersection products"
      );
    }

    // Where the iOS Shortcut's capture file lands (decision #33). Configurable
    // rather than hardcoded — the architecture says so, and the folder name is
    // the user's choice. Guarded on its own absence, like the day-job key.
    const capturePath = db
      .prepare("SELECT value FROM config WHERE key = 'capture.file_path'")
      .get() as { value: string } | undefined;
    if (!capturePath) {
      db.prepare("INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)").run(
        "capture.file_path",
        path.join(os.homedir(), "Library/Mobile Documents/com~apple~CloudDocs/LifeOS/capture.jsonl")
      );
    }

    // The metric registry, published for scripts/ to read (Stage 5). NOT guarded:
    // it is derived from src/lib/health/metrics.ts and must track it, so every
    // startup rewrites it. This is the cross-language contract for metric names —
    // the Python capture parser must never keep its own copy of the list.
    db.prepare(
      "INSERT INTO config (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value"
    ).run("health.metric_keys", JSON.stringify(METRIC_KEYS));

    seedStage2(db);
  }).immediate();
}

/**
 * The dev server keeps the connection on `globalThis` across hot reloads, so a
 * table or column added while it runs would not exist until a restart (and
 * every page reading it would fail). When this module is evaluated again with
 * a connection already open, the schema and the migrations are re-applied:
 * every statement in schema.sql is IF NOT EXISTS and every migration is
 * guarded, so this only ever adds what is missing. Production opens once.
 */
function connection(): Database.Database {
  const cached = globalForDb.lifeosDb;
  if (!cached) return (globalForDb.lifeosDb = open());
  if (process.env.NODE_ENV !== "production") {
    cached.exec(fs.readFileSync(SCHEMA_PATH, "utf8"));
    migrate(cached);
  }
  return cached;
}

export const db = connection();
