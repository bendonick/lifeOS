import type { ReactNode } from "react";
import Link from "next/link";
import { filledButtonChrome } from "@/components/ui/controls";

// The horizontal LifeOS navigation of the Maritime pages (decisions #88, #91):
// the serif wordmark and four real links, the current page marked with the
// filled ink control and `aria-current`. First built as the Overview's own nav;
// extracted when Academic adopted it. No dropdown arrows — these are links, and
// an arrow promises a menu. A page's own menu (Academic's "+ Add") goes in the
// trailing slot, where its arrow is true.

export type SitePage = "overview" | "academic" | "personal" | "professional";

const LINKS: { key: SitePage; href: string; label: string }[] = [
  { key: "overview", href: "/", label: "Overview" },
  { key: "academic", href: "/academic", label: "Academic" },
  { key: "personal", href: "/personal", label: "Personal" },
  { key: "professional", href: "/professional", label: "Professional" },
];

export function SiteNav({
  current,
  children,
}: {
  /** Required, never defaulted: which page this is, is identity. */
  current: SitePage;
  /** Trailing controls, e.g. the page's Add menu. */
  children?: ReactNode;
}) {
  return (
    <header className="border-b border-border">
      <div className="flex flex-wrap items-center gap-x-7 gap-y-2 py-4">
        <nav aria-label="Main" className="flex flex-wrap items-center gap-x-7 gap-y-2">
          <Link href="/" aria-label="LifeOS home" className="t-serif rounded text-[1.75rem] leading-none text-text">
            LifeOS
          </Link>
          <ul className="flex flex-wrap items-center gap-x-0.5 gap-y-1 sm:gap-x-1.5">
            {LINKS.map((link) => (
              <li key={link.key}>
                {link.key === current ? (
                  <Link href={link.href} aria-current="page" className={filledButtonChrome}>
                    {link.label}
                  </Link>
                ) : (
                  <Link
                    href={link.href}
                    className="inline-flex items-center rounded-md px-2.5 py-1.5 text-sm font-medium text-text transition-colors hover:bg-raised sm:px-3.5"
                  >
                    {link.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
        {children && <div className="ml-auto">{children}</div>}
      </div>
    </header>
  );
}
