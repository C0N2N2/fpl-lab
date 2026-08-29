"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fdrClass, fetchPlayers, POSITIONS,
  type Payload, type Position, type Row,
} from "@/lib/api";
import {
  autoFill, bestEleven, blockedReason, BUDGET, countByPosition,
  isComplete, SQUAD_SIZE, squadCost, validate,
} from "@/lib/squad";

const STORAGE_KEY = "fpl-lab.squad.v1";

export default function SquadBuilder() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [horizon, setHorizon] = useState(5);
  const [ids, setIds] = useState<number[]>([]);
  const [restored, setRestored] = useState(false);

  const [query, setQuery] = useState("");
  const [pickPos, setPickPos] = useState<Position | "ALL">("ALL");
  const [rank, setRank] = useState<"xp" | "xpHorizon" | "value">("xpHorizon");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setIds(JSON.parse(raw) as number[]);
    } catch {
      /* storage can be unavailable; an empty squad is a fine default */
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
      /* ignore quota / private-mode failures */
    }
  }, [ids, restored]);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    fetchPlayers(horizon)
      .then((json) => { if (!cancelled) setData(json); })
      .catch((e: Error) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [horizon]);

  const byId = useMemo(() => {
    const m = new Map<number, Row>();
    data?.players.forEach((p) => m.set(p.id, p));
    return m;
  }, [data]);

  const squad = useMemo(
    () => ids.map((id) => byId.get(id)).filter((p): p is Row => Boolean(p)),
    [ids, byId],
  );

  const cost = squadCost(squad);
  const remaining = BUDGET - cost;
  const issues = validate(squad);
  const complete = isComplete(squad);
  const counts = countByPosition(squad);
  const eleven = useMemo(() => bestEleven(squad, "xp"), [squad]);

  const add = useCallback((p: Row) => setIds((prev) => [...prev, p.id]), []);
  const remove = useCallback((p: Row) => setIds((prev) => prev.filter((i) => i !== p.id)), []);

  const candidates = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.players
      .filter((p) => (pickPos === "ALL" ? true : p.position === pickPos))
      .filter((p) => (q ? p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q) : true))
      .filter((p) => !ids.includes(p.id))
      .sort((a, b) => b[rank] - a[rank])
      .slice(0, 60);
  }, [data, query, pickPos, rank, ids]);

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">

        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <nav className="mb-2 flex gap-4 font-mono text-xs">
              <Link href="/" className="text-zinc-500 hover:text-emerald-600">Explorer</Link>
              <span className="font-semibold text-emerald-600">Squad builder</span>
            </nav>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Build a squad</h1>
            <p className="mt-1 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
              £100.0m, 2/5/5/3 by position, three players per club. The best legal XI and
              captain are chosen for you as you pick.
            </p>
          </div>
          <div className="text-right">
            <div className={`font-mono text-3xl font-bold tabular-nums ${remaining < 0 ? "text-rose-600" : "text-emerald-600"}`}>
              £{remaining.toFixed(1)}m
            </div>
            <div className="font-mono text-xs text-zinc-500">
              remaining · {squad.length}/15 picked
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-lg border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
            <strong>Could not load FPL data.</strong> {error}
          </div>
        )}
        {!data && !error && (
          <div className="py-20 text-center text-sm text-zinc-500">Loading FPL data…</div>
        )}

        {data && (
          <>
            <div className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
              {POSITIONS.map((p) => {
                const full = counts[p] >= SQUAD_SIZE[p];
                return (
                  <span
                    key={p}
                    className={`rounded-md px-2.5 py-1 font-mono text-xs font-semibold ${
                      full
                        ? "bg-emerald-600 text-white"
                        : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}
                  >
                    {p} {counts[p]}/{SQUAD_SIZE[p]}
                  </span>
                );
              })}

              <button
                onClick={() => setIds(autoFill(squad, data.players).map((p) => p.id))}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
              >
                Auto-fill
              </button>
              <button
                onClick={() => setIds([])}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-600 transition hover:border-rose-400 hover:text-rose-600 dark:border-zinc-700 dark:text-zinc-400"
              >
                Clear
              </button>

              <label className="ml-auto flex items-center gap-2 font-mono text-xs text-zinc-500">
                horizon
                <select
                  value={horizon}
                  onChange={(e) => setHorizon(Number(e.target.value))}
                  className="rounded-md border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-950"
                >
                  {[1, 3, 5, 8].map((n) => <option key={n} value={n}>{n} GW</option>)}
                </select>
              </label>
            </div>

            {issues.length > 0 && (
              <div className="mb-5 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
                <ul className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs text-amber-800 dark:text-amber-300">
                  {issues.map((i, n) => <li key={n}>⚠ {i.message}</li>)}
                </ul>
              </div>
            )}

            <div className="grid gap-5 lg:grid-cols-[1fr_460px]">

              {/* ---- pitch ---- */}
              <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
                  <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Best XI {eleven.formation !== "—" && `· ${eleven.formation}`}
                  </h2>
                  {eleven.xi.length === 11 && (
                    <div className="font-mono text-sm">
                      <span className="text-zinc-500">projected </span>
                      <span className="text-xl font-bold text-emerald-600">
                        {eleven.total.toFixed(1)}
                      </span>
                      <span className="text-zinc-500"> pts</span>
                    </div>
                  )}
                </div>

                {squad.length === 0 ? (
                  <p className="py-16 text-center text-sm text-zinc-500">
                    Add players from the list, or hit Auto-fill to start from the model&apos;s
                    best-value squad.
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {(["GKP", "DEF", "MID", "FWD"] as Position[]).map((pos) => {
                      const line = eleven.xi.filter((p) => p.position === pos);
                      if (!line.length) return null;
                      return (
                        <div key={pos} className="flex flex-wrap gap-2">
                          <span className="w-9 flex-none pt-2 font-mono text-[10px] uppercase text-zinc-400">
                            {pos}
                          </span>
                          {line.map((p) => (
                            <PlayerChip
                              key={p.id}
                              p={p}
                              captain={eleven.captain?.id === p.id}
                              vice={eleven.vice?.id === p.id}
                              onRemove={() => remove(p)}
                            />
                          ))}
                        </div>
                      );
                    })}

                    {eleven.bench.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2 rounded-md bg-zinc-100 p-2 dark:bg-zinc-950/60">
                        <span className="w-9 flex-none pt-2 font-mono text-[10px] uppercase text-zinc-400">
                          Sub
                        </span>
                        {eleven.bench.map((p) => (
                          <PlayerChip key={p.id} p={p} onRemove={() => remove(p)} muted />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {complete && (
                  <p className="mt-4 rounded-md bg-emerald-500/10 p-2.5 font-mono text-[11px] text-emerald-700 dark:text-emerald-300">
                    ✓ Legal squad · £{cost.toFixed(1)}m spent · captain {eleven.captain?.name} ·
                    vice {eleven.vice?.name}
                  </p>
                )}
              </section>

              {/* ---- picker ---- */}
              <section className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 p-3 dark:border-zinc-800">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search…"
                    aria-label="Search players"
                    className="w-32 flex-1 rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-950"
                  />
                  <select
                    value={pickPos}
                    onChange={(e) => setPickPos(e.target.value as Position | "ALL")}
                    aria-label="Filter by position"
                    className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950"
                  >
                    <option value="ALL">All</option>
                    {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <select
                    value={rank}
                    onChange={(e) => setRank(e.target.value as typeof rank)}
                    aria-label="Rank by"
                    className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950"
                  >
                    <option value="xpHorizon">by xP·{horizon}</option>
                    <option value="xp">by next GW</option>
                    <option value="value">by value</option>
                  </select>
                </div>

                <ul className="max-h-[620px] divide-y divide-zinc-100 overflow-y-auto dark:divide-zinc-800/60">
                  {candidates.map((p) => {
                    const blocked = blockedReason(squad, p);
                    return (
                      <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="truncate font-semibold text-sm">{p.name}</span>
                            <span className="font-mono text-[10px] text-zinc-500">
                              {p.teamShort} · {p.position}
                            </span>
                            {!p.available && (
                              <span className="rounded bg-rose-500/20 px-1 font-mono text-[9px] font-semibold text-rose-700 dark:text-rose-300">
                                OUT
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 flex gap-1">
                            {p.fixtures.slice(0, 5).map((f) => (
                              <span
                                key={f.gw}
                                title={`GW${f.gw} ${f.opponent} ${f.home ? "(H)" : "(A)"} · re-rated ${f.rerated}`}
                                className={`rounded px-1 font-mono text-[9px] ${fdrClass(f.rerated)}`}
                              >
                                {f.opponent}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right font-mono text-xs tabular-nums">
                          <div className="font-semibold text-emerald-600">
                            {rank === "value" ? p.value.toFixed(2) : (rank === "xp" ? p.xp : p.xpHorizon).toFixed(1)}
                          </div>
                          <div className="text-zinc-500">£{p.price.toFixed(1)}</div>
                        </div>
                        <button
                          onClick={() => add(p)}
                          disabled={Boolean(blocked)}
                          title={blocked ?? "Add to squad"}
                          className="rounded-md bg-emerald-600 px-2.5 py-1 font-mono text-xs font-semibold text-white transition enabled:hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 dark:disabled:bg-zinc-800"
                        >
                          +
                        </button>
                      </li>
                    );
                  })}
                  {candidates.length === 0 && (
                    <li className="px-3 py-10 text-center text-sm text-zinc-500">No matches.</li>
                  )}
                </ul>
              </section>
            </div>

            <p className="mt-4 font-mono text-[10px] text-zinc-500">
              Fixture colours use difficulty re-rated on {data.meta.matchesPlayed} matches
              played, not FPL&apos;s preseason ratings. Squad is saved in this browser only.
            </p>
          </>
        )}
      </div>
    </main>
  );
}

function PlayerChip({
  p, captain, vice, muted, onRemove,
}: {
  p: Row;
  captain?: boolean;
  vice?: boolean;
  muted?: boolean;
  onRemove: () => void;
}) {
  return (
    <div
      className={`group relative min-w-[124px] flex-1 rounded-md border px-2.5 py-1.5 ${
        muted
          ? "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
          : "border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/60"
      } ${captain ? "!border-emerald-500 ring-1 ring-emerald-500/40" : ""}`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="truncate text-sm font-semibold">{p.name}</span>
        {captain && <span className="rounded bg-emerald-600 px-1 font-mono text-[9px] font-bold text-white">C</span>}
        {vice && !captain && <span className="rounded bg-zinc-400 px-1 font-mono text-[9px] font-bold text-white">V</span>}
      </div>
      <div className="flex items-center justify-between font-mono text-[10px] text-zinc-500">
        <span>{p.teamShort} £{p.price.toFixed(1)}</span>
        <span className="font-semibold text-emerald-600">{p.xp.toFixed(1)}</span>
      </div>
      <button
        onClick={onRemove}
        aria-label={`Remove ${p.name}`}
        className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-xs font-bold text-white group-hover:flex focus:flex"
      >
        ×
      </button>
    </div>
  );
}
