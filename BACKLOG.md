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
