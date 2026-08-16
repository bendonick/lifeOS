// One place mapping accents to Tailwind classes so the palette rules
// (docs/02-design-system.md) can't drift per-component.

export type Accent = "academic" | "personal" | "professional" | "hub" | "danger" | "warn";

export const accentText: Record<Accent, string> = {
  academic: "text-academic",
  personal: "text-personal",
  professional: "text-professional",
  hub: "text-hub",
  danger: "text-danger",
  warn: "text-warn",
};

export const accentBanner: Record<Accent, string> = {
  academic: "bg-academic/10 text-academic",
  personal: "bg-personal/10 text-personal",
  professional: "bg-professional/10 text-professional",
  hub: "bg-hub/10 text-hub",
  danger: "bg-danger/10 text-danger",
  warn: "bg-warn/10 text-warn",
};

export const accentPill: Record<Accent | "neutral", string> = {
  academic: "bg-academic/10 text-academic border-academic/25",
  personal: "bg-personal/10 text-personal border-personal/25",
  professional: "bg-professional/10 text-professional border-professional/25",
  hub: "bg-hub/10 text-hub border-hub/25",
  danger: "bg-danger/10 text-danger border-danger/25",
  warn: "bg-warn/10 text-warn border-warn/25",
  neutral: "bg-raised text-muted border-border",
};

/* Calendar event tints — block backgrounds with a readable text color. */
export const accentEvent: Record<Accent, string> = {
  academic: "bg-academic/15 border-academic/30 text-academic",
  personal: "bg-personal/15 border-personal/30 text-personal",
  professional: "bg-professional/15 border-professional/30 text-professional",
  hub: "bg-hub/15 border-hub/30 text-hub",
  danger: "bg-danger/15 border-danger/30 text-danger",
  warn: "bg-warn/15 border-warn/30 text-warn",
};
