# 06 — Stage 2 build brief (Personal page)

Companion to `docs/03-pages/personal.md`. That doc says *what* the Personal page contains;
this one records the decisions made in the 2026-08-16 planning session and the specs that
close them. **Read both before writing code.** Where they disagree, this doc wins — it is
newer.

Everything here was decided with the user. Do not re-litigate; flag additions to `BACKLOG.md`.

---

## 0. What changed vs the original page spec

| Area | Original spec | Now |
|---|---|---|
| Health source | "explore device/API, wire if cheap" | **Manual + CSV only.** Garmin has no personal API (see §2). Build a source-agnostic ingest layer; no device code this stage. |
| Health trends | "a detail view (simple charts)" | **Full `/personal/health` trends page**, small multiples + a correlation scatter (§4). |
| Habits | today-only checklist | today + **trailing 7-day strip** per habit (§3). |
| Budget | flat `budgets(month, category, amount)` | **Three-tier `budget_lines`** + category rollup, seeded from the user's real UBS-derived budget (§5). |
| Spending card | one number vs one budget | **variable headline + all-in context line + month-over-month trend** (§6). |
| Charts | unspecified | **Recharts** on the trends page, **hand-rolled SVG** sparklines in cards, shared tokens (§4). |

---

## 1. Non-negotiables carried in from Stage 1

Stage 1's data-flow pattern worked; repeat it exactly:

- Server components read via `src/lib/db/*` query modules.
- Client components mutate via `/api/*` route handlers, then `router.refresh()`.
- **No client-side data ownership.** No `useEffect` fetching, no local caches, no state sync.
- Next 16 route handlers receive `params` as a Promise — `const { id } = await ctx.params`.
- Set `busy_timeout` before `journal_mode=WAL`; seed inside `BEGIN IMMEDIATE`.

Existing UI primitives to reuse, not replace: `PageShell`, `SectionBanner`, `Card`, `Pill`,
`Table`, and the accent maps in `src/components/ui/accents.ts`. Personal page accent is
`personal` (purple) everywhere except urgency.

---

## 2. Health — source-agnostic ingest

### The decision (closes OPEN #B)

Garmin's official Health API is restricted to legal entities — companies, universities,
hospitals — and personal-use applications are explicitly rejected. There is no consumer OAuth.
Unofficial libraries (`python-garminconnect`) do work but reverse-engineer undocumented
endpoints; the widely-used `garth` library was deprecated in March 2026 when Garmin changed
its auth flow. Oura, by contrast, ships an official v2 API with a personal access token.

**Stage 2 therefore ships no device integration at all.** It ships an ingest layer designed so
that a Garmin sidecar (Python, cron, fragile) and an Oura adapter (TypeScript, trivial) can
both be added later without touching a single UI component.

### What to build

`health_metrics` already exists and is correctly shaped (long/narrow, `source` column). Do not
change it. Add around it:

1. **`src/lib/health/metrics.ts`** — the canonical metric registry. One exported const:

   ```ts
   export const METRICS = {
     sleep_score: { label: "Sleep",    unit: "",     precision: 0, higherIsBetter: true  },
     hrv:         { label: "HRV",      unit: "ms",   precision: 0, higherIsBetter: true  },
     steps:       { label: "Steps",    unit: "",     precision: 0, higherIsBetter: true  },
     kcal:        { label: "Calories", unit: "kcal", precision: 0, aggregate: "sum"      },
     protein:     { label: "Protein",  unit: "g",    precision: 0, aggregate: "sum"      },
     carbs:       { label: "Carbs",    unit: "g",    precision: 0, aggregate: "sum"      },
     fat:         { label: "Fat",      unit: "g",    precision: 0, aggregate: "sum"      },
     weight:      { label: "Weight",   unit: "kg",   precision: 1                        },
     resting_hr:  { label: "Resting HR", unit: "bpm", precision: 0, higherIsBetter: false },
   } as const;
   ```

   `aggregate: "sum"` means multiple rows on one date add up (macros logged per meal);
   everything else takes the latest row for that date. Nothing else in the app may hardcode a
   metric name — read from here.

2. **`src/lib/health/ingest.ts`** — one function, `ingestMetrics(rows, source)`, that
   validates, normalises dates to Zurich `YYYY-MM-DD`, and upserts. Every path into
   `health_metrics` goes through it: manual entry, CSV import, and every future adapter. This
   is the quarantine boundary — future Garmin fragility lives *outside* it.

3. **CSV import** — `POST /api/health/import`, accepts a file, plus a mapping config so any
   export format works:

   ```ts
   type HealthCsvMapping = {
     dateColumn: string;
     dateFormat?: string;          // default ISO
     columns: Record<string, keyof typeof METRICS>;  // csv header -> metric key
   };
   ```

   Store named mappings in `config` under `health.csv_mappings` as JSON so the user adds a new
   export format by editing config, not code. Files land in `data/imports/`.

4. **Manual quick-entry** — a compact inline form on the Personal page: date (defaults today),
   metric select (from `METRICS`), value, save. Source = `manual`.

### Targets

Health targets live in `config`, not code. Seed:

| key | value |
|---|---|
| `health.target.kcal` | 0 |
| `health.target.protein` | 0 |
| `health.target.carbs` | 0 |
| `health.target.fat` | 0 |
| `health.target.steps` | 0 |
| `health.range.hrv` | `{"low":0,"high":0}` |

Ask the user to confirm these numbers during the session — they are placeholders from the
design docs, not the user's actual targets.

### Explicitly NOT in Stage 2

No Garmin code. No Oura code. No Apple Health. No food database. Add a BACKLOG entry:
*"Health device adapters — Oura (official PAT, easy) when the ring arrives; Garmin sidecar
(python-garminconnect, fragile) if wanted. Both write through `ingestMetrics`."*

---

## 3. Habits — today + 7-day strip

Existing `habits` / `habit_log` schema is sufficient. No migration.

**Layout.** Three groups by `time_of_day` (Morning / Anytime / Evening), each a small pill
heading. Within a group, one row per active habit:

```
[ ✓ ]  Work on German                       ● ● ○ ● ● ● ●
```

- Checkbox toggles today's `habit_log` row (upsert / delete on the `(habit_id, date)` unique).
- The strip is **7 dots, oldest → newest, today rightmost**. Filled = done, hollow = not.
  Today's dot is ringed so the eye finds it.
- Filled dots use `personal`; hollow use `border`. No streak numbers, no heatmap, no
  animation. Streak math and heatmaps stay in BACKLOG.
- One query fetches the whole 7-day window for all habits at once — do not fire one query
  per habit.

**Seed habits** (if not already seeded in Stage 1): Brush Teeth 2x *(morning)*, Make Bed
*(morning)*, Vitamins *(morning)*, Work on German *(anytime)*, Workout *(anytime)*,
Floss *(evening)*.

**Interaction.** Optimistic toggle in the client, then `router.refresh()`. A failed POST
reverts and shows a small inline error — do not swallow it.

---

## 4. Charts

Two tools, one set of tokens. This split is deliberate: sparklines need zero chrome and
pixel-perfect palette control; the trends page needs axes, tooltips and range selection that
are not worth rebuilding.

### 4a. `src/components/charts/tokens.ts` — shared, single source of truth

Both the hand-rolled SVG and the Recharts components import from here. Nothing else defines a
chart color, stroke width, or radius.

```ts
export const chart = {
  stroke: 2,              // all data lines
  gridStroke: 1,          // hairline, solid — never dashed
  markerMin: 8,           // min hit-target-bearing marker size
  radius: 4,              // rounded data-ends
  series: "var(--color-personal)",     // single-series default on this page
  grid:   "var(--color-border)",
  axis:   "var(--color-faint)",
  label:  "var(--color-muted)",
  surface:"var(--color-surface)",
} as const;
```

### 4b. Sparklines — hand-rolled SVG (`src/components/charts/Sparkline.tsx`)

No dependency. ~50 lines. Props: `values: number[]`, `width = 64`, `height = 20`,
`className?`. Behaviour:

- Scale y to `[min, max]` of the passed window with a small vertical inset so the line never
  touches the edge; if all values are equal, draw a flat line at mid-height.
- Emit one `<polyline>` at `stroke-width: 2`, `stroke="currentColor"`, `fill="none"`,
  `vector-effect="non-scaling-stroke"`. The parent sets color via `text-personal`.
- Optional last-point dot, radius 2, same color.
- `<= 1` value → render nothing (not a broken line).
- No axes, no labels, no tooltip. It is a texture, not a chart.

### 4c. Trends page — Recharts (`/personal/health`)

**Critical constraint, and it overrides what was discussed in planning:** do **not** build a
dual-axis chart. Two y-scales on one plot is the single worst charting mistake — the alignment
between the two scales is arbitrary, so the chart invents a correlation that isn't in the data.
The user asked for a "correlation view"; deliver it correctly as follows.

**Default view — linked small multiples.** One chart per metric, stacked vertically, all
sharing the same x domain and the same range selector. Each chart is a **single series**, so:

- each uses `chart.series` (personal purple) — no categorical palette, no legend needed
  (the chart title names the series);
- hovering any chart draws the crosshair on *all* charts at the same date, via one shared
  hover-date state lifted to the page. Vertical alignment is what reveals the relationship,
  honestly and at a glance.

**Correlation view — a scatter.** Metric A on x, metric B on y, one dot per date, plus the
Pearson *r* printed as text. Two `<select>`s choose the pair; add an optional "lag B by 1 day"
toggle since sleep→next-day-HRV is the interesting question. Dots at radius ≥ 4 with a 2px
surface ring, hit area ≥ 24px. This is the correct form for "do these two things relate."

**Why the palette matters here.** Running the design system's four accents through the
dataviz validator against the dark surface `#141417`:

```
[FAIL] Lightness band   #a78bfa 0.709 · #3ecf8e 0.762 · #60a5fa 0.714 · #fb923c 0.758
                        (dark-mode categorical band is L 0.48–0.67)
[PASS] Chroma floor · CVD separation · Normal-vision floor · Contrast vs surface
```

The domain accents are tuned for **text and tints on dark**, where they pass contrast fine —
they are too light to serve as a multi-series categorical fill set. Single-series small
multiples sidestep this entirely, which is a second, independent reason to prefer them. If a
genuinely categorical chart is ever needed, do not invent hues: derive darker steps of the
existing hues and re-run
`node scripts/validate_palette.js "<hexes>" --mode dark --surface "#141417"` until it passes.

**Also required on every chart:** solid hairline grid (never dashed), recessive axes, a range
selector (7d / 30d / 90d / all) in **one filter row above all charts** — not per-card, a
crosshair tooltip, and a table view toggle so no value is reachable only by hover. Size chart
containers to include the x-axis label band, or the card gets a nested scrollbar.

---

## 5. Budget — schema, seed, and the UBS pipeline

### 5a. Why `budgets` alone is insufficient

The user's budget (derived from a full year of bank transactions) has three structures the flat table cannot express: three tiers that
behave differently, an accumulating envelope, and two-level categories where UBS supplies the
leaf and the budget is stated at the parent.

### 5b. Schema additions (append to `schema.sql`)

```sql
-- The user's standing budget. Tiers behave differently: 'fixed' is committed
-- spend, 'variable' is what the user actually decides day to day, 'annual'
-- amounts are PER YEAR and get smoothed /12 for monthly views.
CREATE TABLE IF NOT EXISTS budget_lines (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  tier       TEXT NOT NULL CHECK (tier IN ('fixed','variable','annual')),
  amount_chf REAL NOT NULL,
  carryover  INTEGER NOT NULL DEFAULT 0,   -- 1 = unspent balance accrues month to month
  sort_order INTEGER NOT NULL DEFAULT 0,
  active     INTEGER NOT NULL DEFAULT 1,
  notes      TEXT
);

-- Transaction-level category -> budget line. UBS gives leaves; the budget is
-- stated at the parent.
CREATE TABLE IF NOT EXISTS category_map (
  category       TEXT PRIMARY KEY,
  budget_line_id INTEGER NOT NULL REFERENCES budget_lines(id) ON DELETE CASCADE
);

-- CSV import provenance, so a bad import can be undone wholesale.
CREATE TABLE IF NOT EXISTS import_batches (
  id          INTEGER PRIMARY KEY,
  filename    TEXT NOT NULL,
  source      TEXT NOT NULL,               -- 'ubs'
  row_count   INTEGER NOT NULL,
  imported_at TEXT NOT NULL DEFAULT (datetime('now'))
);

ALTER TABLE transactions ADD COLUMN batch_id INTEGER REFERENCES import_batches(id) ON DELETE SET NULL;
ALTER TABLE transactions ADD COLUMN dedupe_key TEXT;             -- date|amount|normalised merchant
ALTER TABLE transactions ADD COLUMN budget_line_id INTEGER REFERENCES budget_lines(id);  -- manual override; NULL = derive via category_map
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_dedupe ON transactions (dedupe_key) WHERE dedupe_key IS NOT NULL;
```

`ALTER TABLE` is not idempotent in SQLite — guard the three column adds by checking
`PRAGMA table_info(transactions)` first, consistent with the existing startup-apply pattern.

`budgets` keeps its meaning but is **reinterpreted**: `budgets.category` now holds a
`budget_lines.name` (or NULL for overall), and a row there is a **month-specific override** of
the standing line. No migration needed; the table is empty.

### 5c. Seed data — the user's actual budget

Seed `budget_lines` as below. Amounts are left at 0; the owner enters their own.

**Fixed (monthly):**

| name | amount | notes |
|---|---|---|
| Rent | 0 | Standing order |
| Health insurance | 0 | Monthly premium |
| Phone | 0 | Mobile plan |
| Transit pass, city zones | 0 | Monthly pass |
| House cleaning | 0 | Monthly |

**Variable (monthly):**

| name | amount | carryover | notes |
|---|---|---|---|
| Food & drink | 0 | 0 | Groceries, restaurants and bars |
| Additional expenses | 0 | **1** | Travel, social, clothes, supplements — spiky by nature |
| Buffer / cushion | 0 | **1** | Untouchable reserve; not for planned spending |

**Annual (amount is PER YEAR):**

| name | amount/yr | notes |
|---|---|---|
| University fees | 0 | Per semester |
| Electricity | 0 | Billed quarterly |
| Radio/TV licence | 0 | One bill a year |
| Rail half-fare card | 0 | Renews yearly |
| Gym | 0 | Paid upfront |

Derived totals the UI must compute, never hardcode: **total per month** and
**all-in monthly** (total per month + annual / 12).

**Seed `category_map`:**

| categories | → budget line |
|---|---|
| `groceries`, `restaurants`, `mensa`, `kiosk`, `coffee` | Food & drink |
| `clothing`, `travel`, `pharmacy`, `nightlife`, `payback`, `barber`, `apps_misc` | Additional expenses |
| `rent` | Rent |
| `insurance` | Health insurance |
| `phone` | Phone |
| `transit` | Transit pass, city zones |
| `cleaning` | House cleaning |
| `uni_fees` | University fees |
| `electricity` | Electricity |
| `serafe` | Radio/TV licence |
| `sbb` | Rail half-fare card |
| `gym` | Gym |

**Reference actuals** (semester-month averages, from the same sheet — store in `config` under
`budget.baseline` as JSON so the UI can say "vs your historical average"):
per-category monthly averages for food, and the full-year average and range for
additional expenses.

### 5d. UBS CSV import

**Ask the user for their UBS export at the start of the session and build the parser against
the real file — do not guess column names.** The user has a full-year export
(about a year of transactions). Import it; see §5e for why, and for the start-date
rule that keeps it out of the live budget.

Structure it so the format is data, not code:

- `src/lib/money/parsers/ubs.ts` exporting a `BankParser` interface
  (`detect(headers) => boolean`, `parse(rows) => ParsedTxn[]`), so a second bank is a second
  file.
- Swiss CSV realities to handle explicitly: semicolon delimiters, `1'234.56` thousands
  separators with apostrophes, `DD.MM.YYYY` dates, separate debit/credit columns rather than a
  signed amount, a multi-line preamble before the real header row, and Latin-1 rather than
  UTF-8 encoding. Detect, don't assume.
- **Dedupe on import.** `dedupe_key = date|amount|slug(merchant)`; rows whose key already
  exists are skipped and reported as "N skipped (already imported)". Overlapping exports must
  never double-count.
- **Categorise by rule, not by LLM.** Store merchant→category rules in `config` under
  `budget.rules` as an ordered array of `{ match: string, category: string }` (case-insensitive
  substring on the merchant). Uncategorised rows land in an **Uncategorised** review queue on
  the page where one click assigns a category *and* offers "always categorise <merchant> as
  <category>", which appends a rule. LLM-assisted categorisation is Stage 6 — do not build it.
- Import flow: upload → parse → **preview table with counts and the skip/uncategorised
  summary** → confirm → write. Never write on upload.

### 5e. Budget start date — history is imported but does not count

The user's budget begins **1 September 2026**. The full-year historical export is imported
anyway, because it does three jobs the budget itself doesn't: it is the fixture the parser is
built against, it is the corpus from which the merchant→category rules are written, and it
makes the month-over-month and "vs historical average" comparisons real from day one instead
of dead until November.

To keep it out of the live budget, add a config key:

| key | value |
|---|---|
| `budget.start_date` | `2026-09-01` |

**Rule: every budget-facing query filters `transactions.date >= budget.start_date`.** That
means the spending card, the pace math, all budget-line bars, tier subtotals, and the
uncategorised review count. Historical rows are invisible to all of them.

**The two deliberate exceptions**, which read the full table and must say so in the UI:

- the month-over-month trend line on the spending card — label it plainly
  (`"vs Aug (pre-budget): CHF X under"`) so a pre-start month is never mistaken for a
  tracked one;
- the trends/history view under Spending, which should draw a visible marker at the start date
  separating "before tracking" from "budgeted."

Put the filter in **one** shared query helper in `src/lib/money/` that every budget query calls.
Do not scatter `WHERE date >= ...` across route handlers — that is exactly how a stray
historical row ends up in September's total.

Categorising a year of transactions is a one-off chore worth doing properly: work the
uncategorised queue in descending merchant frequency so each rule written retires the largest
possible block of rows.

---

## 6. Spending card & budget view

### The card (on `/personal`)

Uses the existing `Card` grammar. Headline is **variable spend only** — the money the user
actually decides about; rent landing on day 1 would make pace math meaningless.

```
Spending                                   ← label, personal accent
CHF X / Y                                  ← value; variable tier only
N% · day D · on pace · all-in A / B   ← context line
```

Pace: `expected = budget × (dayOfMonth / daysInMonth)`. State is `under` / `on pace`
(within ±5%) / `over`. Only `over` gets a warm color (`warn`, or `danger` past 100%) — per the
palette rule, if everything is colored nothing signals.

Add a second muted line for the month-over-month trend the user asked for:
`"vs July: CHF X under · 3rd month under budget"`. Compute from `transactions`; if there is
no prior month of data, omit the line rather than showing a zero.

### The budget section (below the card)

Adapted from YNAB's category-row pattern — one row per budget line, grouped by tier, each with
a single horizontal bar. YNAB encodes spent-vs-remaining as solid + striped; **use a filled
portion on a track instead** — striping is too busy for this design system.

```
Food & drink        ████████████░░░░░░░░  CHF X / Y          ·  |  ← pace tick
Additional expenses ██████████████████░░  CHF X / Y
Buffer / cushion    ░░░░░░░░░░░░░░░░░░░░  CHF   0 / Y
```

- Track = `bg-raised`; fill = `personal`; **a small tick on the track marks where you should
  be by today** (the pace marker). That tick is what makes the bar readable at a glance —
  it answers "am I ahead or behind" without any text.
- Over budget → fill turns `warn`, past 100% `danger`, and the bar clamps at full width with
  the overflow shown as text (`CHF X / Y · Z over`). Never draw a bar past its track.
- Fixed-tier rows show paid/unpaid rather than a pace bar — they are committed, not paced.
- Annual-tier rows show `spent this year / annual amount` plus the smoothed monthly figure.
- Tier subtotals render as a slightly heavier row. Grand total at the bottom.
- Every line is editable inline (amount, active) — the user explicitly wants to update this
  easily. Editing writes to `budget_lines`, not to a month override, unless the user picks
  "just this month."

---

## 7. The rest of the page

Build these to the existing spec in `docs/03-pages/personal.md`; nothing was re-decided.

- **Tasks — due this week.** `tasks` where `domain='personal'`, inline add. Reuse the Stage 1
  `ThisWeek` patterns rather than writing a parallel implementation.
- **Notes.** `notes` where `domain='personal'`, kind `note`, with a reviewed flag and a
  "to review · Sunday" caption. Simple table, inline add, click to toggle reviewed.
  Seeds: "Try a new running route", "Bill-split app idea", "Gift idea for a friend".
- **Bills.** `bills` + `bill_payments`. Paid checkbox per current month; unpaid past `due_day`
  gets the `warn` accent, `danger` if the month has rolled over. Seed from the fixed budget
  lines that are genuinely bills: Health insurance (day 1), Phone (day 1), Rent (day 1),
  ZVV (day 1) — confirm days with the user.
- **German.** Small card reading `briefs` where `kind='german_word'`. There will be no rows
  until Stage 5 — render the empty state ("no word yet · briefs start in Stage 5"), not a
  crash and not fake data.
- **Calendar.** The ICS module does not exist until Stage 3. Reuse the Stage 1
  `CalendarStub` with the personal accent. Do **not** build ICS fetching this stage.

### Page layout

Follow the design system's page anatomy: breadcrumb `LifeOS / Personal`, then a narrow left
rail (~20%) of stacked cards — Quick Actions (New Task / Log Metric / Add Transaction /
New Note), Navigation, Notes-to-review count — and a wide main column (~80%) of banner+caption
sections in this order:

1. **Habits** / *today · resets at midnight*
2. **Health** / *manual & CSV · trends →*  (the four cards in a row, each with a sparkline)
3. **Spending** / *current month · UBS import*  (card + budget rows)
4. **Tasks** / *due this week*
5. **Bills** / *this month*
6. **Notes** / *to review · Sunday*
7. **Calendar** / *blocked-off time · lives in Google Calendar*  (full width, stub)

---

## 8. Definition of done

The stage is finished when the user can run `npm run dev` and:

- [ ] Check off today's habits and see the 7-day strip update.
- [ ] Log a health metric manually and watch the matching card and its sparkline change.
- [ ] Import a health CSV via a named mapping and see the rows land.
- [ ] Open `/personal/health`, switch the range to 30d, hover one chart and see the crosshair
      track across all of them, then open the scatter and get an *r* value.
- [ ] Import a real UBS CSV: preview shows counts, dedupe skips a re-import of the same file,
      uncategorised rows queue for review, and one click creates a lasting merchant rule.
- [ ] Confirm the year of imported history is invisible to the spending card and every budget
      bar (they read only from `budget.start_date` forward), while the history chart still
      shows it with a start-date marker.
- [ ] Add a transaction manually and watch the spending card's pace math and the budget bars
      move.
- [ ] Edit a budget line's amount inline and see every derived total recompute.
- [ ] Tick a bill paid; leave one unpaid past its due day and see the urgency accent.
- [ ] Add and review a note.

Then: update `docs/03-pages/personal.md` and `docs/04-roadmap.md`,
move the decisions in §9 into `docs/05-decisions.md`, and commit.

---

## 9. Decisions ledger entries (move these into `docs/05-decisions.md`)

Append to SETTLED:

| # | Decision | Rationale |
|---|---|---|
| 17 | **Health: manual + CSV only in Stage 2; no device integration.** All writes go through `ingestMetrics(rows, source)`; a metric registry in `src/lib/health/metrics.ts` is the only place metric names live. (2026-08-16, closes OPEN B) | Garmin's Health API is entity-only and rejects personal applications; the unofficial path broke in March 2026 when `garth` was deprecated. Oura ships an official personal token and drops in later. Quarantine the fragility behind one function. |
| 18 | **Charts: Recharts on the trends page, hand-rolled SVG for in-card sparklines, shared tokens in `src/components/charts/tokens.ts`.** (2026-08-16) | Sparklines need no axes and benefit from pixel-perfect palette control; dual-axis-free correlation views need real tooling. Shared tokens prevent visual drift. |
| 19 | **No dual-axis charts, ever.** Correlation is shown as linked single-series small multiples plus a scatter with Pearson *r* — never two y-scales on one plot. (2026-08-16) | Two arbitrary scales invent a correlation the data doesn't contain. Single-series charts also sidestep the fact that the domain accents fail the dark-mode categorical lightness band (L 0.71–0.76 vs the 0.48–0.67 band). |
| 20 | **Budget is three-tier: `budget_lines(name, tier, amount_chf, carryover)` + `category_map` for leaf→parent rollup; `budgets` is reinterpreted as month-specific overrides.** Seeded from a three-tier budget. (2026-08-16) | Fixed/variable/annual behave differently; the Additional expenses envelope accumulates; UBS supplies leaf categories while the budget is stated at parent level. A flat month/category/amount table expresses none of it. |
| 21 | **Spending card: variable-tier headline with pace math, all-in as the muted context line, plus a month-over-month trend.** Budget rows use a filled track with a pace tick, not YNAB's striped fill. (2026-08-16) | Pace against all-in is meaningless when rent lands on day 1. The pace tick answers "ahead or behind" with no text; striping is too busy for this design system. |
| 22 | **Bank CSV: one parser file per bank behind a `BankParser` interface; merchant→category rules and CSV mappings live in `config` as JSON; dedupe on `date\|amount\|merchant`.** LLM categorisation stays in Stage 6. (2026-08-16, partially closes OPEN F) | Adding a bank should be a file, not a refactor. Rules-in-config means the user retrains it without a code change. Overlapping exports must never double-count. |
| 23 | **`budget.start_date` = 2026-09-01. Historical transactions are imported but excluded from every budget-facing query via one shared helper; only the labelled MoM trend and the history chart read past it.** (2026-08-16) | The year of history is the parser fixture, the categorisation-rule corpus, and the only way comparisons work in month one — but the budget starts in September and pre-budget spend must never land in its totals. |

Amend OPEN:

- **B** — closed by #17. Reopen when the Oura ring arrives (official v2 API + personal access
  token; roughly a day's work behind `ingestMetrics`).
- **F** — narrowed by #22 to "write the UBS parser against a real export"; the architecture is
  settled.

---

## 10. Guardrails

Things that will look tempting mid-session and are **out of scope**. Flag to `BACKLOG.md`
and move on:

- Streak counts, heatmaps, habit analytics.
- Any Garmin / Oura / Apple Health code.
- LLM categorisation of transactions, spending anomaly detection, budget "insights."
- ICS fetching or a real calendar (Stage 3).
- Food database lookups or barcode scanning.
- Multi-currency. Everything is CHF.
- A light theme.
- Recurring-transaction detection, forecasting, net worth, or account balances.

The named risk on this project is overbuilding. The Personal page is the one the user opens
every day — the win is that habits, health and spending are *fast, honest, and easy to edit*,
not that they are clever.
