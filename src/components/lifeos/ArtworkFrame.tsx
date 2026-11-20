"use client";

import Image from "next/image";
import { createContext, useContext, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Pin } from "lucide-react";
import { artworkById, neighbourArtwork, type Artwork, type ArtworkCollection } from "@/lib/overview/artwork";

// A masthead's print (decisions #88, #91). The server picks what to show — the
// pinned print, else the day's — so a reload never flickers from one print to
// another. Previous / next browse in memory only; Pin stores the print on
// screen, and unpinning hands the slot back to the daily rotation.
//
// One provider holds the state; the image, the controls and the caption read
// it. That is what lets a page put them in different places (Academic keeps the
// controls in its section-link row) while the image and its caption still come
// from one value and cannot drift. `ArtworkFrame` is the stacked arrangement
// the Overview uses.

interface ArtworkState {
  art: Artwork;
  pinned: boolean;
  error: string | null;
  step: (by: 1 | -1) => void;
  togglePin: () => void;
}

const ArtworkContext = createContext<ArtworkState | null>(null);

function useArtwork(): ArtworkState {
  const ctx = useContext(ArtworkContext);
  if (!ctx) throw new Error("Artwork components need an ArtworkProvider");
  return ctx;
}

export function ArtworkProvider({
  collection,
  initialId,
  dailyId,
  pinnedId: initialPin,
  children,
}: {
  /** Whose prints these are — also whose pin is stored. Required: identity. */
  collection: ArtworkCollection;
  initialId: string;
  /** The day's print — what an unpin returns to. */
  dailyId: string;
  pinnedId: string | null;
  children: ReactNode;
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
      body: JSON.stringify({ collection, pin: next }),
    }).catch(() => null);
    if (!res?.ok) {
      setPinnedId(previous);
      if (next === null) setCurrentId(art.id);
      setError("could not save the pin — try again");
    }
  }

  return (
    <ArtworkContext.Provider
      value={{ art, pinned, error, togglePin, step: (by) => setCurrentId(neighbourArtwork(art.id, by).id) }}
    >
      {children}
    </ArtworkContext.Provider>
  );
}

/** The print in a fixed slot: the image changes, the masthead's height does not. */
export function ArtworkImage({ aspect = "aspect-[3/1]" }: { aspect?: string }) {
  const { art } = useArtwork();
  return (
    <div className={`relative w-full overflow-hidden ${aspect}`}>
      <Image
        key={art.id}
        src={art.src}
        alt={art.alt}
        width={art.width}
        height={art.height}
        // The files are already sized and encoded for this slot.
        unoptimized
        priority
        // Cropped, never stretched; `focus` picks the band a shallow slot keeps.
        style={{ objectPosition: art.focus }}
        className="h-full w-full object-cover"
      />
    </div>
  );
}

const iconButton = "inline-flex h-7 w-7 items-center justify-center rounded text-text transition-colors hover:bg-raised";

export function ArtworkControls() {
  const { pinned, error, step, togglePin } = useArtwork();
  return (
    <div className="flex items-center gap-0.5">
      <button type="button" onClick={() => step(-1)} aria-label="Previous print" className={iconButton}>
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
        <Pin size={15} aria-hidden="true" className={pinned ? "fill-(--color-rust) text-(--color-hub)" : "text-muted"} />
      </button>
      <button type="button" onClick={() => step(1)} aria-label="Next print" className={iconButton}>
        <ChevronRight size={17} aria-hidden="true" />
      </button>
      {error && (
        <span role="alert" className="ml-2 text-xs text-danger">
          {error}
        </span>
      )}
    </div>
  );
}

/** The print's name, announced when it changes. A <p>, so it works outside a <figure> too. */
export function ArtworkCaption({ className = "" }: { className?: string }) {
  const { art } = useArtwork();
  return (
    <p aria-live="polite" className={`t-serif !font-medium text-[0.9375rem] italic text-muted ${className}`}>
      {art.caption}
    </p>
  );
}

/** Image above, controls and caption beneath — the Overview's masthead. */
export function ArtworkFrame(props: {
  collection: ArtworkCollection;
  initialId: string;
  dailyId: string;
  pinnedId: string | null;
}) {
  return (
    <ArtworkProvider {...props}>
      <div>
        <ArtworkImage />
        <div className="mt-1.5 flex items-center justify-between gap-3">
          <ArtworkControls />
          <ArtworkCaption className="text-right" />
        </div>
      </div>
    </ArtworkProvider>
  );
}
