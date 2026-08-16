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
| 17 | **Health: manual + CSV only in Stage 2; no device integration.** All writes go through `ingestMetrics(rows, source)`; a metric registry in `src/lib/health/metrics.ts` is the only place metric names live. (2026-08-16, closes former OPEN B; reopen when the Oura ring arrives — official v2 API + personal access token, roughly a day's work behind `ingestMetrics`) | Garmin's Health API is entity-only and rejects personal applications; the unofficial path broke in March 2026 when `garth` was deprecated. Oura ships an official personal token and drops in later. Quarantine the fragility behind one function. |
| 18 | **Charts: Recharts on the trends page, hand-rolled SVG for in-card sparklines, shared tokens in `src/components/charts/tokens.ts`.** (2026-08-16) | Sparklines need no axes and benefit from pixel-perfect palette control; dual-axis-free correlation views need real tooling. Shared tokens prevent visual drift. |
| 19 | **No dual-axis charts, ever.** Correlation is shown as linked single-series small multiples plus a scatter with Pearson *r* — never two y-scales on one plot. (2026-08-16) | Two arbitrary scales invent a correlation the data doesn't contain. Single-series charts also sidestep the fact that the domain accents fail the dark-mode categorical lightness band (L 0.71–0.76 vs the 0.48–0.67 band). |
| 20 | **Budget is three-tier: `budget_lines(name, tier, amount_chf, carryover)` + `category_map` for leaf→parent rollup; `budgets` is reinterpreted as month-specific overrides.** Seeded from a three-tier budget. (2026-08-16) | Fixed/variable/annual behave differently; the Additional expenses envelope accumulates; UBS supplies leaf categories while the budget is stated at parent level. A flat month/category/amount table expresses none of it. |
| 21 | **Spending card: variable-tier headline with pace math, all-in as the muted context line, plus a month-over-month trend.** Budget rows use a filled track with a pace tick, not YNAB's striped fill. (2026-08-16) | Pace against all-in is meaningless when rent lands on day 1. The pace tick answers "ahead or behind" with no text; striping is too busy for this design system. |
| 22 | **Bank CSV: one parser file per bank behind a `BankParser` interface; merchant→category rules and CSV mappings live in `config` as JSON; dedupe on `date\|amount\|merchant`.** LLM categorisation stays in Stage 6. (2026-08-16, narrows OPEN F) | Adding a bank should be a file, not a refactor. Rules-in-config means the user retrains it without a code change. Overlapping exports must never double-count. |
| 23 | **`budget.start_date` = 2026-09-01. Historical transactions are imported but excluded from every budget-facing query via one shared helper; only the labelled MoM trend and the history chart read past it.** (2026-08-16) | The year of history is the parser fixture, the categorisation-rule corpus, and the only way comparisons work in month one — but the budget starts in September and pre-budget spend must never land in its totals. |
| 24 | **Design rules are guidance, not law; translucent materials are permitted; a small set of craft rules is adopted (not a visual identity).** Craft mechanics that ARE binding are listed under "Craft standards" in `02-design-system.md`. Domain colors and dark-only survive unchanged. (2026-08-16, user explicitly reopened) | The user asked to loosen the "set in stone" rules and allow glassmorphism, wanting "clean and professional". Most motion guidance is gesture/spring material that a mouse-driven dashboard has no use for, so only materials, typography, response and the accessibility signals were adopted. Apple's system palette was **not** adopted — it would erase the domain identity that makes the three pages legible at a glance. |
| 25 | **Exams are just `type='exam'` — no midterm/final/quiz distinction, in a column or a tag.** The Exams section is one table with no view tabs. (2026-08-16, closes OPEN C) | The user's call: the split earns nothing here. A kind that is never filtered on is a field to maintain, and view tabs that all show the same rows are chrome pretending to be a control. |
| 26 | **ICS: `ical.js` v2 used directly; expansion in `src/lib/calendar/expand.ts`, fetch + two-layer cache (memory + `data/cache/ics/`) in `ics.ts`; occurrences converted to Zurich wall-clock through absolute instants and `Intl`.** A feed that fails renders from cache flagged `stale`; a feed that throws never blanks the other three. (2026-08-16) | ical.js is the canonical implementation (Mozilla/Thunderbird), zero-dependency, actively maintained, and owns EXDATE + RECURRENCE-ID overrides — the parts that are actually hard. `ical-expander` would have pinned a five-year-old ical.js v1. Converting via instants + `Intl` means correctness does not depend on the feed shipping a VTIMEZONE for Zurich. |

## OPEN

| # | Question | Decide during | Notes |
|---|---|---|---|
| D | Capture parsing: at-capture (phone Claude writes structured) vs at-ingest (local LLM parse) | Stage 5 | At-capture = cleaner data, longer phone instructions; at-ingest = dumber relay, smarter local. |
| E | Gmail OAuth for email-todos brief: worth the setup? | Stage 5 | Briefs may ship without email. |
| F | Bank CSV: write the UBS parser against a real export | Stage 2 | Narrowed by #22 — architecture (BankParser interface, rules-in-config, dedupe) is settled; only the concrete UBS format work remains. Additional banks later as they arise. |
| G | Embeddings: API vs local model; sqlite-vec vs Chroma | Stage 6 | Cost/quality call at build time. |
| H | Google Calendar write-back (OAuth) | Backlog | Only if reading ever proves insufficient. |
