"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { DisclosureTrigger } from "@/components/ui/Disclosure";

/**
 * The Spending module's footer (decision #81): a row of disclosures whose
 * panels open beneath the row at full width. Three `Disclosure`s side by side
 * would each open inside their own column; this keeps the triggers in one line
 * and the detail — fourteen budget lines, a year of bars, the merchant queue —
 * at the width it needs.
 *
 * A panel also opens when the hash names one of its anchors, so the header's
 * "History" link and the `+ Add → Expense` entry land inside the right panel
 * with the target scrolled into view, the same contract `Disclosure.anchors`
 * keeps.
 */
export interface DetailPanel {
  key: string;
  summary: string;
  openSummary?: string;
  detail?: string;
  anchors?: string[];
  children: ReactNode;
}

export function SpendingDetails({ panels }: { panels: DetailPanel[] }) {
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const base = useId();
  // The hash listener is subscribed once; it reads the current panels through a
  // ref that an effect keeps fresh (a ref written during render is a lint
  // error, and rightly — render must stay pure).
  const latest = useRef(panels);
  useEffect(() => {
    latest.current = panels;
  }, [panels]);

  useEffect(() => {
    const openIfTargeted = () => {
      const id = window.location.hash.slice(1);
      const target = latest.current.find((p) => p.anchors?.includes(id));
      if (!target) return;
      setOpen((s) => new Set(s).add(target.key));
      requestAnimationFrame(() => {
        const el = document.getElementById(id);
        el?.scrollIntoView({ block: "start" });
        if (el instanceof HTMLInputElement) el.focus();
      });
    };
    openIfTargeted();
    window.addEventListener("hashchange", openIfTargeted);
    return () => window.removeEventListener("hashchange", openIfTargeted);
  }, []);

  const toggle = (key: string) =>
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="border-t border-border pt-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {panels.map((p) => (
          <DisclosureTrigger
            key={p.key}
            open={open.has(p.key)}
            onToggle={() => toggle(p.key)}
            summary={p.summary}
            openSummary={p.openSummary}
            detail={p.detail}
            controls={`${base}-${p.key}`}
          />
        ))}
      </div>
      {panels
        .filter((p) => open.has(p.key))
        .map((p) => (
          <div key={p.key} id={`${base}-${p.key}`} className="mt-4 border-t border-border pt-4">
            {p.children}
          </div>
        ))}
    </div>
  );
}
