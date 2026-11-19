import type { Domain, Task } from "@/lib/types";

// Shapes shared by the Week plan's server routes and its client component.
// Client-safe: no db import (SQLite must not reach the browser bundle).

/** One item of a stored proposal, after scripts/plan_parse.py validated it. */
export interface ProposalItem {
  key: string;
  title: string;
  domain: Domain;
  course_id: number | null;
  project_id: number | null;
  /** The course code or project name shown beside the title, when there is one. */
  context: string | null;
  group: string | null;
  due: string | null;
  /** An open task this item is, rather than a new one (decision #84). */
  match: { id: number; title: string; due: string | null } | null;
  reason: string | null;
}

export interface Proposal {
  items: ProposalItem[];
}

/** What the client sends back on accept: the draft as the user left it. */
export interface AcceptItem {
  title: string;
  domain: Domain;
  course_id: number | null;
  project_id: number | null;
  group: string | null;
  due: string | null;
  match_id: number | null;
}

/**
 * Everything needed to reverse one apply — accept, carry over or drop. The
 * server returns it; the client hands it back to /api/plan/undo unchanged.
 */
export interface UndoPayload {
  note_id: number | null;
  /** Tasks created by the apply: deleted on undo. */
  created: number[];
  /** Tasks deleted by the apply (Drop): re-inserted on undo with their ids. */
  restored: Task[];
  /** Tasks whose week the apply changed: set back on undo. */
  rewound: { id: number; week: string | null }[];
}

/** A plan row as the hub renders it. */
export interface PlanTask extends Task {
  context: string | null;
}
