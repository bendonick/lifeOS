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

## Stage 5 — Capture relay + briefs — NEXT

Capture ingest from the synced file (script + Sync button), idempotent on the capture `id`;
parse captures into tasks/metrics/notes locally at ingest (decision #34). Brief scripts
(email_todos*, world, ai_research, german_word) on launchd writing to `briefs`; LifeOS brief
cards go live with staleness badges. Build the iOS Shortcut and write down what it does, so it
can be rebuilt (decision #33). (*Gmail OAuth is OPEN — evaluate; briefs may ship without email.)
Only credential needed: `ANTHROPIC_API_KEY`.
**Done when:** a phrase dictated to the Shortcut on the phone appears in the app after a sync
and parses into the right row, and at least two brief kinds generate on schedule.

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
