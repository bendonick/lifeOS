import Link from "next/link";
import { Briefcase, GraduationCap, Heart } from "lucide-react";
import { accentText, type Accent } from "@/components/ui/accents";

// Captions per docs/03-pages/lifeos.md §5. Icons from lucide like every other
// chrome icon in the app — the hand-drawn ui/icons.tsx trio is retired.
const TILES: { href: string; accent: Accent; name: string; caption: string; icon: React.ReactNode }[] = [
  { href: "/academic", accent: "academic", name: "Academic", caption: "Courses · MSc project", icon: <GraduationCap size={20} /> },
  { href: "/personal", accent: "personal", name: "Personal", caption: "health · habits · money", icon: <Heart size={20} /> },
  { href: "/professional", accent: "professional", name: "Professional", caption: "Day job · learning · network", icon: <Briefcase size={20} /> },
];

export function DomainTiles() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {TILES.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          // The subordinate grammar (#70) in utilities, not `.row-card` — that
          // class is un-layered and would beat the hover ground swap.
          className="group rounded-md border border-border bg-(--color-inset) p-5 transition-colors hover:bg-raised"
        >
          <div className={accentText[t.accent]}>{t.icon}</div>
          <div className="mt-3 text-base font-semibold">{t.name}</div>
          <div className="mt-0.5 text-xs text-muted">{t.caption}</div>
        </Link>
      ))}
    </div>
  );
}
