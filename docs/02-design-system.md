# 02 — Design system

Distilled from the Notion build the user iterated on and liked. The goal is *that* feel —
minimal, dark, professional — rendered better than Notion could. These tokens
and patterns constrain every UI change.

## Mood

Dark theme, calm, uncluttered. Information-dense but never busy. No purple-gradient AI-slop,
no decorative illustrations. The reference aesthetic is "clean Notion dashboard, dark mode" —
restrained color, deliberate spacing, nothing random.

**Translucent materials are allowed** (reopened by the user 2026-08-16, decision #24): chrome
that floats over scrolling content — the sticky page header, the left rail — may use
`backdrop-filter` blur over a semi-transparent surface. Rules that come with it: never stack a
light translucent surface on another; bigger surfaces read as thicker (stronger blur); keep it
off dense data rows, where it costs legibility; and always ship the
`prefers-reduced-transparency` / `prefers-contrast` fallbacks (see `globals.css`). Use the
`.material` class so those fallbacks apply.

## Color

- Background: near-black; cards one step lighter; hairline borders.
- **Domain colors are the identity of the system** — used for section banners, tags, calendar
  event tints, and page accents:
  - Academic → green
  - Personal → purple
  - Professional → blue
  - LifeOS/hub → neutral warm gray (the hub is domain-less)
- Warm colors are **reserved for urgency only**: red = exam / overdue / high priority,
  orange = assignment / due-soon. If everything is colored, nothing signals — this rule came
  directly from the Notion tag-palette work.

## Page anatomy (every page follows this)

1. Breadcrumb (LifeOS / <Page>) + page title.
2. **Section banners**: full-width heading strip tinted with the domain color, followed by a
   small muted caption line — e.g. "Exams" / "midterms · finals", "Calendar" / "blocked-off
   time · lives in Google Calendar", "Notes" / "to review · Sunday". This banner+caption pair
   is the strongest visual signature carried over from Notion; keep it.
   The banner takes an optional trailing **link** (`action`) or **stat** (`meta`, e.g. Courses →
   "1 course · 6 credits"). A single headline number belongs there rather than in its own card —
   two stat cards above a short table cost more room than the table itself.
3. Two-column layout on wide screens: narrow left rail (~20%) of stacked **cards**
   (Quick Actions, Navigation, Reminders, Ideas), wide main column (~80%) of sections.
   Full-width sections below where a module needs the room (calendar, big tables).

## Recurring patterns

- **Command center**: read-only calendar (time) and an interactive task list (work) on the same
  page. The user reads free time on one surface and picks tasks on the other. Never merge them
  into a single list. In practice every page built so far **stacks** the two as full-width
  sections rather than placing them in columns — Academic tried a side column and it read as a
  duplicate of the tables above it (decision #28). "Beside" means on the same page, not
  necessarily in the same row.
- **Cards**: small stat/brief cards with a title row (icon + label), one big value, one muted
  context line — e.g. "Sleep · 55 / −22 vs 7d avg", "HRV · N ms / above range · low–high",
  "Steps · N / M% of goal", "CHF X / Y · N% · day D · on pace". This exact card
  grammar comes from the user's Personal page; reuse it for health, budget, and briefs.
- **Tags/pills** for enum values (domain, type, status, schedule day) using the palette rules.
- **Tables**: minimal chrome, sortable where it matters, empty states with a one-line hint
  rather than blank space.
- **View tabs** on data sections (e.g. Open / Upcoming / Overdue / By course / Completed / All
  on assignments; own-domain / All domains on calendars) — small pill tabs above the table, one
  active. A tab names a **state**, never a noun that could read as the name of a list: the
  Academic page once had a "To do" tab beside a "To do" card and showed "nothing open" next to
  "1 open". Lists beside a filtered table say what they carry.
- **Quick Action buttons** in the left rail: New Task / New Assignment / New Exam / New Course
  etc., opening prefilled forms (the page's domain is the default — editable).
- Staleness is honest: anything generated (briefs, synced data) shows generated_at or a
  "stale" badge instead of pretending to be live.

## Typography & spacing

- One clean sans (system stack or a single webfont). Clear hierarchy: page title > section
  banner > card title > body. Generous line-height; sections breathe.
- No more than two font weights per view. Numbers in stat cards may be larger/tabular.

## Craft standards (added 2026-08-16 — decision #24)

These are the non-negotiable mechanics; the aesthetic above is guidance, not law.

- **Focus.** One `:focus-visible` outline defined in `globals.css`. Components must never
  re-suppress it with `outline-none`.
- **Contrast.** `--color-faint` is a *text* tone and must clear 4.5:1 on `--color-surface`;
  decorative hairlines use `--color-border` instead. Re-measure after any token change.
- **Native controls.** `color-scheme: dark` on `:root` — `accent-color` only styles the checked
  state, so without it checkboxes/selects/scrollbars render light.
- **Motion.** Under 300ms, `ease-out` (never `ease-in`), transform/opacity only. Buttons get a
  ~120ms `scale(0.97)` press. `prefers-reduced-motion` is honored globally.
- **Never dim text to signal pending.** Use `aria-busy` plus a hairline; panel-wide opacity
  drops muted text below AA while the user is reading it.
- **Type.** Large numerals take negative tracking and tight leading (`.t-display`); avoid
  inventing new sub-12px sizes — 11px is the floor.
- **State honesty.** Don't render a status that cannot yet be true, and don't color anything
  warm unless it is genuinely urgent.

## Don'ts

- No light theme work until asked.
- No emoji noise in chrome (emoji fine inside user content).
- Don't introduce new accent colors; extend within the domain palette. Domain colors remain the
  identity of the system.
