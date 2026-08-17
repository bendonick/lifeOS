import type { Metadata } from "next";
import { Instrument_Serif } from "next/font/google";
import "./globals.css";

// The editorial half of the type pairing (decision #48). One high-contrast
// serif, one weight, used only for display: page titles, section names and
// hero numerals. Everything functional — tables, labels, controls — stays on
// the system sans, which is what keeps data legible at 11px and keeps tabular
// figures aligned.
//
// Self-hosted by next/font at build time, so no request leaves the machine at
// runtime: a local-first app that phones Google for a font on every page view
// would not be local-first.
const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "LifeOS",
  description: "Local personal operating system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={serif.variable}>
      <body>{children}</body>
    </html>
  );
}
