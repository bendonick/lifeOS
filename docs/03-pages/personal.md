# Page — Personal (`/personal`, Tobacco)

Habits, money, and everyday life. **Built in Stage 2 (2026-08-16)** to `docs/06-stage2-brief.md`;
**re-laid out 2026-08-18** (decisions #63–#66) and **rebuilt on the Academic shell 2026-10-10
(decision #81)**, when Health left the page. This doc describes what exists.

## Layout

The Academic shell (#78): a 13rem navigation rail (`ui/NavRail`) beside the page; a header of
serif title, the subtitle **habits · schedule · money**, and one `+ Add` menu (`ui/AddMenu`:
Task or appointment `#new-task` · Expense `#new-expense` · Note `#new-note`); then modules on
`Tile frame="quiet"` in need order:

| Row | Modules |
|---|---|
| 1 | **Habits today** (7) · **Bills needing attention** (5) — stacked below `xl` |
| 2 | **Upcoming** (12) — tasks, appointments and the calendar as one module |
| 3 | **Spending** (12) — this month first, history behind a disclosure |
| 4 | **German** (6) · **Notes** (6) — stacked below `md` |

No captions (#67). The rail: LifeOS → `/`; **Personal** (current) with Overview `#overview` ·
Habits `#habits` · Spending `#spending` · Calendar `#upcoming` · Notes `#notes`, the active one
following the scroll; a divider; Academic · Professional; the current month and year at the
foot. Below `lg` it is a bar with a toggle and the page is one column.

**Health is gone from this page** (decision #81): no module, no trends link, no metric entry, no
rail signal, no placeholder. `health_metrics`, `/api/health/*`, `lib/db/health.ts` and the
`/personal/health` trends route are untouched — the route is simply not linked. The Health
insurance bill is a bill and stays.

Every figure a module shows is computed by the function its detail view uses, so a summary and
its detail cannot disagree. No form is open at rest (#64).

## Modules (as built)

1. **Habits today** (`HabitsToday`) — `habits`/`habit_log`, flat list ordered morning → anytime
   → evening. "N of M completed" over a quiet olive track (the completion ring is gone), one 24px
   done box and the name per row at ≥ 48px, hairline separators, no `n/7` beside rows. Optimistic
   toggle with revert-on-failure; the count and track move with it. The trailing 7-dot strips sit
   behind **7-day history**. Today is the app's Zurich day. Habits are seeded in the database;
   there is no editor (BACKLOG).

2. **Bills needing attention** (`BillsAttention`) — `bills`/`bill_payments` for the current
   month (`billsForMonth`). "N unpaid" and **CHF N outstanding** in full, then one row per unpaid
   bill: name · amount · status in words — **Overdue** (amber) once past `due_day`, **Missed last
   month** (red) when the previous tracked month rolled over unpaid, otherwise **Due Thu 1 Oct**.
   A row opens to its due date and the **Mark as paid** box. **Manage bills** is the full list,
   paid included, with every box and `N of M paid`. All paid → "All paid for October." No bill
   editor exists (BACKLOG); the payment, recurrence and budget accounting are unchanged.

3. **Upcoming** (`UpcomingSection`, async) — `weekTasksByDomain('personal')` (open tasks due within
   seven days or overdue, plus every open appointment, #60) and the Personal ICS feed for the
   current week. **Empty**: one strip — "Nothing scheduled this week." with **Task** (the
   `TaskForm`, also reached by `#new-task`) and **Open calendar** (the week grid) on the right,
   both opening beneath at full width (`UpcomingEmpty`). **Populated**: `ThisWeek` — rows with
   a done box, title, Details line, one date/time label, `calendar ↗` on appointments, a `Later`
   divider past the horizon — then the calendar's next events and the grid behind **Open
   calendar** (`CalendarTile openSummary="Open calendar" hideEmpty`). No second calendar module
   at the page's foot.

4. **Spending** (`SpendingSection`) — header: the month, **History →** (lands in the chart's
   panel). Left: `MonthCard` — **CHF N** *Available to spend* (or *Over the variable budget*),
   the filled track with the pace tick, "CHF X spent of CHF Y variable budget", "Overall budget ·
   CHF Z" (all-in: monthly lines + annual/12), the labelled month-over-month line, up to two
   insights; before the start date, the plan's composition instead. Right: `CategoryAverages` —
   **Monthly category averages (historical)** from `budget.baseline`, one hue, one scale. Foot
   (`SpendingDetails`, one row of disclosures, panels beneath at full width): **Budget details**
   (`BudgetTable`, this month's `CategoryBreakdown`, `BudgetProposalPanel`) · **Spending
   history** (`SpendingHistory` without its in-chart label; "Budget starts Tue 1 Sept · months
   before it are history" stated beside it) · **Review N merchants** / Manage transactions
   (`TxnQuickAdd` `#new-expense`, `ImportPanel`, `MerchantsPanel` `#uncategorised`). No
   calculation changed; the window rule (`lib/money/window.ts`) and `paceState` still own their
   figures.

5. **German** (`GermanCard`) — the latest `briefs` kind=`german_word`, taken apart by
   `parseGermanWord()`: word, parenthesised note, translation, one example with its English, the
   rest and `generated …` behind **More context**. An off-shape brief renders through `Markdown`.
   No audio, no next word.

6. **Notes** (`NotesPanel`) — the inbox: "N notes" in the header, **To review** / **All · N**,
   "All caught up." when the queue is empty, hairline rows with reviewed boxes, **Add note**
   (`#new-note`). A lightweight inbox, not a PKM.

## Data touched

`habits`, `habit_log`, `tasks`, `bills`, `bill_payments`, `notes`, `transactions`, `budgets`,
`budget_lines`, `category_map`, `import_batches`, `config`, `briefs` (read), the Personal ICS
feed (read), `data/imports/`. `health_metrics` is no longer read by this page.
