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
  className = "",
}: {
  icon?: ReactNode;
  label: string;
  accent?: Accent;
  value?: ReactNode;
  context?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-border bg-surface p-4 ${className}`}>
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
