# LifeOS

Local-first personal operating system — one hub page plus three domain pages
(Academic 🟢 / Personal 🟣 / Professional 🔵) over data you own on disk, with an
intelligence layer (daily AI briefs, RAG over lecture PDFs, budget/health insights)
arriving in later stages. Replaces a Notion-based LifeOS. Desktop-only, localhost,
single user, no auth.

The design docs in [`docs/`](docs/) are the source of truth — start with
[`docs/00-vision.md`](docs/00-vision.md) and [`docs/04-roadmap.md`](docs/04-roadmap.md).

## Run

Requires Node.js 20+.

```sh
npm install
npm run dev
```

Open http://localhost:3000. That one process is the whole runtime.

## Where things live

- **`data/`** (gitignored, created on first run) — everything you own:
  `data/lifeos.db` (SQLite, all structured state) plus folders for lecture PDFs,
  CSV imports and generated briefs as later stages land.
- **`src/lib/db/schema.sql`** — the full schema, applied idempotently at startup.
  All tables exist from Stage 1, even those first used later (schema-first).
- **`.env`** (gitignored) — secrets, copied from [`.env.example`](.env.example).
  The four `ICS_URL_*` entries drive the calendar (see below); API keys arrive in Stage 5.
- **`data/cache/ics/`** — last-good copy of each calendar feed, so the week still renders
  (labelled *stale*) when Google is unreachable. Safe to delete.
- **`scripts/`** (from Stage 5) — Python brief/ingest scripts run by launchd/cron.

## Connecting the calendar

Google owns time; this system only reads it (decision #1 — nothing here ever writes back).
For each of **Academic**, **Personal**, **Professional** and your primary calendar:

1. Google Calendar → **Settings** → pick the calendar → **Integrate calendar**.
2. Copy **Secret address in iCal format**. Treat these URLs as passwords.
3. Paste into `.env` as `ICS_URL_ACADEMIC`, `ICS_URL_PERSONAL`, `ICS_URL_PROFESSIONAL`,
   `ICS_URL_CLASS`, then restart `npm run dev`.

Feeds are cached for 10 minutes; the *refresh* link under any calendar forces a re-fetch.
Calendars you leave blank are listed as *not configured* rather than silently missing.

## Backing up `data/`

SQLite runs in WAL mode, so recent writes can live in `data/lifeos.db-wal` rather than the
`.db` file. **Copying `lifeos.db` alone can miss them.** Back up with either:

```sh
sqlite3 data/lifeos.db "VACUUM INTO 'backup.db'"   # single consistent file
cp data/lifeos.db data/lifeos.db-wal data/lifeos.db-shm backup/   # or all three together
```

## Status

Stages 1–3 complete: scaffold + schema + design system; the Personal page (habits, health,
three-tier budget, UBS import); and the Academic page with the real Google Calendar (ICS)
integration now feeding every page's calendar. Next: Stage 4 — the Professional page.
See [`docs/04-roadmap.md`](docs/04-roadmap.md).
