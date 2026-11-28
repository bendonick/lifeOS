# 01 — Architecture

Two layers, deliberately separable, plus an intelligence layer beside them:

- **Data layer** — SQLite + a folder tree. Owns all persistent state; outlives any UI.
- **Interface layer** — Next.js app at localhost. Reads/writes the data layer via its own API
  routes. Desktop-only, single user, no auth.
- **Intelligence layer** — Python scripts in `scripts/`, scheduled by cron/launchd, calling the
  Anthropic API and writing results *into the data layer*. The webapp displays what scripts
  produced; it never calls LLMs while rendering.

## Data layer

### SQLite — `data/lifeos.db`

Entities distilled from the Notion design. DDL lives in `src/lib/db/schema.sql`
(better-sqlite3 + plain SQL — SETTLED 2026-08-16, decision #15), applied idempotently at
startup; these fields are the contract:

- **tasks** — title, domain (`academic|personal|professional`), type
  (`task|assignment|exam|meeting`), due (datetime, nullable), done, course_id?, project_id?,
  notes, created_at. One store for everything; pages filter by domain — this is what makes the
  LifeOS "This week" rollup trivial.
- **courses** — name, professor, professor_email, credits, room, status, schedule_days (subset
  Mon–Fri), time_label, start_hour, end_hour (24h numbers), term_start, term_end, semester,
  url (the course's LMS page — the university LMS; http(s) only, validated at the API)
  (`F26|S27`). Enough metadata to *generate or validate* class sessions — the thing Notion
  couldn't do.
- **contacts** — name, company, role, how_met, linkedin, last_contacted,
  followup_interval_days, notes. `next_followup = last_contacted + interval` computed app-side
  or as a view; default ordering next_followup ASC so overdue floats up.
- **learning_items** — name, type (`concept|course|paper|book|module|video`), status
  (`queued|in_progress|done|dropped`), link, started, completed, notes. (The "AI / RL Concepts"
  list.)
- **projects** — name, domain, status, deadline, notes. Seeds: **Day job** (the day job as a
  project so its tasks filter cleanly), **SousChef**, **golf-AI**.
- **habits** / **habit_log** — habit(name, time_of_day `morning|anytime|evening`, active);
  log(habit_id, date, done). "Today" = query by date; streaks derivable later.
- **health_metrics** — date, metric (`sleep_score|hrv|steps|kcal|protein|carbs|fat|…`), value,
  source. Long/narrow so new metrics need no migration. Targets live in a config table or file.
- **transactions** — date, amount_chf, category, merchant, note, source.
  **budgets** — month, category (nullable = overall), amount_chf.
- **bills** — name, due_day, amount?, active; per-month paid log in **bill_payments**
  (bill_id, month, paid_at).
- **briefs** — date, kind (`world|ai_research|german_word`; `email_todos` reserved but
  unused — decision #35), content_md,
  generated_at. Written by scripts, rendered by the app; always show generated_at so staleness
  is honest.
- **inbox** — raw captures: text, source (`app|phone_relay`), created_at, processed,
  parsed_json?. Quick-capture in the app and the phone Shortcut both land here.
- **notes** — text, domain?, kind (`note|reminder|idea`), reviewed, created_at. The Personal
  notes inbox, the Academic Reminders / Professional Ideas rail cards, and the target of
  inbox "process → note" (decision #16).
- **config** — key/value store for editable targets/settings (health targets, budget
  defaults) so they never end up hardcoded (decision #16).

### Files

```
data/
  lifeos.db
  academic/courses/<course-slug>/
    lectures/        # PDFs, week-prefixed: 03-attention.pdf  ← RAG corpus
    notes/           # markdown
  imports/           # dropped CSVs (bank, health) — ingesters watch here
  briefs/            # md archive of generated briefs, one file per day+kind
  logs/              # launchd stdout/stderr, one file per job
  index/             # vector index (Stage 6)
.env                 # ANTHROPIC_API_KEY, ICS secret URLs — never committed
```

## Interface layer

- Next.js + TypeScript + Tailwind (SETTLED). One process; `npm run dev` is the whole runtime.
- Pages: `/` (LifeOS), `/academic`, `/personal`, `/professional`. Specs in `docs/03-pages/`.
- Server code owns all SQLite access and ICS fetching: server components read through the
  `src/lib/db/*` query modules, mutations go through the API routes (clients call them and
  `router.refresh()`); client components never touch the DB.
- Follow `docs/02-design-system.md` when building UI.

## Integrations

### Google Calendar — read-only ICS (wired in Stage 3, reused everywhere)

- Each Google calendar exposes a private **"Secret address in iCal format"** (Settings →
  Integrate calendar). Server fetches these URLs and expands events — including RRULE
  recurrence — for the requested window. Use a maintained ICS library; never hand-roll RRULE.
  Cache 5–15 min. URLs are secrets → `.env`.
- Calendars: **Academic**, **Professional**, **Personal** (user creates these — session-zero
  task) plus the primary, historically named **"Class"**, which is the catch-all where external
  invites land (e.g. recurring Tue "Weekly 1:1"). **Exam Prep** (`ICS_URL_EXAM_PREP`, added
  2026-11-26) holds final-exam study blocks and belongs to Academic. Domain pages default to
  their own calendars (`calendarHome` in `src/lib/calendar/types.ts` — Academic's view is
  Academic + Exam Prep) with an all-calendars toggle; LifeOS shows all, colored by domain.
- Timezone Europe/Zurich everywhere.
- Writing events (Google Calendar API + OAuth, e.g. generating class sessions) is OPEN and
  deferred — the user can create a recurring class event in Google in seconds.

### Capture — phone → system (Stage 5; SETTLED, decision #33)

Phone Claude runs in the cloud and cannot reach local disk. Rather than route through a cloud
mailbox, the phone writes to a **file that syncs to the Mac** — no third-party API, no token.

1. An **iOS Shortcut** (Siri-triggerable, e.g. "Hey Siri, LifeOS") takes dictated or typed text
   and appends one JSON line to `capture.jsonl` in iCloud Drive. Each line carries a
   client-generated `id` and an ISO timestamp; the Shortcut never parses or classifies.
2. iCloud syncs the file to the Mac, where it is readable at
   `~/Library/Mobile Documents/com~apple~CloudDocs/<folder>/capture.jsonl` (exact path
   configurable — it belongs in `config`, not hardcoded).
3. A local ingest script (launchd, and a "Sync" button in the app) reads the file and inserts
   unseen lines into `inbox` verbatim. **Ingest must be idempotent**: the normal case is
   re-reading a file whose earlier lines are already ingested, so dedupe on the capture `id`
   rather than on offsets, which iCloud can invalidate.
4. Parsing raw text → structured rows happens **locally at ingest** (decision #34): the script
   sends the line to the Anthropic API. It writes a *proposal* into `inbox.parsed_json` and
   stops — the app creates the task / health_metrics / note when the user accepts it in the
   Inbox (decision #36), so every derived write still goes through the module that owns that
   table. The raw text stays in `inbox`, so a bad parse is always re-runnable.

Shipped in Stage 5: `scripts/capture_ingest.py`, dedupe on the `inbox.external_id` column,
a Sync button on the hub (`POST /api/capture/sync` runs the same script launchd runs), and
the Shortcut itself specified in `docs/07-capture-shortcut.md`.

This removes the last external dependency from the daily path. Recorded alternatives if the
Shortcut annoys: Apple Reminders read via AppleScript/EventKit (Siri-native, needs a macOS
automation grant, task-shaped), or the original Notion relay (decision #7, superseded).

### Week plan parser (2026-11-19, decisions #83/#84)

The same propose-then-apply shape, run on demand. `POST /api/plan/notes` writes the note to
`plan_notes` **first**, then runs `scripts/plan_parse.py --note ID` through
`src/lib/plan/parse.ts` (the capture Sync's runner shape, 60 s timeout). The script sends the
note plus course names/short names, project names, open task titles + due dates + ids and this
week's plan titles to `claude-sonnet-5-5` with a JSON schema and server-side refusal fallbacks,
validates every id against the database, and writes only `plan_notes.proposal_json`. The app
writes `tasks` (`week`, `plan_group`) when the user accepts the draft, and returns an undo
payload for every apply. When the parser fails, the note is kept and the client offers a local
split (`src/lib/plan/split.ts`) instead.

### Anthropic API (Stages 5–6)

Used by brief scripts and the RAG answerer. Key in `.env`. Model names live in
`scripts/lifeos/claude.py`.

### Gmail — not integrated (decision #35)

The email-todos brief was dropped from Stage 5 and is not scheduled. If it returns: try an App
Password + stdlib `imaplib` first; full OAuth (Google Cloud project, consent screen, and the
publish-to-production step that stops refresh tokens expiring every 7 days) only if that path has
closed. Note that summarising mail means sending subjects and snippets to the Anthropic API —
the only place LifeOS would send the user's own content off the machine. A rule-based scan avoids
that and needs no LLM at all.

### Health data (Stage 2, OPEN — ask the user what devices they actually use)

- Apple Health has no desktop API. Realistic: *Health Auto Export* iOS app pushing JSON/CSV to a
  synced folder/endpoint, or periodic manual export into `data/imports/`.
- Whoop / Oura / Garmin have real REST APIs — good if the user has one.
- Macros: manual quick-entry (and later the phone relay) first; food-database integrations are a
  rabbit hole — resist early.
- Always ship manual entry + CSV import first so cards work regardless.

### Banking (Stage 6, OPEN)

Swiss banking ≠ Plaid-easy. Default: monthly CSV export into `data/imports/`, one parser per
bank format, category rules in config. Aggregators only if CSV proves painful.

## Scheduled jobs (Stage 5 — shipped)

- Python scripts, one per brief (world, ai_research, german_word — email dropped, decision #35)
  so one failure doesn't kill the rest; write to `briefs`. This isolation is also what makes a
  fourth brief a new file rather than a refactor.
- **launchd**, installed by `scripts/install_launchd.sh`: `com.lifeos.capture` every 15 minutes,
  and `com.lifeos.brief.{world,ai_research,german_word}` at 07:00 Mon–Fri (decision #37). Logs
  land in `data/logs/<label>.log`. Note `com.lifeos.sync` already exists on this machine from an
  unrelated project — the labels here deliberately don't collide.
- Jobs only run while the machine is awake — accepted. The hub shows each brief's age and calls
  a three-day-old one out, rather than pretending.
- Models: Sonnet 5 for briefs (web search on for world/ai_research), Opus 5 for the capture
  parser (decision #37). Both live in `scripts/lifeos/claude.py`, which also owns the
  `pause_turn` resume loop that a server-side tool run needs.
- **`config` is the contract between the app and the scripts** (decision #39): `capture.file_path`
  is user-owned and seeded once; `health.metric_keys` is rewritten from the TypeScript metric
  registry on every app start, so the parser never keeps its own copy of the metric names.

## RAG (Stage 6)

- Corpus: `data/academic/courses/*/lectures/*.pdf` + notes markdown. Indexer: extract → chunk
  → embed → local vector store (`sqlite-vec` preferred for the single-file ethos; Chroma
  acceptable). Idempotent, re-run on demand.
- Query: top-k with course/week metadata → Anthropic API → answer with citations (file + page).
- Embeddings API vs local model: OPEN, decide at Stage 6 with cost/quality in view.

## Hygiene

- Bind to localhost only. `.env` + `data/` gitignored; ship `.env.example`.
- Private GitHub repo; commit often (rollback insurance).
- Backup: dated copy script for `data/`; suggest keeping `data/` inside a cloud-synced folder.
