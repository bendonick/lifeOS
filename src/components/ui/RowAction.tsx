import type { LucideIcon } from "lucide-react";

/**
 * The quiet per-row action: an icon button at text weight. Extracted because
 * three tables (Projects, Network, Courses) each rendered `edit delete` as two
 * bare words with 6px between them — which read as one string, and as an
 * unfinished interface. Verbs with no honest glyph ("log", "calendar ↗") stay
 * text; this is only for actions an icon states exactly.
 *
 * `label` is required — the icon is decoration, the name is the button.
 */
export function RowAction({
  icon: Icon,
  label,
  onClick,
  danger = false,
  expanded,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  /** Destructive actions hover warm; everything else hovers to ink. */
  danger?: boolean;
  /** For actions that open a row editor — the same aria Disclosure carries. */
  expanded?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-expanded={expanded}
      className={`rounded p-1 align-middle text-muted transition-colors ${
        danger ? "hover:text-danger" : "hover:text-text"
      }`}
    >
      <Icon size={14} aria-hidden="true" />
    </button>
  );
}
