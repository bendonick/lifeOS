/**
 * A stored brief taken apart into its list items, for the Overview's compact
 * Morning brief (decision #90). The brief scripts write a markdown subset
 * (scripts/lifeos/briefs.py): each story or paper is a "- " bullet that opens
 * with a bold headline — `**Headline** — text [source](url)` for the world
 * brief, `**[Title](url)** — text` for AI research.
 *
 * Anything that is not such a bullet (an opening or closing paragraph) is left
 * out of the list; the full stored text is still one click away behind "Read
 * brief", so nothing is hidden, only not led with.
 *
 * Pure: no SQLite, no React.
 */
export interface BriefItem {
  title: string;
  /** The headline's own link, else the bullet's first [source] link. */
  href: string | null;
  /** The first sentence after the headline, or null when there is none. */
  excerpt: string | null;
}

const BULLET = /^\s*[-*•]\s+/;
const HEADLINE = /^\*\*(.+?)\*\*\s*/;
const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/;
const MAX_EXCERPT = 150;

function safeHref(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : null;
  } catch {
    return null;
  }
}

/** Markdown inline marks removed, links reduced to their text. */
function plain(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)\s]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function firstSentence(text: string): string | null {
  // The trailing "[source](url)" is a link, not prose.
  const body = plain(text.replace(/\[source\]\([^)\s]+\)/gi, "")).replace(/^[—–-]\s*/, "");
  if (!body) return null;
  const end = body.search(/[.!?](\s|$)/);
  let sentence = end === -1 ? body : body.slice(0, end + 1);
  if (sentence.length > MAX_EXCERPT) sentence = `${sentence.slice(0, MAX_EXCERPT).replace(/\s+\S*$/, "")}…`;
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

export function briefItems(md: string): BriefItem[] {
  // A bullet runs until the next bullet or a blank line.
  const bullets: string[] = [];
  let current: string | null = null;
  for (const line of md.split("\n")) {
    if (BULLET.test(line)) {
      if (current !== null) bullets.push(current);
      current = line.replace(BULLET, "");
    } else if (line.trim() === "") {
      if (current !== null) bullets.push(current);
      current = null;
    } else if (current !== null) {
      current += ` ${line.trim()}`;
    }
  }
  if (current !== null) bullets.push(current);

  const items: BriefItem[] = [];
  for (const bullet of bullets) {
    const head = bullet.match(HEADLINE);
    if (!head) continue;
    const rest = bullet.slice(head[0].length);
    const titleLink = head[1].match(LINK);
    const title = plain(head[1]);
    if (!title) continue;
    items.push({
      title,
      href: safeHref(titleLink?.[2]) ?? safeHref(rest.match(LINK)?.[2]),
      excerpt: firstSentence(rest),
    });
  }
  return items;
}
