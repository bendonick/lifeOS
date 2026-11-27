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

/**
 * The timetable's name for an event: the course code, then whatever the
 * title says beyond the course ('FoC II · mock exam'). Google titles name a
 * course in several ways ("ML for Natural language Processing", "ML for NLP",
 * "The Effects of AI on Individuals and Soc"); this reads all of them as one.
 *
 * A title matches a course when it starts with the course's name, when it is
 * the start of the name cut off after at least MIN_PREFIX characters, or when
 * it holds the course's code as a whole word (then the code and everything
 * before it are the course part). Case is ignored for names, not for codes,
 * so a code like "Effects" or "Seminar" only matches as written. A title that
 * matches no course is returned unchanged.
 */
export function courseTitle(title: string, courses: CourseName[]): string {
  const t = title.trim();
  const lower = t.toLowerCase();
  // Longest name first, so "Foundations of Computing II" wins over a course
  // whose name is a prefix of it.
  const byName = [...courses].sort((a, b) => b.name.length - a.name.length);

  for (const c of byName) {
    const name = c.name.trim().toLowerCase();
    if (name && lower.startsWith(name)) return withRest(c.code, t.slice(name.length));
  }
  for (const c of byName) {
    const name = c.name.trim().toLowerCase();
    if (lower.length >= MIN_PREFIX && name.startsWith(lower)) return c.code;
  }
  for (const c of byName) {
    const code = c.code.trim();
    if (!code) continue;
    const m = new RegExp(`(^|[^A-Za-z0-9])${escape(code)}(?![A-Za-z0-9])`).exec(t);
    if (m) return withRest(c.code, t.slice(m.index + m[0].length));
  }
  return t;
}

function withRest(code: string, rest: string): string {
  const r = rest.replace(LEAD, "").trim();
  return r ? `${code} · ${r}` : code;
}

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
