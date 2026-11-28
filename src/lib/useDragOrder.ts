"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type KeyboardEvent, type PointerEvent } from "react";

/**
 * Reordering a list by a drag handle, with the keyboard as an equal way in.
 *
 * Pointer: press the handle and move; the list reorders live as the pointer
 * passes each row's middle, and the new order is saved on release. Pointer
 * events (not HTML drag and drop) so it works the same with a mouse, a pen and
 * touch, and the row itself is what moves rather than a ghost image.
 *
 * Keyboard: the handle is a button; Arrow Up and Arrow Down move the row one
 * place and save at once, and a status line says where it went.
 *
 * Optimistic like `useOptimisticToggle`: the local order shows at once, a
 * failed save puts the previous order back and says so, and a success
 * refreshes the page's data from the server.
 */
export function useDragOrder({
  ids,
  labelOf,
  save,
}: {
  /** The server's order. */
  ids: number[];
  labelOf: (id: number) => string;
  save: (order: number[]) => Promise<Response>;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [local, setLocal] = useState<number[] | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rows = useRef(new Map<number, HTMLElement>());
  const before = useRef<number[]>([]);

  // The local order wins only while it names the same habits the server does;
  // once a habit is added or removed the server's order takes over again.
  const sameSet = local !== null && local.length === ids.length && ids.every((id) => local.includes(id));
  const order = sameSet ? local : ids;

  async function commit(next: number[], previous: number[]) {
    if (next.join() === previous.join()) return;
    setError(null);
    const res = await save(next).catch(() => null);
    if (!res?.ok) {
      setLocal(previous);
      setError("could not save the new order, try again");
      return;
    }
    startTransition(() => router.refresh());
  }

  function announce(id: number, next: number[]) {
    setStatus(`${labelOf(id)} moved to position ${next.indexOf(id) + 1} of ${next.length}`);
  }

  function handleProps(id: number) {
    return {
      onPointerDown(e: PointerEvent<HTMLElement>) {
        if (e.button !== 0) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        before.current = order;
        setDragId(id);
      },
      onPointerMove(e: PointerEvent<HTMLElement>) {
        if (dragId !== id) return;
        // The dragged row's new index is the number of other rows whose middle
        // the pointer has passed.
        const others = order.filter((o) => o !== id);
        let index = 0;
        for (const o of others) {
          const r = rows.current.get(o)?.getBoundingClientRect();
          if (r && e.clientY > r.top + r.height / 2) index++;
        }
        const next = [...others];
        next.splice(index, 0, id);
        if (next.join() !== order.join()) setLocal(next);
      },
      onPointerUp() {
        if (dragId !== id) return;
        setDragId(null);
        if (order.join() !== before.current.join()) announce(id, order);
        void commit(order, before.current);
      },
      onPointerCancel() {
        if (dragId !== id) return;
        setDragId(null);
        setLocal(before.current);
      },
      onKeyDown(e: KeyboardEvent<HTMLElement>) {
        const step = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
        if (!step) return;
        e.preventDefault();
        const from = order.indexOf(id);
        const to = from + step;
        if (to < 0 || to >= order.length) return;
        const next = [...order];
        next.splice(from, 1);
        next.splice(to, 0, id);
        setLocal(next);
        announce(id, next);
        void commit(next, order);
      },
    };
  }

  /** Attach to each row so the pointer can be measured against it. */
  function rowRef(id: number) {
    return (el: HTMLElement | null) => {
      if (el) rows.current.set(id, el);
      else rows.current.delete(id);
    };
  }

  return { order, dragId, handleProps, rowRef, status, error };
}
