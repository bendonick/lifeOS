#!/usr/bin/env python3
"""World brief — a few headline summaries worth knowing (docs/03-pages/lifeos.md §1).

Global first, Switzerland second: the reader lives in Switzerland, so a Swiss story
that changes his week beats a third international headline.
"""

from lifeos.briefs import MARKDOWN_CONTRACT, OUT_OF_SEARCHES, generate
from lifeos.db import zurich_today

SYSTEM = (
    "You write a five-second morning news brief for one reader: an MSc student "
    "who wants to know what happened without opening a news site. "
    "Report what is verifiably in the sources you searched — no speculation, no "
    "framing, no adjectives doing work the facts don't. If a story is unclear or "
    "unconfirmed, say so in the sentence rather than dropping it. " + OUT_OF_SEARCHES + MARKDOWN_CONTRACT
)

PROMPT = f"""Today is {zurich_today()} (Europe/Zurich). Search for the most significant
news of the last 24 hours, then write the brief.

Format: exactly 4 bullets, most significant first. Three of world/international
significance and one from Switzerland (national, or Zurich specifically). Each bullet:

- **Four to eight word headline** — one sentence of what happened and why it matters, then a [source](https://…) link.

Skip celebrity news, sports results and market noise. If nothing from Switzerland
is worth a bullet, use a fourth international story instead and don't note the
substitution."""

generate("world", system=SYSTEM, prompt=PROMPT, search=True)
