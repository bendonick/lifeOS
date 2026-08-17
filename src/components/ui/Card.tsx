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
  value,
  context,
  children,
  surface = "bg-surface",
  className = "",
}: {
  icon?: ReactNode;
  label: string;
  accent?: Accent;
  value?: ReactNode;
  context?: string;
  children?: ReactNode;
  /** Ground for the card. A lead card can take `bg-field` to sit apart from the
   *  tiles around it; passing it through className would not reliably win, as
   *  Tailwind utilities share specificity and source order decides. */
  surface?: string;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-border p-4 ${surface} ${className}`}>
      <div className={`flex items-center gap-2 text-xs font-medium ${accentText[accent]}`}>
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
