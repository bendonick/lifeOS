import type { LearningItem } from "@/lib/types";

/**
 * The AI/RL curriculum's structure — its five phases
 * and their items in priority order. The roadmap says it plainly: "the table's
 * ordering carries the sequence; the phases live only here". This module is
 * that "here" made machine-readable (decision #68): `learning_items` stays the
 * settled flat table, and rows added by hand simply don't appear in this list.
 *
 * The join is by exact `name`. Renaming a row in the UI silently drops it from
 * the banner — `curriculumState` reports such names in `unmatched`, and the
 * component warns in dev. If a rename is deliberate, mirror it here.
 *
 * Pure module in the shape of `followup.ts`: no db imports, safe anywhere.
 */

export interface CurriculumPhase {
  /** Short phase name, as the banner shows it and as the roadmap headings carry it. */
  name: string;
  /** One-line phase goal, distilled from the roadmap prose — feeds the priming prompt. */
  goal: string;
  /** `learning_items.name` values, in priority order (first = next to do). */
  items: string[];
}

export const CURRICULUM: CurriculumPhase[] = [
  {
    name: "How models actually work",
    goal:
      "the training pipeline end to end — pre-training, SFT, RLHF, tokens, hallucination — deeply enough that no customer question rattles you",
    items: [
      "Karpathy: Deep dive into LLMs like ChatGPT",
      "3Blue1Brown: Neural networks, visually",
      "The Illustrated Transformer",
      "Attention Is All You Need",
      "Karpathy: Let's build GPT from scratch",
      "Embeddings: what they are, why they matter",
      "AI Engineering (Chip Huyen)",
    ],
  },
  {
    name: "Post-training & RL literacy",
    goal:
      "post-training and RL fluency — explain base vs instruct vs reasoning models to a CTO, and have post-trained one yourself",
    items: [
      "RL fundamentals: agents, rewards, policies",
      "Sutton & Barto ch. 1-3: the RL frame",
      "Illustrating RLHF (Hugging Face)",
      "InstructGPT: LMs that follow instructions",
      "DPO: Direct Preference Optimization",
      "LoRA: low-rank adaptation of LLMs",
      "DeepSeek-R1: reasoning via RL",
      "smol-course: hands-on post-training",
    ],
  },
  {
    name: "Building with AI",
    goal:
      "the demo-building core — RAG, agents, evals — with every concept tied to a named tool the industry actually uses",
    items: [
      "Prompt engineering (Claude docs)",
      "RAG: retrieval-augmented generation",
      "Retrieval quality: rerankers & hybrid search",
      "Tool use & function calling",
      "Building effective agents (Anthropic)",
      "LangGraph: stateful agent orchestration",
      "Hugging Face Agents Course",
      "Model Context Protocol (MCP)",
      "Your AI product needs evals",
      "Demystifying evals for AI agents",
      "Langfuse: LLM observability & evals",
      "Gradio: ship a working demo",
    ],
  },
  {
    name: "Systems credibility",
    goal:
      "the backend-conversation layer — inference, serving, cost and security — light on hands-on, heavy on being un-bluffable",
    items: [
      "LLM inference: KV cache, batching, latency",
      "Quantization: precision vs cost tradeoffs",
      "vLLM: how models are served",
      "Prompt caching & cost engineering",
      "GPU glossary: the hardware layer",
      "Prompt injection (Willison series)",
      "OWASP Top 10 for LLM apps",
    ],
  },
  {
    name: "Platform fluency",
    goal: "the vendor layer — speak Vertex and Bedrock, table stakes for the customer-engineer conversation",
    items: ["Google Cloud ML & gen-AI training path", "Amazon Bedrock: getting started"],
  },
];

/** Still on the plan: not yet learned, not dropped. */
function isPending(item: LearningItem): boolean {
  return item.status === "queued" || item.status === "in_progress";
}

export interface CurriculumNext {
  /** `continue` = an item is already Learning; `start` = first Not-learned item. */
  kind: "continue" | "start";
  item: LearningItem;
  phase: CurriculumPhase;
  /** 1-based, for "Phase 2 — …" labels. */
  phaseNumber: number;
  /** The next few still-pending topics after this one, for the priming prompt. */
  upcoming: string[];
}

export interface CurriculumState {
  /** Mapped names with a matching row. 0 means the curriculum isn't loaded — render nothing. */
  matched: number;
  learned: number;
  dropped: number;
  /** First phase, in order, still holding a pending item. Null once every matched item is closed. */
  phase: { number: number; name: string } | null;
  /** The next topic in order. Null when the plan is complete. */
  next: CurriculumNext | null;
  /** Mapped names with no matching row — a rename in the UI, or an unloaded curriculum. */
  unmatched: string[];
}

/**
 * Resolve the banner against the live table. Never trusts row ids —
 * the load order made id DESC match priority once, and one hand-added row
 * breaks that forever. Order comes only from this module.
 */
export function curriculumState(items: LearningItem[]): CurriculumState {
  const byName = new Map<string, LearningItem>();
  for (const item of items) {
    const key = item.name.trim();
    if (!byName.has(key)) byName.set(key, item);
  }

  const ordered: { item: LearningItem; phase: CurriculumPhase; phaseNumber: number }[] = [];
  const unmatched: string[] = [];
  CURRICULUM.forEach((phase, i) => {
    for (const name of phase.items) {
      const item = byName.get(name);
      if (item) ordered.push({ item, phase, phaseNumber: i + 1 });
      else unmatched.push(name);
    }
  });

  const firstPending = ordered.find((e) => isPending(e.item));
  const target =
    ordered.find((e) => e.item.status === "in_progress") ??
    ordered.find((e) => e.item.status === "queued");

  let next: CurriculumNext | null = null;
  if (target) {
    const after = ordered.slice(ordered.indexOf(target) + 1);
    next = {
      kind: target.item.status === "in_progress" ? "continue" : "start",
      item: target.item,
      phase: target.phase,
      phaseNumber: target.phaseNumber,
      upcoming: after.filter((e) => isPending(e.item)).slice(0, 3).map((e) => e.item.name),
    };
  }

  return {
    matched: ordered.length,
    learned: ordered.filter((e) => e.item.status === "done").length,
    dropped: ordered.filter((e) => e.item.status === "dropped").length,
    phase: firstPending ? { number: firstPending.phaseNumber, name: firstPending.phase.name } : null,
    next,
    unmatched,
  };
}
