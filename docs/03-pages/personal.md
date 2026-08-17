# Page — Personal (`/personal`, purple)

Health, habits, money, and everyday life. **Built in Stage 2 (2026-08-16)** to
`docs/06-stage2-brief.md`, which refined this spec and wins where they differ. This doc now
describes what exists.

## Layout

**Themed `theme-editorial` (decisions #48/#55) — Graphite ground, Midnight Blue tiles, Bone text, Olive rail titles, Tobacco main titles. Rebuilt as a rail + bento, 2026-08-17 (decisions #50/#54).** A sticky 19rem left rail — Quick
add · Go to · To review · Habits · German, all Cerulean-titled — beside a twelve-column bento of
`Tile`s in ochre: Health 12, Spending 12, Tasks 6 · Bills 6, Notes 12, Calendar 12. The accent
split is the point: cool for the day's small state, warm for the subject matter, so the halves
read apart without a divider. Habits leads with a completion
ring and Spending leads with the history chart, so both tiles open with a picture. The original
rail-and-column description below is superseded.

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
   user's budget) + `category_map` rollup; `budgets` = month overrides. A **dashboard row**
   leads the section (added 2026-08-16 on user feedback, translated from a spreadsheet
   reference into this design system): the headline card, a single-hue **"left to spend"
   radial gauge** (same pace semantics as the bars; never a multi-segment donut — the
   accents can't pass dark-mode categorical validation), and a **by-category bar list**
   with faint ticks marking the historical monthly averages from `budget.baseline`. Card
   shows the **variable-tier** headline with pace math, all-in context, and the labelled
   MoM trend; while today < `budget.start_date` (2026-09-01) it shows the first budget
   month, labelled. Budget rows: filled track + **pace tick**; warn only when ahead of pace,
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


   **Stage 6 additions.** The card now *explains*: up to two ranked lines from
   `src/lib/money/insights.ts` (decision #44) — runway, category-vs-your-own-average, per-day
   allowance, over-budget, an unpaid fixed line — rendered only when they have something to
   say, so a quiet month leaves the card exactly as Stage 2 left it. **Merchants panel**
   (replaces `UncategorisedQueue`): *To review* prefills each row from `category_proposals`
   written by `scripts/categorize_assist.py` (decisions #40/#41), with confidence and a
   one-clause reason, plus bulk accept for the high-confidence block; *All merchants* lists
   every merchant with count, net total and current category, and is how a misfiling gets
   corrected — merchant granularity, no per-row editor (decision #42). **Propose from
   history** (`src/lib/money/propose.ts`): median monthly spend per variable line over the
   complete months of history, with its range and per-category basis printed beside it, and
   per-line accept through the existing budget-line PATCH; it names the months it skipped as
   too sparse and the transactions still uncategorised, because both make it an
   understatement. **Category taxonomy** (decision #45): Food & drink is
   `groceries` / `restaurants` / `bars` and nothing else — five near-identical leaves made
   every chart look busier than the spending is. Additional expenses keeps its six leaves in
   the assignment picker but renders as a single row everywhere visual. **Design pass, 2026-08-17
   (decisions #46/#47).** The section reads in the order the questions get asked: hero →
   categories → budget → propose → history → chores. `MonthCard` replaced `SpendingCard` +
   `SpendGauge`, which had been stating the same number twice across two thirds of the row; it
   is month-scoped with no daily rate, uses the budget rows' own filled-track-plus-pace-tick
   glyph rather than a second radial grammar, states the *plan's composition* before the month
   starts instead of a wall of zeros, and gives insights their own place below a rule. Fixed and
   Annual collapse (Fixed carrying `N of M paid`); quick-add, import and the merchant queue sit
   behind a `Manage transactions` disclosure that auto-opens when `#uncategorised` is targeted.
   The money map was cut as "cool but not that insightful" — it was also trailing-12-month,
   which fought the month focus the page is for.
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
