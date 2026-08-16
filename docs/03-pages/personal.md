# Page — Personal (`/personal`, purple)

Health, habits, money, and everyday life. **Built in Stage 2 (2026-08-16)** to
`docs/06-stage2-brief.md`, which refined this spec and wins where they differ. This doc now
describes what exists.

## Layout

Breadcrumb `LifeOS / Personal`; narrow left rail (Quick Actions · Navigation ·
Notes-to-review count · German card); wide main column of banner+caption sections:
Habits → Health → Spending → Tasks → Bills → Notes; Calendar full-width below.

## Modules (as built)

1. **Habits** — `habits`/`habit_log`. One compact flat list (time-of-day group headers
   dropped on user feedback 2026-08-16; the query still orders morning → anytime →
   evening), one-tap done for today, trailing **7-dot strip** per habit (today rightmost,
   ringed). Optimistic toggle with revert-on-failure. One query for the whole week window.

2. **Health cards** — *Macros left*, *Sleep* (delta vs 7d avg), *HRV* (vs configured range),
   *Steps* (% of target), each with a hand-rolled SVG sparkline (14d). Honest empty states.
   Manual quick-entry + **mapped CSV import** (`health.csv_mappings` in config; `generic`
   mapping seeded). All writes go through `ingestMetrics(rows, source)`
   (`src/lib/health/ingest.ts`); metric names live only in `src/lib/health/metrics.ts`.
   **No device integration** (decision #17) — Oura/Garmin adapters are BACKLOG and will
   write through the same ingest function. Targets in config (`health.target.*`,
   `health.range.hrv`), confirmed with the user 2026-08-16.

3. **Health trends** — `/personal/health`. Linked single-series small multiples (shared
   range selector 7d/30d/90d/all, synced crosshair), a correlation **scatter** with Pearson
   *r* and a 1-day-lag toggle, and a table view. Never dual-axis (decision #19). Recharts +
   shared tokens in `src/components/charts/tokens.ts`.

4. **Spending** — three-tier `budget_lines` (fixed/variable/annual, real numbers from the
   user's budget) + `category_map` rollup; `budgets` = month overrides. Card shows the
   **variable-tier** headline with pace math, all-in context, and the labelled MoM trend;
   while today < `budget.start_date` (2026-09-01) it shows the first budget month,
   labelled. Budget rows: filled track + **pace tick**; warn only when ahead of pace,
   danger past 100%; fixed rows show paid/unpaid; the **annual tier is collapsed by
   default** behind a toggle (its subtotal row keeps the /yr and /mo figures; user feedback
   2026-08-16). Inline amount edit (standing or "just this month"). Manual transaction
   quick-add. **UBS CSV import**: upload → preview (counts, skip/uncategorised summary) →
   confirm; dedupe on `ubs:<transaction no>`; merchant→category rules in config
   (`budget.rules`), trained via the uncategorised queue's "always categorise" (§5d/§5e of
   the brief). Category pickers (queue + quick-add) are **grouped by budget line** —
   single-leaf lines collapse to one option labelled by the line itself. Full-year history
   imported; invisible to all budget math via `src/lib/money/window.ts` — only the labelled
   MoM line and the history chart (with start-date marker) read past the start.

5. **Tasks — due this week** — reuses the Stage 1 `ThisWeek` component with a
   domain-filtered query (`weekTasksByDomain('personal')`).

6. **Bills** — `bills`/`bill_payments`, paid checkbox per month. Unpaid past `due_day` →
   warn; unpaid at month rollover (only when the previous month was tracked) → danger.
   Seeded: Rent · Health insurance · Phone · Transit pass, all due day 1 (confirmed).

7. **Notes** — inbox with reviewed toggle + inline add ("to review · Sunday"). Seeded three
   notes from Notion.

8. **German** — rail card reading `briefs` kind=`german_word`; honest empty state until
   Stage 5.

9. **Calendar** — Stage 1 `CalendarStub`, personal accent; real ICS lands in Stage 3.

## Data touched

`habits`, `habit_log`, `health_metrics`, `tasks`, `bills`, `bill_payments`, `notes`,
`transactions`, `budgets`, `budget_lines`, `category_map`, `import_batches`, `config`,
`briefs` (read), `data/imports/` (archived CSVs; the user's real UBS export lives here,
gitignored).
