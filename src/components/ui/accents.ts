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

/* Tint raised from /10 to /16 — at /10 the strip measured 1.13:1 against the
   page and read as colored text on black rather than a tinted band. */
export const accentBanner: Record<Accent, string> = {
  academic: "bg-academic/16 text-academic",
  personal: "bg-personal/16 text-personal",
  professional: "bg-professional/16 text-professional",
  hub: "bg-hub/16 text-hub",
  danger: "bg-danger/16 text-danger",
  warn: "bg-warn/16 text-warn",
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

/* Form-control tint (checkbox/radio `accent-color`). Components must use this
   rather than a hardcoded hex — Personal was rendering Academic-green
   checkboxes because ThisWeek shipped with `accent-[#3ecf8e]` baked in. */
export const accentControl: Record<Accent, string> = {
  academic: "accent-academic",
  personal: "accent-personal",
  professional: "accent-professional",
  hub: "accent-hub",
  danger: "accent-danger",
  warn: "accent-warn",
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
