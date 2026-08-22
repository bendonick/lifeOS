import { Children, type ReactNode } from "react";

/**
 * Minimal-chrome table (docs/02-design-system.md): hairline borders, muted
 * header, one-line empty-state hint instead of blank space.
 */
export function Table({
  columns,
  empty,
  frameless = false,
  rows = "divided",
  children,
}: {
  columns: string[];
  empty: string;
  /** Drop the table's own border and ground. Use when the table is already
   *  inside a `Tile` — otherwise the section paints a box, and the table paints
   *  an identical box 16px inside it, and neither border means anything. */
  frameless?: boolean;
  /** How rows separate. `divided` is the default hairline dividers; `cards`
   *  renders each row as a subordinate row-card (hairline outline, inset
   *  ground, small radius — `.table-cards` in globals.css). The subordinate
   *  part is the point: internal containment must never wear the tile shell's
   *  own chrome. Prototyped on /professional 2026-08-23. */
  rows?: "divided" | "cards";
  children?: ReactNode;
}) {
  const rowCount = Children.count(children);
  return (
    <div className={`overflow-x-auto ${frameless ? "" : "rounded-lg border border-border bg-surface"}`}>
      <table className={`w-full text-sm ${rows === "cards" ? "table-cards" : ""}`}>
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            {columns.map((c) => (
              <th key={c} className="px-3 py-2 font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={rows === "cards" ? "" : "divide-y divide-border"}>
          {rowCount === 0 ? (
            // data-empty: an empty state is a message, not an item — the cards
            // variant must not draw a card around "nothing here yet".
            <tr data-empty="">
              <td colSpan={columns.length} className="px-3 py-6 text-center text-xs text-faint">
                {empty}
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}
