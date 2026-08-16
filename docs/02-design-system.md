# 02 — Design system

Distilled from the Notion build the user iterated on and liked. The goal is *that* feel —
minimal, dark, professional — rendered better than Notion could. These tokens
and patterns constrain every UI change.

## Mood

Dark theme, calm, uncluttered. Information-dense but never busy. No purple-gradient AI-slop,
no glassmorphism, no decorative illustrations. The reference aesthetic is "clean Notion
dashboard, dark mode" — flat surfaces, subtle borders, restrained color.

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
3. Two-column layout on wide screens: narrow left rail (~20%) of stacked **cards**
   (Quick Actions, Navigation, Reminders, Ideas), wide main column (~80%) of sections.
   Full-width sections below where a module needs the room (calendar, big tables).

## Recurring patterns

- **Command center**: read-only calendar (time) rendered beside an interactive task list
  (work). The user reads free time on one side and picks tasks on the other. Never merge them.
- **Cards**: small stat/brief cards with a title row (icon + label), one big value, one muted
  context line — e.g. "Sleep · 55 / −22 vs 7d avg", "HRV · N ms / above range · low–high",
  "Steps · N / M% of goal", "CHF X / Y · N% · day D · on pace". This exact card
  grammar comes from the user's Personal page; reuse it for health, budget, and briefs.
- **Tags/pills** for enum values (domain, type, status, schedule day) using the palette rules.
- **Tables**: minimal chrome, sortable where it matters, empty states with a one-line hint
  rather than blank space.
- **View tabs** on data sections (e.g. All / To Do / Upcoming / Overdue / By course /
  Completed on assignments; All / Midterms / Final on exams; own-domain / All domains on
  calendars) — small pill tabs above the table, one active.
- **Quick Action buttons** in the left rail: New Task / New Assignment / New Exam / New Course
  etc., opening prefilled forms (the page's domain is the default — editable).
- Staleness is honest: anything generated (briefs, synced data) shows generated_at or a
  "stale" badge instead of pretending to be live.

## Typography & spacing

- One clean sans (system stack or a single webfont). Clear hierarchy: page title > section
  banner > card title > body. Generous line-height; sections breathe.
- No more than two font weights per view. Numbers in stat cards may be larger/tabular.

## Don'ts

- No light theme work until asked. No animations beyond subtle hover/transition.
- No emoji noise in chrome (emoji fine inside user content).
- Don't introduce new accent colors; extend within the domain palette.
