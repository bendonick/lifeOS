import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
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

    seedStage2(db);
  }).immediate();
}

export const db = globalForDb.lifeosDb ?? (globalForDb.lifeosDb = open());
