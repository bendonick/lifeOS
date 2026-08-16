# 00 — Vision

## What this is

A personal CRM / second brain / life dashboard, hosted locally, that makes the user's life
easier. It replaces a Notion build that hit platform ceilings: no recurring database entries,
no private calendar embeds, no real automation hooks, and an API too awkward for retrieval work.

The move to local is motivated by the **intelligence layer**, not prettier dashboards:

1. **RAG over course materials** — lecture PDFs per course, embedded and queryable in natural
   language, with citations back to file and page.
2. **Daily AI briefs** — weekday-morning scripts calling the Anthropic API: email todos, world
   brief, suggested AI/RL papers, German word of the day.
3. **Intelligent budget tracking** — CHF spending vs monthly budget with pace ("day 13 · on
   pace"), category insight ("eating out is 2× last month"), anomaly flags.
4. **Intelligent health tracking** — macros remaining vs targets; sleep vs 7-day average; HRV vs
   personal range; steps vs goal — trends and nudges, not just numbers.

A lesson from prior art (a large self-hosted finance dashboard): **the data
pipeline matters more than the UI** — if ingestion and the data model are messy, dashboards are
decoration. Hence: schema early, pages on top.

## User context

- MSc student (AI-focused). Europe/Zurich, CHF. Semesters F26 (Fall 2026), S27.
  Courses carry ECTS-style credits (e.g. 6).
- Works a **day job**. Building AI/RL skills; tracking any job search is
  deliberately **out of scope** (dropped during design).
- Learning German. Runs and lifts. Tracks daily habits by time of day.
- Projects: **SousChef**, a **golf-AI** product idea.
- Wants an outreach cadence: meet people, follow up before contacts go stale.

## Principles

1. **Google owns time, the system owns work.** Blocked hours (classes, meetings, training) live
   in Google Calendar — it does recurrence natively. Tasks, courses, contacts, learning items
   live here. The UI renders a read-only calendar *beside* an interactive task list: look at free
   time on one side, pick work from the other. No syncing between them, ever. This is the most
   settled decision in the project.
2. **Data as files the user owns.** SQLite for structured state; predictable folders for content.
   The interface must be replaceable without a data migration.
3. **Three domains, one system.** Academic (green), Personal (purple), Professional (blue).
   Shared stores filtered by domain — not per-domain silos.
4. **Desktop-only.** Localhost, no hosting, no auth, no mobile client. Phone participation
   happens only through the capture relay (phone Claude → Notion inbox → local ingest).
5. **Low maintenance.** The user is the sysadmin. Manual fallbacks (quick-entry, CSV import)
   ship before or alongside any automated integration.
6. **Frictionless input beats fancy output.** Tracking systems die at the data-entry step.
   Capture must be one message or one click; parsing/structuring is the machine's job.
7. **Cheap features are the trap.** Building is easy; the discipline is
   deciding what *not* to build. Flag scope creep, log it in BACKLOG.md, move on.

## What "done" looks like, by horizon

- **Stages 1–4:** four pages exist and look right; tasks, courses, contacts, learning items,
  projects, habits are CRUD-able; the calendar shows real Google data next to task lists;
  health/budget cards render manual or stubbed data.
- **Stage 5:** briefs land every weekday morning; phone capture flows in via the relay; the
  timetable shows real class blocks.
- **Stage 6+:** ask questions across a semester of lecture PDFs and get cited answers; budget
  and health cards say something insightful; stale contacts surface themselves.

## Non-goals

- Multi-user, sharing, collaboration, public hosting, mobile client.
- Replacing Google Calendar as the scheduling tool.
- A general PKM/note-taking app — notes exist only where modules need them.
- Application tracking (schema shouldn't preclude a future return; build nothing for it now).
