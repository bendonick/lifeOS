"use client";

import Link from "next/link";
import { useState } from "react";
import { Disclosure } from "@/components/ui/Disclosure";
import {
  isBusyWeek,
  weekRangeLabel,
  type MapMark,
  type MarkState,
  type SemesterMapModel,
} from "@/lib/academic/semester";

/**
 * The Academic page's hero (decisions #74, #79, #92): courses down, the term's
 * weeks across, one mark per dated item. Position on a shared time axis answers
 * "when does the term get heavy" and "which course owns the load" without
 * reading a row.
 *
 * Read by calendar date (#92): every column header is that week's Monday–Sunday
 * range — "16–22" under its month, "26 Oct–1 Nov" across months, "28 Dec–3 Jan"
 * across the year — with the full dates and years as its accessible name. A week
 * sits under the month that holds its Monday. The current week is tinted from
 * its header down to its weekly total, and the legend names its range.
 *
 * Three glyphs: a filled slate circle = completed assignment, an outlined navy
 * circle = open assignment, an oxblood diamond = exam. "Due today" and "overdue"
 * are words in the mark's name, not glyphs of their own. Every mark is a 24px
 * link to the course page with its full description as its name; hovering or
 * focusing one writes that description into the line under the table, so
 * keyboard and touch see what a mouse sees.
 *
 * A real <table>: the months are column groups, the weeks column headers, the
 * courses row headers — a screen reader announces "ATAI, 16–22 November 2026"
 * for a cell. The course column is sticky, so it stays in view when the table
 * scrolls sideways on a narrow screen.
 */

const GLYPH: Record<MarkState, string> = {
  open: "h-3 w-3 rounded-full border-[1.5px] border-(--color-ink)",
  // An item due today is an open assignment; the status text says "due today".
  today: "h-3 w-3 rounded-full border-[1.5px] border-(--color-ink)",
  // Slate, darkened one step: at its exact value the mark is 2.78:1 on cream,
  // under the 3:1 a non-text mark needs (decision #76). This is 3.66:1.
  done: "h-3 w-3 rounded-full bg-border-strong",
  exam: "h-2.5 w-2.5 rotate-45 rounded-[1px] bg-danger",
};

const LEGEND: { state: MarkState; label: string }[] = [
  { state: "done", label: "Completed assignment" },
  { state: "open", label: "Open assignment" },
  { state: "exam", label: "Exam" },
];

/** A cell shows this many marks before folding the rest behind a "+N" link. */
const MAX_MARKS = 4;

const describe = (m: MapMark) => [m.title, m.course, m.when, m.status].filter(Boolean).join(" · ");

/** The sticky first column: opaque, so week cells scroll under it. */
const STICKY = "sticky left-0 z-10 bg-bg";

export function SemesterMap({ model }: { model: SemesterMapModel }) {
  const [detail, setDetail] = useState<MapMark | null>(null);
  // Left edge only: a month's first week gets a stronger guide. `border-l-*`,
  // not `border-*`, or the colour would also repaint the row's top rule.
  const guide = (i: number) => `border-l ${model.weeks[i].monthStart ? "border-l-border-strong/60" : "border-l-border/70"}`;
  const band = (i: number) => (i === model.now ? " map-now" : "");
  const empty = model.emptyCourses.length;
  const nowWeek = model.now >= 0 ? model.weeks[model.now] : null;

  return (
    <div>
      {/* Horizontal scrolling stays inside this box; the page never scrolls
          sideways. `relative` matters: the table holds visually-hidden text
          (`sr-only` is position:absolute), and without a positioned ancestor
          those spans escape the scroll box and widen the whole document. */}
      <div className="relative overflow-x-auto" tabIndex={0} role="group" aria-label="Semester map, scrolls sideways on a narrow screen">
        <table className="w-full min-w-[64rem] table-fixed border-separate border-spacing-0 text-sm">
          <caption className="sr-only">
            Semester map: one row per course, one column per Monday-to-Sunday week, a mark for each dated assignment
            and exam.
          </caption>
          <colgroup>
            <col className="w-[7.25rem]" />
            {model.weeks.map((w) => (
              <col key={w.monday} />
            ))}
            <col className="w-[5.25rem]" />
          </colgroup>
          <thead>
            <tr>
              <td className={STICKY} />
              {model.months.map((m, i) => (
                <th
                  key={`${m.label}-${i}`}
                  scope="colgroup"
                  colSpan={m.span}
                  className={`t-serif pb-1.5 text-center text-base text-text ${i === 0 ? "" : "border-l border-l-border-strong/60"}`}
                >
                  {m.label}
                </th>
              ))}
              <td />
            </tr>
            <tr>
              <th scope="col" className={`${STICKY} border-t border-border py-2 pr-2 text-left align-middle text-sm font-normal italic text-muted`}>
                Mon–Sun
              </th>
              {model.weeks.map((w, i) => (
                <th
                  key={w.monday}
                  scope="col"
                  // The visible label is the short range; this is the whole date.
                  aria-label={w.isNow ? `${w.rangeFull}, this week` : w.rangeFull}
                  title={w.rangeFull}
                  aria-current={w.isNow ? "date" : undefined}
                  className={`tabular border-t border-border px-0.5 py-2 text-center align-middle text-[0.8125rem] leading-tight ${guide(i)}${band(i)} ${
                    w.isNow ? "font-bold text-(--color-hub)" : "font-semibold text-text"
                  }`}
                >
                  {/* A boundary week wraps after the dash: "26 Oct–" / "1 Nov". */}
                  {w.range.includes(" ") ? (
                    <>
                      <span className="whitespace-nowrap">{w.range.split("–")[0]}–</span>{" "}
                      <span className="whitespace-nowrap">{w.range.split("–")[1]}</span>
                    </>
                  ) : (
                    <span className="whitespace-nowrap">{w.range}</span>
                  )}
                </th>
              ))}
              <th scope="col" className="border-t border-border py-2 pl-2 text-right align-middle text-sm font-normal italic text-muted">
                Remaining
              </th>
            </tr>
          </thead>

          <tbody>
            {model.rows.map((row) => (
              <tr key={row.key}>
                <th
                  scope="row"
                  title={row.name}
                  className={`${STICKY} truncate border-t border-border py-1 pr-2 text-left align-middle ${
                    row.key === "none" ? "font-normal text-muted" : "font-bold text-text"
                  }`}
                >
                  {row.code}
                </th>
                {row.cells.map((marks, i) => {
                  const shown = marks.length > MAX_MARKS ? marks.slice(0, MAX_MARKS - 1) : marks;
                  const folded = marks.length - shown.length;
                  return (
                    <td key={i} className={`h-9 border-t border-border px-0 py-0.5 text-center align-middle ${guide(i)}${band(i)}`}>
                      <span className="flex flex-wrap items-center justify-center">
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
                            className="inline-flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-(--color-slate)/25"
                          >
                            <span aria-hidden="true" className={`block shrink-0 ${GLYPH[m.state]}`} />
                          </Link>
                        ))}
                        {folded > 0 && (
                          <Link
                            href={row.href}
                            aria-label={`${folded} more in ${model.weeks[i].rangeFull}`}
                            className="tabular inline-flex h-6 min-w-6 items-center justify-center rounded px-1 text-xs text-muted hover:bg-(--color-slate)/25 hover:text-text"
                          >
                            +{folded}
                          </Link>
                        )}
                      </span>
                    </td>
                  );
                })}
                <td className="tabular border-t border-border py-1 pl-2 text-right align-middle text-text">
                  {row.remaining ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>

          {/* The weekly load: incomplete assignments plus open exams, the same set
              the marks draw. Blank when zero; heavier type from the busy threshold. */}
          <tfoot>
            <tr>
              <th scope="row" className={`${STICKY} border-y border-border py-2 pr-2 text-left align-middle text-sm font-normal italic text-muted`}>
                Weekly load
                <span className="sr-only">: open assignments and exams due</span>
              </th>
              {model.counts.map((n, i) => (
                <td
                  key={i}
                  title={n ? `${n} open ${n === 1 ? "item" : "items"} due ${model.weeks[i].rangeFull}` : undefined}
                  className={`tabular border-y border-border py-2 text-center align-middle ${guide(i)}${band(i)} ${
                    isBusyWeek(n) ? "font-bold text-text" : "text-muted"
                  }`}
                >
                  {n > 0 ? n : <span className="sr-only">none</span>}
                </td>
              ))}
              <td className="border-y border-border" />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* What the pointer or the focus ring is on. */}
      <p aria-live="polite" className="tabular mt-2 min-h-5 text-sm text-muted">
        {detail ? describe(detail) : ""}
      </p>

      <div className="mt-1 flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <ul className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-sm italic text-muted">
          {LEGEND.map((l) => (
            <li key={l.state} className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="inline-flex h-4 w-4 items-center justify-center">
                <span className={`block ${GLYPH[l.state]}`} />
              </span>
              {l.label}
            </li>
          ))}
          {nowWeek && (
            <li className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="map-now inline-block h-4 w-4 rounded-sm" />
              This week · {weekRangeLabel(nowWeek.monday)}
            </li>
          )}
          <li>Weekly load = Open assignments and exams due</li>
        </ul>
        {empty > 0 && (
          <Disclosure summary={`${empty} ${empty === 1 ? "course" : "courses"} without deadlines`} className="ml-auto items-end">
            <ul className="flex flex-col items-end gap-1 text-sm">
              {model.emptyCourses.map((c) => (
                <li key={c.href}>
                  <Link href={c.href} className="inline-flex min-h-6 items-center rounded text-muted transition-colors hover:text-text">
                    <span className="font-semibold text-text">{c.code}</span>&nbsp;· {c.name} →
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
