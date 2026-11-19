import { getConfig, getConfigJSON, setConfig } from "@/lib/db/config";
import { artworkById } from "@/lib/overview/artwork";

// The Overview's two small preferences (decision #88), kept in `config` — the
// app's one key/value store — so they survive a reload and a new browser alike.

export interface Currently {
  building: string;
  reading: string;
}

const CURRENTLY_KEY = "overview.currently";
const PIN_KEY = "overview.artwork_pin";

/** "SousChef" is the user's stated starting entry; reading starts empty. */
const DEFAULT_CURRENTLY: Currently = { building: "SousChef", reading: "" };

export function getCurrently(): Currently {
  const stored = getConfigJSON<Partial<Currently>>(CURRENTLY_KEY, {});
  return {
    building: typeof stored.building === "string" ? stored.building : DEFAULT_CURRENTLY.building,
    reading: typeof stored.reading === "string" ? stored.reading : DEFAULT_CURRENTLY.reading,
  };
}

export function setCurrently(patch: Partial<Currently>): Currently {
  const next = { ...getCurrently(), ...patch };
  setConfig(CURRENTLY_KEY, JSON.stringify(next));
  return next;
}

/** The pinned print's id, or null while the daily rotation is in charge. */
export function getArtworkPin(): string | null {
  const id = getConfig(PIN_KEY);
  return id && artworkById(id) ? id : null;
}

/** An empty value means "unpinned"; `config.value` is NOT NULL, so it is stored as "". */
export function setArtworkPin(id: string | null): void {
  setConfig(PIN_KEY, id ?? "");
}
