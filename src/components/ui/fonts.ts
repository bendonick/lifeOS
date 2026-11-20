import { Newsreader } from "next/font/google";

// The Maritime pages' display serif (decisions #87, #91): the wordmark, page
// titles, section headings, captions. Instrument Serif — the app's other serif
// — has one light weight, and these pages lead with a heavy serif line, so they
// need a face with a real semibold. Declared here, not in the root layout, so
// only the pages that import it preload it; self-hosted by next/font at build
// time like the other.
export const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-newsreader",
});
