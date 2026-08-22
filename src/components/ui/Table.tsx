import { Children, type ReactNode } from "react";

/**
 * Minimal-chrome table (docs/02-design-system.md): hairline borders, muted
 * header, one-line empty-state hint instead of blank space.
 */
export function Table({
  columns,
  empty,
  frameless = false,
  children,
}: {
  columns: string[];
  empty: string;
  /** Drop the table's own border and ground. Use when the table is already
   *  inside a `Tile` — otherwise the section paints a box, and the table paints
   *  an identical box 16px inside it, and neither border means anything. */
  frameless?: boolean;
  children?: ReactNode;
}) {
  const rowCount = Children.count(children);
  return (
    <div className={`overflow-x-auto ${frameless ? "" : "rounded-lg border border-border bg-surface"}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            {columns.map((c) => (
              <th key={c} className="px-3 py-2 font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rowCount === 0 ? (
            <tr>
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
