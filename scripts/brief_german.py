#!/usr/bin/env python3
"""German word of the day — word, translation, example sentence.

No web search: this is generation, not retrieval, so it runs at low effort and
costs a fraction of a cent. Level A2-B1, biased toward words that actually turn
up in Zurich (decision recorded in docs/05-decisions.md).
"""

from lifeos.briefs import MARKDOWN_CONTRACT, generate

SYSTEM = (
    "You teach German to an English-speaking student living in Switzerland, at the "
    "A2-B1 level. Choose words that earn their place in daily life here — shops, "
    "admin, lectures, small talk — over textbook vocabulary. Standard High German "
    "(Hochdeutsch), with a note only where the Swiss usage genuinely differs. "
    + MARKDOWN_CONTRACT
)

PROMPT = """Give today's German word. Vary the part of speech from day to day; nouns
must carry their article and plural. Format exactly:

**der Termin** (pl. die Termine) — *appointment, deadline*

Ich habe morgen einen Termin beim Arzt.
*I have an appointment at the doctor tomorrow.*

Then, if and only if there is something genuinely useful to add, one final line
of at most 20 words: a false friend, a common mistake, or the Swiss variant."""

generate("german_word", system=SYSTEM, prompt=PROMPT, search=False, effort="low")
