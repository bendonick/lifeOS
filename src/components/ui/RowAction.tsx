import type { LucideIcon } from "lucide-react";

/**
 * The quiet per-row action: an icon button at text weight. Extracted because
 * three tables (Projects, Network, Courses) each rendered `edit delete` as two
 * bare words with 6px between them — which read as one string, and as an
 * unfinished interface. Verbs with no honest glyph ("log", "calendar ↗") stay
 * text; this is only for actions an icon states exactly.
 *
 * `label` is required — the icon is decoration, the name is the button.
 *
 * 24×24 (decision #76): the glyph is 14px, the target is the smallest box a
 * pointer hits without aiming. It was `p-1` around the glyph, 22px, and the
 * course cards' pencil sat next to two text links at that size.
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
      className={`inline-flex h-6 w-6 items-center justify-center rounded align-middle text-muted transition-colors ${
        danger ? "hover:text-danger" : "hover:text-text"
      }`}
    >
      <Icon size={14} aria-hidden="true" />
    </button>
  );
}
