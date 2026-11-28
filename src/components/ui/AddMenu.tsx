"use client";

import { ChevronDown, Plus } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { accentHoverBorder, type Accent } from "@/components/ui/accents";
import { buttonChrome, filledButtonChrome } from "@/components/ui/controls";

/**
 * A page's one creation control (decision #78): each entry is the anchor an
 * existing form already listens for. Picking one sets the hash; `Disclosure`
 * and `AnchoredForm` open, scroll and focus the input. If the hash is already
 * that anchor (the form was opened and cancelled), the same pick re-dispatches
 * `hashchange` so the form opens again.
 */
export interface AddItem {
  label: string;
  hash: string;
}

export function AddMenu({
  items,
  accent,
  variant = "outline",
}: {
  items: AddItem[];
  accent: Accent;
  /** `filled` is the Maritime pages' ink control (decision #91) — the same
   *  pairing as the current page in the navigation. */
  variant?: "outline" | "filled";
}) {
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
        className={
          variant === "filled"
            ? `${filledButtonChrome} gap-1.5`
            : `${buttonChrome} inline-flex items-center gap-1.5 ${accentHoverBorder[accent]}`
        }
      >
        <Plus size={14} aria-hidden="true" />
        Add
        <ChevronDown size={12} aria-hidden="true" className={variant === "filled" ? "" : "text-faint"} />
      </button>
      {open && (
        <ul
          id={menuId}
          role="menu"
          aria-label="Add"
          className="absolute right-0 z-30 mt-1.5 min-w-48 rounded-lg border border-border bg-surface p-1 shadow-lg shadow-black/10"
        >
          {items.map((item) => (
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
