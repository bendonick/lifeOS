"""The one place scripts talk to the Anthropic API.

Model choice is a recorded decision, not a per-script whim: briefs run on
Sonnet 5 (summarising retrieved headlines is well inside its range and it is
roughly half the cost of Opus), the capture parser on Opus 5 because a
misparsed capture writes a wrong row into the system.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

from anthropic import Anthropic

REPO_ROOT = Path(__file__).resolve().parents[2]

BRIEF_MODEL = "claude-sonnet-5"
PARSER_MODEL = "claude-opus-5"
# The hub's Week plan parser (decision #84). Sonnet, not the capture parser's
# Opus: the user is waiting for this answer, and reviews a draft before anything
# is written, so a misparse costs one edit rather than a wrong row.
PLAN_MODEL = "claude-sonnet-5-5"

# Server-side refusal fallbacks (beta). With "default" the API re-runs a declined
# request on a fallback model it picks by refusal category, inside the same call.
FALLBACK_BETA = "server-side-fallback-2026-07-01"

# Dynamic-filtering web search: Claude writes and runs code to filter results
# before they reach the context window. Supported on Sonnet 5 and the current
# Opus models; the older `web_search_20250305` is the fallback elsewhere.
#
# `max_uses` is the cost and latency dial, and it is steeper than it looks: each
# search adds roughly 14k input tokens, and a long tool loop eventually stops with
# `pause_turn`, whose resume re-sends the whole conversation. Measured: 2 searches
# = 28k input in 22s; 4 = 85k; 8 ran past six minutes without finishing. Six is the
# ceiling that still leaves room to write. Running *out* is normal and the prompts
# say what to do about it — hitting the cap returns `max_uses_exceeded` on the next
# search, which an un-warned model reads as "the internet is down" and answers with
# an apology instead of a brief.
WEB_SEARCH_TOOL = {"type": "web_search_20260209", "name": "web_search", "max_uses": 6}


def load_env() -> None:
    """Read `.env` into os.environ without adding a dependency for six lines.

    Values already in the environment win, so a shell export can override the
    file. Only keys that are absent are filled in.
    """
    env_path = REPO_ROOT / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key, value = key.strip(), value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def client() -> Anthropic:
    load_env()
    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise SystemExit("ANTHROPIC_API_KEY is not set — add it to .env (see .env.example)")
    return Anthropic()


def search_results(response) -> tuple[int, int]:
    """(successful, failed) web-search calls in a response.

    A search that errors — `max_uses_exceeded`, rate limits — comes back as a
    normal result block whose content is an error object, not as an exception.
    Nothing raises, so a brief built on zero usable searches looks exactly like a
    brief built on six unless someone counts.
    """
    ok = failed = 0
    for block in response.content:
        if block.type != "web_search_tool_result":
            continue
        content = block.content
        if isinstance(content, list):
            ok += 1
        else:
            failed += 1
    return ok, failed


def text_of(response) -> str:
    """Every text block, concatenated. Server-tool result blocks are skipped.

    Joined with nothing, not with a newline: a web-search response is split into
    several text blocks wherever a citation attaches, and those splits land
    mid-sentence. Joining with "\n" tore every cited bullet into three lines and
    the renderer then read the fragments as separate paragraphs.
    """
    return "".join(b.text for b in response.content if b.type == "text").strip()


def run(
    api,
    *,
    model: str,
    prompt: str,
    system: str | None = None,
    tools: list | None = None,
    effort: str = "medium",
    max_tokens: int = 4000,
    output_format: dict | None = None,
    max_continuations: int = 3,
    fallbacks: str | list | None = None,
):
    """One request, resumed across `pause_turn`.

    A server-side tool loop stops with `stop_reason: "pause_turn"` after ten
    iterations; the fix is to re-send the conversation with the assistant turn
    appended — NOT to add a "continue" user message, which the API neither
    needs nor expects here.

    Resumes are capped low on purpose: each one re-sends every search result
    gathered so far, so an unbounded loop is quadratic in tokens.
    """
    messages: list[dict] = [{"role": "user", "content": prompt}]
    output_config: dict = {"effort": effort}
    if output_format is not None:
        output_config["format"] = output_format

    for attempt in range(max_continuations + 1):
        kwargs = {
            "model": model,
            "max_tokens": max_tokens,
            "messages": messages,
            "output_config": output_config,
        }
        if system:
            kwargs["system"] = system
        if tools:
            kwargs["tools"] = tools

        if fallbacks is not None:
            # Fallbacks are a beta parameter, so they need the beta endpoint.
            response = api.beta.messages.create(
                **kwargs, betas=[FALLBACK_BETA], fallbacks=fallbacks
            )
        else:
            response = api.messages.create(**kwargs)

        # A web-search brief takes minutes, not seconds, and prints nothing until
        # it finishes — without this the log of a slow or looping run is empty.
        searches = getattr(response.usage, "server_tool_use", None)
        print(
            f"[{model}] request {attempt + 1}: stop_reason={response.stop_reason} "
            f"in={response.usage.input_tokens} out={response.usage.output_tokens} "
            f"searches={getattr(searches, 'web_search_requests', 0) if searches else 0}",
            file=sys.stderr,
        )

        if response.stop_reason == "refusal":
            raise RuntimeError(
                f"model declined the request ({getattr(response, 'stop_details', None)})"
            )
        if response.stop_reason == "pause_turn":
            messages.append({"role": "assistant", "content": response.content})
            continue
        return response

    raise RuntimeError(f"still paused after {max_continuations} continuations")
