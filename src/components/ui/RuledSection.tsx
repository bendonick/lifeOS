import type { ReactNode } from "react";

/**
 * A page section on the Maritime pages (decision #91): a serif heading, an
 * optional italic summary at the right, and a rule beneath the whole — no tile,
 * no card. Renders a real <section aria-labelledby> around a real <h2>, as
 * `Tile` does, so the heading outline and #hash links work the same way.
 */
export function RuledSection({
  id,
  title,
  meta,
  aside,
  className = "",
  children,
}: {
  /** Anchor id; the heading gets `${id}-title`. */
  id: string;
  title: string;
  /** A short read-only summary: counts, a date, a timezone. */
  meta?: ReactNode;
  /** Sits beside the heading rather than at the far right. */
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`border-b border-border pb-6 pt-5 ${className}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <div className="flex flex-wrap items-baseline gap-x-6">
          <h2 id={`${id}-title`} className="t-serif text-[1.75rem] leading-tight text-text">
            {title}
          </h2>
          {aside}
        </div>
        {meta && <p className="t-serif !font-medium text-base italic text-muted">{meta}</p>}
      </div>
      <div className="mt-3 min-w-0">{children}</div>
    </section>
  );
}
