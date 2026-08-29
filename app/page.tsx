"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import {
  fdrClass, fetchPlayers, POSITIONS,
  type Payload, type Position, type Row,
} from "@/lib/api";

type SortKey =
  | "xp" | "xpHorizon" | "value" | "price" | "points"
  | "form" | "ownership" | "xG90" | "xA90" | "defcon90" | "minutes";

const COLUMNS: { key: SortKey; label: string; help: string; fmt: (r: Row) => string }[] = [
  { key: "xp", label: "xP", help: "Projected points, next gameweek", fmt: (r) => r.xp.toFixed(2) },
  { key: "xpHorizon", label: "xP·N", help: "Projected points across the whole horizon", fmt: (r) => r.xpHorizon.toFixed(1) },
  { key: "value", label: "Value", help: "Horizon points per £1m of price", fmt: (r) => r.value.toFixed(2) },
  { key: "price", label: "£", help: "Current price", fmt: (r) => r.price.toFixed(1) },
  { key: "points", label: "Pts", help: "Total points this season", fmt: (r) => String(r.points) },
  { key: "form", label: "Form", help: "FPL form rating", fmt: (r) => r.form.toFixed(1) },
  { key: "xG90", label: "xG90", help: "Expected goals per 90 minutes", fmt: (r) => r.xG90.toFixed(2) },
  { key: "xA90", label: "xA90", help: "Expected assists per 90 minutes", fmt: (r) => r.xA90.toFixed(2) },
  { key: "defcon90", label: "DEF90", help: "Defensive contributions per 90 minutes", fmt: (r) => r.defcon90.toFixed(1) },
  { key: "ownership", label: "Own%", help: "Selected by percentage", fmt: (r) => r.ownership.toFixed(1) },
  { key: "minutes", label: "Min", help: "Minutes played this season", fmt: (r) => String(r.minutes) },
];

export default function Explorer() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [horizon, setHorizon] = useState(5);

  const [query, setQuery] = useState("");
  const [positions, setPositions] = useState<Set<Position>>(new Set(POSITIONS));
  const [teamId, setTeamId] = useState<number | "all">("all");
  const [maxPrice, setMaxPrice] = useState(15.5);
  const [hideUnavailable, setHideUnavailable] = useState(true);
  const [minMinutes, setMinMinutes] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("xp");
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    fetchPlayers(horizon)
      .then((json) => { if (!cancelled) setData(json); })
      .catch((e: Error) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [horizon]);

  const rows = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.players
      .filter((r) => positions.has(r.position))
      .filter((r) => (teamId === "all" ? true : r.teamId === teamId))
      .filter((r) => r.price <= maxPrice)
      .filter((r) => r.minutes >= minMinutes)
      .filter((r) => (hideUnavailable ? r.available : true))
      .filter((r) =>
        q ? r.name.toLowerCase().includes(q) || r.team.toLowerCase().includes(q) : true,
      )
      .sort((a, b) => (b[sortKey] as number) - (a[sortKey] as number))
      .slice(0, 120);
  }, [data, query, positions, teamId, maxPrice, minMinutes, hideUnavailable, sortKey]);

  function togglePosition(p: Position) {
    setPositions((prev) => {
      const next = new Set(prev);
      if (next.has(p)) {
        if (next.size > 1) next.delete(p);
      } else next.add(p);
      return next;
    });
  }

  const deadline = data?.meta.deadline
    ? new Date(data.meta.deadline).toLocaleString(undefined, {
        weekday: "short", day: "numeric", month: "short",
        hour: "2-digit", minute: "2-digit",
      })
    : null;

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">

        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <nav className="mb-2 flex gap-4 font-mono text-xs">
              <span className="font-semibold text-emerald-600">Explorer</span>
              <Link href="/squad" className="text-zinc-500 hover:text-emerald-600">
                Squad builder
              </Link>
            </nav>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">FPL Lab</h1>
            <p className="mt-1 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
              Every player ranked by projected points — built from expected goals, clean-sheet
              probability, defensive contributions and fixture difficulty re-rated on results.
            </p>
          </div>
          <div className="text-right text-xs text-zinc-600 dark:text-zinc-400">
            {data && (
              <>
                <div className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {data.meta.nextGameweek ? `Gameweek ${data.meta.nextGameweek}` : "Season over"}
                </div>
                {deadline && <div className="font-mono">deadline {deadline}</div>}
                <div className="font-mono">{data.meta.playerCount} players</div>
              </>
            )}
          </div>
        </header>

        <section className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search player or club…"
            aria-label="Search player or club"
            className="w-56 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none placeholder:text-zinc-400 focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-950"
          />

          <div className="flex gap-1">
            {POSITIONS.map((p) => (
              <button
                key={p}
                onClick={() => togglePosition(p)}
                aria-pressed={positions.has(p)}
                className={`rounded-md px-3 py-1.5 font-mono text-xs font-semibold transition focus:outline-2 focus:outline-offset-2 focus:outline-emerald-500 ${
                  positions.has(p)
                    ? "bg-emerald-600 text-white"
                    : "bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <select
            value={teamId}
            onChange={(e) => setTeamId(e.target.value === "all" ? "all" : Number(e.target.value))}
            aria-label="Filter by club"
            className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          >
            <option value="all">All clubs</option>
            {data?.teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
            max £{maxPrice.toFixed(1)}
            <input
              type="range" min={3.8} max={15.5} step={0.5}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-28 accent-emerald-600"
            />
          </label>

          <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
            min {minMinutes}′
            <input
              type="range" min={0} max={900} step={45}
              value={minMinutes}
              onChange={(e) => setMinMinutes(Number(e.target.value))}
              className="w-24 accent-emerald-600"
            />
          </label>

          <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
            horizon
            <select
              value={horizon}
              onChange={(e) => setHorizon(Number(e.target.value))}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950"
            >
              {[1, 3, 5, 8].map((n) => <option key={n} value={n}>{n} GW</option>)}
            </select>
          </label>

          <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
            <input
              type="checkbox"
              checked={hideUnavailable}
              onChange={(e) => setHideUnavailable(e.target.checked)}
              className="accent-emerald-600"
            />
            fit players only
          </label>
        </section>

        {error && (
          <div className="rounded-lg border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
            <strong>Could not load FPL data.</strong> {error}
          </div>
        )}

        {!data && !error && (
          <div className="py-20 text-center text-sm text-zinc-500">Loading FPL data…</div>
        )}

        {data && (
          <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <table className="w-full min-w-[1100px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                    Player
                  </th>
                  {COLUMNS.map((c) => (
                    <th
                      key={c.key}
                      title={c.help}
                      onClick={() => setSortKey(c.key)}
                      className={`cursor-pointer px-3 py-2.5 text-right font-mono text-[10px] uppercase tracking-wider transition select-none ${
                        sortKey === c.key
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                      }`}
                    >
                      {c.label}{sortKey === c.key ? " ↓" : ""}
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                    Next {horizon}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <Fragment key={r.id}>
                    <tr
                      onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                      className="cursor-pointer border-b border-zinc-100 transition hover:bg-emerald-500/5 dark:border-zinc-800/60"
                    >
                      <td className="px-3 py-2">
                        <div className="flex items-baseline gap-2">
                          <span className="font-semibold">{r.name}</span>
                          <span className="font-mono text-[10px] text-zinc-500">
                            {r.teamShort} · {r.position}
                          </span>
                          {!r.available && (
                            <span className="rounded bg-rose-500/20 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-rose-700 dark:text-rose-300">
                              OUT
                            </span>
                          )}
                          {r.available && r.chanceNext !== null && r.chanceNext < 100 && (
                            <span className="rounded bg-amber-500/20 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-amber-700 dark:text-amber-300">
                              {r.chanceNext}%
                            </span>
                          )}
                        </div>
                      </td>
                      {COLUMNS.map((c) => (
                        <td
                          key={c.key}
                          className={`px-3 py-2 text-right font-mono tabular-nums ${
                            c.key === sortKey
                              ? "font-semibold text-emerald-700 dark:text-emerald-400"
                              : ""
                          }`}
                        >
                          {c.fmt(r)}
                        </td>
                      ))}
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          {r.fixtures.map((f) => (
                            <span
                              key={f.gw}
                              title={`GW${f.gw} · ${f.opponent} ${f.home ? "(H)" : "(A)"} · ${f.points.toFixed(2)} xP · FPL rates this ${f.difficulty}, results say ${f.rerated}`}
                              className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${fdrClass(f.rerated)}`}
                            >
                              {f.opponent}{f.home ? "" : "*"}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                    {expanded === r.id && (
                      <tr className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800/60 dark:bg-zinc-950/60">
                        <td colSpan={COLUMNS.length + 2} className="px-3 py-3">
                          <div className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                              Next GW → {r.xp.toFixed(2)} xP
                            </span>
                            <span>appearance {r.breakdown.appearance.toFixed(2)}</span>
                            <span>goals {r.breakdown.goals.toFixed(2)}</span>
                            <span>assists {r.breakdown.assists.toFixed(2)}</span>
                            <span>clean sheet {r.breakdown.cleanSheet.toFixed(2)}</span>
                            {r.position === "GKP" && <span>saves {r.breakdown.saves.toFixed(2)}</span>}
                            {r.breakdown.conceded !== 0 && (
                              <span>conceded {r.breakdown.conceded.toFixed(2)}</span>
                            )}
                            <span>defcon {r.breakdown.defcon.toFixed(2)}</span>
                            <span>bonus {r.breakdown.bonus.toFixed(2)}</span>
                            <span className="text-zinc-500">
                              expected minutes {r.expectedMinutes}′
                            </span>
                          </div>
                          {r.news && (
                            <div className="mt-2 text-[11px] text-amber-700 dark:text-amber-400">
                              {r.news}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && (
              <div className="py-12 text-center text-sm text-zinc-500">
                No players match those filters.
              </div>
            )}
          </div>
        )}

        <p className="mt-4 font-mono text-[10px] leading-relaxed text-zinc-500">
          Fixtures marked * are away. Colour is difficulty <em>re-rated on results</em> — team
          attack and defence measured from actual goals, shrunk toward FPL&apos;s preseason
          ratings by how many matches have been played. Hover a fixture to compare the two.
          Click any row for the points breakdown.
        </p>
      </div>
    </main>
  );
}
