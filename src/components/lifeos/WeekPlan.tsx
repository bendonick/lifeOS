"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Link2, X } from "lucide-react";
import { accentButton, accentControl, urgencyText } from "@/components/ui/accents";
import { buttonChrome, primaryButtonChrome, selectChrome } from "@/components/ui/controls";
import { RowAction } from "@/components/ui/RowAction";
import { dayLabel, dueInfo } from "@/lib/dates";
import { splitNote } from "@/lib/plan/split";
import type { PlanTask, ProposalItem, UndoPayload } from "@/lib/plan/types";
import { useOptimisticToggle } from "@/lib/useOptimisticToggle";
import { useTransientStatus } from "@/lib/useTransientStatus";
import { DOMAINS, type Domain } from "@/lib/types";

// The hub's Week plan (decisions #82–#85; docs/08-week-plan-brief.md). A note is
// parsed into a draft by scripts/plan_parse.py; nothing is written until the user
// adds the draft; every apply can be undone. Laws of UX applied: one
// primary button per state (Von Restorff), the pending line appears at once
// (Doherty), free text in (Postel), one box per item in the header
// (Goal-gradient), last week's leftovers offered, never pushed (Zeigarnik, not
// weaponised — no badge, no nag).

const DOMAIN_LABEL: Record<Domain, string> = {
  academic: "Academic",
  personal: "Personal",
  professional: "Professional",
};

const DOT: Record<Domain, string> = {
  academic: "bg-academic",
  personal: "bg-personal",
  professional: "bg-professional",
};

// Named steps, not "Processing…" (decision #85). One API call does all three;
// the text follows the order the parser works in.
const PROGRESS = [
  [0, "Reading your note…"],
  [1500, "Matching it to your courses and open tasks…"],
  [4500, "Writing the draft…"],
] as const;

type DraftItem = ProposalItem;

type Draft = { noteId: number; items: DraftItem[]; source: "parser" | "split" };

type Failure = { noteId: number; message: string };

/** Items grouped for display: a group appears where its first member does. */
function blocks<T>(items: T[], groupOf: (item: T) => string | null): Array<{ group: string | null; members: T[] }> {
  const out: Array<{ group: string | null; members: T[] }> = [];
  const byGroup = new Map<string, { group: string | null; members: T[] }>();
  for (const item of items) {
    const group = groupOf(item);
    if (!group) {
      out.push({ group: null, members: [item] });
      continue;
    }
    const existing = byGroup.get(group);
    if (existing) existing.members.push(item);
    else {
      const block = { group, members: [item] };
      byGroup.set(group, block);
      out.push(block);
    }
  }
  return out;
}

function Dot({ domain }: { domain: Domain }) {
  return <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${DOT[domain]}`} />;
}

export function WeekPlan({
  plan,
  leftovers,
  leftoverLabel,
}: {
  plan: PlanTask[];
  leftovers: PlanTask[];
  /** "last week" or "earlier weeks" — from leftoverSourceLabel(). */
  leftoverLabel: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const refresh = () => startTransition(() => router.refresh());

  const [text, setText] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [progress, setProgress] = useState<string>(PROGRESS[0][1]);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useTransientStatus(9000);
  const [undo, setUndo] = useState<UndoPayload | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // The progress text advances on a timer while the parser runs; planIt() resets
  // it to the first step when a parse starts.
  useEffect(() => {
    if (!parsing) return;
    const timers = PROGRESS.slice(1).map(([ms, label]) => setTimeout(() => setProgress(label), ms));
    return () => timers.forEach(clearTimeout);
  }, [parsing]);

  const toggles = useOptimisticToggle<PlanTask>({
    idOf: (t) => t.id,
    labelOf: (t) => t.title,
    send: (t, next) =>
      fetch(`/api/tasks/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: next }),
      }),
  });

  const hasPlan = plan.length > 0;
  const showCompose = !hasPlan || composeOpen || parsing || failure !== null;

  async function planIt() {
    const note = text.trim();
    if (!note) {
      setError("Write at least one thing first.");
      textareaRef.current?.focus();
      return;
    }
    setError(null);
    setFailure(null);
    setProgress(PROGRESS[0][1]);
    setParsing(true);
    const res = await fetch("/api/plan/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: note }),
    }).catch(() => null);
    setParsing(false);
    const body = res ? await res.json().catch(() => null) : null;
    if (!res?.ok || !body) {
      setError(body?.error ?? "Could not reach the app — is the dev server running?");
      return;
    }
    if (body.status === "proposed" && body.proposal) {
      if (body.proposal.items.length === 0) {
        setError("The planner found nothing to add in that note.");
        return;
      }
      setDraft({ noteId: body.note_id, items: body.proposal.items, source: "parser" });
      return;
    }
    setFailure({ noteId: body.note_id, message: body.error });
  }

  function splitMyself() {
    if (!failure) return;
    const items: DraftItem[] = splitNote(text).map((title, i) => ({
      key: `s${i}`,
      title,
      domain: "personal",
      course_id: null,
      project_id: null,
      context: null,
      group: null,
      due: null,
      match: null,
      reason: null,
    }));
    if (items.length === 0) {
      setError("There is nothing to split in that note.");
      return;
    }
    setDraft({ noteId: failure.noteId, items, source: "split" });
    setFailure(null);
  }

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setDraft((d) => d && { ...d, items: d.items.map((it) => (it.key === key ? { ...it, ...patch } : it)) });
  }

  function removeItem(key: string) {
    setDraft((d) => {
      if (!d) return d;
      const items = d.items.filter((it) => it.key !== key);
      // A group left with one member is no longer a group.
      const counts = new Map<string, number>();
      for (const it of items) if (it.group) counts.set(it.group, (counts.get(it.group) ?? 0) + 1);
      return { ...d, items: items.map((it) => (it.group && counts.get(it.group)! < 2 ? { ...it, group: null } : it)) };
    });
  }

  async function discardDraft() {
    if (!draft) return;
    const noteId = draft.noteId;
    setDraft(null);
    await fetch(`/api/plan/notes/${noteId}/discard`, { method: "POST" }).catch(() => null);
  }

  async function addDraft() {
    if (!draft) return;
    const empty = draft.items.find((it) => !it.title.trim());
    if (empty) {
      setError("Every item needs a title — remove the empty one or write it.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/plan/notes/${draft.noteId}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: draft.items.map((it) => ({
          title: it.title,
          domain: it.domain,
          course_id: it.course_id,
          project_id: it.project_id,
          group: it.group,
          due: it.due,
          match_id: it.match?.id ?? null,
        })),
      }),
    }).catch(() => null);
    setSaving(false);
    const body = res ? await res.json().catch(() => null) : null;
    if (!res?.ok || !body?.undo) {
      setError(body?.error ?? "Could not add the items — nothing was saved. Try again.");
      return;
    }
    const n = draft.items.length;
    setDraft(null);
    setText("");
    setComposeOpen(false);
    setUndo(body.undo);
    setStatus(`${n} ${n === 1 ? "item" : "items"} added to this week.`);
    refresh();
  }

  async function undoLast() {
    if (!undo) return;
    const payload = undo;
    setUndo(null);
    const res = await fetch("/api/plan/undo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ undo: payload }),
    }).catch(() => null);
    if (!res?.ok) {
      setError("Could not undo — the change is still saved.");
      return;
    }
    setStatus("Undone.");
    refresh();
  }

  const showCancel = hasPlan && composeOpen && !parsing;

  return (
    <div>
        {showCompose && !draft && (
          <div aria-busy={parsing} className="mb-5">
            <label htmlFor="plan-note" className="mb-2 block text-sm font-medium text-text">
              {hasPlan ? "Anything else this week?" : "What do you want to get done this week?"}
            </label>
            {/* The page's one input open at rest (decision #64's hub exception now
                covers this box as well as the capture box — #82). */}
            <textarea
              id="plan-note"
              ref={textareaRef}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  if (!parsing) planIt();
                }
              }}
              readOnly={parsing}
              rows={4}
              aria-invalid={error ? true : undefined}
              aria-describedby="plan-note-help"
              placeholder="polish the ATAI chatbot, buy a mop, link fitbit to lifeSTREAMS…"
              className="block min-h-26 w-full resize-y rounded-lg border border-border bg-(--color-inset) px-3.5 py-3 text-sm leading-relaxed text-text placeholder:text-faint"
            />
            {parsing && <div className="mt-2 h-0.5 rounded-full bg-hub/50" aria-hidden="true" />}
            <div className="mt-2.5 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
              <p id="plan-note-help" className="max-w-xl text-xs text-faint">
                {parsing
                  ? progress
                  : "Write it the way you think it. Plan it sends this note, your course and project names and your open task titles to Claude, then shows a draft — nothing is saved until you add it."}
              </p>
              <div className="flex shrink-0 gap-2">
                {showCancel && (
                  <button
                    type="button"
                    onClick={() => {
                      setComposeOpen(false);
                      setFailure(null);
                      setError(null);
                    }}
                    className={buttonChrome}
                  >
                    Cancel
                  </button>
                )}
                {!failure && (
                  <button
                    type="button"
                    onClick={planIt}
                    disabled={parsing}
                    className={`${primaryButtonChrome} ${accentButton.hub} disabled:cursor-default`}
                  >
                    {parsing ? "Planning…" : "Plan it"}
                  </button>
                )}
              </div>
            </div>
            {failure && (
              <div role="alert" className="row-card mt-3 px-3 py-2.5">
                <p className="text-sm font-medium text-danger">{failure.message}</p>
                <p className="mt-0.5 text-xs text-muted">Your note is kept. Try again, or split it into items yourself.</p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <button type="button" onClick={splitMyself} className={`${primaryButtonChrome} ${accentButton.hub}`}>
                    Split it myself
                  </button>
                  <button type="button" onClick={planIt} className={buttonChrome}>
                    Try again
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {draft && (
          <DraftPanel
            draft={draft}
            saving={saving}
            onTitle={(key, title) => updateItem(key, { title })}
            onDomain={(key, domain) =>
              updateItem(key, { domain, ...(domain !== "academic" ? { course_id: null, context: null } : {}) })
            }
            onRemove={removeItem}
            onAdd={addDraft}
            onDiscard={discardDraft}
          />
        )}

        {error && (
          <p role="alert" className="mb-3 text-xs text-danger">
            {error}
          </p>
        )}

        {leftovers.length > 0 && !draft && (
          <Leftovers
            items={leftovers}
            label={leftoverLabel}
            onDone={(payload, message) => {
              setUndo(payload);
              setStatus(message);
              refresh();
            }}
            onError={setError}
          />
        )}

        {hasPlan && (
          <PlanList plan={plan} valueFor={toggles.valueFor} onToggle={toggles.toggle} />
        )}
        {toggles.error && (
          <p role="alert" className="mt-2 text-xs text-danger">
            {toggles.error}
          </p>
        )}

        {hasPlan && !showCompose && !draft && (
          <button
            type="button"
            onClick={() => {
              setComposeOpen(true);
              setTimeout(() => textareaRef.current?.focus(), 0);
            }}
            className={`${buttonChrome} mt-3`}
          >
            + Add to this week
          </button>
        )}

        <div role="status" className="mt-2 flex items-center gap-3 text-xs text-muted empty:mt-0">
          {status && <span>{status}</span>}
          {status && undo && (
            <button type="button" onClick={undoLast} className="text-xs font-medium text-hub underline-offset-2 hover:underline">
              Undo
            </button>
          )}
        </div>

    </div>
  );
}

/** The header's progress: "2 of 7 done" and one box per item (Goal-gradient). */
export function PlanProgress({ done, total }: { done: number; total: number }) {
  if (total === 0) return <>Nothing planned yet</>;
  return (
    <span className="inline-flex items-center gap-2.5">
      <span>
        {done} of {total} done
      </span>
      <span aria-hidden="true" className="inline-flex gap-[3px]">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`h-1.5 w-3.5 rounded-sm ${i < done ? "bg-hub" : "bg-border"}`} />
        ))}
      </span>
    </span>
  );
}

function PlanList({
  plan,
  valueFor,
  onToggle,
}: {
  plan: PlanTask[];
  valueFor: (t: PlanTask, server: boolean) => boolean;
  onToggle: (t: PlanTask, current: boolean) => void;
}) {
  return (
    <ul className="flex flex-col gap-1.5" aria-label="This week's plan">
      {blocks(plan, (t) => t.plan_group).map((block) =>
        block.group ? (
          <li key={`g:${block.group}`}>
            <div className="flex items-center gap-2 px-1.5 pb-1.5 pt-2">
              <Dot domain={block.members[0].domain} />
              <span className="text-sm font-semibold text-text">{block.group}</span>
              <span className="tabular text-xs text-faint">
                {block.members.filter((m) => valueFor(m, m.done === 1)).length} of {block.members.length}
              </span>
            </div>
            <ul className="ml-7 flex flex-col gap-1.5">
              {block.members.map((t) => (
                <PlanRow key={t.id} task={t} done={valueFor(t, t.done === 1)} onToggle={onToggle} inGroup />
              ))}
            </ul>
          </li>
        ) : (
          <PlanRow key={block.members[0].id} task={block.members[0]} done={valueFor(block.members[0], block.members[0].done === 1)} onToggle={onToggle} />
        )
      )}
    </ul>
  );
}

function PlanRow({
  task,
  done,
  onToggle,
  inGroup = false,
}: {
  task: PlanTask;
  done: boolean;
  onToggle: (t: PlanTask, current: boolean) => void;
  inGroup?: boolean;
}) {
  const due = task.due ? dueInfo(task.due) : null;
  return (
    <li className="row-card flex min-h-10 items-center gap-2.5 py-1.5 pl-1.5 pr-3">
      {/* 24px target around a 16px box (decision #76); the label covers the title,
          so the whole text toggles too. */}
      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5">
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center">
          <input
            type="checkbox"
            checked={done}
            onChange={() => onToggle(task, done)}
            className={`h-4 w-4 cursor-pointer ${accentControl.hub}`}
            aria-label={`done: ${task.title}`}
          />
        </span>
        <span className={`min-w-0 text-sm transition-colors ${done ? "text-muted line-through" : "text-text"}`}>
          {task.title}
        </span>
      </label>
      {due && !done && <span className={`shrink-0 text-xs ${urgencyText[due.urgency]}`}>{due.label}</span>}
      {!inGroup && (
        <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted">
          <Dot domain={task.domain} />
          {task.context ?? DOMAIN_LABEL[task.domain]}
        </span>
      )}
    </li>
  );
}

function DraftPanel({
  draft,
  saving,
  onTitle,
  onDomain,
  onRemove,
  onAdd,
  onDiscard,
}: {
  draft: Draft;
  saving: boolean;
  onTitle: (key: string, title: string) => void;
  onDomain: (key: string, domain: Domain) => void;
  onRemove: (key: string) => void;
  onAdd: () => void;
  onDiscard: () => void;
}) {
  const n = draft.items.length;
  const matched = draft.items.filter((it) => it.match).length;
  const headline =
    draft.source === "split"
      ? `Draft · ${n} ${n === 1 ? "item" : "items"} split from your note`
      : `Draft · ${n - matched} new${matched ? `, ${matched} already on your list` : ""}`;

  return (
    <section
      aria-label="Draft from your note"
      aria-busy={saving}
      className="mb-5 rounded-lg border border-dashed border-border-strong px-3.5 pb-3 pt-3"
    >
      {saving && <div className="-mt-3 mb-3 h-0.5 rounded-full bg-hub/50" aria-hidden="true" />}
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-sm font-semibold text-text">{headline}</h3>
        <p className="text-xs text-faint">Nothing is saved until you add it. Click a title to edit it.</p>
      </div>
      <ul className="flex flex-col gap-1.5">
        {blocks(draft.items, (it) => it.group).map((block) =>
          block.group ? (
            <li key={`g:${block.group}`}>
              <div className="flex items-center gap-2 px-1.5 pb-1.5 pt-1">
                <Dot domain={block.members[0].domain} />
                <span className="text-sm font-semibold text-text">{block.group}</span>
                <span className="text-xs text-faint">grouped — {block.members.length} items about one thing</span>
              </div>
              <ul className="ml-7 flex flex-col gap-1.5">
                {block.members.map((it) => (
                  <DraftRow key={it.key} item={it} onTitle={onTitle} onDomain={onDomain} onRemove={onRemove} />
                ))}
              </ul>
            </li>
          ) : (
            <DraftRow key={block.members[0].key} item={block.members[0]} onTitle={onTitle} onDomain={onDomain} onRemove={onRemove} />
          )
        )}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onAdd}
          disabled={saving || n === 0}
          className={`${primaryButtonChrome} ${accentButton.hub} disabled:cursor-default`}
        >
          {saving ? "Adding…" : `Add ${n} to this week`}
        </button>
        <button type="button" onClick={onDiscard} disabled={saving} className={buttonChrome}>
          Discard
        </button>
      </div>
    </section>
  );
}

function DraftRow({
  item,
  onTitle,
  onDomain,
  onRemove,
}: {
  item: DraftItem;
  onTitle: (key: string, title: string) => void;
  onDomain: (key: string, domain: Domain) => void;
  onRemove: (key: string) => void;
}) {
  if (item.match) {
    const due = item.match.due ? `, due ${dayLabel(item.match.due.slice(0, 10))}` : "";
    return (
      <li className="row-card flex items-start gap-2.5 py-2 pl-3 pr-1.5">
        <Link2 size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-hub" />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-text">
            {item.match.title}
            {item.context && <span className="ml-2 text-xs text-muted">{item.context}</span>}
          </p>
          <p className="mt-0.5 text-xs text-faint">
            Already on your list{due}. It joins this week&apos;s plan — not added twice.
          </p>
        </div>
        <span className="shrink-0 pt-0.5 text-xs text-muted">Matched</span>
        <RowAction icon={X} label={`Remove ${item.match.title} from the draft`} onClick={() => onRemove(item.key)} />
      </li>
    );
  }
  return (
    <li className="row-card flex items-start gap-2 py-1.5 pl-1.5 pr-1.5">
      <div className="min-w-0 flex-1">
        <input
          value={item.title}
          onChange={(e) => onTitle(item.key, e.target.value)}
          aria-label="Item title"
          className="w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-sm text-text transition-colors hover:border-border"
        />
        {item.reason && <p className="px-1.5 pb-0.5 text-xs text-faint">{item.reason}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2 pt-0.5">
        {item.due && <span className="text-xs text-text">{dueInfo(item.due).label}</span>}
        {item.context && <span className="text-xs text-muted">{item.context}</span>}
        <span className="inline-flex items-center gap-1.5">
          <Dot domain={item.domain} />
          <select
            value={item.domain}
            onChange={(e) => onDomain(item.key, e.target.value as Domain)}
            aria-label={`Domain of ${item.title || "this item"}`}
            className={`${selectChrome} w-30 py-1 text-xs`}
          >
            {DOMAINS.map((d) => (
              <option key={d} value={d}>
                {DOMAIN_LABEL[d]}
              </option>
            ))}
          </select>
        </span>
        <RowAction icon={X} label={`Remove ${item.title || "this item"} from the draft`} onClick={() => onRemove(item.key)} />
      </div>
    </li>
  );
}

function Leftovers({
  items,
  label,
  onDone,
  onError,
}: {
  items: PlanTask[];
  label: string;
  onDone: (undo: UndoPayload, message: string) => void;
  onError: (message: string) => void;
}) {
  // Everything is checked by default: carrying over is the common case, and a
  // dropped item is one click away from coming back (Undo).
  const [keep, setKeep] = useState<Set<number>>(() => new Set(items.map((t) => t.id)));
  const [busy, setBusy] = useState(false);
  // Hidden as soon as the server confirms, not when the refreshed page arrives —
  // in between, a second click would resolve the same items again.
  const [resolved, setResolved] = useState(false);
  const carry = items.filter((t) => keep.has(t.id));
  const drop = items.filter((t) => !keep.has(t.id));

  async function resolve(carryIds: number[], dropIds: number[]) {
    setBusy(true);
    const res = await fetch("/api/plan/leftovers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ carry: carryIds, drop: dropIds }),
    }).catch(() => null);
    setBusy(false);
    const body = res ? await res.json().catch(() => null) : null;
    if (!res?.ok || !body?.undo) {
      onError(body?.error ?? "Could not move last week's items — nothing changed.");
      return;
    }
    setResolved(true);
    const parts = [];
    if (carryIds.length) parts.push(`${carryIds.length} carried over`);
    if (dropIds.length) parts.push(`${dropIds.length} dropped`);
    onDone(body.undo, `${parts.join(", ")}.`);
  }

  if (resolved) return null;

  const primaryLabel =
    drop.length === 0 ? `Carry over ${carry.length}` : carry.length === 0 ? `Drop ${drop.length}` : `Carry over ${carry.length}, drop ${drop.length}`;

  return (
    <section
      aria-label={`Unfinished from ${label}`}
      aria-busy={busy}
      className="mb-5 rounded-lg border border-dashed border-border-strong px-3.5 pb-3 pt-3"
    >
      <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-sm font-semibold text-text">
          {items.length} left from {label}
        </h3>
        <p className="text-xs text-faint">Checked items move into this week.</p>
      </div>
      <ul className="flex flex-col gap-1.5">
        {items.map((t) => (
          <li key={t.id} className="row-card flex min-h-10 items-center gap-2.5 py-1.5 pl-1.5 pr-3">
            <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center">
                <input
                  type="checkbox"
                  checked={keep.has(t.id)}
                  onChange={() =>
                    setKeep((s) => {
                      const next = new Set(s);
                      if (next.has(t.id)) next.delete(t.id);
                      else next.add(t.id);
                      return next;
                    })
                  }
                  className={`h-4 w-4 cursor-pointer ${accentControl.hub}`}
                  aria-label={`carry over: ${t.title}`}
                />
              </span>
              <span className="min-w-0 text-sm text-text">{t.title}</span>
            </label>
            <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted">
              <Dot domain={t.domain} />
              {t.plan_group ?? t.context ?? DOMAIN_LABEL[t.domain]}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => resolve(carry.map((t) => t.id), drop.map((t) => t.id))}
          className={`${primaryButtonChrome} ${accentButton.hub}`}
        >
          {primaryLabel}
        </button>
        {carry.length > 0 && (
          <button type="button" disabled={busy} onClick={() => resolve([], items.map((t) => t.id))} className={buttonChrome}>
            Drop all
          </button>
        )}
      </div>
    </section>
  );
}
