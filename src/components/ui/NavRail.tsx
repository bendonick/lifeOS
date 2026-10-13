"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";
import { accentText, type Accent } from "@/components/ui/accents";

/**
 * The slim navigation rail (decision #78, generalised for Personal in #81): the
 * ways out of a page and one line of standing state, in 13rem. Sections are
 * anchors on the page; the active one follows the scroll, so the rail says where
 * you are rather than only where you can go. Below `lg` it is a bar with a
 * toggle and the page is one column.
 *
 * Icons arrive as rendered nodes rather than components, because a server page
 * cannot hand a component function to a client component.
 */
export interface RailSection {
  id: string;
  label: string;
  icon: ReactNode;
}

export interface RailLinkItem {
  href: string;
  label: string;
  icon: ReactNode;
  /** A count badge — pending reminders, say. */
  badge?: number;
}

export function NavRail({
  page,
  pageIcon,
  accent,
  sections,
  links,
  footer,
}: {
  page: string;
  pageIcon: ReactNode;
  /** The page's domain hue, for its identity row. */
  accent: Accent;
  sections: RailSection[];
  links: RailLinkItem[];
  /** The line at the foot — week of term, the month, nothing. */
  footer?: ReactNode;
}) {
  const [active, setActive] = useState(sections[0]?.id ?? "");
  const [open, setOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    // The active section is the one whose top sits highest on the page while
    // still above a line a little below the viewport's edge — the rule a reader
    // applies, and independent of the order the rail lists them in.
    const update = () => {
      let current = sections[0]?.id ?? "";
      // At the top of the page you are at its overview, whatever sits 100px
      // below the header; the scroll rule takes over once you have moved.
      if (window.scrollY < 80) {
        setActive(current);
        return;
      }
      let best = -Infinity;
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top <= 140 && top > best) {
          best = top;
          current = s.id;
        }
      }
      setActive(current);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [sections]);

  const nav = (
    <>
      <div
        aria-current="page"
        className={`flex items-center gap-2.5 rounded-md bg-raised/70 px-2.5 py-2 ${accentText[accent]}`}
      >
        <span aria-hidden="true" className="shrink-0">
          {pageIcon}
        </span>
        <span className="t-serif text-base leading-none">{page}</span>
      </div>
      <nav aria-label={`${page} sections`} className="mt-1 flex flex-col gap-0.5">
        {sections.map((s) => (
          <RailLink key={s.id} href={`#${s.id}`} current={active === s.id} onClick={() => setOpen(false)}>
            <span aria-hidden="true" className="shrink-0 text-faint">
              {s.icon}
            </span>
            {s.label}
          </RailLink>
        ))}
      </nav>
      <div aria-hidden="true" className="my-4 border-t border-border" />
      <nav aria-label="Other pages" className="flex flex-col gap-0.5">
        {links.map((l) => (
          <RailLink key={l.href} href={l.href} onClick={() => setOpen(false)}>
            <span aria-hidden="true" className="shrink-0 text-faint">
              {l.icon}
            </span>
            {l.label}
            {l.badge !== undefined && (
              <span
                className={`tabular ml-auto rounded-full px-1.5 text-[11px] leading-4 ${
                  l.badge > 0 ? "bg-hub/20 text-hub" : "bg-raised text-faint"
                }`}
                aria-label={`${l.badge} pending`}
              >
                {l.badge}
              </span>
            )}
          </RailLink>
        ))}
      </nav>
    </>
  );

  return (
    <>
      {/* Desktop: a sticky column the height of the viewport. */}
      <aside className="hidden border-r border-border px-3 py-5 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <Link href="/" className="t-serif rounded px-2.5 text-2xl leading-none text-text">
          LifeOS
        </Link>
        <div className="mt-7">{nav}</div>
        {footer && <div className="mt-auto pt-6">{footer}</div>}
      </aside>

      {/* Narrow: a bar with a toggle, the same links beneath it. */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <Link href="/" className="t-serif rounded text-xl leading-none text-text">
            LifeOS
          </Link>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={open ? "Close navigation" : "Open navigation"}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-raised text-text"
          >
            {open ? <X size={16} aria-hidden="true" /> : <Menu size={16} aria-hidden="true" />}
          </button>
        </div>
        {open && (
          <div id={menuId} className="border-b border-border px-3 py-3">
            {nav}
            {footer && <div className="mt-4">{footer}</div>}
          </div>
        )}
      </div>
    </>
  );
}

function RailLink({
  href,
  current = false,
  onClick,
  children,
}: {
  href: string;
  current?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  const className = `flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
    current ? "bg-raised/50 text-text" : "text-muted hover:bg-raised/40 hover:text-text"
  }`;
  // Hash links stay plain anchors so the browser scrolls and fires hashchange;
  // page links go through next/link.
  return href.startsWith("#") ? (
    <a href={href} aria-current={current ? "location" : undefined} onClick={onClick} className={className}>
      {children}
    </a>
  ) : (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
