// The landscape prints in the Overview header (decision #88). Pure and
// client-safe: the daily pick takes the date it works from, so a node check can
// move the calendar (helpers take `today`).
//
// The files live in public/artwork/. Three are standalone 3:1 prints; the coast
// and Lake Tahoe were cropped out of the dashboard mockups they were drawn in,
// so they are ~550px wide and are shown at their native softness.

export interface Artwork {
  id: string;
  src: string;
  /** The italic line under the print. */
  caption: string;
  alt: string;
  width: number;
  height: number;
}

export const ARTWORKS: readonly Artwork[] = [
  {
    id: "zurich-quaibruecke",
    src: "/artwork/zurich-quaibruecke.webp",
    caption: "Zürich — Quaibrücke",
    alt: "Block print of Zürich seen across the Limmat: the Quaibrücke, the Fraumünster spire and the twin towers of the Grossmünster under banded clouds.",
    width: 1800,
    height: 600,
  },
  {
    id: "mont-blanc-chamonix",
    src: "/artwork/mont-blanc-chamonix.webp",
    caption: "Mont Blanc — Chamonix",
    alt: "Block print of the Mont Blanc massif above Chamonix: dark rock needles, a glacier running down the snow dome, and two small huts on a ridge.",
    width: 1800,
    height: 600,
  },
  {
    id: "seattle-puget-sound",
    src: "/artwork/seattle-puget-sound.webp",
    caption: "Seattle — Puget Sound",
    alt: "Block print of Seattle from across Puget Sound, the skyline low on the water.",
    width: 1800,
    height: 600,
  },
  {
    id: "northern-california-coast",
    src: "/artwork/northern-california-coast.webp",
    caption: "Northern California coast",
    alt: "Painted print of the Northern California coast: golden grass on a bluff, a red-roofed house, and headlands fading into fog over a dark sea.",
    width: 549,
    height: 182,
  },
  {
    id: "lake-tahoe",
    src: "/artwork/lake-tahoe.webp",
    caption: "Lake Tahoe",
    alt: "Block print of Lake Tahoe: a snow-capped range across deep blue water, dark pines in the foreground and a small red cabin on the far shore.",
    width: 558,
    height: 186,
  },
];

export function artworkById(id: string | null | undefined): Artwork | undefined {
  return ARTWORKS.find((a) => a.id === id);
}

/** Whole days since 1970-01-01 for a 'YYYY-MM-DD' date. */
function dayNumber(date: string): number {
  return Math.round(Date.parse(`${date}T12:00:00Z`) / 86_400_000);
}

/** The print for a Zürich calendar day: one step through the list per day. */
export function dailyArtwork(today: string): Artwork {
  return ARTWORKS[dayNumber(today) % ARTWORKS.length];
}

/** The print `step` places after (or before) `id`, wrapping at both ends. */
export function neighbourArtwork(id: string, step: 1 | -1): Artwork {
  const i = ARTWORKS.findIndex((a) => a.id === id);
  return ARTWORKS[(Math.max(i, 0) + step + ARTWORKS.length) % ARTWORKS.length];
}
