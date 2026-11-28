"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { inputChrome } from "@/components/ui/controls";
import { PAYMENT_NOTE_MAX, checkPaymentNote } from "@/lib/personal/payments";

/**
 * A payment's note, read and written in place: one text box that saves when
 * it loses focus (or on Cmd/Ctrl+Enter), with the state in words beneath it
 * ("Saved", "Saving…", or what went wrong). Clearing it removes the note. No
 * Save button: the box is the note, as on paper.
 */
export function PaymentNote({ billId, name, initial }: { billId: number; name: string; initial: string | null }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [text, setText] = useState(initial ?? "");
  const [saved, setSaved] = useState(initial ?? "");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const statusId = useId();

  async function save() {
    if (text.trim() === saved.trim()) return;
    const checked = checkPaymentNote(text);
    if ("error" in checked) {
      setState("error");
      setError(checked.error);
      return;
    }
    setState("saving");
    setError(null);
    const res = await fetch(`/api/bills/${billId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: checked.note }),
    }).catch(() => null);
    if (!res?.ok) {
      const msg = await res?.json().then((j) => j?.error).catch(() => null);
      setState("error");
      setError(typeof msg === "string" ? msg : "could not save the note");
      return;
    }
    setSaved(checked.note ?? "");
    setState("saved");
    startTransition(() => router.refresh());
  }

  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (state !== "saving") setState("idle");
        }}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            save();
          }
        }}
        rows={3}
        maxLength={PAYMENT_NOTE_MAX}
        placeholder="Anything worth keeping about this payment…"
        aria-label={`Note for ${name}`}
        aria-describedby={statusId}
        aria-invalid={state === "error"}
        className={`block w-full resize-y text-sm leading-relaxed ${inputChrome}`}
      />
      <p id={statusId} role="status" className={`mt-1 text-xs ${state === "error" ? "text-danger" : "text-faint"}`}>
        {state === "saving"
          ? "Saving…"
          : state === "saved"
            ? "Saved"
            : state === "error"
              ? error
              : text.trim() !== saved.trim()
                ? "Saves when you click away"
                : ""}
      </p>
    </div>
  );
}
