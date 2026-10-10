import { scheduleDays } from "@/lib/academic/course";
import { addDays, dayLabel, mondayOf } from "@/lib/dates";
import type { CourseTask } from "@/lib/db/tasks";
import { WEEKDAYS, type Course, type CourseStatus, type Weekday } from "@/lib/types";

/*
 * Pure helpers behind the Academic page's glance surfaces (decisions #74, #78–#80):
 * the course code, the grouped course, the term, the semester map model, the
 * horizon buckets and the due labels. No SQLite — client components import
 * from here too.
 *
 * Every threshold that drives a colour, a label or a count on the page lives in
 * this file, once, and takes `today` as an argument rather than reading the
 * clock, so a test can move the calendar. Three components each implementing
 * "busy" is how a map reads one thing while the panel beside it says another.
 */

/* ---------------------------------------------------------------------------
 * Course code
 * ------------------------------------------------------------------------- */

const STOPWORDS = new Set(["of", "the", "and", "in", "on", "for", "to", "a", "an", "with"]);

/**
 * The short name every Academic surface calls a course by — 'ATAI', not
 * 'Advanced Topics in AI' repeated down five rows. The stored `short_name`
 * wins; the fallback keeps all-caps tokens whole (AI, ML, II) and takes the
 * initials of the rest, capped where it stops being short. The course editor
 * shows the fallback as the field's placeholder, so it is seen before it is
 * overridden.
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

/** 'F26' → 'Autumn semester 2026', 'S27' → 'Spring semester 2027'; anything else as typed. */
export function semesterLabel(code: string | null | undefined): string {
  if (!code) return "";
  const m = code.trim().match(/^([FSfs])(\d{2})$/);
  if (!m) return code;
  return `${m[1].toUpperCase() === "F" ? "Autumn" : "Spring"} semester 20${m[2]}`;
}

/* ---------------------------------------------------------------------------
 * Courses grouped by name
 *
 * A `courses` row holds one weekly slot, so a course that meets twice is two
 * rows (decision #77). The page shows one row per course and keeps every slot
 * editable underneath it. Grouping is by name, which is the only identity the
 * rows share until a slots table exists (BACKLOG).
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

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);
}

/* ---------------------------------------------------------------------------
 * Due labels and the busy-week threshold
 * ------------------------------------------------------------------------- */

/**
 * A week carrying this many open deadlines or more is busy — tinted on the
 * map, named in the Exams panel. A fixed number, the user's call (decision
 * #79): the earlier median-relative rule meant "more than usual for you", which
 * nobody could predict from the page; three is a count you can see.
 */
export const BUSY_WEEK_THRESHOLD = 3;

export function isBusyWeek(count: number): boolean {
  return count >= BUSY_WEEK_THRESHOLD;
}

/** 'Today' / 'Tomorrow' / 'Wed 14 Oct' / 'Thu 1 Oct · overdue', with the time
 *  when the row carries one. One label per row — the countdown column is gone. */
export function dueLabel(due: string, today: string): string {
  const date = due.slice(0, 10);
  const time = due.length > 10 ? ` · ${due.slice(11, 16)}` : "";
  if (date < today) return `${dayLabel(date)}${time} · overdue`;
  if (date === today) return `Today${time}`;
  if (date === addDays(today, 1)) return `Tomorrow${time}`;
  return `${dayLabel(date)}${time}`;
}

/** 'Today' / 'Tomorrow' / 'First in 90 days' for the Exams header. */
export function firstExamLabel(due: string, today: string): string {
  const n = daysBetween(today, due.slice(0, 10));
  if (n < 0) return "Past";
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  return `First in ${n} days`;
}

/* ---------------------------------------------------------------------------
 * The semester map — courses down, weeks across, one mark per dated item
 * ------------------------------------------------------------------------- */

/** Exactly the four legend states (decision #79). Overdue is a status word on an
 *  open mark, not a fifth glyph. */
export type MarkState = "open" | "done" | "today" | "exam";

export interface MapMark {
  id: number;
  state: MarkState;
  title: string;
  course: string | null;
  /** The exact deadline — 'Wed 14 Oct' or 'Fri 8 Jan 2027 · 16:15'. */
  when: string;
  /** 'upcoming' · 'overdue' · 'due today' · 'completed' · 'exam' · 'exam today'. */
  status: string;
  /** Where a click goes — the course page, or the list for unfiled items. */
  href: string;
}

export interface MapWeek {
  monday: string;
  /** Day of month of the Monday — the column header. */
  day: number;
  month: string;
  isNow: boolean;
  /** First column of a month, drawn with a slightly stronger guide. */
  monthStart: boolean;
}

export interface MapRow {
  key: string;
  code: string;
  name: string;
  href: string;
  cells: MapMark[][];
  /** Incomplete assignment/task records on the axis; null when the row has no
   *  assignment records at all (exams only), which renders as an em dash. */
  remaining: number | null;
}

export interface SemesterMapModel {
  weeks: MapWeek[];
  months: { label: string; span: number }[];
  rows: MapRow[];
  /** Courses with no dated assignment or exam on the axis. */
  emptyCourses: { code: string; name: string; href: string }[];
  /** Open deadlines per week — incomplete assignments plus open exams, the set
   *  the marks draw. */
  counts: number[];
  now: number;
  /** Assignment/task records: open and completed, every record in the domain. */
  open: number;
  completed: number;
  /** Open exams. */
  exams: number;
  nextBusy: { monday: string; count: number } | null;
  peak: { monday: string; count: number } | null;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function markOf(t: CourseTask, today: string, course: string | null, href: string): MapMark {
  const date = t.due!.slice(0, 10);
  const when = t.due!.length > 10 ? `${dayLabel(date)} · ${t.due!.slice(11, 16)}` : dayLabel(date);
  const base = { id: t.id, title: t.title, course, when, href };
  // Completion wins over everything, and an exam stays a diamond even on its
  // day — the status text carries "today" instead of the glyph changing.
  if (t.done) return { ...base, state: "done", status: "completed" };
  if (t.type === "exam") return { ...base, state: "exam", status: date === today ? "exam today" : "exam" };
  if (date === today) return { ...base, state: "today", status: "due today" };
  return { ...base, state: "open", status: date < today ? "overdue" : "upcoming" };
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
    return { monday, day: d.getUTCDate(), month: MONTHS[d.getUTCMonth()], isNow: mondayOf(today) === monday, monthStart: false };
  });
  const months: { label: string; span: number }[] = [];
  weeks.forEach((w, i) => {
    const last = months[months.length - 1];
    if (last && last.label === w.month) last.span++;
    else {
      months.push({ label: w.month, span: 1 });
      weeks[i].monthStart = i > 0;
    }
  });

  const weekIndex = (due: string) => Math.floor(daysBetween(start, due.slice(0, 10)) / 7);
  const onAxis = (t: CourseTask): t is CourseTask & { due: string } =>
    !!t.due && weekIndex(t.due) >= 0 && weekIndex(t.due) < weekCount;

  const ownerOf = new Map<number, CourseGroup>();
  for (const g of groups) for (const id of g.ids) ownerOf.set(id, g);

  const buildRow = (key: string, code: string, name: string, href: string, items: CourseTask[]): MapRow => {
    const cells: MapMark[][] = weeks.map(() => []);
    const ordered = [...items].sort((a, b) => a.done - b.done || a.due!.localeCompare(b.due!));
    for (const t of ordered) cells[weekIndex(t.due!)].push(markOf(t, today, key === "none" ? null : code, href));
    const coursework = items.filter((t) => t.type !== "exam");
    const remaining = coursework.length === 0 ? null : coursework.filter((t) => !t.done).length;
    return { key, code, name, href, cells, remaining };
  };

  // Rows rank by their earliest open item, overdue included: the course that is
  // behind leads, which is where its mark should be.
  const earliestOpen = (items: CourseTask[]) =>
    items
      .filter((t) => !t.done && t.due)
      .map((t) => t.due!)
      .sort()[0] ?? "9999";

  const candidates: { next: string; row: MapRow }[] = [];
  const emptyCourses: SemesterMapModel["emptyCourses"] = [];
  for (const g of groups) {
    const items = [...work, ...exams].filter((t) => t.course_id != null && ownerOf.get(t.course_id) === g && onAxis(t));
    const href = `/academic/courses/${g.ids[0]}`;
    if (items.length === 0) {
      emptyCourses.push({ code: g.code, name: g.name, href });
      continue;
    }
    candidates.push({ next: earliestOpen(items), row: buildRow(g.key, g.code, g.name, href, items) });
  }
  // Unfiled items get a row of their own, shown only when there are any.
  const loose = [...work, ...exams].filter((t) => (t.course_id == null || !ownerOf.has(t.course_id)) && onAxis(t));
  if (loose.length > 0) {
    candidates.push({ next: earliestOpen(loose), row: buildRow("none", "Unassigned", "No course set", "#assignments", loose) });
  }
  candidates.sort((a, b) => a.next.localeCompare(b.next));
  const rows = candidates.map((c) => c.row);

  // Weekly deadlines: incomplete assignments plus open exams — the same set the
  // marks draw, so the row can never disagree with the column over it.
  const counts = weeks.map(() => 0);
  for (const t of [...work, ...exams]) if (!t.done && onAxis(t)) counts[weekIndex(t.due)]++;
  const now = weeks.findIndex((w) => w.isNow);
  let nextBusy: SemesterMapModel["nextBusy"] = null;
  for (let i = now + 1; i < counts.length; i++) {
    if (isBusyWeek(counts[i])) {
      nextBusy = { monday: weeks[i].monday, count: counts[i] };
      break;
    }
  }
  const peakCount = Math.max(0, ...counts);
  const peak = peakCount > 0 ? { monday: weeks[counts.indexOf(peakCount)].monday, count: peakCount } : null;

  return {
    weeks,
    months,
    rows,
    emptyCourses,
    counts,
    now,
    open: work.filter((t) => !t.done).length,
    completed: work.filter((t) => t.done).length,
    exams: exams.filter((e) => !e.done).length,
    nextBusy,
    peak,
  };
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
 * Horizon buckets for the Upcoming work list
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
