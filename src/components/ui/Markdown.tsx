import type { ReactNode } from "react";

/**
 * The markdown subset the brief scripts are told to write (scripts/lifeos/briefs.py
 * → MARKDOWN_CONTRACT): paragraphs, "- " bullets, **bold**, *italic*, `code`, and
 * [links](https://…).
 *
 * Hand-rolled rather than a dependency because the contract is this small and the
 * output lands inside a design-system card — a general renderer would bring its own
 * type scale, its own link colour and its own heading sizes to fight with. Anything
 * outside the subset renders as plain text, which is the right failure: a brief that
 * arrives with a stray table is still readable.
 */

const INLINE = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`|\[[^\]\n]+\]\([^)\s]+\))/g;

/** Only http(s) links render as links — a brief is model output, and `javascript:`
 *  or `data:` has no business becoming an anchor. */
function safeHref(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : null;
  } catch {
    return null;
  }
}

function inline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(INLINE).filter(Boolean).map((token, i) => {
    const key = `${keyPrefix}-${i}`;

    // Recurses: the AI-research brief writes **[Title](url)** — bold wrapping a
    // link — and rendering the inner text raw dropped every link on that card.
    // Terminates because the inner text can no longer contain its own delimiter.
    if (token.startsWith("**") && token.endsWith("**"))
      return (
        <strong key={key} className="font-medium text-text">
          {inline(token.slice(2, -2), `${key}b`)}
        </strong>
      );

    if (token.startsWith("`") && token.endsWith("`"))
      return (
        <code key={key} className="rounded bg-raised px-1 py-0.5 text-[12px]">
          {token.slice(1, -1)}
        </code>
      );

    const link = token.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (link) {
      const href = safeHref(link[2]);
      if (!href) return <span key={key}>{link[1]}</span>;
      return (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noreferrer"
          className="text-hub underline decoration-hub/40 underline-offset-2 transition-colors hover:decoration-hub"
        >
          {link[1]}
        </a>
      );
    }

    // Checked last: `**bold**` also starts with `*`.
    if (token.startsWith("*") && token.endsWith("*"))
      return (
        <em key={key} className="italic">
          {inline(token.slice(1, -1), `${key}i`)}
        </em>
      );

    return <span key={key}>{token}</span>;
  });
}

type Block = { type: "p" | "ul"; lines: string[] };

/** Group lines into paragraphs and bullet lists; a blank line closes the group. */
function blocksOf(text: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) {
      blocks.push({ type: "p", lines: [] }); // sentinel: break the run
      continue;
    }
    const bullet = line.startsWith("- ") || line.startsWith("* ");
    const type = bullet ? "ul" : "p";
    const last = blocks.at(-1);
    if (last && last.type === type && last.lines.length) last.lines.push(bullet ? line.slice(2) : line);
    else blocks.push({ type, lines: [bullet ? line.slice(2) : line] });
  }
  return blocks.filter((b) => b.lines.length);
}

export function Markdown({ text, className = "" }: { text: string; className?: string }) {
  const blocks = blocksOf(text);

  return (
    <div className={`flex flex-col gap-2 text-sm leading-relaxed text-muted ${className}`}>
      {blocks.map((block, b) =>
        block.type === "ul" ? (
          <ul key={b} className="flex flex-col gap-1.5">
            {block.lines.map((line, i) => (
              <li key={i} className="relative pl-3.5">
                {/* The faint *text* tone, not the border tone: a list marker
                    separates items rather than decorating the card, and at
                    border tone it measured invisible against the surface. */}
                <span
                  aria-hidden
                  className="absolute left-0 top-[0.6em] size-1 rounded-full bg-faint"
                />
                {inline(line, `${b}-${i}`)}
              </li>
            ))}
          </ul>
        ) : (
          <p key={b}>
            {block.lines.map((line, i) => (
              <span key={i}>
                {i > 0 && <br />}
                {inline(line, `${b}-${i}`)}
              </span>
            ))}
          </p>
        )
      )}
    </div>
  );
}
