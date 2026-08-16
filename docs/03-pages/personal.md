# Page — Personal (`/personal`, purple)

Health, habits, money, and everyday life. This page is where device/API exploration happens —
build manual paths first, then wire integrations with the user in the loop.

## Modules

1. **Habits — Today** — `habits`/`habit_log`: today's checklist grouped by time-of-day pill
   (Morning / Anytime / Evening), one-tap done, resets daily by date. Seed habits from the
   user's Notion page: Brush Teeth 2x, Make Bed, Vitamins, Work on German, Workout, Floss.
   Streaks/heatmap are a later nice-to-have — log the data now, visualize later.

2. **Health cards** — the card grammar from the design system, reading `health_metrics`:
   - *Macros left* — kcal + P/C/F remaining vs targets (targets in config)
   - *Sleep* — last score, delta vs 7-day average
   - *HRV* — last value vs personal range (e.g. "N ms · above range · low–high")
   - *Steps* — count, % of 10k
   Stage 2 ships manual quick-entry + CSV import into `health_metrics`; device/API integration
   (Health Auto Export / Whoop / Oura / Garmin — ask what the user wears) is explored in the
   same session and recorded in the decisions ledger. A *Health log & trends* detail view
   (simple charts over time) hangs off the cards.

3. **Tasks — due this week** — `tasks` domain=personal, with inline add.

4. **Notes** — lightweight notes inbox ("to review · Sunday"): text rows with a reviewed flag.
   Seeded examples from Notion: "Try a new running route", "Bill-split app idea",
   "Gift idea for a friend". (Simple table; not a PKM.)

5. **Bills** — `bills` monthly checklist (Subscriptions, Health insurance, Phone, Rent) with a
   paid checkbox per current month; unpaid past due_day gets the urgency accent.

6. **Spending — current month** — card + breakdown over `transactions`/`budgets`:
   "CHF X / Y · N% · day D · on pace · top: eating out CHF Z". Pace = spend rate vs
   day-of-month. Stage 2: manual transaction entry + CSV import stub; intelligence (categories,
   anomalies, insights) is Stage 6.

7. **German** — small card: word of the day from `briefs` (kind=german_word) + a link to
   the Work-on-German habit. Keep tiny; it's a delight feature, not a language platform.

8. **Calendar (command center)** — Personal ICS calendar week view (toggle all) beside the
   personal task list.

## Data touched

`habits`, `habit_log`, `health_metrics`, `tasks`, `bills`, `transactions`, `budgets`,
`briefs` (read), ICS Personal feed, `data/imports/` (CSV ingest).
