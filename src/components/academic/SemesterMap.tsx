"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import { Disclosure } from "@/components/ui/Disclosure";
import { isBusyWeek, type MapMark, type MarkState, type SemesterMapModel } from "@/lib/academic/semester";
import { dayLabel } from "@/lib/dates";

/**
 * The Academic page's hero (decisions #74, #79): courses down, the term's weeks
 * across, one mark per dated item. Position on a shared time axis answers
 * "when does the term get heavy" and "which course owns the load" without
 * reading a row.
 *
 * Exactly four glyphs: hollow rose circle = upcoming assignment, filled grey =
 * completed, filled amber = due today, hollow rose diamond = exam. Overdue is a
 * status word on an open mark, not a fifth glyph. Every mark is a 24px link to
 * the course page with its full description as its name; hovering or focusing
 * one writes that description into the line under the grid, so keyboard and
 * touch see what a mouse sees.
 *
 * The grid is quiet and the marks are loud: weekly guides at a third of the
 * hairline tone, month boundaries a little stronger, the current week a
 * neutral band. "Remaining" is incomplete assignment records per course — an
 * em dash for a course with none, 0 when everything is done. "Weekly deadlines"
 * counts incomplete assignments plus open exams, blank when zero, tinted from
 * `BUSY_WEEK_THRESHOLD` up.
 */

const GLYPH: Record<MarkState, string> = {
  open: "h-3 w-3 rounded-full border-[1.5px] border-academic",
  done: "h-3 w-3 rounded-full bg-faint/70",
  today: "h-3 w-3 rounded-full bg-warn",
  exam: "h-[11px] w-[11px] rotate-45 rounded-[1px] border-[1.5px] border-academic",
};

const LEGEND: { state: MarkState; label: string }[] = [
  { state: "open", label: "Upcoming assignment" },
  { state: "done", label: "Completed assignment" },
  { state: "today", label: "Today" },
  { state: "exam", label: "Exam" },
];

/** A cell shows this many marks before folding the rest behind a "+N" link. */
const MAX_MARKS = 4;

const describe = (m: MapMark) => [m.title, m.course, m.when, m.status].filter(Boolean).join(" · ");

export function SemesterMap({ model }: { model: SemesterMapModel }) {
  const [detail, setDetail] = useState<MapMark | null>(null);
  const columns = `9rem repeat(${model.weeks.length}, minmax(2.5rem, 1fr)) 5rem`;
  const guide = (i: number) =>
    `border-l ${model.weeks[i].monthStart ? "border-border/80" : "border-border/35"}`;
  const band = (i: number) => (i === model.now ? " map-now" : "");
  const empty = model.emptyCourses.length;

  return (
    <div>
      <div className="overflow-x-auto">
        <div className="grid min-w-[46rem] items-stretch" style={{ gridTemplateColumns: columns }}>
          {/* Months, spanning their weeks. */}
          <div />
          {model.months.map((m, i) => (
            <div
              key={`${m.label}-${i}`}
              className={`pb-1 pl-1.5 text-xs text-muted ${i === 0 ? "" : "border-l border-border/80"}`}
              style={{ gridColumn: `span ${m.span}` }}
            >
              {m.label}
            </div>
          ))}
          <div />

          {/* Week starts; "This week" sits above its own numeral. */}
          <div className="flex items-end pb-1.5 text-xs text-muted">Week of</div>
          {model.weeks.map((w, i) => (
            <div
              key={w.monday}
              title={`week of ${dayLabel(w.monday)}`}
              className={`flex h-11 flex-col items-center justify-end gap-0.5 pb-1.5 ${guide(i)}${band(i)}`}
            >
              {w.isNow && <span className="text-[11px] leading-none whitespace-nowrap text-muted">This week</span>}
              <span className={`tabular text-xs leading-none ${w.isNow ? "text-text" : "text-faint"}`}>{w.day}</span>
            </div>
          ))}
          <div className="flex items-end justify-end pb-1.5 pr-1 text-xs text-muted">Remaining</div>

          {model.rows.map((row) => (
            <Fragment key={row.key}>
              <div
                title={row.name}
                className={`flex items-center truncate border-t border-border/40 pr-2 text-sm ${
                  row.key === "none" ? "text-muted" : "font-semibold text-text"
                }`}
              >
                {row.code}
              </div>
              {row.cells.map((marks, i) => {
                const shown = marks.length > MAX_MARKS ? marks.slice(0, MAX_MARKS - 1) : marks;
                const folded = marks.length - shown.length;
                return (
                  <div
                    key={i}
                    className={`flex min-h-11 flex-wrap items-center justify-center gap-0.5 border-t border-border/40 px-0.5 py-1 ${guide(i)}${band(i)}`}
                  >
                    {shown.map((m) => (
                      <Link
                        key={m.id}
                        href={m.href}
                        aria-label={describe(m)}
                        title={describe(m)}
                        onFocus={() => setDetail(m)}
                        onBlur={() => setDetail(null)}
                        onMouseEnter={() => setDetail(m)}
                        onMouseLeave={() => setDetail(null)}
                        className="inline-flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-academic/10"
                      >
                        <span aria-hidden="true" className={`block shrink-0 ${GLYPH[m.state]}`} />
                      </Link>
                    ))}
                    {folded > 0 && (
                      <Link
                        href={row.href}
                        aria-label={`${folded} more in the week of ${dayLabel(model.weeks[i].monday)}`}
                        className="tabular inline-flex h-6 min-w-6 items-center justify-center rounded px-1 text-[11px] text-muted hover:bg-academic/10 hover:text-text"
                      >
                        +{folded}
                      </Link>
                    )}
                  </div>
                );
              })}
              <div className="tabular flex items-center justify-end border-t border-border/40 pr-1 text-sm text-text">
                {row.remaining ?? "—"}
              </div>
            </Fragment>
          ))}

          {/* Weekly deadlines: incomplete assignments plus open exams, the same
              set the marks draw. Blank when zero; tinted when busy. */}
          <div className="flex flex-col justify-center border-t border-border/60 py-2 pr-2">
            <span className="text-xs text-muted">Weekly deadlines</span>
            <span className="text-[11px] leading-tight text-faint">Includes assignments and exams</span>
          </div>
          {model.counts.map((n, i) => {
            const busy = isBusyWeek(n);
            return (
              <div
                key={i}
                title={n ? `${n} due in the week of ${dayLabel(model.weeks[i].monday)}` : undefined}
                className={`flex items-center justify-center border-t border-border/60 py-2 ${guide(i)}${band(i)}`}
              >
                {n > 0 && (
                  <span
                    className={`tabular inline-flex h-7 min-w-7 items-center justify-center rounded px-1.5 text-sm ${
                      busy ? "bg-academic/20 font-medium text-text" : "text-muted"
                    }`}
                  >
                    {n}
                  </span>
                )}
              </div>
            );
          })}
          <div className="border-t border-border/60" />
        </div>
      </div>

      {/* What the pointer or the focus ring is on. */}
      <p aria-live="polite" className="tabular mt-2 min-h-5 text-xs text-muted">
        {detail ? describe(detail) : ""}
      </p>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <ul className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted">
          {LEGEND.map((l) => (
            <li key={l.state} className="inline-flex items-center gap-2">
              <span aria-hidden="true" className={`inline-flex h-4 w-4 items-center justify-center`}>
                <span className={`block ${GLYPH[l.state]}`} />
              </span>
              {l.label}
            </li>
          ))}
        </ul>
        {empty > 0 && (
          <Disclosure summary={`${empty} ${empty === 1 ? "course" : "courses"} without deadlines`} className="ml-auto items-end">
            <ul className="flex flex-col items-end gap-1 text-xs">
              {model.emptyCourses.map((c) => (
                <li key={c.href}>
                  <Link href={c.href} className="rounded text-muted transition-colors hover:text-text">
                    <span className="font-semibold text-text">{c.code}</span> · {c.name} →
                  </Link>
                </li>
              ))}
            </ul>
          </Disclosure>
        )}
      </div>
    </div>
  );
}
