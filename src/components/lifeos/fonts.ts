import { Newsreader } from "next/font/google";

// The Overview's display serif (decision #87): the date, the wordmark, the
// print's caption and the German word. Instrument Serif — the app's other
// serif — has one light weight, and the date is this page's identity, so it
// needs a face with a real semibold. Declared here, not in the root layout, so
// only `/` preloads it; self-hosted by next/font at build time like the other.
export const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-newsreader",
});
