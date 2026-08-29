/**
 * Club kit colours, keyed by FPL short name.
 *
 * `primary` is the shirt body, `secondary` the sleeves or trim, and `ink` the
 * text colour that stays legible on the primary. `stripes` renders the shirt
 * with vertical bars, which is how Brighton, Brentford and Palace actually
 * look and what makes a pitch of tokens readable at a glance.
 */

export interface Kit {
  primary: string;
  secondary: string;
  ink: string;
  stripes?: boolean;
}

const FALLBACK: Kit = { primary: "#6b7280", secondary: "#9ca3af", ink: "#ffffff" };

export const KITS: Record<string, Kit> = {
  ARS: { primary: "#ef0107", secondary: "#ffffff", ink: "#ffffff" },
  AVL: { primary: "#670e36", secondary: "#95bfe5", ink: "#ffffff" },
  BOU: { primary: "#da291c", secondary: "#000000", ink: "#ffffff", stripes: true },
  BRE: { primary: "#e30613", secondary: "#ffffff", ink: "#ffffff", stripes: true },
  BHA: { primary: "#0057b8", secondary: "#ffffff", ink: "#ffffff", stripes: true },
  BUR: { primary: "#6c1d45", secondary: "#99d6ea", ink: "#ffffff" },
  CHE: { primary: "#034694", secondary: "#ffffff", ink: "#ffffff" },
  COV: { primary: "#6cabdd", secondary: "#ffffff", ink: "#0b2545" },
  CRY: { primary: "#1b458f", secondary: "#c4122e", ink: "#ffffff", stripes: true },
  EVE: { primary: "#003399", secondary: "#ffffff", ink: "#ffffff" },
  FUL: { primary: "#f5f5f5", secondary: "#000000", ink: "#111111" },
  HUL: { primary: "#f5a12d", secondary: "#000000", ink: "#111111", stripes: true },
  IPS: { primary: "#3a64a3", secondary: "#ffffff", ink: "#ffffff" },
  LEE: { primary: "#f4f4f4", secondary: "#ffcd00", ink: "#1d428a" },
  LEI: { primary: "#003090", secondary: "#fdbe11", ink: "#ffffff" },
  LIV: { primary: "#c8102e", secondary: "#00b2a9", ink: "#ffffff" },
  LUT: { primary: "#f78f1e", secondary: "#002d62", ink: "#ffffff" },
  MCI: { primary: "#6cabdd", secondary: "#1c2c5b", ink: "#08203f" },
  MUN: { primary: "#da291c", secondary: "#000000", ink: "#ffffff" },
  NEW: { primary: "#241f20", secondary: "#ffffff", ink: "#ffffff", stripes: true },
  NFO: { primary: "#dd0000", secondary: "#ffffff", ink: "#ffffff" },
  NOR: { primary: "#fff200", secondary: "#00a650", ink: "#00563f" },
  SHU: { primary: "#ee2737", secondary: "#000000", ink: "#ffffff", stripes: true },
  SOU: { primary: "#d71920", secondary: "#ffffff", ink: "#ffffff", stripes: true },
  SUN: { primary: "#eb172b", secondary: "#ffffff", ink: "#ffffff", stripes: true },
  TOT: { primary: "#f4f4f4", secondary: "#132257", ink: "#132257" },
  WHU: { primary: "#7a263a", secondary: "#1bb1e7", ink: "#ffffff" },
  WOL: { primary: "#fdb913", secondary: "#231f20", ink: "#231f20" },
};

export function kitFor(short: string): Kit {
  return KITS[short.toUpperCase()] ?? FALLBACK;
}
