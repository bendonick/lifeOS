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

> **Superseded for the four main pages by the editorial theme (decisions #48/#55).** The palette
> below is still what `:root` holds and what the two detail pages render with; everything under
> `.theme-editorial` overrides it. Both are live — read the theme block in `globals.css` before
> changing a colour.

**Editorial theme (shipped, all four main pages).** Grounds: Graphite `#121212` page, Midnight
Blue `#1C2430` tiles, Merlot `#4B1E23` field (page header only). Ink: Bone `#E6E0D6`, with
`muted`/`faint` stepped down from it. Accents are split **by layout, not only by domain**: the
left rail is Olive `#9aa075` on every page, and the main column carries the domain —
Tobacco `#c68a4a` (Personal) · Merlot `#cc7480` (Academic) · blue `#5590cc` (Professional) ·
Olive (hub, which is domain-less). Budget categories get exactly **three** validated slots plus a
neutral remainder — a fourth has failed the ΔE 15 floor on both reference palettes, each time on
the green against the warm yellow-brown.

**Original theme (`:root`, detail pages).**
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
2. **Tiles** (`src/components/ui/Tile.tsx`) — the card shell with the section header inside it:
   icon, serif title, caption, optional trailing `action` link or `meta` stat, and a caller-set
   grid `span`. **`accent` is required, not defaulted** (#59): it defaulted once, and three pages
   silently rendered in a fourth page's colour with nothing failing.

   Tiles replaced `SectionBanner` on the four main pages in the design pass. The banner was the
   signature carried over from Notion, and seven identical ones stacked down a page turned out to
   be the single strongest reason it read as generated — every section at the same volume, so the
   page had no subject. Hierarchy now comes from **tile size**, which needs no decoration to
   express. `SectionBanner` is unchanged and still serves the two detail pages; the description
   below applies there.
   The banner takes an optional trailing **link** (`action`) or **stat** (`meta`, e.g. Courses →
   "1 course · 6 credits"). A single headline number belongs there rather than in its own card —
   two stat cards above a short table cost more room than the table itself.
3. **Rail + bento** on wide screens: a sticky **19rem** left rail of the ways out of the page
   and the day's small state (Go to, Quick add, Reminders/Ideas, and on Personal also Habits and
   German), beside a **twelve-column** grid of tiles with `items-start`. Set spans from the
   content, not from symmetry. The hub has **no rail** — it is the navigation. The week calendar
   sits **outside** the rail grid at full page width: `WeekCalendar` has a 52rem floor and the
   main column beside a 19rem rail is narrower than that (#58).
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

- One clean sans (system stack or a single webfont) for everything functional — tables, labels,
  controls, data. Clear hierarchy: page title > section banner > card title > body. Generous
  line-height; sections breathe.
- **Display type (decision #48, `.theme-warm` only for now):** one high-contrast editorial serif
  (Instrument Serif, self-hosted via `next/font`) for page titles, section names and hero
  numerals — never for tables or controls, which need the sans's tabular figures and its
  legibility at 11px. The `.t-serif` class is the hook. A single serif paired against a
  functional sans is the strongest "authored rather than generated" signal available, and it is
  what the user's own reference is built on.
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
- Don't introduce new accent colors; extend within the domain palette (or, under
  `.theme-editorial`, within its six). Domain colors remain the
  identity of the system.
