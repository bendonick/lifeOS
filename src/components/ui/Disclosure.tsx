"use client";

import { ChevronRight, Plus } from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";
import { accentHoverBorder, type Accent } from "@/components/ui/accents";

/**
 * The `add` variant opens an editor, so its hover carries the section's accent
 * — required, never defaulted (#72): it shipped hardcoded to Personal's hue and
 * the hub's add trigger silently hovered Tobacco. An identity the compiler
 * can't ask about is an identity that drifts (the Tile.accent lesson, #59).
 */
type VariantProps =
  | { variant?: "chevron"; accent?: undefined }
  | { variant: "add"; accent: Accent };

/**
 * The page's one progressive-disclosure control.
 *
 * Generalised out of `ManagePanel`, which had this behaviour hardcoded for a
 * single anchor. The Personal page needs the same shape in five places — the
 * budget table, the CSV import, the habit matrix, the week grid, the
 * bookkeeping — and five hand-rolled `open ? "▾" : "▸"` buttons is how the
 * chevrons end up pointing different ways on the same screen.
 *
 * The rule it encodes: **a collapsed disclosure must still say what is behind
 * it.** `detail` is the one fact worth carrying while shut ("120 to review",
 * "4 unpaid"), so a real backlog is never hidden behind a control that looks
 * inert. Status stays visible; only detail collapses.
 */
/**
 * The trigger on its own, for the controlled case: when the detail being
 * revealed is spread across rows rather than sitting in one block, the panel
 * cannot be a child. `HabitList` needs exactly that — a 7-day strip inside each
 * row — and this is what stops it hand-rolling a fifth toggle with its own
 * chevron pointing its own way.
 */
export function DisclosureTrigger({
  open,
  onToggle,
  summary,
  openSummary,
  detail,
  variant = "chevron",
  accent,
  controls,
}: {
  open: boolean;
  onToggle: () => void;
  summary: string;
  openSummary?: string;
  detail?: ReactNode;
  /** id of the region this controls, when there is one to point at. */
  controls?: string;
} & VariantProps) {
  const isAdd = variant === "add";
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={controls}
      className={
        isAdd
          ? `flex items-center gap-1.5 self-start rounded-md border border-border bg-raised px-2.5 py-1 text-xs text-muted transition-colors ${
              accent ? accentHoverBorder[accent] : ""
            } hover:text-text`
          : "group flex items-center gap-1.5 self-start rounded text-xs text-muted transition-colors hover:text-text"
      }
    >
      {isAdd ? (
        <Plus
          size={13}
          aria-hidden="true"
          className={`shrink-0 transition-transform duration-150 ease-out ${open ? "rotate-45" : ""}`}
        />
      ) : (
        <ChevronRight
          size={13}
          aria-hidden="true"
          className={`shrink-0 text-faint transition-transform duration-150 ease-out ${open ? "rotate-90" : ""}`}
        />
      )}
      <span>{open ? (openSummary ?? summary) : summary}</span>
      {!open && detail && <span className="text-faint">· {detail}</span>}
    </button>
  );
}

export function Disclosure({
  summary,
  openSummary,
  detail,
  defaultOpen = false,
  anchors,
  variant = "chevron",
  accent,
  className = "",
  children,
}: {
  /** Label while collapsed, e.g. "Show budget". */
  summary: string;
  /** Label while open, when the verb should flip ("Hide budget"). Defaults to `summary`. */
  openSummary?: string;
  /** One fact worth showing while collapsed — a count, a total. */
  detail?: ReactNode;
  defaultOpen?: boolean;
  /** Anchor ids living inside this panel. Targeting one opens it, scrolls to it
   *  and focuses it if it is an input — none of which the browser can do on its
   *  own, because while the panel is shut the element is not in the DOM. That
   *  was the whole of the `+ Expense` dead click. */
  anchors?: string[];
  /** `chevron` reveals detail that already belongs to the section. `add` opens
   *  an editor, so it reads as an action — a bordered control with a plus that
   *  turns into a close. Same component either way: two hand-rolled toggles is
   *  how one section ends up with a triangle and its neighbour with a caret. */
  className?: string;
  children: ReactNode;
} & VariantProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  useEffect(() => {
    if (!anchors?.length) return;
    // Runs on mount and on later hash changes, because clicking the same anchor
    // twice fires `hashchange` but not a navigation.
    const openIfTargeted = () => {
      const id = window.location.hash.slice(1);
      if (!anchors.includes(id)) return;
      setOpen(true);
      requestAnimationFrame(() => {
        const el = document.getElementById(id);
        el?.scrollIntoView({ block: "start" });
        if (el instanceof HTMLInputElement) el.focus();
      });
    };
    openIfTargeted();
    window.addEventListener("hashchange", openIfTargeted);
    return () => window.removeEventListener("hashchange", openIfTargeted);
  }, [anchors]);

  return (
    <div className={`flex flex-col ${className}`}>
      <DisclosureTrigger
        open={open}
        onToggle={() => setOpen((v) => !v)}
        summary={summary}
        openSummary={openSummary}
        detail={detail}
        controls={panelId}
        {...((variant === "add"
          ? { variant: "add", accent: accent as Accent }
          : { variant: "chevron" }) satisfies VariantProps as VariantProps)}
      />
      {open && (
        <div id={panelId} className="mt-3">
          {children}
        </div>
      )}
    </div>
  );
}
