import type { ReactNode } from "react";
import Link from "next/link";
import { accentText, type Accent } from "@/components/ui/accents";

/**
 * A bento tile: the card shell with the section header inside it.
 *
 * The page used to be a narrow rail beside one 3,300px column of
 * `SectionBanner` + content, which gave every section the same weight and made
 * the whole page a scroll. A tile grid gives hierarchy from size instead of
 * from decoration — a module that matters is simply bigger — and it is what
 * makes the layout read as structured rather than generated.
 *
 * Renders a real <section aria-labelledby> around a real <h2>, so the heading
 * outline the page relies on survives the move off `SectionBanner`. That
 * component stays as-is for Academic and Professional.
 *
 * Sizing is the caller's job (`span`), because only the page knows what
 * matters on it.
 */
export function Tile({
  id,
  icon,
  title,
  caption,
  accent,
  action,
  meta,
  span = "",
  surface = "bg-surface",
  frame = "strong",
  bodyClassName = "",
  children,
}: {
  /** Anchor id; the heading gets `${id}-title` so #hash links keep working. */
  id: string;
  icon?: ReactNode;
  title: string;
  caption?: string;
  /** Required, not defaulted: a default silently painted Academic's and
   *  Professional's tiles in Personal's tobacco, and nothing failed — the pages
   *  simply looked wrong. Making it explicit turns that into a type error. */
  accent: Accent;
  /** Trailing link — never a caption implying an action it can't perform. */
  action?: { href: string; label: string };
  /** Trailing read-only stat, when a number belongs in the header. */
  meta?: ReactNode;
  /** Grid span classes, e.g. "lg:col-span-8". */
  span?: string;
  /** Ground for the tile — `bg-field` makes it a lead surface. Passed as a prop
   *  rather than through className because Tailwind utilities share
   *  specificity, so source order, not class order, would decide the winner. */
  surface?: string;
  /** `strong` is the page's one 2px border (#65/#70). `quiet` is a hairline at
   *  20px padding for a page whose modules sit beside a navigation rail rather
   *  than a rail of other modules (decision #78): with only four modules on the
   *  page, a 2px outline on each read as the outline rather than the content. */
  frame?: "strong" | "quiet";
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      // border-2 in border-strong, and inner tables render frameless (#65
      // rolled app-wide, 2026-08-23): the module boundary is the page's one
      // strong border — weight AND tone — so sub-structure gets dividers and
      // hairline control chrome, never a second box at the same volume.
      className={`flex flex-col rounded-xl ${
        frame === "quiet" ? "border border-border p-5" : "border-2 border-border-strong p-4"
      } ${surface} ${span}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            id={`${id}-title`}
            className={`t-serif flex items-center gap-2 text-lg leading-none ${accentText[accent]}`}
          >
            {/* Decorative: the title beside it already names the tile, so an
                icon that also announced itself would double every heading. */}
            {icon && (
              <span aria-hidden="true" className="shrink-0 opacity-80">
                {icon}
              </span>
            )}
            {title}
          </h2>
          {caption && <p className="mt-1.5 text-xs text-muted">{caption}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {meta && <span className="tabular text-xs text-muted">{meta}</span>}
          {action && (
            <Link href={action.href} className="text-xs text-muted transition-colors hover:text-text">
              {action.label}
            </Link>
          )}
        </div>
      </div>
      <div className={`mt-4 min-w-0 flex-1 ${bodyClassName}`}>{children}</div>
    </section>
  );
}
