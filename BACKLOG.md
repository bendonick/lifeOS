# BACKLOG.md

Ideas flagged during sessions that were out of the current stage's scope. Review occasionally;
promote to a stage deliberately, never by drift.

## Seeds (from the design session)

- Streak visualizations / habit heatmap (log data exists from Stage 2; visualize later).
- Day job accomplishments log ("brag doc") — discussed, not adopted.
- Google Calendar write-back via OAuth (create/edit events from the app).
- Cross-check ICS class blocks against course schedule metadata; flag mismatches.
- Stale-contact nudges surfacing on the LifeOS hub (early version lands in Stage 6).
- Job-hunt module (only if the user brings it back).
- Alternative capture channels, now that the Shortcut is the primary one (decision #33): Apple
  Reminders read via AppleScript/EventKit (Siri-native, needs a macOS automation grant), Telegram
  bot, or the original Notion relay (decision #7, superseded — recoverable from the ledger).

## Stage 2 (2026-08-16)

- Health device adapters — Oura (official PAT, easy) when the ring arrives; Garmin sidecar
  (python-garminconnect, fragile) if wanted. Both write through `ingestMetrics`.
- Per-transaction recategorisation UI (the queue works at merchant granularity; editing a
  single already-categorised row currently needs SQL or a re-import).
- "Re-apply rules" button — after editing `budget.rules` in config, apply them to existing
  uncategorised rows without re-importing (done via one-off script this session).
- Undo an import batch from the UI (`import_batches` provenance exists; no button yet).

## Stage 3 (2026-08-16)

- Checked-in ICS regression fixture + a `npm run check:ics` script. The Stage 3 fixture
  (recurring class across a DST switch, EXDATE skip, moved occurrence, all-day, UTC-expressed
  event) proved the expander and was then discarded — the repo has no test framework, and
  adopting one is a deliberate choice, not a side effect of this stage.
- Cross-check ICS class blocks against `courses` schedule metadata and flag mismatches — the
  metadata (`schedule_days`, `start_hour`, `end_hour`) is now captured for exactly this, but
  nothing compares it to the feed yet. (Also listed under the design-session seeds.)
- Course rename leaves its materials folder behind: the slug is derived from the name, so the
  old `data/academic/courses/<old-slug>/` keeps the PDFs. Offer a rename/move, or store the
  slug on the row.
- Calendar event detail: clicking a block currently does nothing (tooltip only). A popover with
  description/attendees would need those fields carried through the expander.
- Month view / day view for the calendar. The week grid is the only view; the command center
  only ever needed the week.
- Materials: upload from the browser instead of dropping files into the folder by hand.

## Stage 4 (2026-08-17)

- Edit or delete a logged interaction — there is no undo. The *queue* is always correctable
  (`last_contacted` stays editable on the contact); only the history row isn't.
- `notes.project_id` for a real per-project note feed. Stage 4 uses the `projects.notes` text
  field, and the detail page's caption says so ("one field, not a feed").
- Migrate the four private tab implementations (`AcademicTasks`, `NotesPanel`, `TrendsView`,
  `WeekCalendar`) onto `src/components/ui/Tabs.tsx`. Built and used by Network; the migration
  touches three finished pages, so it wasn't done inside the build stage.
- `PATCH /api/tasks/[id]` accepting `project_id` — re-filing a task between projects. The db layer
  supports it; nothing in the UI needs it yet.
- A learning **target** date (offered and declined 2026-08-17 in favour of started/completed) and a
  type filter — only once the table is big enough to need them.
- `contact_interactions.channel` (call/email/coffee) if a pill turns out to be wanted. Left out for
  decision #25's reason.
- Contact import from a LinkedIn or CSV export, instead of hand entry.
- The "AI Engineer & RL Learning Roadmap" link in the Navigation rail card, once that doc exists —
  the user is still writing it, and no dead link ships.

## Deferred from Stage 6 — waiting on data, not on code (2026-08-17)

Moved out of Stage 6 at the user's ask: build a module fully or not at all, and three of the
four had nothing to run against. None of them is blocked by design or by another stage — each
becomes a session the day its data exists.

- **RAG over lecture PDFs.** `data/academic/` holds zero PDFs and both F26 courses start
  14–16 Sep, so "a question about a lecture PDF returns a correct cited answer" is unverifiable
  today. Brings decision **G** with it (embeddings: API vs local model; sqlite-vec vs Chroma),
  which should be decided against a real corpus rather than a hypothetical one. The indexer's
  shape is already written down in `docs/01-architecture.md` → RAG.
- **Health trends and nudges.** `health_metrics` is empty — Stage 2 shipped manual entry, CSV
  import and the trends page, and nothing has been logged. Needs a week or two of real data
  before a nudge can be judged useful rather than merely correct.
- **Stale-contact nudge on the hub.** `contacts` is empty by design (Stage 4's fixtures were
  deleted). Cheap to unblock — a handful of real contacts — and the follow-up maths already
  exists in `src/lib/professional/followup.ts`.

## Stage 5 (2026-08-17)

- **Build the capture Shortcut on the phone** — deferred 2026-08-17 at the user's ask. The Mac
  half is finished and verified against hand-written lines in the Shortcut's format: ingest runs
  every 15 minutes under launchd, dedupes, parses, and proposes. Until the Shortcut exists the
  only way in is the app's own capture box, and `capture.jsonl` stays empty. Steps are in
  `docs/07-capture-shortcut.md`; nothing in the codebase is waiting on it.

- **A `sleep_hours` metric.** The parser handled "slept 7 and a half hours" by
  reporting that no sleep-duration metric exists — the registry has
  `sleep_score` (a device number) and nothing for hours slept, which is the most natural thing
  to dictate. Adding it touches the metric registry, the health page and the trends charts, so
  it is a deliberate change rather than a side effect of Stage 5.
- Re-parse a capture whose proposal is wrong or missing. Today the fix is to use the manual
  "→ task" / "→ note" buttons; clearing `inbox.parsed_json` by hand makes the next ingest run
  re-propose it.
- Edit a proposal before accepting. A *task* proposal prefills the manual form, so it is
  correctable; metric and note proposals are accept-or-redo.
- A brief archive view. `data/briefs/YYYY-MM-DD-kind.md` accumulates every brief ever
  generated and nothing in the UI reads it — "what did the world brief say last Tuesday" is
  currently a `cat`.
- A per-brief "regenerate" button on the hub. The scripts are re-runnable by hand and the
  upsert is idempotent; there is just no UI for it.
- Schedule in `config` rather than baked into `install_launchd.sh` — changing 07:00 or adding
  weekends currently means editing the installer and re-running it.
- Trim the capture file. `capture.jsonl` grows forever and every ingest re-reads it whole;
  the dedupe makes that harmless but not free. Rotating it means keeping the ids of trimmed
  lines somewhere, or accepting that a trimmed line could re-ingest if its inbox row is gone.
- Surface a failed scheduled job in the UI. A brief that fails shows as a stale card, which is
  honest but indirect; the reason is only in `data/logs/`.

## Removed on 2026-08-17 — recoverable from commit 6625ba3

- **Schedule check panel** — compared each course's days/times against the Academic ICS feed
  and reported matched / moved / missing, offering a prefilled add-link where a block was
  absent. Removed as chrome: it had something to say only when a class had drifted. If it comes
  back, render it *only* in that case rather than always. `src/lib/academic/drift.ts` held the
  pure logic and was verified against all four states.
- **"Up next" work list** beside the timetable — open assignments, tasks and exams, soonest
  first, with optimistic checkboxes. Removed because it restated the two tables directly above
  it. The version worth building instead is the one tied to the calendar's visible week
  (option 3 of the 2026-08-17 plan), which needs `WeekCalendar`'s week state hoisted.
