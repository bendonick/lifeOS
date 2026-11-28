// The prints in a page's masthead (decisions #88, #91). Pure and client-safe:
// the daily pick takes the date it works from, so a node check can move the
// calendar (helpers take `today`).
//
// A page shows one *collection*: the Overview's landscapes, Academic's desk
// prints. Rotation, browsing and the pin all stay inside a collection.
//
// The files live in public/artwork/. Six are standalone 3:1 prints; the coast
// and Lake Tahoe were cropped out of the dashboard mockups they were drawn in,
// so they are ~550px wide and are shown at their native softness.

export type ArtworkCollection = "overview" | "academic";

export interface Artwork {
  id: string;
  collection: ArtworkCollection;
  /** `object-position` for a slot shallower than the file's 3:1 — which band of
   *  the print survives the crop. Defaults to the centre. */
  focus?: string;
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
    collection: "overview",
    src: "/artwork/zurich-quaibruecke.webp",
    caption: "Zürich — Quaibrücke",
    alt: "Block print of Zürich seen across the Limmat: the Quaibrücke, the Fraumünster spire and the twin towers of the Grossmünster under banded clouds.",
    width: 1800,
    height: 600,
  },
  {
    id: "mont-blanc-chamonix",
    collection: "overview",
    src: "/artwork/mont-blanc-chamonix.webp",
    caption: "Mont Blanc — Chamonix",
    alt: "Block print of the Mont Blanc massif above Chamonix: dark rock needles, a glacier running down the snow dome, and two small huts on a ridge.",
    width: 1800,
    height: 600,
  },
  {
    id: "seattle-puget-sound",
    collection: "overview",
    src: "/artwork/seattle-puget-sound.webp",
    caption: "Seattle — Puget Sound",
    alt: "Block print of Seattle from across Puget Sound, the skyline low on the water.",
    width: 1800,
    height: 600,
  },
  {
    id: "northern-california-coast",
    collection: "overview",
    src: "/artwork/northern-california-coast.webp",
    caption: "Northern California coast",
    alt: "Painted print of the Northern California coast: golden grass on a bluff, a red-roofed house, and headlands fading into fog over a dark sea.",
    width: 549,
    height: 182,
  },
  {
    id: "lake-tahoe",
    collection: "overview",
    src: "/artwork/lake-tahoe.webp",
    caption: "Lake Tahoe",
    alt: "Block print of Lake Tahoe: a snow-capped range across deep blue water, dark pines in the foreground and a small red cabin on the far shore.",
    width: 558,
    height: 186,
  },
  {
    id: "network-notebook",
    collection: "academic",
    src: "/artwork/network-notebook.webp",
    caption: "Network notebook",
    alt: "Block print of an open squared notebook with a network of nodes and edges drawn across both pages, one node ringed in orange, and a fountain pen resting at the edge.",
    focus: "50% 44%",
    width: 1800,
    height: 600,
  },
  {
    id: "reading-desk",
    collection: "academic",
    src: "/artwork/reading-desk.webp",
    caption: "Reading desk",
    alt: "Block print of an open book lying on two closed navy volumes, an orange ribbon marker hanging from its pages.",
    focus: "50% 38%",
    width: 1800,
    height: 600,
  },
  {
    id: "drafting-compass",
    collection: "academic",
    src: "/artwork/drafting-compass.webp",
    caption: "Drafting compass",
    alt: "Block print of a drafting compass with an orange pencil, standing on the circle it has just drawn among fainter construction arcs.",
    focus: "50% 62%",
    width: 1800,
    height: 600,
  },
];

export function artworksIn(collection: ArtworkCollection): Artwork[] {
  return ARTWORKS.filter((a) => a.collection === collection);
}

export function artworkById(id: string | null | undefined): Artwork | undefined {
  return ARTWORKS.find((a) => a.id === id);
}

/** Whole days since 1970-01-01 for a 'YYYY-MM-DD' date. */
function dayNumber(date: string): number {
  return Math.round(Date.parse(`${date}T12:00:00Z`) / 86_400_000);
}

/** The print for a Zürich calendar day: one step through the collection per day. */
export function dailyArtwork(today: string, collection: ArtworkCollection = "overview"): Artwork {
  const list = artworksIn(collection);
  return list[dayNumber(today) % list.length];
}

/** The print `step` places after (or before) `id` in its own collection, wrapping at both ends. */
export function neighbourArtwork(id: string, step: 1 | -1): Artwork {
  const list = artworksIn(artworkById(id)?.collection ?? "overview");
  const i = list.findIndex((a) => a.id === id);
  return list[(Math.max(i, 0) + step + list.length) % list.length];
}
