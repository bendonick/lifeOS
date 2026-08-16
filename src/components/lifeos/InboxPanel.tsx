"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { utcToZurichLabel } from "@/lib/dates";
import { DOMAINS, type Domain, type InboxItem } from "@/lib/types";

// Quick capture writes raw rows to `inbox`; processing turns a capture into a
// task / note or dismisses it (docs/03-pages/lifeos.md §3). Phone-relay captures
// will appear in the same list from Stage 5.

export function InboxPanel({ items, today }: { items: InboxItem[]; today: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [text, setText] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const refresh = () => startTransition(() => router.refresh());

  async function capture(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    await fetch("/api/inbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.trim() }),
    });
    setText("");
    refresh();
  }

  async function process(id: number, body: object) {
    await fetch(`/api/inbox/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setExpandedId(null);
    refresh();
  }

  return (
    <div className={isPending ? "opacity-60 transition-opacity" : "transition-opacity"}>
      <form onSubmit={capture} className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Capture anything…"
          className="min-w-0 flex-1 rounded-md border border-border bg-surface px-3 py-1.5 text-sm placeholder:text-faint focus:border-hub/50 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md border border-border bg-raised px-3 py-1.5 text-sm transition-colors hover:border-hub/40"
        >
          Add
        </button>
      </form>

      <ul className="mt-3 flex flex-col gap-2">
        {items.length === 0 && (
          <li className="rounded-lg border border-border bg-surface px-3 py-4 text-center text-xs text-faint">
            inbox zero — captures from here and (later) your phone land in this list
          </li>
        )}
        {items.map((item) => (
          <li key={item.id} className="rounded-lg border border-border bg-surface px-3 py-2.5">
            <p className="text-sm">{item.text}</p>
            <div className="mt-1.5 flex items-center gap-2 text-[11px] text-faint">
              <span>{item.source === "phone_relay" ? "phone" : "here"}</span>
              <span>·</span>
              <span>{utcToZurichLabel(item.created_at)}</span>
              <span className="flex-1" />
              <button
                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                className="rounded border border-border px-1.5 py-0.5 text-muted transition-colors hover:border-hub/40 hover:text-text"
              >
                → task
              </button>
              <button
                onClick={() => process(item.id, { action: "note", text: item.text })}
                className="rounded border border-border px-1.5 py-0.5 text-muted transition-colors hover:border-hub/40 hover:text-text"
              >
                → note
              </button>
              <button
                onClick={() => process(item.id, { action: "dismiss" })}
                className="rounded border border-border px-1.5 py-0.5 text-muted transition-colors hover:border-danger/40 hover:text-danger"
              >
                dismiss
              </button>
            </div>
            {expandedId === item.id && (
              <CaptureToTaskForm
                capture={item}
                today={today}
                onSubmit={(body) => process(item.id, body)}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CaptureToTaskForm({
  capture,
  today,
  onSubmit,
}: {
  capture: InboxItem;
  today: string;
  onSubmit: (body: object) => void;
}) {
  const [title, setTitle] = useState(capture.text);
  const [domain, setDomain] = useState<Domain>("personal");
  const [due, setDue] = useState(today);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (title.trim()) onSubmit({ action: "task", title: title.trim(), domain, due: due || null });
      }}
      className="mt-2 flex flex-col gap-2 rounded-md border border-border bg-raised p-2"
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="rounded border border-border bg-surface px-2 py-1 text-sm focus:outline-none"
        aria-label="task title"
      />
      <div className="flex gap-2">
        <select
          value={domain}
          onChange={(e) => setDomain(e.target.value as Domain)}
          className="flex-1 rounded border border-border bg-surface px-1.5 py-1 text-xs text-muted focus:outline-none"
        >
          {DOMAINS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          className="rounded border border-border bg-surface px-1.5 py-1 text-xs text-muted [color-scheme:dark] focus:outline-none"
        />
        <button
          type="submit"
          className="rounded border border-border bg-surface px-2 py-1 text-xs transition-colors hover:border-hub/40"
        >
          Create
        </button>
      </div>
    </form>
  );
}
