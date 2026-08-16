import Link from "next/link";
import type { ReactNode } from "react";
import { accentBanner, type Accent } from "@/components/ui/accents";

/**
 * The banner + caption pair — the strongest visual signature carried over from
 * Notion (docs/02-design-system.md). Full-width strip tinted with the domain
 * color, small muted caption line beneath.
 *
 * Renders a real <h2> so the page has a heading outline: every section title
 * used to be a <div>, leaving the whole app with exactly one heading element
 * and no way to navigate by heading or landmark.
 */
export function SectionBanner({
  accent = "hub",
  title,
  caption,
  id,
  action,
  meta,
}: {
  accent?: Accent;
  title: string;
  caption?: string;
  /** Ties the banner to its <section aria-labelledby>. */
  id?: string;
  /** Optional trailing link, so a caption never implies an action it can't perform. */
  action?: { href: string; label: string };
  /** Trailing read-only stat — a headline number that doesn't warrant a card. */
  meta?: ReactNode;
}) {
  return (
    <div>
      <div
        className={`flex items-baseline justify-between gap-3 rounded-md px-4 py-2 ${accentBanner[accent]}`}
      >
        <h2 id={id} className="text-sm font-semibold tracking-wide">
          {title}
        </h2>
        {meta && <span className="tabular text-xs font-normal opacity-90">{meta}</span>}
        {action && (
          <Link href={action.href} className="text-xs font-normal opacity-90 hover:underline">
            {action.label}
          </Link>
        )}
      </div>
      {caption && <p className="mt-1.5 text-xs text-muted">{caption}</p>}
    </div>
  );
}
