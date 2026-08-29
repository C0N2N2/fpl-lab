"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchPlayers, POSITIONS, type Payload, type Position, type Row } from "@/lib/api";
import {
  autoFill, bestEleven, blockedReason, BUDGET, countByPosition,
  isComplete, SQUAD_SIZE, squadCost, validate,
} from "@/lib/squad";
import { ErrorNote, FixtureRun, Hero, Loading, Panel, PanelHead, Pill } from "@/components/ui";
import { Pitch, PitchRow, PlayerToken } from "@/components/Pitch";

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
    <main className="py-10">
      <Hero
        kicker="Wish team"
        title={<>Build the <span className="marker">perfect</span> fifteen</>}
        blurb="£100.0m, two keepers, five defenders, five midfielders, three forwards, three players per club. The best legal XI and captain are picked for you as you go."
        right={
          <div
            className={`rounded-xl border border-line px-5 py-3  ${
              remaining < 0 ? "bg-strike text-white" : "bg-flare text-chalk"
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
                    className={`stat rounded-lg border border-line px-2.5 py-1 text-xs font-bold ${
                      full ? "bg-surge text-white" : "bg-panel text-chalk-mid"
                    }`}
                  >
                    {p} {counts[p]}/{SQUAD_SIZE[p]}
                  </span>
                );
              })}

              <button
                onClick={() => setIds(autoFill(squad, data.players).map((p) => p.id))}
                className="rounded-lg border border-line bg-strike px-4 py-1.5 text-sm font-bold text-white transition hover:bg-strike-deep"
              >
                Auto-fill
              </button>
              <button
                onClick={() => setIds([])}
                className="rounded-lg border border-line bg-panel px-4 py-1.5 text-sm font-bold text-chalk-mid transition hover:bg-strike-wash hover:text-strike"
              >
                Clear
              </button>

              <label className="stat ml-auto flex items-center gap-2 text-xs text-chalk-mid">
                horizon
                <select
                  value={horizon}
                  onChange={(e) => setHorizon(Number(e.target.value))}
                  className="rounded-lg border border-line bg-panel px-2 py-1"
                >
                  {[1, 3, 5, 8].map((n) => <option key={n} value={n}>{n} GW</option>)}
                </select>
              </label>
            </div>
          </Panel>

          {issues.length > 0 && (
            <div className="mb-5 rounded-xl border border-strike bg-strike-wash px-4 py-3">
              <ul className="stat flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold text-strike">
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
                      <span className="text-chalk-dim">projected </span>
                      <b className="display text-2xl text-strike">{eleven.total.toFixed(1)}</b>
                      <span className="text-chalk-dim"> pts</span>
                    </span>
                  ) : null
                }
              />
              {squad.length === 0 ? (
                <p className="px-5 py-20 text-center text-sm text-chalk-mid">
                  Add players from the list, or hit <b>Auto-fill</b> to start from the model&apos;s
                  best-value squad.
                </p>
              ) : (
                <div className="flex flex-col gap-3 p-4">
                  <Pitch
                    bench={eleven.bench.map((p) => (
                      <PlayerToken
                        key={p.id}
                        name={p.name}
                        club={p.teamShort}
                        value={p.xp.toFixed(1)}
                        meta={`£${p.price.toFixed(1)}`}
                        muted
                        onRemove={() => remove(p)}
                      />
                    ))}
                  >
                    {LINES.map((pos) => {
                      const line = eleven.xi.filter((p) => p.position === pos);
                      if (!line.length) return null;
                      return (
                        <PitchRow key={pos}>
                          {line.map((p) => (
                            <PlayerToken
                              key={p.id}
                              name={p.name}
                              club={p.teamShort}
                              value={p.xp.toFixed(1)}
                              meta={`£${p.price.toFixed(1)}`}
                              captain={eleven.captain?.id === p.id}
                              vice={eleven.vice?.id === p.id}
                              flag={!p.available ? "red" : undefined}
                              flagLabel={!p.available ? "out" : undefined}
                              onRemove={() => remove(p)}
                            />
                          ))}
                        </PitchRow>
                      );
                    })}
                  </Pitch>
                  {complete && (
                    <p className="stat rounded-lg bg-surge-wash px-3 py-2 text-[11px] font-semibold text-surge">
                      ✓ Legal squad · £{cost.toFixed(1)}m spent · captain {eleven.captain?.name} ·
                      vice {eleven.vice?.name}
                    </p>
                  )}
                </div>
              )}
            </Panel>

            <Panel className="overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search…"
                  aria-label="Search players"
                  className="w-28 flex-1 rounded-lg border border-line bg-panel px-2.5 py-1.5 text-sm outline-none"
                />
                <select
                  value={pickPos}
                  onChange={(e) => setPickPos(e.target.value as Position | "ALL")}
                  aria-label="Filter by position"
                  className="rounded-lg border border-line bg-panel px-2 py-1.5 text-xs"
                >
                  <option value="ALL">All</option>
                  {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <select
                  value={rank}
                  onChange={(e) => setRank(e.target.value as typeof rank)}
                  aria-label="Rank by"
                  className="rounded-lg border border-line bg-panel px-2 py-1.5 text-xs"
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
                          <span className="stat text-[10px] text-chalk-dim">
                            {p.teamShort} · {p.position}
                          </span>
                          {!p.available && <Pill tone="red">out</Pill>}
                        </div>
                        <div className="mt-1">
                          <FixtureRun fixtures={p.fixtures.slice(0, 5)} size="xs" />
                        </div>
                      </div>
                      <div className="stat text-right text-xs">
                        <div className="font-bold text-strike">
                          {rank === "value" ? p.value.toFixed(2) : (rank === "xp" ? p.xp : p.xpHorizon).toFixed(1)}
                        </div>
                        <div className="text-chalk-dim">£{p.price.toFixed(1)}</div>
                      </div>
                      <button
                        onClick={() => add(p)}
                        disabled={Boolean(blocked)}
                        title={blocked ?? "Add to squad"}
                        aria-label={blocked ?? `Add ${p.name}`}
                        className="rounded-lg border border-line bg-strike px-2.5 py-1 text-sm font-bold text-white transition enabled:hover:bg-strike-deep disabled:cursor-not-allowed disabled:border-line disabled:bg-panel-2 disabled:text-chalk-dim"
                      >
                        +
                      </button>
                    </li>
                  );
                })}
                {candidates.length === 0 && (
                  <li className="px-3 py-10 text-center text-sm text-chalk-mid">No matches.</li>
                )}
              </ul>
            </Panel>
          </div>

          <p className="stat mt-4 text-[10px] text-chalk-dim">
            Fixture colours use difficulty re-rated on {data.meta.matchesPlayed} matches played,
            not FPL&apos;s preseason ratings. Your squad is saved in this browser only.
          </p>
        </>
      )}
    </main>
  );
}
