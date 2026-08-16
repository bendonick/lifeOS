# 05 — Decisions ledger

SETTLED = decided and final.
Reopen only if the user explicitly asks. OPEN = decide with the user when the module comes up,
then move it to SETTLED with a date and one-line rationale.

## SETTLED

| # | Decision | Rationale |
|---|---|---|
| 1 | **Google owns time, system owns work.** Calendar is read-only ICS; tasks never sync to calendar. | Recurrence + notifications belong to Google; relations/rollups belong here. Ended a long Notion struggle. |
| 2 | Two-surface planning UI: calendar beside task list ("command center"). | User plans by reading free time on one side, picking tasks on the other. |
| 3 | Domain colors: Academic green, Personal purple, Professional blue; warm colors reserved for urgency. | Carried from Notion; if everything is colored, nothing signals. |
| 4 | Stack: Next.js + TypeScript + Tailwind + SQLite, single process; Python allowed in `scripts/`. | Boring, battle-tested, best-trodden path for this project class. |
| 5 | Desktop-only, localhost, no auth, no mobile client. | Explicit user choice; avoids sync/hosting upkeep. |
| 6 | Briefs run locally: cron/launchd + Anthropic API key. | Cloud-scheduled tasks can't write to local disk. |
| 7 | Phone capture via relay: phone Claude → Notion Capture Inbox → local ingest. | Only cloud surface Claude-on-phone can already write to; zero new infra. Fallback recorded: iOS Shortcut → synced file. |
| 8 | Private GitHub repo; `data/` + `.env` gitignored; commit often. | Rollback insurance. |
| 9 | One tasks store with domain/type fields; pages are filtered views. | Makes cross-domain rollups (This week) trivial; proven in Notion. |
| 10 | No grading/GPA features; credits only. | User removed the grading system deliberately. |
| 11 | Job-hunt tracking out of scope. | Dropped during design; schema shouldn't preclude, build nothing. |
| 12 | Timezone Europe/Zurich; currency CHF. | User's life. |
| 13 | Scope discipline is **soft**: flag → BACKLOG.md → proceed only on user OK. Designing/iterating within a stage is expected. | User wants flexibility in what ends up on pages. |
| 14 | Class sessions live in Google as recurring events the user creates; the app reads them via ICS. | Generating 14 rows per course was the Notion workaround; Google recurrence replaces it. |
| 15 | Query layer: **better-sqlite3 + raw SQL**, no ORM. DDL in `src/lib/db/schema.sql` applied idempotently at startup; thin typed query modules in `src/lib/db/`. (2026-08-16, closes former OPEN A) | Fewest moving parts; the SQL you read is the SQL that runs. Drizzle declined. |
| 16 | Schema includes three tables beyond the 01-architecture entity list: `notes` (text, domain?, kind note/reminder/idea, reviewed), `bill_payments` (per-month paid log), `config` (key/value). (2026-08-16) | Page specs require them: Personal notes inbox, bills paid checklist, editable targets; one `notes` table also serves Academic Reminders / Professional Ideas rail cards and inbox "→ note". |

## OPEN

| # | Question | Decide during | Notes |
|---|---|---|---|
| B | Health data source: Health Auto Export vs wearable API vs manual+CSV only | Stage 2 | Ask what devices the user actually wears. Manual path ships regardless. |
| C | Exam kind modeling (field vs tag: midterm/final) | Stage 3 | Small; decide when building exams view. |
| D | Capture parsing: at-capture (phone Claude writes structured) vs at-ingest (local LLM parse) | Stage 5 | At-capture = cleaner data, longer phone instructions; at-ingest = dumber relay, smarter local. |
| E | Gmail OAuth for email-todos brief: worth the setup? | Stage 5 | Briefs may ship without email. |
| F | Bank CSV format(s) / parser per bank | Stage 6 | Depends on user's bank export. |
| G | Embeddings: API vs local model; sqlite-vec vs Chroma | Stage 6 | Cost/quality call at build time. |
| H | Google Calendar write-back (OAuth) | Backlog | Only if reading ever proves insufficient. |
