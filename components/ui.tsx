"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { FixtureCell } from "@/lib/api";

export type Tone = "neutral" | "strike" | "flare" | "surge";

/**
 * The pages were written against the previous palette's names. Rather than
 * touch every call site in one go, both vocabularies resolve to the same
 * three accents.
 */
export type ToneInput = Tone | "ink" | "red" | "yellow" | "good";

function tone(t: ToneInput = "neutral"): Tone {
  if (t === "red") return "strike";
  if (t === "yellow") return "flare";
  if (t === "good") return "surge";
  if (t === "ink") return "neutral";
  return t;
}

/* ------------------------------------------------------------------ *
 * Difficulty — a five-step ramp from surge (easy) to strike (brutal)
 * ------------------------------------------------------------------ */

export function fdrClass(d: number): string {
  if (d <= 1) return "bg-surge text-void";
  if (d === 2) return "bg-surge-wash text-surge";
  if (d === 3) return "bg-panel-2 text-chalk-mid";
  if (d === 4) return "bg-flare-wash text-flare";
  return "bg-strike-wash text-strike";
}

/* ------------------------------------------------------------------ *
 * Scorebug panel — glass, hairline border, lit along the top edge
 * ------------------------------------------------------------------ */

export function Bug({
  children,
  tone: toneIn = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: ToneInput;
  className?: string;
}) {
  const t = tone(toneIn);
  const edge = t === "strike" ? "bug-strike" : t === "flare" ? "bug-flare" : t === "surge" ? "bug-surge" : "";
  return <section className={`bug ${edge} ${className}`}>{children}</section>;
}

export function BugHead({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
      <h2 className="display text-[15px] tracking-[0.06em]">{title}</h2>
      {right}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Kinetic counter — numbers arrive rather than appear
 * ------------------------------------------------------------------ */

export function Counter({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  className = "",
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { setShown(value); from.current = value; return; }

    const start = performance.now();
    const a = from.current;
    const b = value;
    const dur = 650;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      // easeOutQuart — fast arrival, soft landing
      const e = 1 - Math.pow(1 - t, 4);
      setShown(a + (b - a) * e);
      if (t < 1) raf.current = requestAnimationFrame(tick);
      else from.current = b;
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [value]);

  return (
    <span className={className}>
      {prefix}
      {shown.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * Hero — oversized display type with a ghosted echo behind it
 * ------------------------------------------------------------------ */

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
    <header className="rise mb-8 flex flex-wrap items-end justify-between gap-6 pt-2">
      <div className="max-w-3xl">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="h-3 w-1 rounded-full bg-strike" />
          <span className="label">{kicker}</span>
        </div>
        <h1 className="display text-[clamp(2.6rem,7vw,5.2rem)]">{title}</h1>
        {blurb && (
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-chalk-mid">{blurb}</p>
        )}
      </div>
      {right}
    </header>
  );
}

/* ------------------------------------------------------------------ *
 * Stat — the reading, the label, and an optional trend
 * ------------------------------------------------------------------ */

export function Stat({
  label,
  value,
  sub,
  tone: toneIn = "neutral",
  decimals,
  prefix,
  suffix,
}: {
  label: string;
  value: number | string;
  sub?: string;
  tone?: ToneInput;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}) {
  const t = tone(toneIn);
  const colour =
    t === "strike" ? "text-strike"
    : t === "flare" ? "text-flare"
    : t === "surge" ? "text-surge"
    : "text-chalk";

  return (
    <div className="flex flex-col gap-1.5 border-r border-line-soft px-5 py-4 last:border-r-0">
      <span className="label">{label}</span>
      <span className={`display text-[2rem] ${colour}`}>
        {typeof value === "number" ? (
          <Counter value={value} decimals={decimals ?? 0} prefix={prefix} suffix={suffix} />
        ) : (
          <>{prefix}{value}{suffix}</>
        )}
      </span>
      {sub && <span className="text-[11px] leading-tight text-chalk-dim">{sub}</span>}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Small parts
 * ------------------------------------------------------------------ */

export function Chip({ children, tone: toneIn = "neutral" }: { children: ReactNode; tone?: ToneInput }) {
  const t = tone(toneIn);
  const map: Record<Tone, string> = {
    neutral: "bg-panel-2 text-chalk-mid border-line",
    strike: "bg-strike-wash text-strike border-strike/30",
    flare: "bg-flare-wash text-flare border-flare/30",
    surge: "bg-surge-wash text-surge border-surge/30",
  };
  return <span className={`chip border ${map[t]}`}>{children}</span>;
}

/** Kept as an alias so existing pages keep working through the redesign. */
export const Pill = Chip;

export function Button({
  children,
  onClick,
  type = "button",
  tone: toneIn = "strike",
  disabled,
  title,
  ariaPressed,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  tone?: ToneInput | "ghost";
  disabled?: boolean;
  title?: string;
  ariaPressed?: boolean;
  className?: string;
}) {
  const map: Record<string, string> = {
    strike: "bg-strike text-white hover:brightness-110",
    flare: "bg-flare text-void hover:brightness-110",
    surge: "bg-surge text-void hover:brightness-110",
    neutral: "bg-panel-2 text-chalk hover:bg-line",
    ghost: "bg-transparent text-chalk-mid border border-line hover:text-chalk hover:border-chalk-dim",
  };
  const t = toneIn === "ghost" ? "ghost" : tone(toneIn);
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={ariaPressed}
      className={`rounded-full px-4 py-2 text-[13px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${map[t]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Field(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return (
    <input
      {...rest}
      className={`rounded-full border border-line bg-panel px-4 py-2 text-[13px] text-chalk outline-none transition placeholder:text-chalk-dim focus:border-flare ${className}`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = "", children, ...rest } = props;
  return (
    <select
      {...rest}
      className={`rounded-full border border-line bg-panel px-3 py-2 text-[12px] text-chalk outline-none transition focus:border-flare ${className}`}
    >
      {children}
    </select>
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
          className={`stat rounded font-semibold ${
            size === "xs" ? "px-1 py-px text-[9px]" : "px-1.5 py-0.5 text-[10px]"
          } ${fdrClass(f.rerated)}`}
        >
          {f.opponent}
          {f.home ? "" : "*"}
        </span>
      ))}
    </div>
  );
}

export function Loading({ what }: { what: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-28">
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 rounded-full bg-strike"
            style={{ animation: `pulse-live 1.2s ease-in-out ${i * 0.16}s infinite` }}
          />
        ))}
      </div>
      <p className="label">Loading {what}</p>
    </div>
  );
}

export function ErrorNote({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="bug bug-strike p-5">
      <p className="display text-lg text-strike">{title}</p>
      {detail && <p className="mt-2 text-[14px] leading-relaxed text-chalk-mid">{detail}</p>}
    </div>
  );
}

/** Compatibility shims so the redesign can land without rewriting every page at once. */
export const Panel = Bug;
export const PanelHead = BugHead;
export const Tile = Stat;
