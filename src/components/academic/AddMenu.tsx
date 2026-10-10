"use client";

import { ChevronDown, Plus } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { buttonChrome } from "@/components/ui/controls";

/**
 * The page's one creation control (decision #78): four entries, each the
 * anchor an existing form already listens for. Picking an entry sets the hash;
 * `Disclosure`/`AnchoredForm` open, scroll and focus the input. If the hash is
 * already that anchor (the form was opened and cancelled), the same pick
 * re-dispatches `hashchange` so the form opens again.
 */
const ITEMS = [
  { label: "Course", hash: "new-course" },
  { label: "Assignment or task", hash: "new-assignment" },
  { label: "Exam", hash: "new-exam" },
  { label: "Reminder", hash: "new-reminder" },
];

export function AddMenu() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        root.current?.querySelector("button")?.focus();
      }
    };
    const onPointer = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className={`${buttonChrome} inline-flex items-center gap-1.5 hover:border-academic/40`}
      >
        <Plus size={14} aria-hidden="true" />
        Add
        <ChevronDown size={12} aria-hidden="true" className="text-faint" />
      </button>
      {open && (
        <ul
          id={menuId}
          role="menu"
          aria-label="Add"
          className="absolute right-0 z-30 mt-1.5 min-w-48 rounded-lg border border-border bg-surface p-1"
        >
          {ITEMS.map((item) => (
            <li key={item.hash} role="none">
              <a
                role="menuitem"
                href={`#${item.hash}`}
                onClick={() => {
                  setOpen(false);
                  if (window.location.hash === `#${item.hash}`) {
                    window.dispatchEvent(new HashChangeEvent("hashchange"));
                  }
                }}
                className="block rounded-md px-2.5 py-1.5 text-sm text-text transition-colors hover:bg-raised"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
