"use client";

import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { DisclosureTrigger } from "@/components/ui/Disclosure";

// "Open calendar" on the Overview (decision #90). The agenda sits in the page's
// narrow right column, and the week grid needs the page's full width — seven day
// columns in 440px is not a calendar. So the trigger and the panel live in
// different places and share this state: the trigger stays in the column, the
// panel opens across the page beneath the two columns and is scrolled into view.
// The trigger is the shared `DisclosureTrigger`, so it carries the same
// aria-expanded / aria-controls contract as every other disclosure.

const RevealContext = createContext<{ open: boolean; toggle: () => void; panelId: string } | null>(null);

export function CalendarRevealProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <RevealContext.Provider value={{ open, toggle: () => setOpen((v) => !v), panelId }}>
      {children}
    </RevealContext.Provider>
  );
}

function useReveal() {
  const ctx = useContext(RevealContext);
  if (!ctx) throw new Error("CalendarReveal components need a CalendarRevealProvider");
  return ctx;
}

export function CalendarRevealTrigger({ detail }: { detail?: string }) {
  const { open, toggle, panelId } = useReveal();
  return (
    <DisclosureTrigger
      open={open}
      onToggle={toggle}
      summary="Open calendar"
      openSummary="Hide calendar"
      detail={detail}
      controls={panelId}
    />
  );
}

export function CalendarRevealPanel({ children }: { children: ReactNode }) {
  const { open, panelId } = useReveal();
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    ref.current?.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
    ref.current?.focus({ preventScroll: true });
  }, [open]);

  if (!open) return null;
  return (
    <section
      ref={ref}
      id={panelId}
      tabIndex={-1}
      aria-label="Week calendar"
      className="mt-8 scroll-mt-4 border-t border-border pt-6"
    >
      {children}
    </section>
  );
}
