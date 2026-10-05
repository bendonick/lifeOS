import { scheduleDays } from "@/lib/academic/course";
import { addDays, dayLabel, dueInfo, mondayOf } from "@/lib/dates";
import type { CourseTask } from "@/lib/db/tasks";
import { WEEKDAYS, type Course, type CourseStatus, type Weekday } from "@/lib/types";

/*
 * Pure helpers behind the Academic page's glance surfaces (decision #74): the
 * course code, the grouped course, the term, the semester map and the horizon
 * buckets. No SQLite — client components import from here too.
 *
 * Every threshold that drives a colour or a label on the page lives in this
 * file, once: the heavy-week rule, the exam countdown window, the horizon
 * edges. Three components each implementing "heavy" is how a map reads one
 * thing while the rail beside it says another (the `pace.ts` lesson).
 */

/* ---------------------------------------------------------------------------
 * Course code
 * ------------------------------------------------------------------------- */

const STOPWORDS = new Set(["of", "the", "and", "in", "on", "for", "to", "a", "an", "with"]);

/**
 * The short name every Academic surface calls a course by — 'ATAI', not
 * 'Advanced Topics in AI' repeated down five rows. The stored `short_name`
 * wins; the fallback keeps all-caps tokens whole (AI, ML, II) and takes the
 * initials of the rest, capped where it stops being short. The fallback is a
 * default, not an opinion: the course editor shows it as the placeholder so
 * the user can see what they would get before overriding it.
 */
export function courseCode(course: Pick<Course, "name" | "short_name">): string {
  const set = course.short_name?.trim();
  if (set) return set;
  const words = course.name
    .split(/[^A-Za-z0-9]+/)
    .filter((w) => w && !STOPWORDS.has(w.toLowerCase()));
  const code = words.map((w) => (/^[A-Z0-9]{2,4}$/.test(w) ? w : w[0].toUpperCase())).join("");
  return code.slice(0, 6) || course.name.slice(0, 6);
}

/* ---------------------------------------------------------------------------
 * Courses grouped by name
 *
 * A `courses` row holds one weekly slot, so a course that meets twice is two
 * rows (decision #77). The page shows one card and one map row per course and
 * keeps every slot editable underneath it. Grouping is by name, which is the
 * only identity the rows share until a slots table exists (BACKLOG).
 * ------------------------------------------------------------------------- */

export interface CourseGroup {
  key: string;
  name: string;
  code: string;
  /** Every row carrying this course, in the store's order (by start hour). */
  slots: Course[];
  ids: number[];
  days: Weekday[];
  credits: number | null;
  status: CourseStatus;
  semester: string | null;
  url: string | null;
  /** Contact hours per week across the slots. */
  hoursPerWeek: number;
}

export function groupCourses(courses: Course[]): CourseGroup[] {
  const groups = new Map<string, CourseGroup>();
  for (const c of courses) {
    const key = c.name.trim().toLowerCase();
    let g = groups.get(key);
    if (!g) {
      g = {
        key,
        name: c.name,
        code: "",
        slots: [],
        ids: [],
        days: [],
        credits: c.credits,
        status: c.status,
        semester: c.semester,
        url: c.url,
        hoursPerWeek: 0,
      };
      groups.set(key, g);
    }
    g.slots.push(c);
    g.ids.push(c.id);
    if (g.credits == null && c.credits != null) g.credits = c.credits;
    if (!g.url && c.url) g.url = c.url;
    if (!g.semester && c.semester) g.semester = c.semester;
    if (c.start_hour != null && c.end_hour != null && c.end_hour > c.start_hour) {
      g.hoursPerWeek += c.end_hour - c.start_hour;
    }
  }
  for (const g of groups.values()) {
    const days = new Set(g.slots.flatMap(scheduleDays));
    g.days = WEEKDAYS.filter((d) => days.has(d));
    g.code = courseCode({ name: g.name, short_name: g.slots.find((s) => s.short_name)?.short_name ?? null });
  }
  return [...groups.values()];
}

/** Credits summed once per course, not once per slot — two rows of one 6-credit
 *  course are 6 credits, which is what the header's total must say. */
export function totalCredits(groups: CourseGroup[]): number {
  return groups.reduce((sum, g) => sum + (g.credits ?? 0), 0);
}

export function weeklyHours(groups: CourseGroup[]): number {
  return groups.reduce((sum, g) => sum + g.hoursPerWeek, 0);
}

/** '17.25' / '4' — a number of hours without a trailing '.00'. */
export function hoursLabel(hours: number): string {
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(2).replace(/0+$/, "");
}

/* ---------------------------------------------------------------------------
 * The term
 * ------------------------------------------------------------------------- */

export interface Term {
  /** Earliest `term_start` among enrolled courses. */
  start: string;
  /** Latest `term_end` among enrolled courses — whatever the user entered,
   *  which may be the exam date rather than the last lecture. */
  end: string;
  /** Whole weeks from start to end, rounded up. */
  weeks: number;
}

export function termOf(groups: CourseGroup[]): Term | null {
  const slots = groups.filter((g) => g.status === "enrolled").flatMap((g) => g.slots);
  const starts = slots.map((s) => s.term_start).filter((d): d is string => !!d).sort();
  if (starts.length === 0) return null;
  const ends = slots.map((s) => s.term_end).filter((d): d is string => !!d).sort();
  const start = starts[0];
  // A term with no end entered is drawn at the Swiss fourteen teaching weeks,
  // which is a default to replace, not a fact about the courses.
  const end = ends.length > 0 ? ends[ends.length - 1] : addDays(start, 14 * 7 - 1);
  const weeks = Math.max(1, Math.ceil(daysBetween(start, end) / 7));
  return { start, end, weeks };
}

/** 1-based week of the term that `today` falls in, clamped to the term. */
export function weekOfTerm(term: Term, today: string): number {
  const n = Math.floor(daysBetween(mondayOf(term.start), today) / 7) + 1;
  return Math.min(Math.max(n, 1), term.weeks);
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);
}

/* ---------------------------------------------------------------------------
 * The semester map — courses down, weeks across, one mark per dated item
 * ------------------------------------------------------------------------- */

export type MarkState = "open" | "done" | "overdue" | "soon" | "exam";
const MARK_ORDER: MarkState[] = ["open", "done", "overdue", "soon", "exam"];

export interface MapMark {
  state: MarkState;
  /** Tooltip and accessible-name text: title, date, state. */
  label: string;
}

export interface MapWeek {
  monday: string;
  /** Day of month of the Monday — the column header. */
  day: number;
  month: string;
  isNow: boolean;
}

export interface MapRow {
  key: string;
  code: string;
  name: string;
  /** Where a cell leads — the course page, or the list for unfiled items. */
  href: string;
  cells: MapMark[][];
  /** '5 left' until something is done, then '2 of 7'; null when the row is exams only. */
  left: string | null;
}

export interface SemesterMapModel {
  weeks: MapWeek[];
  months: { label: string; span: number }[];
  rows: MapRow[];
  /** Codes of courses with nothing dated — named in a footnote, not drawn as empty rows. */
  empty: string[];
  /** Open items due per week, exams included — the same set the marks draw. */
  counts: number[];
  /** A week at or above this count is heavy. */
  threshold: number;
  /** Index of the heaviest week, or -1. */
  peak: number;
  /** Index of the current week, or -1 when today is off the axis. */
  now: number;
  /** The mark states actually present, for a legend that lists only what is drawn. */
  states: MarkState[];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Heavy = above the user's own median non-empty week. An absolute "three or
 * more" would call every week heavy for one student and none for another;
 * relative to the term's own rhythm, the flag means "more than usual for you".
 */
export function heavyThreshold(counts: number[]): number {
  const nonEmpty = counts.filter((n) => n > 0).sort((a, b) => a - b);
  if (nonEmpty.length === 0) return Infinity;
  return nonEmpty[Math.floor(nonEmpty.length / 2)] + 1;
}

function markOf(t: CourseTask): MapMark {
  const date = t.due!.slice(0, 10);
  const when = t.due!.length > 10 ? `${dayLabel(date)} ${t.due!.slice(11, 16)}` : dayLabel(date);
  if (t.done) return { state: "done", label: `${t.title} · ${when} · done` };
  if (t.type === "exam") return { state: "exam", label: `${t.title} · ${when}` };
  // `dueInfo` owns the urgency thresholds; the map only maps them to a glyph.
  const urgency = dueInfo(t.due!).urgency;
  const state: MarkState = urgency === "overdue" ? "overdue" : urgency === "none" ? "open" : "soon";
  return { state, label: `${t.title} · ${when}${state === "overdue" ? " · overdue" : ""}` };
}

export function semesterMap(
  groups: CourseGroup[],
  work: CourseTask[],
  exams: CourseTask[],
  today: string,
  term: Term | null
): SemesterMapModel | null {
  if (!term) return null;
  const start = mondayOf(term.start);
  const dated = [...work, ...exams].filter((t): t is CourseTask & { due: string } => !!t.due);
  const lastDue = dated.map((t) => t.due.slice(0, 10)).sort().at(-1);
  const end = lastDue && lastDue > term.end ? lastDue : term.end;
  const weekCount = Math.floor(daysBetween(start, end) / 7) + 1;

  const weeks: MapWeek[] = Array.from({ length: weekCount }, (_, i) => {
    const monday = addDays(start, i * 7);
    const d = new Date(`${monday}T12:00:00Z`);
    return { monday, day: d.getUTCDate(), month: MONTHS[d.getUTCMonth()], isNow: mondayOf(today) === monday };
  });
  const months: { label: string; span: number }[] = [];
  for (const w of weeks) {
    const last = months[months.length - 1];
    if (last && last.label === w.month) last.span++;
    else months.push({ label: w.month, span: 1 });
  }

  const weekIndex = (due: string) => Math.floor(daysBetween(start, due.slice(0, 10)) / 7);
  const onAxis = (t: CourseTask): t is CourseTask & { due: string } =>
    !!t.due && weekIndex(t.due) >= 0 && weekIndex(t.due) < weekCount;

  const buildRow = (key: string, code: string, name: string, href: string, items: CourseTask[]): MapRow => {
    const cells: MapMark[][] = weeks.map(() => []);
    const ordered = [...items].sort((a, b) => a.done - b.done || a.due!.localeCompare(b.due!));
    for (const t of ordered) cells[weekIndex(t.due!)].push(markOf(t));
    const coursework = items.filter((t) => t.type !== "exam");
    const done = coursework.filter((t) => t.done).length;
    const left =
      coursework.length === 0 ? null : done === 0 ? `${coursework.length} left` : `${done} of ${coursework.length}`;
    return { key, code, name, href, cells, left };
  };

  // Rows rank by their earliest open item, overdue included: the course that is
  // already behind leads, which is where its red mark should be.
  const nextDue = (items: CourseTask[]) =>
    items
      .filter((t) => !t.done && t.due)
      .map((t) => t.due!)
      .sort()[0] ?? "9999";

  const ownerOf = new Map<number, CourseGroup>();
  for (const g of groups) for (const id of g.ids) ownerOf.set(id, g);

  const candidates: { next: string; row: MapRow }[] = [];
  const empty: string[] = [];
  for (const g of groups) {
    const items = [...work, ...exams].filter((t) => t.course_id != null && ownerOf.get(t.course_id) === g && onAxis(t));
    if (items.length === 0) {
      empty.push(g.code);
      continue;
    }
    candidates.push({
      next: nextDue(items),
      row: buildRow(g.key, g.code, g.name, `/academic/courses/${g.ids[0]}`, items),
    });
  }
  // Unfiled items get a row of their own — a nudge to file them, and the only
  // place on the map they could honestly appear.
  const loose = [...work, ...exams].filter((t) => (t.course_id == null || !ownerOf.has(t.course_id)) && onAxis(t));
  if (loose.length > 0) {
    candidates.push({ next: nextDue(loose), row: buildRow("none", "no course", "No course set", "#assignments", loose) });
  }
  candidates.sort((a, b) => a.next.localeCompare(b.next));
  const rows = candidates.map((c) => c.row);

  const counts = weeks.map(() => 0);
  for (const t of [...work, ...exams]) if (!t.done && onAxis(t)) counts[weekIndex(t.due)]++;
  const threshold = heavyThreshold(counts);
  const peakCount = Math.max(0, ...counts);
  const peak = peakCount > 0 ? counts.indexOf(peakCount) : -1;

  const present = new Set(rows.flatMap((r) => r.cells.flat().map((m) => m.state)));
  const states = MARK_ORDER.filter((s) => present.has(s));

  return { weeks, months, rows, empty, counts, threshold, peak, now: weeks.findIndex((w) => w.isNow), states };
}

/** The first heavy week after the current one, for the rail. */
export function nextHeavyWeek(model: SemesterMapModel): { monday: string; count: number } | null {
  for (let i = model.now + 1; i < model.counts.length; i++) {
    if (model.counts[i] >= model.threshold) return { monday: model.weeks[i].monday, count: model.counts[i] };
  }
  return null;
}

/** '19–25 Oct', or '28 Sep – 4 Oct' when the week straddles a month. */
export function weekRangeLabel(monday: string): string {
  const sunday = addDays(monday, 6);
  const fmt = (date: string, opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-GB", { ...opts, timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
  const sameMonth = monday.slice(0, 7) === sunday.slice(0, 7);
  return sameMonth
    ? `${fmt(monday, { day: "numeric" })}–${fmt(sunday, { day: "numeric", month: "short" })}`
    : `${fmt(monday, { day: "numeric", month: "short" })} – ${fmt(sunday, { day: "numeric", month: "short" })}`;
}

/* ---------------------------------------------------------------------------
 * Horizon buckets for the assignments list
 * ------------------------------------------------------------------------- */

export type Horizon = "overdue" | "today" | "week" | "next" | "later" | "undated";

/** Display order. "Later" is collapsed by default; "No date" sits last because an
 *  undated item has no horizon to be sorted into. */
export const HORIZONS: Horizon[] = ["overdue", "today", "week", "next", "later", "undated"];

export const HORIZON_LABEL: Record<Horizon, string> = {
  overdue: "Overdue",
  today: "Today",
  week: "This week",
  next: "Next week",
  later: "Later",
  undated: "No date",
};

/** Weeks run Monday to Sunday, so "this week" is the rest of the current one,
 *  not the next seven days — a Sunday deadline seen on Friday is this week. */
export function horizonOf(due: string | null, today: string): Horizon {
  if (!due) return "undated";
  const date = due.slice(0, 10);
  if (date < today) return "overdue";
  if (date === today) return "today";
  const sunday = addDays(mondayOf(today), 6);
  if (date <= sunday) return "week";
  if (date <= addDays(sunday, 7)) return "next";
  return "later";
}

/**
 * How close an exam must be before its day count is shown. Day-metric framing
 * makes a deadline feel connected to now inside about a month; "100d" on four
 * rows all autumn is a number nobody reads.
 */
export const EXAM_COUNTDOWN_DAYS = 30;
