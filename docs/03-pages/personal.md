# Page — Personal (`/personal`, purple)

Health, habits, money, and everyday life. **Built in Stage 2 (2026-08-16)** to
`docs/06-stage2-brief.md`, which refined this spec and wins where they differ. This doc now
describes what exists.

## Layout

**Rebuilt as a three-level hierarchy, 2026-08-18 (decisions #63–#66).** Theme unchanged
(`theme-editorial`, #48/#55): Graphite ground, Midnight tiles, Bone text, Olive rail, Tobacco
main column.

1. **The rail** — the day, in six modules: **Quick add** (four anchors) · **Needs attention**
   (unpaid bills, notes to review, merchants to categorise — warm only when genuinely late) ·
   **Signals** (budget headline, whether anything was logged today) · **Habits** · **German** ·
   **Go to**. Sticky, so it follows the whole column. `src/components/personal/RailStatus.tsx`
   holds the first two as server components; every figure comes from the same function the
   section below uses, so the two cannot disagree.

   There is **no full-width heading band** — the page opens straight into the tiles, like
   `/academic`. A `TodayBand` held this content for one iteration and was dissolved into the rail.
   *Next up* did not survive the move: the Schedule tile is the first thing in the main column and
   its first row is that same task. *Signals* carries no habits row for the same reason — the
   Habits tile is directly beneath it with a completion ring.
2. **Rail + stacked column** — supporting context, and structurally identical to `/academic`
   and `/professional`. Sticky 19rem rail (Habits · German, Olive) beside a twelve-column grid
   (Tobacco) in which everything stacks full width: **Schedule 12 · Health 12 · Spending 12**,
   then **Bills 6 · Notes 6** as the last row. Only the week calendar sits outside the rail grid,
   at full page width (#28/#58 — it has a 52rem floor). Navigation is a quiet footer row.

   Two rules this encodes, both learned the hard way here:
   - **Pairing at `span-6` opens holes.** Row one's height is the taller tile's, so the next row
     starts below *it* — ~105px of nothing sat under Schedule because Health was taller. Only the
     last row may pair, where the shorter tile leaves a ragged corner instead.
   - **Content tiles must live inside the rail grid or the rail stops following.** With Spending
     and Calendar outside it the grid was exactly as tall as the rail, so `lg:sticky lg:top-28`
     had **zero travel**. It now has 782px. Keep `content-start` alongside `items-start` as a
     guard: this div is a grid *item*, and a stretched grid container spreads its auto rows.

   At 776px the full-width tiles compact their insides — Health's metrics run 4-across in one row,
   and Spending's hero:category split is 3:2 (`lg:grid-cols-5`) so the category bars keep a usable
   track.
3. **Behind a `Disclosure`** — the detail: budget lines, propose-from-history, the transaction
   tools, the CSV import, the habit matrix, the week grid. Every collapsed summary carries the one
   fact worth knowing while shut ("120 merchants to review", "5 fixed · 3 variable · 6 annual").

**Editing is behind intent (#64).** No form is open at rest — asserted, not eyeballed. `QuickAdd`
and each section's `+` render the *same* components: `TaskForm`, `MetricForm`, `NoteForm`,
`TxnQuickAdd`.

**No tile carries a caption** (decision #67) — every one of them restated the module beneath it —
and nothing on the page explains how the interface works. What survives is data, its units, the
caveats that make a figure auditable, `generated_at` on anything generated, and one-clause empty
states.

Breadcrumb `LifeOS / Personal`.

## Modules (as built)

1. **Habits** (rail) — `habits`/`habit_log`. One compact flat list (time-of-day group headers
   dropped on user feedback 2026-08-16; the query still orders morning → anytime →
   evening), one-tap done for today, trailing **7-dot strip** per habit (today rightmost,
   ringed). Optimistic toggle with revert-on-failure. One query for the whole week window.
   **Since 2026-08-18** progress leads — completion ring, then the list — and the 7-dot strips
   sit behind a `7-day history` toggle, each row showing `n/7` instead. Ticking today is never
   behind anything.

2. **Health** — *Macros left*, *Sleep* (delta vs 7d avg), *HRV* (vs configured range),
   *Steps* (% of target), each with a hand-rolled SVG sparkline (14d). Honest empty states.
   Manual quick-entry + **mapped CSV import** (`health.csv_mappings` in config; `generic`
   mapping seeded). All writes go through `ingestMetrics(rows, source)`
   (`src/lib/health/ingest.ts`); metric names live only in `src/lib/health/metrics.ts`.
   **No device integration** (decision #17) — Oura/Garmin adapters are BACKLOG and will
   write through the same ingest function. Targets in config (`health.target.*`,
   `health.range.hrv`), confirmed with the user 2026-08-16.
   **Since 2026-08-18** the four metrics are `Card bare` — no boxes inside the tile — with muted
   labels; `MetricForm` sits behind `Log a metric` (and in Quick add), `HealthImport` behind
   `Import CSV`. The duplicate `trends →` at the foot of the section is gone; the tile header
   carries it.

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
5. **Schedule** (was "Tasks — due this week"; renamed 2026-08-18) — reuses the Stage 1
   `ThisWeek` component with a domain-filtered query (`weekTasksByDomain('personal')`).
   It holds two kinds of row and tells them apart with **no tag at all** (decision #60): a
   row whose `due` carries a time (`'2026-08-22T10:00'`) is an *appointment*, a row with
   only a date is a task. Consequences, all from that one fact:
   - The add row offers **date + time + Details**, the time optional; a time with no date
     is refused rather than dropped. Details is free text stored in `tasks.notes`
     (decision #62) and renders as a muted second line under the title.
   - A timed row gets a **`calendar ↗`** hand-off — Google's own form, prefilled, which the
     user presses Save on, so Google still creates and owns the event (#27/#61). One hour is
     assumed and the tooltip says so; Details goes over as the event's `location`.
   - The query keeps **every open appointment regardless of the 7-day horizon**
     (`OR length(due) > 10`), under a `Later` divider. Plain dated tasks keep the week
     filter. Booking something a month out used to mean typing it in and watching it vanish.
   - The **Type column is gone here** (`showType={false}`): Personal only ever writes
     `type='task'`, so the pill was one word repeated down the page. The hub keeps it, where
     the type actually varies. The header reads `When` whenever a timed row is present.

   The loop closes on this page: the event handed to Google comes back into the Calendar
   tile below within the ICS cache TTL (10 min).

6. **Bills** — `bills`/`bill_payments`, paid checkbox per month. Unpaid past `due_day` →
   warn; unpaid at month rollover (only when the previous month was tracked) → danger.
   Seeded: Rent · Health insurance · Phone · Transit pass, all due day 1 (confirmed).

7. **Notes** — inbox with reviewed toggle + inline add ("to review · Sunday"). Seeded three
   notes from Notion.

8. **German** — rail card reading `briefs` kind=`german_word`; honest empty state until
   Stage 5.

9. **Calendar** — `CalendarTile`: a compact list of what is coming on this page's own calendar,
   with the full `WeekCalendar` grid behind `Open week` (decision #66). Full page width, outside
   the rail grid. The collapsed summary names its scope, because a filtered list above an
   unfiltered count reads as a contradiction.

## Data touched

`habits`, `habit_log`, `health_metrics`, `tasks`, `bills`, `bill_payments`, `notes`,
`transactions`, `budgets`, `budget_lines`, `category_map`, `import_batches`, `config`,
`briefs` (read), `data/imports/` (archived CSVs; the user's real UBS export lives here,
gitignored).
