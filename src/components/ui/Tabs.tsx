"use client";

import { accentTab, type Accent } from "@/components/ui/accents";

/**
 * The small pill view-tabs above a data section (docs/02-design-system.md).
 * Four private copies of this shape already exist (AcademicTasks, NotesPanel,
 * TrendsView, WeekCalendar); this is the extracted one, used by Stage 4 so a
 * fifth copy doesn't happen. Migrating the older four is a BACKLOG item —
 * refactoring three finished pages mid-stage is how regressions arrive.
 *
 * A tab names a *state*, never a noun that could read as the name of a list.
 */
export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  accent,
  label,
}: {
  tabs: { key: T; label: string; count?: number }[];
  active: T;
  onChange: (key: T) => void;
  accent: Accent;
  /** Names the group for screen readers, e.g. "contact views". */
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="mb-2 flex flex-wrap items-center gap-1">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          aria-pressed={active === t.key}
          // Styling hook: the Maritime theme draws the active tab as its filled
          // ink control (globals.css). Inert on the dark pages.
          data-view-tab=""
          className={`rounded-full border px-2.5 py-0.5 text-[11px] transition-colors ${
            active === t.key
              ? accentTab[accent]
              : "border-border bg-surface text-muted hover:text-text"
          }`}
        >
          {t.label}
          {t.count !== undefined && t.count > 0 && ` · ${t.count}`}
        </button>
      ))}
    </div>
  );
}
