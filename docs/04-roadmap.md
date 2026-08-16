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
- [ ] (Stage 5 prep) In Notion, create a **Capture Inbox** database with properties:
      Text (title), Kind (select: food/task/note/reminder/idea), Domain (select), Processed
      (checkbox). Note its ID.

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

**Addendum (same day, decision #27):** courses link out to a prefilled Google Calendar form
rather than being created by the app, and a Schedule check panel under the timetable compares
each course's days/times against what the Academic feed actually returns — flagging a class
that is missing, moved, or at a different time.

## Stage 4 — Professional page — NEXT

Build per `03-pages/professional.md`: Day job task view, learning table, projects,
Network CRM with follow-up math. Add Personal/Professional calendar views (reuse ICS module).
**Done when:** a contact with last_contacted + interval sorts correctly in Due for follow-up,
and logging an interaction reshuffles it.

## Stage 5 — Capture relay + briefs

Notion Capture Inbox ingest (script + Sync button); parse captures into tasks/metrics/notes
(decide parse-at-ingest vs at-capture). Brief scripts (email_todos*, world, ai_research,
german_word) on cron/launchd writing to `briefs`; LifeOS brief cards go live with staleness
badges. Write the phone-side instruction snippet the user pastes into their Claude mobile
preferences. (*Gmail OAuth is OPEN — evaluate; briefs may ship without email first.)
**Done when:** a message typed to phone Claude appears in the app after a sync, and at least
two brief kinds generate on schedule.

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
