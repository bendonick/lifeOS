"use client";

import { useRef, useState } from "react";

// The "Currently" strip under the Overview's date (decision #88): two entries
// the user keeps by hand. Each is a button that turns into a field in place —
// Enter or leaving the field saves, Escape cancels — and the value is stored in
// `config` through /api/overview/prefs, so it survives a reload.

type Field = "building" | "reading";

const LABEL: Record<Field, string> = { building: "Building", reading: "Reading" };
const EMPTY: Record<Field, string> = { building: "Choose a project", reading: "Choose a book" };

export function Currently({ building, reading }: { building: string; reading: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Currently</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
        <Entry field="building" initial={building} />
        {/* Only between the two on one line; a rule left dangling at the end of
            a wrapped line reads as a stray mark. */}
        <span aria-hidden="true" className="hidden h-4 w-px bg-(--color-rust) sm:block" />
        <Entry field="reading" initial={reading} />
      </div>
    </div>
  );
}

function Entry({ field, initial }: { field: Field; initial: string }) {
  const [value, setValue] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  // Escape must not save: blur fires after it, and would.
  const cancelled = useRef(false);

  function open() {
    setDraft(value);
    setError(null);
    cancelled.current = false;
    setEditing(true);
  }

  function close() {
    setEditing(false);
    // Hand focus back to the button the field replaced.
    requestAnimationFrame(() => buttonRef.current?.focus());
  }

  async function save() {
    if (cancelled.current) return;
    const next = draft.trim();
    setEditing(false);
    if (next === value) return;
    const previous = value;
    setValue(next); // optimistic
    const res = await fetch("/api/overview/prefs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: next }),
    }).catch(() => null);
    if (!res?.ok) {
      const body = res ? await res.json().catch(() => null) : null;
      setValue(previous);
      setError(body?.error ?? "could not save — try again");
    }
  }

  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1.5">
      <span className="t-serif !font-medium text-[1.0625rem] text-text">{LABEL[field]}</span>
      <span aria-hidden="true" className="text-muted">
        ·
      </span>
      {editing ? (
        <input
          autoFocus
          value={draft}
          maxLength={80}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save().then(close);
            } else if (e.key === "Escape") {
              cancelled.current = true;
              close();
            }
          }}
          aria-label={`Currently ${LABEL[field].toLowerCase()}`}
          className="t-serif !font-medium w-44 rounded border border-border-strong bg-transparent px-1.5 py-0.5 text-[1.0625rem] text-text"
        />
      ) : (
        <button
          ref={buttonRef}
          type="button"
          onClick={open}
          aria-label={`${LABEL[field]}: ${value || "not set"} — edit`}
          className={`t-serif !font-medium -mx-1 min-h-6 rounded px-1 text-left text-[1.0625rem] transition-colors hover:bg-raised ${
            value ? "text-text" : "italic text-muted"
          }`}
        >
          {value || EMPTY[field]}
        </button>
      )}
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </span>
  );
}
