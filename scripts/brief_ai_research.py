#!/usr/bin/env python3
"""AI research brief — suggested papers and articles, with links.

The reader is building AI/RL skills (docs/00-vision.md), so this is a reading
queue, not a news feed: things worth an hour, not things that happened.
"""

from lifeos.briefs import MARKDOWN_CONTRACT, OUT_OF_SEARCHES, generate
from lifeos.db import zurich_today

SYSTEM = (
    "You curate a daily AI/RL reading list for an MSc student who is deliberately "
    "building reinforcement-learning and applied-AI skills, and who already knows the "
    "fundamentals — assume familiarity with transformers, policy gradients and the "
    "standard RL vocabulary. Prefer primary sources (arXiv, lab blogs, papers) over "
    "commentary about them, and something genuinely new over something merely popular. "
    "Never invent a title, author or link: every item must come from your search "
    "results. " + OUT_OF_SEARCHES + MARKDOWN_CONTRACT
)

PROMPT = f"""Today is {zurich_today()}. Search for notable AI and reinforcement-learning
papers, releases and technical write-ups from the past few days, then write the brief.

Format: exactly 3 bullets, best first. Each bullet:

- **[Title](https://link)** — one sentence on the idea and why it is worth reading.

At most one bullet may be a product or model release; the rest should be research
or technical writing. If the last few days were quiet, say so in a single short
line and give fewer bullets rather than padding with weak items."""

generate("ai_research", system=SYSTEM, prompt=PROMPT, search=True)
