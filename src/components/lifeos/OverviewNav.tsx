import Link from "next/link";
import { filledButtonChrome } from "@/components/ui/controls";

// The Overview's navigation (decision #88). It takes over the job of the three
// Domain tiles: four plain links, the current page marked with the filled ink
// control and `aria-current`. The reference also drew a search field, an avatar
// and dropdown arrows; the app has no search, no accounts and no sub-menus, so
// none of them is rendered — a control that does nothing is worse than no control.

const LINKS = [
  { href: "/academic", label: "Academic" },
  { href: "/personal", label: "Personal" },
  { href: "/professional", label: "Professional" },
];

export function OverviewNav() {
  return (
    <header className="border-b border-border">
      <nav aria-label="Main" className="flex flex-wrap items-center gap-x-7 gap-y-2 py-4">
        <Link href="/" aria-label="LifeOS home" className="t-serif rounded text-[1.75rem] leading-none text-text">
          LifeOS
        </Link>
        <ul className="flex flex-wrap items-center gap-x-0.5 gap-y-1 sm:gap-x-1.5">
          <li>
            <Link href="/" aria-current="page" className={filledButtonChrome}>
              Overview
            </Link>
          </li>
          {LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="inline-flex items-center rounded-md px-2.5 py-1.5 text-sm font-medium text-text transition-colors hover:bg-raised sm:px-3.5"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
