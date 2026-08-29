"use client";

import type { ReactNode } from "react";
import { kitFor } from "@/lib/clubs";

/* ------------------------------------------------------------------ *
 * The pitch
 *
 * Drawn in CSS rather than shipped as an image: mown stripes from a
 * repeating gradient, markings from borders. That keeps it crisp at any
 * width, themable, and free.
 * ------------------------------------------------------------------ */

export function Pitch({
  children,
  bench,
}: {
  children: ReactNode;
  bench?: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border-2 border-ink shadow-[4px_4px_0_0_var(--ink)]">
      <div className="relative isolate">
        {/* turf */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              "repeating-linear-gradient(180deg,#1f7a44 0 46px,#1b6d3d 46px 92px)",
          }}
        />
        {/* markings */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-3 rounded-sm border-2 border-white/25" />
          {/* penalty area, top */}
          <div className="absolute left-1/2 top-3 h-16 w-2/5 -translate-x-1/2 border-2 border-t-0 border-white/25" />
          <div className="absolute left-1/2 top-3 h-6 w-1/5 -translate-x-1/2 border-2 border-t-0 border-white/20" />
          {/* centre */}
          <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/20" />
          <div className="absolute left-3 right-3 top-1/2 border-t-2 border-white/20" />
          {/* penalty area, bottom */}
          <div className="absolute bottom-3 left-1/2 h-16 w-2/5 -translate-x-1/2 border-2 border-b-0 border-white/25" />
        </div>

        <div className="relative flex flex-col gap-3 px-3 py-5 sm:gap-5 sm:py-7">{children}</div>
      </div>

      {bench && (
        <div className="border-t-2 border-ink bg-surface-2 px-3 py-3">
          <div className="stat mb-2 text-[10px] uppercase tracking-[0.16em] text-ink-soft">
            Substitutes
          </div>
          <div className="flex flex-wrap items-start gap-2">{bench}</div>
        </div>
      )}
    </div>
  );
}

/** One line of the formation. */
export function PitchRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-start justify-center gap-2 sm:gap-3">{children}</div>;
}

/* ------------------------------------------------------------------ *
 * Player token — a shirt, a name plate and a score plate
 * ------------------------------------------------------------------ */

export interface TokenProps {
  name: string;
  club: string;
  /** Large figure on the score plate. */
  value: string;
  /** Small line under the name. */
  meta?: string;
  captain?: boolean;
  vice?: boolean;
  /** Red = a problem, yellow = watch, good = a return. */
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
  const ring =
    flag === "red" ? "ring-2 ring-[var(--red)]"
    : flag === "good" ? "ring-2 ring-[var(--good)]"
    : flag === "yellow" ? "ring-2 ring-[var(--yellow)]"
    : "";

  return (
    <div
      className={`group relative w-[86px] sm:w-[100px] ${muted ? "opacity-90" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
    >
      <div className={`relative mx-auto w-fit rounded-md ${ring}`}>
        <Shirt kit={kit} />
        {captain && (
          <span className="stat absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-ink bg-[var(--red)] text-[9px] font-bold text-white">
            C
          </span>
        )}
        {vice && !captain && (
          <span className="stat absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-ink bg-ink text-[9px] font-bold text-ground">
            V
          </span>
        )}
      </div>

      {/* Name, score and meta all sit inside the card so they stay legible
          on the turf and on the light substitutes bar alike. */}
      <div className="mt-1 overflow-hidden rounded-md border-2 border-ink bg-surface">
        <div className="truncate px-1.5 py-0.5 text-center text-[11px] font-bold leading-tight">
          {name}
        </div>
        <div className="stat bg-ink px-1 py-0.5 text-center text-[11px] font-bold text-ground">
          {value}
        </div>
        {meta && (
          <div className="stat truncate border-t border-line-soft px-1 py-0.5 text-center text-[9px] text-ink-soft">
            {meta}
          </div>
        )}
      </div>
      {flagLabel && (
        <div
          className={`stat mx-auto mt-0.5 w-fit rounded px-1 text-[8px] font-bold uppercase ${
            flag === "red" ? "bg-[var(--red)] text-white"
            : flag === "good" ? "bg-[var(--good)] text-white"
            : "bg-[var(--yellow)] text-black"
          }`}
        >
          {flagLabel}
        </div>
      )}

      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          aria-label={`Remove ${name}`}
          className="stat absolute -right-1 -top-1 hidden h-5 w-5 items-center justify-center rounded-full border-2 border-ink bg-[var(--red)] text-[11px] font-bold leading-none text-white group-hover:flex focus:flex"
        >
          ×
        </button>
      )}
    </div>
  );
}

/** A shirt drawn as SVG so club colours and stripes come through. */
function Shirt({ kit }: { kit: ReturnType<typeof kitFor> }) {
  const id = `s${kit.primary.replace("#", "")}${kit.stripes ? "x" : ""}`;
  return (
    <svg viewBox="0 0 48 44" className="h-11 w-12 drop-shadow-[0_2px_2px_rgba(0,0,0,0.35)]" aria-hidden>
      {kit.stripes && (
        <defs>
          <pattern id={id} width="8" height="4" patternUnits="userSpaceOnUse">
            <rect width="8" height="4" fill={kit.primary} />
            <rect width="4" height="4" fill={kit.secondary} />
          </pattern>
        </defs>
      )}
      {/* sleeves */}
      <path d="M2 12 L12 4 L18 8 L10 16 Z" fill={kit.secondary} stroke="#14120f" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M46 12 L36 4 L30 8 L38 16 Z" fill={kit.secondary} stroke="#14120f" strokeWidth="1.5" strokeLinejoin="round" />
      {/* body */}
      <path
        d="M12 4 L18 8 Q24 12 30 8 L36 4 L38 16 L36 42 L12 42 L10 16 Z"
        fill={kit.stripes ? `url(#${id})` : kit.primary}
        stroke="#14120f"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* collar */}
      <path d="M18 8 Q24 13 30 8" fill="none" stroke={kit.secondary} strokeWidth="2.5" />
    </svg>
  );
}
