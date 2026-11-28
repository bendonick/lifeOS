// Client-safe: no env, no node, no SQLite. The Academic page builds the list
// from the courses table and hands it to the week grid.

/** A course as the timetable needs it: its full name and the code every
 *  Academic surface calls it by (`courseCode`). */
export interface CourseName {
  name: string;
  code: string;
}

/** Leading separators left once the course part of a title is cut off. */
const LEAD = /^[\s:;,.\-–—·|/]+/;

/** A cut-off title still names its course when this many characters agree. */
const MIN_PREFIX = 12;

/** Which course a title names, and what the title says beyond the course. */
export interface CourseMatch {
  code: string;
  /** The rest of the title with leading separators trimmed; "" when none. */
  rest: string;
}

/**
 * The course a calendar title names. Google titles name a course in several
 * ways ("ML for Natural language Processing", "ML for NLP", "The Effects of AI
 * on Individuals and Soc"); this reads all of them as one.
 *
 * A title matches a course when it starts with the course's name, when it is
 * the start of the name cut off after at least MIN_PREFIX characters, or when
 * it holds the course's code as a whole word (then the code and everything
 * before it are the course part). Case is ignored for names, not for codes,
 * so a code like "Effects" or "Seminar" only matches as written. A title that
 * matches no course gives null.
 */
export function matchCourse(title: string, courses: CourseName[]): CourseMatch | null {
  const t = title.trim();
  const lower = t.toLowerCase();
  // Longest name first, so "Foundations of Computing II" wins over a course
  // whose name is a prefix of it.
  const byName = [...courses].sort((a, b) => b.name.length - a.name.length);

  for (const c of byName) {
    const name = c.name.trim().toLowerCase();
    if (name && lower.startsWith(name)) return { code: c.code, rest: trimLead(t.slice(name.length)) };
  }
  for (const c of byName) {
    const name = c.name.trim().toLowerCase();
    if (lower.length >= MIN_PREFIX && name.startsWith(lower)) return { code: c.code, rest: "" };
  }
  for (const c of byName) {
    const code = c.code.trim();
    if (!code) continue;
    const m = new RegExp(`(^|[^A-Za-z0-9])${escape(code)}(?![A-Za-z0-9])`).exec(t);
    if (m) return { code: c.code, rest: trimLead(t.slice(m.index + m[0].length)) };
  }
  return null;
}

/**
 * The timetable's name for an event: the course code, then whatever the
 * title says beyond the course ('FoC II · mock exam'). A title that matches
 * no course (see `matchCourse`) is returned unchanged.
 */
export function courseTitle(title: string, courses: CourseName[]): string {
  const m = matchCourse(title, courses);
  if (!m) return title.trim();
  return m.rest ? `${m.code} · ${m.rest}` : m.code;
}

function trimLead(rest: string): string {
  return rest.replace(LEAD, "").trim();
}

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
