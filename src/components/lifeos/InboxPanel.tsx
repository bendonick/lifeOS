"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pill } from "@/components/ui/Pill";
import type { Accent } from "@/components/ui/accents";
import { readProposal, type ActionableProposal } from "@/lib/capture/proposal";
import { dayLabel, dueInfo, utcToZurichLabel, zurichToday } from "@/lib/dates";
import { METRICS } from "@/lib/health/metrics";
import { DOMAINS, type Domain, type InboxItem } from "@/lib/types";

// Quick capture writes raw rows to `inbox`; processing turns a capture into a
// task / note or dismisses it (docs/03-pages/lifeos.md §3). Phone captures arrive
// in the same list via scripts/capture_ingest.py, each carrying the parser's
// proposal — one click accepts it, and nothing is written until you do
// (decision #36). Pure helpers only here: readProposal and the date/metric
// registries hold no db import, so this stays a client component.

export function InboxPanel({ items, today }: { items: InboxItem[]; today: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [text, setText] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const refresh = () => startTransition(() => router.refresh());

  async function capture(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    const res = await fetch("/api/inbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.trim() }),
    }).catch(() => null);
    if (!res?.ok) {
      setError("couldn't save that capture");
      return;
    }
    setError(null);
    setText("");
    refresh();
  }

  async function process(id: number, body: object) {
    const res = await fetch(`/api/inbox/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    if (!res?.ok) {
      const detail = await res?.json().catch(() => null);
      setError(detail?.error ?? "that didn't go through");
      return;
    }
    setError(null);
    setExpandedId(null);
    refresh();
  }

  async function sync() {
    setSyncing(true);
    setSyncMessage(null);
    setError(null);
    const res = await fetch("/api/capture/sync", { method: "POST" }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setSyncing(false);

    if (!res?.ok) {
      setError(data?.error ?? "sync failed — see the terminal");
      return;
    }
    if (!data.file_exists) {
      setSyncMessage("no capture file yet — check the Shortcut's folder");
    } else if (data.ingested === 0) {
      setSyncMessage("nothing new");
    } else {
      const parsed = data.parsed ? ` · ${data.parsed} parsed` : "";
      setSyncMessage(`${data.ingested} new${parsed}`);
    }
    refresh();
  }

  return (
    <div aria-busy={isPending || syncing}>
      <form onSubmit={capture} className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Capture anything…"
          className="min-w-0 flex-1 rounded-md border border-border bg-surface px-3 py-1.5 text-sm placeholder:text-faint focus:border-hub/50"
        />
        <button
          type="submit"
          className="rounded-md border border-border bg-raised px-3 py-1.5 text-sm transition-colors hover:border-hub/40"
        >
          Add
        </button>
      </form>

      <div className="mt-2 flex items-center gap-2 text-[11px]">
        <button
          onClick={sync}
          disabled={syncing}
          className="rounded border border-border px-1.5 py-0.5 text-muted transition-colors hover:border-hub/40 hover:text-text disabled:text-faint"
        >
          {syncing ? "Syncing…" : "Sync phone"}
        </button>
        {syncMessage && (
          <span role="status" className="text-faint">
            {syncMessage}
          </span>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-2 text-[11px] text-danger">
          {error}
        </p>
      )}

      <ul className="mt-3 flex flex-col gap-2">
        {items.length === 0 && (
          <li className="rounded-lg border border-border bg-surface px-3 py-4 text-center text-xs text-faint">
            inbox zero — captures from here and from your phone land in this list
          </li>
        )}
        {items.map((item) => {
          const proposal = readProposal(item.parsed_json, item.processed);
          return (
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

              {proposal && expandedId !== item.id && (
                <ProposalChip proposal={proposal} onAccept={() => process(item.id, { action: "accept" })} />
              )}

              {expandedId === item.id && (
                <CaptureToTaskForm
                  capture={item}
                  today={today}
                  proposal={proposal}
                  onSubmit={(body) => process(item.id, body)}
                />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** What the capture would become, in the words of the tables it would land in. */
function proposalSummary(proposal: ActionableProposal): { action: string; detail: string; tone: Accent | "neutral" } {
  switch (proposal.kind) {
    case "task":
      return {
        action: proposal.type,
        detail: proposal.due ? dueInfo(proposal.due).label : "no date",
        tone: proposal.domain,
      };
    case "metrics": {
      const today = zurichToday();
      const dates = new Set(proposal.rows.map((r) => r.date));
      const when = dates.size === 1 && !dates.has(today) ? ` · ${dayLabel([...dates][0])}` : "";
      return {
        action: proposal.rows.length === 1 ? "metric" : `${proposal.rows.length} metrics`,
        detail:
          proposal.rows
            .map((r) => `${METRICS[r.metric as keyof typeof METRICS].label} ${r.value}`)
            .join(" · ") + when,
        tone: "personal",
      };
    }
    case "note":
      return { action: proposal.noteKind, detail: proposal.domain ?? "no domain", tone: proposal.domain ?? "neutral" };
  }
}

/**
 * The parse proposal, as one click. The chip states what it would create before
 * it creates it — the parser suggests, the app writes (decision #36) — and the
 * parser's own one-line reasoning rides along as the title attribute for when a
 * resolved date looks wrong.
 */
function ProposalChip({ proposal, onAccept }: { proposal: ActionableProposal; onAccept: () => void }) {
  const { action, detail, tone } = proposalSummary(proposal);
  return (
    <button
      onClick={onAccept}
      title={proposal.reason || undefined}
      className="mt-2 flex w-full items-center gap-2 rounded-md border border-border bg-raised px-2 py-1.5 text-left text-[11px] transition-colors hover:border-hub/40"
    >
      <span className="text-faint">→</span>
      <Pill tone={tone}>{action}</Pill>
      <span className="min-w-0 flex-1 text-muted">{detail}</span>
      <span className="text-hub">accept</span>
    </button>
  );
}

function CaptureToTaskForm({
  capture,
  today,
  proposal,
  onSubmit,
}: {
  capture: InboxItem;
  today: string;
  /** A task proposal prefills the form, so "→ task" on a parsed capture means
   *  correcting a draft rather than retyping it. */
  proposal: ActionableProposal | null;
  onSubmit: (body: object) => void;
}) {
  const draft = proposal?.kind === "task" ? proposal : null;
  const [title, setTitle] = useState(draft?.title ?? capture.text);
  const [domain, setDomain] = useState<Domain>(draft?.domain ?? "personal");
  const [due, setDue] = useState(draft?.due?.slice(0, 10) ?? today);
  const [invalid, setInvalid] = useState(false);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) {
          setInvalid(true);
          return;
        }
        setInvalid(false);
        onSubmit({ action: "task", title: title.trim(), domain, due: due || null });
      }}
      className="mt-2 flex flex-col gap-2 rounded-md border border-border bg-raised p-2"
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        aria-invalid={invalid}
        aria-label="task title"
        className="rounded border border-border bg-surface px-2 py-1 text-sm aria-[invalid=true]:border-danger"
      />
      {invalid && (
        <p role="alert" className="text-[11px] text-danger">
          enter a title
        </p>
      )}
      <div className="flex gap-2">
        <select
          value={domain}
          onChange={(e) => setDomain(e.target.value as Domain)}
          className="flex-1 rounded border border-border bg-surface px-1.5 py-1 text-xs text-muted"
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
          aria-label="due date"
          className="rounded border border-border bg-surface px-1.5 py-1 text-xs text-muted"
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
