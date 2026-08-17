"use client";

import { useEffect, useState, type ReactNode } from "react";

// Quick-add, CSV import and the 122-row merchant review are maintenance, not
// information — they answer "let me fix the books", never "how is the month
// going". They used to sit between the budget and the charts, which put a
// bookkeeping chore in the middle of the daily read. Here they are one line at
// the bottom until asked for.
//
// Deliberately client-side and content-agnostic: its children are server
// components passed through, so nothing about the panels themselves moves into
// the browser bundle to gain a disclosure.

export function ManagePanel({
  children,
  pendingLabel,
}: {
  children: ReactNode;
  /** e.g. "118 to categorise" — the one fact worth showing while collapsed,
   *  so a real backlog isn't hidden behind a control that looks inert. */
  pendingLabel?: string;
}) {
  const [open, setOpen] = useState(false);

  // The spending card links to "#uncategorised", which lives inside this panel.
  // Without this, that link scrolls to a collapsed element and reads as broken.
  // Runs on mount and on later hash changes, because clicking the same anchor
  // twice fires `hashchange` but not a navigation.
  useEffect(() => {
    const openIfTargeted = () => {
      if (window.location.hash !== "#uncategorised") return;
      setOpen(true);
      // The anchor cannot be scrolled to until the panel has painted it.
      requestAnimationFrame(() =>
        document.getElementById("uncategorised")?.scrollIntoView({ block: "start" })
      );
    };
    openIfTargeted();
    window.addEventListener("hashchange", openIfTargeted);
    return () => window.removeEventListener("hashchange", openIfTargeted);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 self-start text-xs text-muted transition-colors hover:text-text"
      >
        <span aria-hidden="true" className="text-[11px] text-faint">
          {open ? "▾" : "▸"}
        </span>
        Manage transactions
        {!open && pendingLabel && <span className="text-faint">· {pendingLabel}</span>}
      </button>
      {open && children}
    </div>
  );
}
