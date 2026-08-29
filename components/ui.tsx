import type { ReactNode } from "react";
import type { FixtureCell } from "@/lib/api";

/** Difficulty colour on the red / yellow / green scale. */
export function fdrClass(d: number): string {
  if (d <= 1) return "bg-good text-white";
  if (d === 2) return "bg-good-wash text-good";
  if (d === 3) return "bg-surface-2 text-ink-mid";
  if (d === 4) return "bg-yellow-wash text-yellow-deep";
  return "bg-red-wash text-red";
}

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border-2 border-ink bg-surface shadow-[4px_4px_0_0_var(--ink)] ${className}`}
    >
      {children}
    </section>
  );
}

export function PanelHead({
  title,
  right,
}: {
  title: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink px-4 py-2.5">
      <h2 className="display text-lg tracking-wide">{title}</h2>
      {right}
    </div>
  );
}

export function Hero({
  kicker,
  title,
  blurb,
  right,
}: {
  kicker: string;
  title: ReactNode;
  blurb?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-5">
      <div className="max-w-2xl">
        <div className="stat mb-2 inline-block bg-ink px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-ground">
          {kicker}
        </div>
        <h1 className="display text-4xl sm:text-5xl lg:text-6xl">{title}</h1>
        {blurb && <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-mid">{blurb}</p>}
      </div>
      {right}
    </div>
  );
}

export function Tile({
  label,
  value,
  sub,
  tone = "ink",
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  tone?: "ink" | "red" | "yellow" | "good";
}) {
  const toneClass =
    tone === "red"
      ? "text-red"
      : tone === "yellow"
        ? "text-yellow-deep"
        : tone === "good"
          ? "text-good"
          : "text-ink";
  return (
    <div className="flex flex-col gap-1 border-r-2 border-line-soft px-4 py-3 last:border-r-0">
      <span className="stat text-[10px] uppercase tracking-[0.14em] text-ink-soft">{label}</span>
      <span className={`display text-3xl ${toneClass}`}>{value}</span>
      {sub && <span className="text-[11px] text-ink-soft">{sub}</span>}
    </div>
  );
}

export function FixtureRun({
  fixtures,
  size = "sm",
}: {
  fixtures: FixtureCell[];
  size?: "sm" | "xs";
}) {
  return (
    <div className="flex gap-1">
      {fixtures.map((f) => (
        <span
          key={f.gw}
          title={`GW${f.gw} · ${f.opponent} ${f.home ? "(H)" : "(A)"} · ${f.points.toFixed(2)} xP · FPL rates ${f.difficulty}, results say ${f.rerated}`}
          className={`stat rounded ${size === "xs" ? "px-1 text-[9px]" : "px-1.5 py-0.5 text-[10px]"} font-semibold ${fdrClass(f.rerated)}`}
        >
          {f.opponent}
          {f.home ? "" : "*"}
        </span>
      ))}
    </div>
  );
}

export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "red" | "yellow" | "good";
}) {
  const map = {
    neutral: "bg-surface-2 text-ink-mid",
    red: "bg-red-wash text-red",
    yellow: "bg-yellow-wash text-yellow-deep",
    good: "bg-good-wash text-good",
  } as const;
  return (
    <span className={`stat rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${map[tone]}`}>
      {children}
    </span>
  );
}

export function Loading({ what }: { what: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-24 text-center">
      <div className="stripe h-2 w-40 animate-pulse rounded-full" />
      <p className="stat text-xs uppercase tracking-widest text-ink-soft">Loading {what}…</p>
    </div>
  );
}

export function ErrorNote({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="rounded-xl border-2 border-red bg-red-wash p-4">
      <p className="display text-lg text-red">{title}</p>
      {detail && <p className="mt-1 text-sm text-ink-mid">{detail}</p>}
    </div>
  );
}
