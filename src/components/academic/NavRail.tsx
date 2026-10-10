"use client";

import Link from "next/link";
import { Bell, BookOpen, Briefcase, CalendarDays, GraduationCap, Home, ListChecks, Menu, User, X } from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";

/**
 * The slim navigation rail (decision #78): the ways out of the page and where
 * in the term we are, in roughly 13rem. It replaced a rail of modules — Now,
 * Exams, Go to, Quick add, Reminders — whose contents moved into the page or
 * the `+ Add` menu. Sections are anchors on this page; the active one follows
 * the scroll position, so the rail says where you are rather than only where
 * you can go.
 *
 * Below `lg` it is a bar with a menu toggle; the page is one column there.
 */
const SECTIONS: { id: string; label: string; icon: typeof Home }[] = [
  { id: "semester", label: "Overview", icon: Home },
  { id: "courses", label: "Courses", icon: BookOpen },
  { id: "assignments", label: "Assignments", icon: ListChecks },
  { id: "timetable", label: "Timetable", icon: CalendarDays },
];

export function NavRail({
  reminders,
  weekNo,
  weeks,
  termEnd,
}: {
  /** Pending reminders, for the badge. */
  reminders: number;
  weekNo: number | null;
  weeks: number | null;
  termEnd: string | null;
}) {
  const [active, setActive] = useState(SECTIONS[0].id);
  const [open, setOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    // The active section is the last one whose top has passed a line a little
    // below the viewport's top edge — the same rule a reader applies.
    const update = () => {
      let current = SECTIONS[0].id;
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= 140) current = s.id;
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
  }, []);

  const links = (
    <>
      <div
        aria-current="page"
        className="flex items-center gap-2.5 rounded-md bg-raised/70 px-2.5 py-2 text-academic"
      >
        <GraduationCap size={16} aria-hidden="true" />
        <span className="t-serif text-base leading-none">Academic</span>
      </div>
      <nav aria-label="Academic sections" className="mt-1 flex flex-col gap-0.5">
        {SECTIONS.map((s) => (
          <RailLink key={s.id} href={`#${s.id}`} current={active === s.id} onClick={() => setOpen(false)}>
            <s.icon size={15} aria-hidden="true" className="text-faint" />
            {s.label}
          </RailLink>
        ))}
      </nav>
      <div aria-hidden="true" className="my-4 border-t border-border" />
      <nav aria-label="Other pages" className="flex flex-col gap-0.5">
        <RailLink href="/personal">
          <User size={15} aria-hidden="true" className="text-faint" />
          Personal
        </RailLink>
        <RailLink href="/professional">
          <Briefcase size={15} aria-hidden="true" className="text-faint" />
          Professional
        </RailLink>
        <RailLink href="#reminders" onClick={() => setOpen(false)}>
          <Bell size={15} aria-hidden="true" className="text-faint" />
          Reminders
          <span
            className={`tabular ml-auto rounded-full px-1.5 text-[11px] leading-4 ${
              reminders > 0 ? "bg-hub/20 text-hub" : "bg-raised text-faint"
            }`}
            aria-label={`${reminders} pending`}
          >
            {reminders}
          </span>
        </RailLink>
      </nav>
    </>
  );

  const progress =
    weekNo && weeks ? (
      <div className="px-2.5" title={termEnd ? `term ends ${termEnd}` : undefined}>
        <div className="text-xs text-text">
          Week {weekNo} of {weeks}
        </div>
        <div
          role="progressbar"
          aria-label="week of term"
          aria-valuemin={1}
          aria-valuemax={weeks}
          aria-valuenow={weekNo}
          className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-track"
        >
          <div className="h-full rounded-full bg-hub" style={{ width: `${Math.round((weekNo / weeks) * 100)}%` }} />
        </div>
      </div>
    ) : null;

  return (
    <>
      {/* Desktop: a sticky column the height of the viewport. */}
      <aside className="hidden border-r border-border px-3 py-5 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <Link href="/" className="t-serif rounded px-2.5 text-2xl leading-none text-text">
          LifeOS
        </Link>
        <div className="mt-7">{links}</div>
        <div className="mt-auto pt-6">{progress}</div>
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
            {open ? <Menu size={16} className="hidden" aria-hidden="true" /> : null}
            {open ? <X size={16} aria-hidden="true" /> : <Menu size={16} aria-hidden="true" />}
          </button>
        </div>
        {open && (
          <div id={menuId} className="border-b border-border px-3 py-3">
            {links}
            <div className="mt-4">{progress}</div>
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
