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
  The four `ICS_URL_*` entries drive the calendar (see below); `ANTHROPIC_API_KEY` drives
  everything in `scripts/`.
- **`data/cache/ics/`** — last-good copy of each calendar feed, so the week still renders
  (labelled *stale*) when Google is unreachable. Safe to delete.
- **`scripts/`** — Python brief and capture-ingest scripts run by launchd, with their own
  [README](scripts/README.md). They write into `data/lifeos.db`; the app only renders what
  they produced.

## Connecting the calendar

Google owns time; this system only reads it (decision #1 — nothing here ever writes back).
For each of **Academic**, **Personal**, **Professional** and your primary calendar:

1. Google Calendar → **Settings** → pick the calendar → **Integrate calendar**.
2. Copy **Secret address in iCal format**. Treat these URLs as passwords.
3. Paste into `.env` as `ICS_URL_ACADEMIC`, `ICS_URL_PERSONAL`, `ICS_URL_PROFESSIONAL`,
   `ICS_URL_CLASS`, then restart `npm run dev`.

Feeds are cached for 10 minutes; the *refresh* link under any calendar forces a re-fetch.
Calendars you leave blank are listed as *not configured* rather than silently missing.

## The morning briefs and phone capture

The intelligence layer is four scheduled Python jobs — the app itself never calls an LLM
while rendering a page.

```sh
./scripts/setup.sh            # one venv, one dependency (anthropic)
./scripts/install_launchd.sh  # capture ingest every 15 min; three briefs at 07:00 Mon–Fri
```

Both need `ANTHROPIC_API_KEY` in `.env`. Logs land in `data/logs/`; each job prints a
one-line JSON summary. Remove everything with `./scripts/install_launchd.sh --remove`.

**Phone capture** is an iOS Shortcut that appends one JSON line to
`iCloud Drive/LifeOS/capture.jsonl` — no third-party service, no token. Build it once from
[`docs/07-capture-shortcut.md`](docs/07-capture-shortcut.md); ingest then reads that file,
proposes what each capture should become, and the LifeOS Inbox files it on one click. The
**Sync phone** button there runs the same ingest script by hand when you don't want to
wait fifteen minutes.

## Backing up `data/`

SQLite runs in WAL mode, so recent writes can live in `data/lifeos.db-wal` rather than the
`.db` file. **Copying `lifeos.db` alone can miss them.** Back up with either:

```sh
sqlite3 data/lifeos.db "VACUUM INTO 'backup.db'"   # single consistent file
cp data/lifeos.db data/lifeos.db-wal data/lifeos.db-shm backup/   # or all three together
```

## Status

Stages 1–5 complete: scaffold + schema + design system; the Personal page (habits, health,
three-tier budget, UBS import); the Academic page with the real Google Calendar (ICS)
integration feeding every page; the Professional page (day job, learning, projects, network
CRM); and the intelligence layer — phone capture, parsed at ingest, plus the three morning
briefs. Next: Stage 6 — RAG over lecture PDFs, budget and health insights.
See [`docs/04-roadmap.md`](docs/04-roadmap.md).
