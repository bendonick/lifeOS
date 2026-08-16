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
  Nothing in it is needed until Stage 3 (calendar ICS URLs) and Stage 5 (API keys).
- **`scripts/`** (from Stage 5) — Python brief/ingest scripts run by launchd/cron.

## Status

Stage 1 complete: scaffold, full SQLite schema + seeds, design-system foundation,
LifeOS hub with live This week + Inbox (briefs and calendar stubbed). Next:
Stage 2 — the Personal page. See [`docs/04-roadmap.md`](docs/04-roadmap.md).
