"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchPlayers, POSITIONS, type Payload, type Position, type Row } from "@/lib/api";
import {
  autoFill, bestEleven, blockedReason, BUDGET, countByPosition,
  isComplete, SQUAD_SIZE, squadCost, validate,
} from "@/lib/squad";
import { ErrorNote, FixtureRun, Hero, Loading, Panel, PanelHead, Pill } from "@/components/ui";

const STORAGE_KEY = "fpl-lab.squad.v1";
const LINES: Position[] = ["GKP", "DEF", "MID", "FWD"];

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
    } catch { /* storage unavailable — empty squad is a fine default */ }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)); } catch { /* ignore */ }
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
    <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
      <Hero
        kicker="Wish team"
        title={<>Build the <span className="marker">perfect</span> fifteen</>}
        blurb="£100.0m, two keepers, five defenders, five midfielders, three forwards, three players per club. The best legal XI and captain are picked for you as you go."
        right={
          <div
            className={`rounded-xl border-2 border-ink px-5 py-3 shadow-[4px_4px_0_0_var(--ink)] ${
              remaining < 0 ? "bg-red text-white" : "bg-yellow text-ink"
            }`}
          >
            <div className="display text-4xl">£{remaining.toFixed(1)}m</div>
            <div className="stat text-[11px] font-semibold">
              left · {squad.length}/15 picked
            </div>
          </div>
        }
      />

      {error && <ErrorNote title="Couldn't load FPL data" detail={error} />}
      {!data && !error && <Loading what="every player" />}

      {data && (
        <>
          <Panel className="mb-5">
            <div className="flex flex-wrap items-center gap-3 p-3">
              {POSITIONS.map((p) => {
                const full = counts[p] >= SQUAD_SIZE[p];
                return (
                  <span
                    key={p}
                    className={`stat rounded-lg border-2 border-ink px-2.5 py-1 text-xs font-bold ${
                      full ? "bg-good text-white" : "bg-surface text-ink-mid"
                    }`}
                  >
                    {p} {counts[p]}/{SQUAD_SIZE[p]}
                  </span>
                );
              })}

              <button
                onClick={() => setIds(autoFill(squad, data.players).map((p) => p.id))}
                className="rounded-lg border-2 border-ink bg-red px-4 py-1.5 text-sm font-bold text-white shadow-[3px_3px_0_0_var(--ink)] transition hover:bg-red-hot"
              >
                Auto-fill
              </button>
              <button
                onClick={() => setIds([])}
                className="rounded-lg border-2 border-ink bg-surface px-4 py-1.5 text-sm font-bold text-ink-mid transition hover:bg-red-wash hover:text-red"
              >
                Clear
              </button>

              <label className="stat ml-auto flex items-center gap-2 text-xs text-ink-mid">
                horizon
                <select
                  value={horizon}
                  onChange={(e) => setHorizon(Number(e.target.value))}
                  className="rounded-lg border-2 border-ink bg-surface px-2 py-1"
                >
                  {[1, 3, 5, 8].map((n) => <option key={n} value={n}>{n} GW</option>)}
                </select>
              </label>
            </div>
          </Panel>

          {issues.length > 0 && (
            <div className="mb-5 rounded-xl border-2 border-red bg-red-wash px-4 py-3">
              <ul className="stat flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold text-red">
                {issues.map((i, n) => <li key={n}>⚠ {i.message}</li>)}
              </ul>
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-[1fr_440px]">
            <Panel>
              <PanelHead
                title={eleven.formation === "—" ? "Best XI" : `Best XI · ${eleven.formation}`}
                right={
                  eleven.xi.length === 11 ? (
                    <span className="stat text-sm">
                      <span className="text-ink-soft">projected </span>
                      <b className="display text-2xl text-red">{eleven.total.toFixed(1)}</b>
                      <span className="text-ink-soft"> pts</span>
                    </span>
                  ) : null
                }
              />
              {squad.length === 0 ? (
                <p className="px-5 py-20 text-center text-sm text-ink-mid">
                  Add players from the list, or hit <b>Auto-fill</b> to start from the model&apos;s
                  best-value squad.
                </p>
              ) : (
                <div className="flex flex-col gap-3 p-4">
                  {LINES.map((pos) => {
                    const line = eleven.xi.filter((p) => p.position === pos);
                    if (!line.length) return null;
                    return (
                      <div key={pos} className="flex flex-wrap items-stretch gap-2">
                        <span className="stat w-9 flex-none pt-3 text-[10px] uppercase text-ink-soft">
                          {pos}
                        </span>
                        {line.map((p) => (
                          <Chip
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
                    <div className="mt-1 flex flex-wrap items-stretch gap-2 rounded-lg bg-surface-2 p-2">
                      <span className="stat w-9 flex-none pt-3 text-[10px] uppercase text-ink-soft">
                        Sub
                      </span>
                      {eleven.bench.map((p) => (
                        <Chip key={p.id} p={p} muted onRemove={() => remove(p)} />
                      ))}
                    </div>
                  )}
                  {complete && (
                    <p className="stat rounded-lg bg-good-wash px-3 py-2 text-[11px] font-semibold text-good">
                      ✓ Legal squad · £{cost.toFixed(1)}m spent · captain {eleven.captain?.name} ·
                      vice {eleven.vice?.name}
                    </p>
                  )}
                </div>
              )}
            </Panel>

            <Panel className="overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 border-b-2 border-ink p-3">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search…"
                  aria-label="Search players"
                  className="w-28 flex-1 rounded-lg border-2 border-ink bg-surface px-2.5 py-1.5 text-sm outline-none"
                />
                <select
                  value={pickPos}
                  onChange={(e) => setPickPos(e.target.value as Position | "ALL")}
                  aria-label="Filter by position"
                  className="rounded-lg border-2 border-ink bg-surface px-2 py-1.5 text-xs"
                >
                  <option value="ALL">All</option>
                  {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <select
                  value={rank}
                  onChange={(e) => setRank(e.target.value as typeof rank)}
                  aria-label="Rank by"
                  className="rounded-lg border-2 border-ink bg-surface px-2 py-1.5 text-xs"
                >
                  <option value="xpHorizon">by xP·{horizon}</option>
                  <option value="xp">by next GW</option>
                  <option value="value">by value</option>
                </select>
              </div>

              <ul className="max-h-[620px] divide-y divide-line-soft overflow-y-auto">
                {candidates.map((p) => {
                  const blocked = blockedReason(squad, p);
                  return (
                    <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="truncate text-sm font-bold">{p.name}</span>
                          <span className="stat text-[10px] text-ink-soft">
                            {p.teamShort} · {p.position}
                          </span>
                          {!p.available && <Pill tone="red">out</Pill>}
                        </div>
                        <div className="mt-1">
                          <FixtureRun fixtures={p.fixtures.slice(0, 5)} size="xs" />
                        </div>
                      </div>
                      <div className="stat text-right text-xs">
                        <div className="font-bold text-red">
                          {rank === "value" ? p.value.toFixed(2) : (rank === "xp" ? p.xp : p.xpHorizon).toFixed(1)}
                        </div>
                        <div className="text-ink-soft">£{p.price.toFixed(1)}</div>
                      </div>
                      <button
                        onClick={() => add(p)}
                        disabled={Boolean(blocked)}
                        title={blocked ?? "Add to squad"}
                        aria-label={blocked ?? `Add ${p.name}`}
                        className="rounded-lg border-2 border-ink bg-red px-2.5 py-1 text-sm font-bold text-white transition enabled:hover:bg-red-hot disabled:cursor-not-allowed disabled:border-line disabled:bg-surface-2 disabled:text-ink-soft"
                      >
                        +
                      </button>
                    </li>
                  );
                })}
                {candidates.length === 0 && (
                  <li className="px-3 py-10 text-center text-sm text-ink-mid">No matches.</li>
                )}
              </ul>
            </Panel>
          </div>

          <p className="stat mt-4 text-[10px] text-ink-soft">
            Fixture colours use difficulty re-rated on {data.meta.matchesPlayed} matches played,
            not FPL&apos;s preseason ratings. Your squad is saved in this browser only.
          </p>
        </>
      )}
    </main>
  );
}

function Chip({
  p, captain, vice, muted, onRemove,
}: {
  p: Row; captain?: boolean; vice?: boolean; muted?: boolean; onRemove: () => void;
}) {
  return (
    <div
      className={`group relative min-w-[132px] flex-1 rounded-lg border-2 px-2.5 py-1.5 ${
        muted ? "border-line bg-surface" : "border-ink bg-surface"
      } ${captain ? "!border-red ring-2 ring-red/25" : ""}`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="truncate text-sm font-bold">{p.name}</span>
        {captain && <Pill tone="red">C</Pill>}
        {vice && !captain && <Pill>V</Pill>}
      </div>
      <div className="stat flex items-center justify-between text-[10px] text-ink-soft">
        <span>{p.teamShort} £{p.price.toFixed(1)}</span>
        <span className="font-bold text-red">{p.xp.toFixed(1)}</span>
      </div>
      <button
        onClick={onRemove}
        aria-label={`Remove ${p.name}`}
        className="absolute -right-2 -top-2 hidden h-5 w-5 items-center justify-center rounded-full border-2 border-ink bg-red text-xs font-bold leading-none text-white group-hover:flex focus:flex"
      >
        ×
      </button>
    </div>
  );
}
