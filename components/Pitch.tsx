"use client";

import type { ReactNode } from "react";
import { kitFor } from "@/lib/clubs";

/* ------------------------------------------------------------------ *
 * The pitch, at night
 *
 * Dark turf under a floodlight cone rather than flat green, so the
 * shirts read as lit objects instead of stickers. Drawn in CSS — no
 * images, crisp at any width, correct in both themes.
 * ------------------------------------------------------------------ */

export function Pitch({ children, bench }: { children: ReactNode; bench?: ReactNode }) {
  return (
    <div className="bug overflow-hidden">
      <div className="relative isolate">
        {/* turf, mown in bands */}
        <div
          aria-hidden
          className="absolute inset-0 -z-20"
          style={{
            background:
              "repeating-linear-gradient(180deg,#0d2419 0 52px,#0f2a1e 52px 104px)",
          }}
        />
        {/* floodlight falling from above */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(90% 60% at 50% -8%, rgba(190,255,220,0.16), transparent 62%), radial-gradient(70% 50% at 50% 108%, rgba(0,0,0,0.45), transparent 60%)",
          }}
        />
        {/* markings */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-4 rounded border border-white/15" />
          <div className="absolute left-1/2 top-4 h-[74px] w-[46%] -translate-x-1/2 border border-t-0 border-white/15" />
          <div className="absolute left-1/2 top-4 h-7 w-[22%] -translate-x-1/2 border border-t-0 border-white/10" />
          <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
          <div className="absolute left-4 right-4 top-1/2 border-t border-white/10" />
          <div className="absolute bottom-4 left-1/2 h-[74px] w-[46%] -translate-x-1/2 border border-b-0 border-white/15" />
        </div>

        <div className="relative flex flex-col gap-4 px-3 py-6 sm:gap-6 sm:py-8">{children}</div>
      </div>

      {bench && (
        <div className="border-t border-[#232b3a] bg-[#0b1016] px-4 py-3">
          <div className="label mb-2.5 !text-[#6f7a8c]">Substitutes</div>
          <div className="flex flex-wrap items-start gap-2.5">{bench}</div>
        </div>
      )}
    </div>
  );
}

export function PitchRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-start justify-center gap-2 sm:gap-4">{children}</div>;
}

/* ------------------------------------------------------------------ *
 * Player token
 * ------------------------------------------------------------------ */

export interface TokenProps {
  name: string;
  club: string;
  value: string;
  meta?: string;
  captain?: boolean;
  vice?: boolean;
  flag?: "red" | "yellow" | "good";
  flagLabel?: string;
  muted?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
}

export function PlayerToken({
  name, club, value, meta, captain, vice, flag, flagLabel, muted, onRemove, onClick,
}: TokenProps) {
  const kit = kitFor(club);

  const glow =
    flag === "red" ? "shadow-[0_0_0_1px_var(--strike),0_0_22px_-4px_var(--strike)]"
    : flag === "good" ? "shadow-[0_0_0_1px_var(--surge),0_0_22px_-4px_var(--surge)]"
    : flag === "yellow" ? "shadow-[0_0_0_1px_var(--flare),0_0_22px_-4px_var(--flare)]"
    : "";

  const flagTone =
    flag === "red" ? "bg-strike text-white"
    : flag === "good" ? "bg-surge text-void"
    : "bg-flare text-void";

  return (
    <div
      className={`group relative w-[84px] transition-transform duration-200 hover:-translate-y-1 sm:w-[98px] ${muted ? "opacity-80" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
    >
      <div className={`relative mx-auto w-fit rounded-lg ${glow}`}>
        <Shirt kit={kit} />
        {captain && <Armband label="C" tone="bg-strike text-white" />}
        {vice && !captain && <Armband label="V" tone="bg-chalk text-void" />}
      </div>

      {/* The token always sits on dark turf, so it carries its own dark
          palette rather than following the theme — otherwise the score
          plate inverts to yellow-on-white in daylight mode. */}
      <div className="mt-1.5 overflow-hidden rounded-lg border border-[#2b3444] bg-[#141a25] backdrop-blur">
        <div className="truncate px-1.5 py-1 text-center text-[11px] font-bold leading-tight text-[#eef2f8]">
          {name}
        </div>
        <div className="stat bg-[#080b11] px-1 py-1 text-center text-[13px] font-bold text-[#ffd426]">
          {value}
        </div>
        {meta && (
          <div className="stat truncate border-t border-[#242c3a] px-1 py-0.5 text-center text-[9px] text-[#7d8798]">
            {meta}
          </div>
        )}
      </div>

      {flagLabel && (
        <div className={`stat mx-auto mt-1 w-fit rounded-full px-1.5 py-px text-[8px] font-bold uppercase tracking-wider ${flagTone}`}>
          {flagLabel}
        </div>
      )}

      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          aria-label={`Remove ${name}`}
          className="stat absolute -right-1 -top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-strike text-[11px] font-bold leading-none text-white shadow-lg group-hover:flex focus:flex"
        >
          ×
        </button>
      )}
    </div>
  );
}

function Armband({ label, tone }: { label: string; tone: string }) {
  return (
    <span
      className={`stat absolute -right-1.5 -top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full text-[9px] font-bold shadow-md ${tone}`}
    >
      {label}
    </span>
  );
}

/** The shirt, in club colours, lit from above. */
function Shirt({ kit }: { kit: ReturnType<typeof kitFor> }) {
  const uid = `k${kit.primary.replace("#", "")}${kit.stripes ? "s" : ""}`;
  return (
    <svg viewBox="0 0 48 44" className="h-11 w-12 drop-shadow-[0_4px_8px_rgba(0,0,0,0.55)]" aria-hidden>
      <defs>
        {kit.stripes && (
          <pattern id={uid} width="8" height="4" patternUnits="userSpaceOnUse">
            <rect width="8" height="4" fill={kit.primary} />
            <rect width="4" height="4" fill={kit.secondary} />
          </pattern>
        )}
        <linearGradient id={`${uid}l`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.22" />
        </linearGradient>
      </defs>

      <path d="M2 12 L12 4 L18 8 L10 16 Z" fill={kit.secondary} stroke="#05070a" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M46 12 L36 4 L30 8 L38 16 Z" fill={kit.secondary} stroke="#05070a" strokeWidth="1.2" strokeLinejoin="round" />
      <path
        d="M12 4 L18 8 Q24 12 30 8 L36 4 L38 16 L36 42 L12 42 L10 16 Z"
        fill={kit.stripes ? `url(#${uid})` : kit.primary}
        stroke="#05070a"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* light falling across the shirt */}
      <path
        d="M12 4 L18 8 Q24 12 30 8 L36 4 L38 16 L36 42 L12 42 L10 16 Z"
        fill={`url(#${uid}l)`}
      />
      <path d="M18 8 Q24 13 30 8" fill="none" stroke={kit.secondary} strokeWidth="2.2" />
    </svg>
  );
}
