"use client";

import Image from "next/image";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Pin } from "lucide-react";
import { artworkById, neighbourArtwork, type Artwork } from "@/lib/overview/artwork";

// The landscape print in the Overview header (decision #88). The server picks
// what to show — the pinned print, else the day's — so a reload never flickers
// from one print to another. Previous / next browse in memory only; Pin stores
// the print on screen, and unpinning hands the slot back to the daily rotation.
// The image and its caption come from one piece of state, so they cannot drift.

export function ArtworkFrame({
  initialId,
  dailyId,
  pinnedId: initialPin,
}: {
  initialId: string;
  /** The day's print — what an unpin returns to. */
  dailyId: string;
  pinnedId: string | null;
}) {
  const [currentId, setCurrentId] = useState(initialId);
  const [pinnedId, setPinnedId] = useState<string | null>(initialPin);
  const [error, setError] = useState<string | null>(null);
  const art: Artwork = artworkById(currentId) ?? artworkById(dailyId)!;
  const pinned = pinnedId === art.id;

  async function togglePin() {
    const next = pinned ? null : art.id;
    const previous = pinnedId;
    setError(null);
    setPinnedId(next); // optimistic
    if (next === null) setCurrentId(dailyId);
    const res = await fetch("/api/overview/prefs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: next }),
    }).catch(() => null);
    if (!res?.ok) {
      setPinnedId(previous);
      if (next === null) setCurrentId(art.id);
      setError("could not save the pin — try again");
    }
  }

  const iconButton =
    "inline-flex h-7 w-7 items-center justify-center rounded text-text transition-colors hover:bg-raised";

  return (
    <figure className="m-0">
      {/* A fixed 3:1 slot: the print changes, the header's height does not. */}
      <div className="relative aspect-[3/1] w-full overflow-hidden">
        <Image
          key={art.id}
          src={art.src}
          alt={art.alt}
          width={art.width}
          height={art.height}
          // The files are already sized and encoded for this slot.
          unoptimized
          priority
          className="h-full w-full object-cover"
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setCurrentId(neighbourArtwork(art.id, -1).id)}
            aria-label="Previous print"
            className={iconButton}
          >
            <ChevronLeft size={17} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={togglePin}
            aria-pressed={pinned}
            aria-label={pinned ? "Unpin this print and resume the daily rotation" : "Pin this print"}
            title={pinned ? "Pinned — click to resume the daily rotation" : "Pin this print"}
            className={iconButton}
          >
            <Pin
              size={15}
              aria-hidden="true"
              className={pinned ? "fill-(--color-rust) text-(--color-hub)" : "text-muted"}
            />
          </button>
          <button
            type="button"
            onClick={() => setCurrentId(neighbourArtwork(art.id, 1).id)}
            aria-label="Next print"
            className={iconButton}
          >
            <ChevronRight size={17} aria-hidden="true" />
          </button>
          {error && (
            <span role="alert" className="ml-2 text-xs text-danger">
              {error}
            </span>
          )}
        </div>
        <figcaption aria-live="polite" className="t-serif !font-medium text-right text-[0.9375rem] italic text-muted">
          {art.caption}
        </figcaption>
      </div>
    </figure>
  );
}
