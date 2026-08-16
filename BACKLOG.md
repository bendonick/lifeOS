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
- Alternative capture channels (iOS Shortcut → synced file; Telegram bot).

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
