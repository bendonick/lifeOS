import Link from "next/link";
import { Fragment } from "react";
import type { MarkState, SemesterMapModel } from "@/lib/academic/semester";
import { dayLabel } from "@/lib/dates";

/**
 * The Academic page's hero (decision #74): courses down, the term's weeks
 * across, one mark per dated item. It answers the three questions the old
 * 21-row table made you read for — when does the term get heavy, which course
 * owns the load, how far through each course's work am I — with position on a
 * shared time axis, the encoding people read most accurately.
 *
 * Vocabulary (decision #76): shape carries type and state, colour carries
 * urgency only. Ring = open, filled quiet = done, filled red = overdue, filled
 * amber = due today or tomorrow, diamond = exam. Overdue and done are both
 * filled, so they also differ by lightness and never by hue alone.
 *
 * A cell with marks is a link to the course page — the whole 49×30 cell, not
 * the 10px mark, is the target — with an accessible name that reads the cell
 * out. Nothing here is colour-coded without a shape or a word beside it, and
 * the done mark sits at 70% opacity because 45% measured 2.26:1 on the tile.
 *
 * Server component: the model is pure data from `semesterMap()`.
 */

const MARK: Record<MarkState, string> = {
  open: "rounded-full border-[1.5px] border-academic",
  done: "rounded-full bg-faint/70",
  overdue: "rounded-full bg-danger",
  soon: "rounded-full bg-warn",
  exam: "h-[9px] w-[9px] rotate-45 rounded-[1px] border-[1.5px] border-academic",
};

const LEGEND: Record<MarkState, string> = {
  open: "open",
  done: "done",
  overdue: "overdue",
  soon: "today · tomorrow",
  exam: "exam",
};

export function SemesterMap({ model }: { model: SemesterMapModel }) {
  const columns = `6rem repeat(${model.weeks.length}, minmax(0, 1fr)) 3.5rem`;
  const heavy = Number.isFinite(model.threshold);

  return (
    <div>
      <div className="overflow-x-auto">
        <div className="grid min-w-[40rem] items-stretch" style={{ gridTemplateColumns: columns }}>
          {/* Months, spanning their weeks. */}
          <div />
          {model.months.map((m, i) => (
            <div
              key={`${m.label}-${i}`}
              className="border-l border-border pb-1 pl-1.5 text-[11px] text-muted"
              style={{ gridColumn: `span ${m.span}` }}
            >
              {m.label}
            </div>
          ))}
          <div />

          {/* Week starts. The current week keeps its date — "now" is said by
              the column, not by replacing the number. */}
          <div className="t-eyebrow self-end pb-1 text-faint">course</div>
          {model.weeks.map((w) => (
            <div
              key={w.monday}
              title={`week of ${dayLabel(w.monday)}`}
              className={`tabular border-l border-border py-1 text-center text-[11px] ${
                w.isNow ? "map-now font-semibold text-academic" : "text-faint"
              }`}
            >
              {w.day}
            </div>
          ))}
          <div className="t-eyebrow self-end pb-1 text-right text-faint">left</div>

          {model.rows.map((row) => (
            <Fragment key={row.key}>
              <div
                title={row.name}
                className={`flex items-center truncate border-t border-border pr-1.5 text-xs ${
                  row.key === "none" ? "text-muted" : "font-semibold text-text"
                }`}
              >
                {row.code}
              </div>
              {row.cells.map((marks, i) => {
                const now = i === model.now ? " map-now" : "";
                if (marks.length === 0) {
                  return <div key={i} className={`min-h-[30px] border-t border-l border-border${now}`} />;
                }
                const text = marks.map((m) => m.label).join("; ");
                return (
                  <Link
                    key={i}
                    href={row.href}
                    aria-label={`${row.code}: ${text}`}
                    title={marks.map((m) => m.label).join("\n")}
                    className={`flex min-h-[30px] flex-col items-center justify-center gap-[3px] border-t border-l border-border py-1 transition-colors hover:bg-academic/10${now}`}
                  >
                    {marks.map((m, j) => (
                      <span key={j} aria-hidden="true" className={`block h-2.5 w-2.5 shrink-0 ${MARK[m.state]}`} />
                    ))}
                  </Link>
                );
              })}
              <div className="tabular flex items-center justify-end border-t border-l border-border pr-0.5 text-[11px] text-muted">
                {row.left ?? "—"}
              </div>
            </Fragment>
          ))}

          {/* Items due per week — the same set as the marks above, exams
              included, so the row can never disagree with the column over it.
              Heavy weeks are bold; the peak takes the page accent. */}
          <div className="flex items-center border-t border-border text-[11px] text-muted">due</div>
          {model.counts.map((n, i) => {
            const isHeavy = heavy && n >= model.threshold;
            const tone =
              i === model.peak && n > 0
                ? "font-semibold text-academic"
                : isHeavy
                  ? "font-semibold text-text"
                  : n === 0
                    ? "text-border-strong"
                    : "text-muted";
            return (
              <div
                key={i}
                title={`${n} due in the week of ${dayLabel(model.weeks[i].monday)}`}
                className={`tabular border-t border-l border-border py-1.5 text-center text-[11px] ${tone}${
                  i === model.now ? " map-now" : ""
                }`}
              >
                {n || "·"}
              </div>
            );
          })}
          <div className="border-t border-border" />
        </div>
      </div>

      {/* The legend lists only the states that are drawn — a key to a glyph
          that is not on screen is a sentence about the interface. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
        {model.states.map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className={`block h-2.5 w-2.5 ${MARK[s]}`} />
            {LEGEND[s]}
          </span>
        ))}
        {model.now >= 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="map-now block h-3 w-3.5 rounded-sm" />
            this week
          </span>
        )}
        {heavy && (
          <span className="inline-flex items-center gap-1.5">
            <span className="tabular font-semibold text-text">{model.threshold}+</span>
            heavy · above your median week
          </span>
        )}
      </div>
      {model.empty.length > 0 && (
        <p className="mt-2 text-xs text-muted">no deadlines entered · {model.empty.join(" · ")}</p>
      )}
    </div>
  );
}
