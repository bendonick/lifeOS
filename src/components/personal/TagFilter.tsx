"use client";

import { useState } from "react";
import { tagKey } from "@/lib/personal/payments";

/**
 * Filtering a Money page list by its tags, shared by Monthly payments and
 * Subscriptions. Any number of tags can be picked; a row shows when it carries
 * any of them, and with none picked every row shows. A pick whose tag is then
 * taken off every row stops filtering. Picks last while the page is open.
 */
export function useTagFilter<T extends { tags: string[] }>(items: T[]) {
  const [picked, setPicked] = useState<Set<string>>(() => new Set()); // tag keys

  // Every tag in use, once each (first spelling wins), A to Z, with its count.
  const counts = new Map<string, { tag: string; count: number }>();
  for (const it of items) {
    for (const t of it.tags) {
      const seen = counts.get(tagKey(t));
      if (seen) seen.count += 1;
      else counts.set(tagKey(t), { tag: t, count: 1 });
    }
  }
  const inUse = [...counts.values()].sort((a, b) => a.tag.localeCompare(b.tag, "en", { sensitivity: "base" }));
  const active = [...picked].filter((k) => counts.has(k));
  const shown = active.length ? items.filter((it) => it.tags.some((t) => active.includes(tagKey(t)))) : items;

  return {
    inUse,
    active,
    shown,
    /** The picked tags as written, e.g. "Utility, Tech". */
    label: active.map((k) => counts.get(k)!.tag).join(", "),
    toggle: (tag: string) =>
      setPicked((prev) => {
        const next = new Set(prev);
        const k = tagKey(tag);
        if (next.has(k)) next.delete(k);
        else next.add(k);
        return next;
      }),
    clear: () => setPicked(new Set()),
  };
}

const chip =
  "rounded-full border border-border bg-surface px-2.5 py-0.5 text-[11px] text-muted transition-colors hover:text-text";

/** The row of tags above a list: All, then each tag with its count. Until
 *  any row has a tag, a line saying where tags come from. */
export function TagFilterRow({
  filter,
  total,
  noun,
}: {
  filter: ReturnType<typeof useTagFilter>;
  total: number;
  /** What the list holds, for the empty line: "payment", "subscription". */
  noun: string;
}) {
  if (filter.inUse.length === 0) {
    return <p className="text-xs text-faint">Tags you give a {noun} (its pencil) appear here to filter by.</p>;
  }
  return (
    <div role="group" aria-label="Filter by tag" className="flex flex-wrap items-center gap-1">
      {/* data-view-tab: the Maritime theme draws a pressed one as its filled
          ink control (globals.css). */}
      <button type="button" aria-pressed={filter.active.length === 0} onClick={filter.clear} data-view-tab="" className={chip}>
        All · {total}
      </button>
      {filter.inUse.map(({ tag, count }) => (
        <button
          key={tag}
          type="button"
          aria-pressed={filter.active.includes(tagKey(tag))}
          onClick={() => filter.toggle(tag)}
          data-view-tab=""
          className={chip}
        >
          {tag} · {count}
        </button>
      ))}
    </div>
  );
}

/** Under the controls while tags are picked: what is shown and its sum. */
export function TagFilterSummary({
  filter,
  noun,
  perMonth,
}: {
  filter: ReturnType<typeof useTagFilter>;
  noun: string;
  perMonth: string;
}) {
  if (filter.active.length === 0) return null;
  const n = filter.shown.length;
  return (
    <p className="tabular pb-2 text-sm text-text">
      {filter.label}: {n} {n === 1 ? noun : `${noun}s`} · {perMonth}
      <button type="button" onClick={filter.clear} className="ml-3 text-link hover:text-text">
        Show all
      </button>
    </p>
  );
}
