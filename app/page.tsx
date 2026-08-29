"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { fetchPlayers, POSITIONS, type Payload, type Position, type Row } from "@/lib/api";
import { ErrorNote, FixtureRun, Hero, Loading, Panel, Pill } from "@/components/ui";

type SortKey =
  | "xp" | "xpHorizon" | "value" | "differential" | "price" | "points"
  | "form" | "ownership" | "xG90" | "xA90" | "defcon90" | "minutes"
  | "netTransfers" | "priceChangeSeason";

const compact = (n: number) =>
  Math.abs(n) >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(n);

const COLUMNS: { key: SortKey; label: string; help: string; fmt: (r: Row) => string }[] = [
  { key: "xp", label: "xP", help: "Projected points, next gameweek", fmt: (r) => r.xp.toFixed(2) },
  { key: "xpHorizon", label: "xP·N", help: "Projected points across the whole horizon", fmt: (r) => r.xpHorizon.toFixed(1) },
  { key: "value", label: "Value", help: "Horizon points per £1m of price", fmt: (r) => r.value.toFixed(2) },
  { key: "differential", label: "Diff", help: "Projection weighted against ownership — high means good and rarely picked", fmt: (r) => r.differential.toFixed(1) },
  { key: "price", label: "£", help: "Current price", fmt: (r) => r.price.toFixed(1) },
  { key: "priceChangeSeason", label: "Δ£", help: "Price movement since the season started", fmt: (r) => (r.priceChangeSeason > 0 ? "+" : "") + r.priceChangeSeason.toFixed(1) },
  { key: "netTransfers", label: "Net in", help: "Transfers in minus out this gameweek — the pressure behind the next price change", fmt: (r) => (r.netTransfers > 0 ? "+" : "") + compact(r.netTransfers) },
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
  const [maxOwnership, setMaxOwnership] = useState(100);
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
      .filter((r) => r.ownership <= maxOwnership)
      .filter((r) => (hideUnavailable ? r.available : true))
      .filter((r) => (q ? r.name.toLowerCase().includes(q) || r.team.toLowerCase().includes(q) : true))
      .sort((a, b) => (b[sortKey] as number) - (a[sortKey] as number))
      .slice(0, 120);
  }, [data, query, positions, teamId, maxPrice, minMinutes, maxOwnership, hideUnavailable, sortKey]);

  function togglePosition(p: Position) {
    setPositions((prev) => {
      const next = new Set(prev);
      if (next.has(p)) { if (next.size > 1) next.delete(p); } else next.add(p);
      return next;
    });
  }

  const deadline = data?.meta.deadline
    ? new Date(data.meta.deadline).toLocaleString(undefined, {
        weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
      })
    : null;

  return (
    <main className="py-10">
      <Hero
        kicker="Player rankings"
        title={<>Find the <span className="marker">best picks</span> before the deadline</>}
        blurb="Every player in the game, ranked by projected points — built from expected goals, clean-sheet probability, defensive actions and fixture difficulty re-rated on real results."
        right={
          data ? (
            <div className="rounded-xl border border-line bg-flare px-5 py-3 text-chalk ">
              <div className="display text-3xl">
                {data.meta.nextGameweek ? `GW ${data.meta.nextGameweek}` : "Season over"}
              </div>
              {deadline && <div className="stat text-[11px] font-semibold">deadline {deadline}</div>}
              <div className="stat text-[11px]">{data.meta.playerCount} players</div>
            </div>
          ) : null
        }
      />

      <Panel className="mb-5">
        <div className="flex flex-wrap items-center gap-3 p-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search player or club…"
            aria-label="Search player or club"
            className="w-52 rounded-lg border border-line bg-panel px-3 py-1.5 text-sm outline-none"
          />

          <div className="flex gap-1">
            {POSITIONS.map((p) => (
              <button
                key={p}
                onClick={() => togglePosition(p)}
                aria-pressed={positions.has(p)}
                className={`stat rounded-lg border border-line px-3 py-1.5 text-xs font-bold transition ${
                  positions.has(p) ? "bg-strike text-white" : "bg-panel text-chalk-dim"
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
            className="rounded-lg border border-line bg-panel px-2 py-1.5 text-sm"
          >
            <option value="all">All clubs</option>
            {data?.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>

          <label className="stat flex items-center gap-2 text-xs text-chalk-mid">
            max £{maxPrice.toFixed(1)}
            <input
              type="range" min={3.8} max={15.5} step={0.5} value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-24 accent-[var(--strike)]"
            />
          </label>

          <label className="stat flex items-center gap-2 text-xs text-chalk-mid">
            min {minMinutes}′
            <input
              type="range" min={0} max={900} step={45} value={minMinutes}
              onChange={(e) => setMinMinutes(Number(e.target.value))}
              className="w-20 accent-[var(--strike)]"
            />
          </label>

          <label className="stat flex items-center gap-2 text-xs text-chalk-mid">
            horizon
            <select
              value={horizon}
              onChange={(e) => setHorizon(Number(e.target.value))}
              className="rounded-lg border border-line bg-panel px-2 py-1 text-xs"
            >
              {[1, 3, 5, 8].map((n) => <option key={n} value={n}>{n} GW</option>)}
            </select>
          </label>

          <label className="stat flex cursor-pointer items-center gap-2 text-xs text-chalk-mid">
            <input
              type="checkbox" checked={hideUnavailable}
              onChange={(e) => setHideUnavailable(e.target.checked)}
              className="accent-[var(--strike)]"
            />
            fit players only
          </label>

          <button
            onClick={() => {
              const on = maxOwnership <= 10;
              setMaxOwnership(on ? 100 : 10);
              setSortKey(on ? "xp" : "differential");
            }}
            aria-pressed={maxOwnership <= 10}
            title="Show only players owned by 10% or fewer, ranked by projection against ownership"
            className={`stat rounded-lg border border-line px-3 py-1.5 text-xs font-bold transition ${
              maxOwnership <= 10 ? "bg-flare text-chalk" : "bg-panel text-chalk-mid hover:bg-flare-wash"
            }`}
          >
            Differentials
          </button>
        </div>
      </Panel>

      {error && <ErrorNote title="Couldn't load FPL data" detail={error} />}
      {!data && !error && <Loading what="every player" />}

      {data && (
        <Panel className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-panel-2">
                  <th className="stat px-3 py-3 text-left text-[10px] uppercase tracking-wider text-chalk-dim">
                    Player
                  </th>
                  {COLUMNS.map((c) => (
                    <th
                      key={c.key}
                      title={c.help}
                      onClick={() => setSortKey(c.key)}
                      className={`stat cursor-pointer px-3 py-3 text-right text-[10px] uppercase tracking-wider transition select-none ${
                        sortKey === c.key ? "bg-flare text-chalk" : "text-chalk-dim hover:text-chalk"
                      }`}
                    >
                      {c.label}{sortKey === c.key ? " ▼" : ""}
                    </th>
                  ))}
                  <th className="stat px-3 py-3 text-left text-[10px] uppercase tracking-wider text-chalk-dim">
                    Next {horizon}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <Fragment key={r.id}>
                    <tr
                      onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                      className="cursor-pointer border-b border-line-soft transition hover:bg-flare-wash"
                    >
                      <td className="px-3 py-2">
                        <div className="flex items-baseline gap-2">
                          <span className="stat w-5 text-[10px] text-chalk-dim">{i + 1}</span>
                          <span className="font-bold">{r.name}</span>
                          <span className="stat text-[10px] text-chalk-dim">
                            {r.teamShort} · {r.position}
                          </span>
                          {!r.available && <Pill tone="red">out</Pill>}
                          {r.available && r.chanceNext !== null && r.chanceNext < 100 && (
                            <Pill tone="yellow">{r.chanceNext}%</Pill>
                          )}
                        </div>
                      </td>
                      {COLUMNS.map((c) => (
                        <td
                          key={c.key}
                          className={`stat px-3 py-2 text-right ${
                            c.key === sortKey ? "bg-flare-wash font-bold text-chalk" : "text-chalk-mid"
                          }`}
                        >
                          {c.fmt(r)}
                        </td>
                      ))}
                      <td className="px-3 py-2">
                        <FixtureRun fixtures={r.fixtures} />
                      </td>
                    </tr>
                    {expanded === r.id && (
                      <tr className="border-b border-line-soft bg-panel-2">
                        <td colSpan={COLUMNS.length + 2} className="px-3 py-3">
                          <div className="stat flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-chalk-mid">
                            <span className="font-bold text-chalk">
                              Next GW → {r.xp.toFixed(2)} xP
                            </span>
                            <span>appearance {r.breakdown.appearance.toFixed(2)}</span>
                            <span>goals {r.breakdown.goals.toFixed(2)}</span>
                            <span>assists {r.breakdown.assists.toFixed(2)}</span>
                            <span>clean sheet {r.breakdown.cleanSheet.toFixed(2)}</span>
                            {r.position === "GKP" && <span>saves {r.breakdown.saves.toFixed(2)}</span>}
                            {r.breakdown.conceded !== 0 && <span>conceded {r.breakdown.conceded.toFixed(2)}</span>}
                            <span>defcon {r.breakdown.defcon.toFixed(2)}</span>
                            <span>bonus {r.breakdown.bonus.toFixed(2)}</span>
                            <span className="text-chalk-dim">expected minutes {r.expectedMinutes}′</span>
                          </div>
                          {r.news && <p className="mt-2 text-[12px] text-strike">{r.news}</p>}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length === 0 && (
            <p className="py-14 text-center text-sm text-chalk-mid">No players match those filters.</p>
          )}
        </Panel>
      )}

      <p className="stat mt-4 text-[10px] leading-relaxed text-chalk-dim">
        Fixtures marked * are away. Colour is difficulty <em>re-rated on results</em> — team
        attack and defence measured from actual goals, shrunk toward FPL&apos;s preseason ratings
        by matches played. Hover a fixture to compare the two. Click any row for the breakdown.
      </p>
    </main>
  );
}
