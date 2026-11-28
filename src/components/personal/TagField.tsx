"use client";

import { X } from "lucide-react";
import { useRef, useState } from "react";
import { inputChrome } from "@/components/ui/controls";
import { PAYMENT_TAGS_MAX, PAYMENT_TAG_MAX, tagKey } from "@/lib/personal/payments";

/**
 * A payment's tags in its editor: the tags as chips, each with its own remove
 * button, then a box to type a new one. Enter or a comma adds what is typed;
 * Backspace in the empty box takes the last tag off. While the field has
 * focus, the tags already in use (and the starter ones) that this payment
 * lacks are offered beneath it, narrowed by what is typed; a typed word that
 * matches one in a different letter case takes the existing spelling.
 *
 * The parent owns the typed text too, so Save can keep a tag that was typed
 * but not yet added.
 */
export function TagField({
  tags,
  onTags,
  draft,
  onDraft,
  suggestions,
}: {
  tags: string[];
  onTags: (tags: string[]) => void;
  draft: string;
  onDraft: (draft: string) => void;
  suggestions: string[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const have = new Set(tags.map(tagKey));
  const typed = tagKey(draft);
  const offered = suggestions.filter((s) => !have.has(tagKey(s)) && (!typed || tagKey(s).includes(typed))).slice(0, 10);
  const full = tags.length >= PAYMENT_TAGS_MAX;

  function add(raw: string) {
    const tag = raw.trim().replace(/\s+/g, " ");
    onDraft("");
    if (!tag || full || have.has(tagKey(tag))) return;
    onTags([...tags, suggestions.find((s) => tagKey(s) === tagKey(tag)) ?? tag]);
  }

  return (
    <div
      className="relative"
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
      }}
    >
      <div
        className={`flex min-h-[2.125rem] w-72 max-w-full flex-wrap items-center gap-1 py-1 ${inputChrome}`}
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-0.5 rounded-full border border-border-strong py-0.5 pl-2 pr-1 text-[11px] leading-4 text-text"
          >
            {t}
            <button
              type="button"
              aria-label={`Remove tag ${t}`}
              onClick={() => onTags(tags.filter((k) => k !== t))}
              className="rounded-full p-0.5 text-muted hover:text-danger"
            >
              <X size={10} aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => onDraft(e.target.value.replace(",", ""))}
          onKeyDown={(e) => {
            if ((e.key === "Enter" && draft.trim()) || e.key === ",") {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && !draft && tags.length) {
              onTags(tags.slice(0, -1));
            }
          }}
          maxLength={PAYMENT_TAG_MAX}
          disabled={full}
          placeholder={full ? "" : tags.length ? "Add…" : "Add a tag…"}
          aria-label="Add a tag"
          className="min-w-16 flex-1 bg-transparent text-sm outline-none placeholder:text-faint"
        />
      </div>
      {focused && offered.length > 0 && !full && (
        <div
          role="group"
          aria-label="Suggested tags"
          className="absolute left-0 top-full z-10 mt-1 flex w-72 max-w-[calc(100vw-2.5rem)] flex-wrap gap-1 rounded-md border border-border bg-surface p-1.5 shadow-sm"
        >
          {offered.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                add(s);
                inputRef.current?.focus();
              }}
              className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted transition-colors hover:border-border-strong hover:text-text"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
