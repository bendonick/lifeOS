import type { ReactNode } from "react";
import { accentText, type Accent } from "@/components/ui/accents";

/**
 * The card grammar (docs/02-design-system.md): title row (icon + label), one big
 * value, one muted context line — or arbitrary children for richer cards.
 */
export function Card({
  icon,
  label,
  accent = "hub",
  labelTone = "accent",
  value,
  context,
  children,
  surface = "bg-surface",
  bare = false,
  className = "",
}: {
  icon?: ReactNode;
  label: string;
  accent?: Accent;
  /** Accent labels are for cards that lead. Four accent-coloured labels over
   *  four empty metrics spent the page's whole colour budget on "no data yet" —
   *  the palette rule is that colour marks meaning, and "Sleep" is a caption. */
  labelTone?: "accent" | "muted";
  value?: ReactNode;
  context?: string;
  children?: ReactNode;
  /** Ground for the card. A lead card can take `bg-field` to sit apart from the
   *  tiles around it; passing it through className would not reliably win, as
   *  Tailwind utilities share specificity and source order decides. */
  surface?: string;
  /** Drop the box. A `Card` inside a `Tile` is a card inside a card, and four
   *  of them made the Health tile read as five nested rectangles saying "—".
   *  Bare keeps the grammar — label, value, context — and lets the tile be the
   *  only border. */
  bare?: boolean;
  className?: string;
}) {
  const shell = bare ? "" : `rounded-lg border border-border p-4 ${surface}`;
  return (
    <div className={`${shell} ${className}`}>
      <div
        className={`t-eyebrow flex items-center gap-2 font-medium ${
          labelTone === "accent" ? accentText[accent] : "text-muted"
        }`}
      >
        {icon}
        <span>{label}</span>
      </div>
      {value !== undefined && (
        <div className="tabular t-display mt-2 text-2xl font-semibold">{value}</div>
      )}
      {context && <p className="mt-1 text-xs text-muted">{context}</p>}
      {children}
    </div>
  );
}
