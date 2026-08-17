# 04 — Roadmap

Each stage ends with: (a) something the user can run and
click, (b) docs updated, (c) a git commit. Scope beyond the stage →
flag it, log to BACKLOG.md, proceed only if the user says so.

## Setup before Stage 1

- [ ] Create local folder; drop this doc set in; `git init`; create **private** GitHub repo; push.
- [ ] Install Node.js
- [ ] Get an Anthropic API key (needed from Stage 5; fine to do later).
- [ ] In Google Calendar, create three calendars: **Academic**, **Professional**, **Personal**
      (Settings → Add calendar). Set their colors to green/blue/purple so every surface matches.
- [ ] For each (plus the primary "Class"): Settings → Integrate calendar → copy the
      **Secret address in iCal format** into a note for `.env` later. Treat as passwords.
- [ ] Create one recurring Google event per course on the Academic calendar (e.g. Advanced
      Topics in AI — Wed 08:00–12:00, weekly until term end, Europe/Zurich).
- [ ] ~~(Stage 5 prep) In Notion, create a **Capture Inbox** database.~~ Dropped — decision #33
      replaced the Notion relay with an iOS Shortcut writing to a synced file. The Shortcut is
      built *with* Stage 5, so there is nothing to do here in advance.

## Stage 1 — Scaffold + data layer + LifeOS shell

Scaffold Next.js + TS + Tailwind; SQLite with full schema from `01-architecture.md` (all
tables now, even ones used later — schema-first is the point) + seed data (projects, habits);
design-system foundation (tokens, banner/caption components, card, pill, table); LifeOS page
per `03-pages/lifeos.md` with This week + Inbox live against SQLite, briefs and calendar
stubbed. `.gitignore`, `.env.example`, README run instructions.
**Done when:** `npm run dev` → LifeOS renders, a task added inline appears in This week,
a capture lands in Inbox, page matches the design system.

## Stage 2 — Personal page — COMPLETE (2026-08-16)

Built per `06-stage2-brief.md` (which superseded parts of `03-pages/personal.md`): habits
with 7-day strips, source-agnostic health ingest (manual + mapped CSV; devices declined —
decision #17) with a Recharts trends page (`/personal/health`), three-tier budget over the
real UBS-derived numbers, UBS CSV import with preview/dedupe/rule-based categorisation, the
year of history imported behind `budget.start_date` = 2026-09-01 (decision #23), tasks,
notes, bills, calendar stub. Definition of done in the brief §8 — all items verified.

## Stage 3 — Academic page + ICS calendar — COMPLETE (2026-08-16)

Built per `03-pages/academic.md`. The ICS module (`src/lib/calendar/`) fetches the four secret
feeds, expands RRULE/RDATE/EXDATE/RECURRENCE-ID with ical.js and renders occurrences in Zurich
wall-clock (decision #26); a two-layer cache keeps the week readable offline and labels it
stale. `WeekCalendar` replaced the Stage 1 stub on all three pages — hub shows every calendar
colour-coded, domain pages default to their own with an All-calendars tab. Academic page:
courses CRUD + credits counter, assignments/tasks with view tabs, exams (no midterm/final
split — decision #25), Reminders rail card, course detail with materials folder listing, and
the timetable command center (week grid beside the to-do list).
**Done when:** verified — an assignment created on the page appears on LifeOS This week, and a
Google-format recurring event renders at the correct Zurich time across a DST switch.
Verified against the user's own feeds on 2026-08-16: all four connect, and an invite stored as
11:00 Pacific renders at 20:00 Zurich.

**Addendum (decision #27):** courses link out to a prefilled Google Calendar form rather than
being created by the app — Google still creates and owns every event. A Schedule check panel
comparing course metadata against the feed shipped alongside it and was removed the next day
as chrome (decision #28); the timetable now renders full width with nothing beside it.

## Stage 4 — Professional page — COMPLETE (2026-08-17)

Built per `03-pages/professional.md`, in the spec's section order: Day job (day-job tasks),
AI/RL concepts, Projects, Network — plus the three rail cards and the Professional ICS week view
full width below the grid (following #28, not `/personal`). New: `contact_interactions` and the
follow-up queue (decision #30), the day-job config key (#31), the learning list in the user's own
status words (#32), `src/lib/db/{contacts,learning,projects}.ts`, seven API routes, and
`project_id` finally plumbed through `tasks` — the column existed from Stage 1 and nothing wrote it.
`RemindersCard` was generalised into `components/notes/NotesCard.tsx` (Academic keeps a zero-line
diff) and the pill view-tab was extracted to `components/ui/Tabs.tsx`.
**Done when:** verified 2026-08-17. Four fixture contacts sorted D (never contacted) → A (overdue,
red) → C (tomorrow, orange) → B, with the no-cadence contact appearing only under All contacts;
logging an interaction on A moved it from second to last and dropped the red, and the order survived
a reload. Back-dating recorded history without moving `last_contacted`. A Day job task appeared on
LifeOS This week with a blue domain pill. Fixtures were deleted afterwards; the page ships empty.

## Stage 5 — Capture relay + briefs — COMPLETE (2026-08-17)

The intelligence layer arrives: `scripts/` is standalone Python on launchd, writing into
the data layer that the webapp renders. Capture ingest reads the Shortcut's synced
`capture.jsonl`, dedupes on a new `inbox.external_id` (iCloud rewrites the file, so
offsets are meaningless), and attaches a parse *proposal* to each capture — the app
creates the task/metric/note when the proposal is accepted, so `ingestMetrics` stays the
only door into `health_metrics` (decision #36). Three brief scripts (world, ai_research,
german_word — decision #35) run 07:00 Mon–Fri on Sonnet 5 with web search; ingest runs
every 15 minutes and behind a Sync button. `BriefRow` renders real markdown through a
hand-rolled subset renderer with an honest staleness line. The Shortcut is specified in
`docs/07-capture-shortcut.md` so it can be rebuilt from scratch.
**Done when:** verified 2026-08-17 — three dictation-shaped lines written to the capture
file ingested and parsed correctly ("…by friday" → task, academic, due 2026-08-21;
"slept 7 and a half hours" → the parser noting no
sleep-hours metric exists; "idea use rl to…" → professional idea). Accepting the task
chip created it in This week. A second ingest run ingested 0 rows. All three briefs
generated and render on the hub. Two manual steps remain, both outside what code can do:
**build the Shortcut on the phone** (`docs/07-capture-shortcut.md`), and **grant Full Disk
Access to the venv interpreter** — a launchd agent inherits no Files-and-Folders consent,
and both `~/Desktop` and iCloud Drive are protected, so the scheduled jobs are installed
but blocked until it is granted. `install_launchd.sh` probes for this and prints the exact
path; the scripts themselves run correctly from a terminal either way.

## Stage 6 — Intelligence

RAG over `data/academic/courses/*/lectures` (index + cited Q&A in the Academic page);
budget intelligence (categorization rules + LLM assist, insights on the spending card);
health trends/nudges; stale-contact nudge on LifeOS.
**Done when:** a question about a lecture PDF returns a correct cited answer; the spending
card says something a raw total alone wouldn't.

## Later / BACKLOG seeds

Streak heatmaps; Day job accomplishments log; Google Calendar write-back; class-session
cross-check vs course metadata; job-hunt module (only if it returns); Telegram-style capture
alternatives.
