"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchPlayers, type Payload, type Row } from "@/lib/api";
import { ErrorNote, FixtureRun, Hero, Loading, Panel, PanelHead, Pill } from "@/components/ui";

/** Rows of the comparison table. `better` says which direction wins. */
const METRICS: {
  key: keyof Row | "csChance";
  label: string;
  help: string;
  better: "high" | "low";
  fmt: (r: Row) => string;
  val: (r: Row) => number;
}[] = [
  { key: "xp", label: "Projected pts (next GW)", help: "Model output for the next fixture", better: "high", fmt: (r) => r.xp.toFixed(2), val: (r) => r.xp },
  { key: "xpHorizon", label: "Projected pts (5 GW)", help: "Sum across the horizon", better: "high", fmt: (r) => r.xpHorizon.toFixed(1), val: (r) => r.xpHorizon },
  { key: "value", label: "Points per £1m", help: "Horizon points divided by price", better: "high", fmt: (r) => r.value.toFixed(2), val: (r) => r.value },
  { key: "price", label: "Price", help: "Current cost", better: "low", fmt: (r) => `£${r.price.toFixed(1)}m`, val: (r) => r.price },
  { key: "points", label: "Points so far", help: "Season total", better: "high", fmt: (r) => String(r.points), val: (r) => r.points },
  { key: "form", label: "Form", help: "FPL's rolling form rating", better: "high", fmt: (r) => r.form.toFixed(1), val: (r) => r.form },
  { key: "xG90", label: "Expected goals / 90", help: "Shot quality per full match", better: "high", fmt: (r) => r.xG90.toFixed(2), val: (r) => r.xG90 },
  { key: "xA90", label: "Expected assists / 90", help: "Chance creation per full match", better: "high", fmt: (r) => r.xA90.toFixed(2), val: (r) => r.xA90 },
  { key: "csChance", label: "Clean sheet chance", help: "Poisson P(0 conceded) in the next fixture", better: "high", fmt: (r) => `${Math.round(csChance(r) * 100)}%`, val: (r) => csChance(r) },
  { key: "defcon90", label: "Defensive actions / 90", help: "Tackles, blocks, interceptions, recoveries", better: "high", fmt: (r) => r.defcon90.toFixed(1), val: (r) => r.defcon90 },
  { key: "expectedMinutes", label: "Expected minutes", help: "Modelled from minutes per team game", better: "high", fmt: (r) => `${r.expectedMinutes}′`, val: (r) => r.expectedMinutes },
  { key: "ownership", label: "Ownership", help: "Selected by", better: "high", fmt: (r) => `${r.ownership.toFixed(1)}%`, val: (r) => r.ownership },
];

/** Clean-sheet probability implied by the model's own breakdown. */
function csChance(r: Row): number {
  const per = r.position === "GKP" || r.position === "DEF" ? 4 : r.position === "MID" ? 1 : 0;
  if (!per) return 0;
  return Math.min(1, (r.breakdown.cleanSheet ?? 0) / per);
}

export default function Compare() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ids, setIds] = useState<number[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchPlayers(5)
      .then((json) => { if (!cancelled) setData(json); })
      .catch((e: Error) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, []);

  const chosen = useMemo(
    () => ids.map((id) => data?.players.find((p) => p.id === id)).filter((p): p is Row => Boolean(p)),
    [ids, data],
  );

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!data || q.length < 2) return [];
    return data.players
      .filter((p) => p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q))
      .filter((p) => !ids.includes(p.id))
      .sort((a, b) => b.xpHorizon - a.xpHorizon)
      .slice(0, 8);
  }, [query, data, ids]);

  function add(p: Row) {
    if (ids.length >= 4) return;
    setIds((prev) => [...prev, p.id]);
    setQuery("");
  }

  return (
    <main className="py-10">
      <Hero
        kicker="Head to head"
        title={<>Who is the <span className="marker">better</span> pick?</>}
        blurb="Put up to four players side by side on projected points, expected goals, clean-sheet odds, minutes and value. The winner of each row is highlighted."
      />

      {error && <ErrorNote title="Couldn't load players" detail={error} />}
      {!data && !error && <Loading what="players" />}

      {data && (
        <>
          <div className="relative mb-6 max-w-md">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={ids.length >= 4 ? "Four is the maximum — remove one first" : "Add a player…"}
              disabled={ids.length >= 4}
              aria-label="Search for a player to compare"
              className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm outline-none disabled:opacity-50"
            />
            {suggestions.length > 0 && (
              <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-line bg-panel ">
                {suggestions.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => add(p)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition hover:bg-flare-wash"
                    >
                      <span>
                        <b>{p.name}</b>{" "}
                        <span className="stat text-[10px] text-chalk-dim">
                          {p.teamShort} · {p.position}
                        </span>
                      </span>
                      <span className="stat text-xs text-chalk-dim">
                        £{p.price.toFixed(1)} · {p.xpHorizon.toFixed(1)} xP
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {chosen.length === 0 ? (
            <Panel>
              <div className="px-5 py-16 text-center">
                <p className="display text-2xl text-chalk-dim">Pick two players to start</p>
                <p className="mt-2 text-sm text-chalk-mid">
                  Try the two you keep going back and forth on.
                </p>
              </div>
            </Panel>
          ) : (
            <Panel className="overflow-hidden">
              <PanelHead
                title="Comparison"
                right={
                  <button
                    onClick={() => setIds([])}
                    className="stat text-xs font-bold uppercase text-strike hover:underline"
                  >
                    Clear all
                  </button>
                }
              />
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="w-56 border-b border-line px-4 py-3 text-left" />
                      {chosen.map((p) => (
                        <th key={p.id} className="border-b border-line px-4 py-3 text-left align-top">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="display text-xl leading-tight">{p.name}</div>
                              <div className="stat mt-0.5 text-[10px] text-chalk-dim">
                                {p.team} · {p.position} · £{p.price.toFixed(1)}m
                              </div>
                              <div className="mt-1.5">
                                <FixtureRun fixtures={p.fixtures.slice(0, 5)} size="xs" />
                              </div>
                              {!p.available && (
                                <div className="mt-1.5">
                                  <Pill tone="red">out</Pill>
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => setIds((prev) => prev.filter((i) => i !== p.id))}
                              aria-label={`Remove ${p.name}`}
                              className="rounded-full border border-line px-1.5 text-xs font-bold leading-tight transition hover:bg-strike hover:text-white"
                            >
                              ×
                            </button>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {METRICS.map((m) => {
                      const vals = chosen.map(m.val);
                      const target = m.better === "high" ? Math.max(...vals) : Math.min(...vals);
                      const allSame = vals.every((v) => v === vals[0]);
                      return (
                        <tr key={String(m.key)} className="border-b border-line-soft last:border-b-0">
                          <th
                            title={m.help}
                            scope="row"
                            className="px-4 py-2.5 text-left text-[13px] font-semibold text-chalk-mid"
                          >
                            {m.label}
                          </th>
                          {chosen.map((p, i) => {
                            const win = !allSame && vals[i] === target;
                            return (
                              <td
                                key={p.id}
                                className={`stat px-4 py-2.5 text-[15px] font-bold ${
                                  win ? "bg-flare-wash text-chalk" : "text-chalk-mid"
                                }`}
                              >
                                {m.fmt(p)}
                                {win && <span className="ml-1.5 text-[10px] text-flare">▲</span>}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}
        </>
      )}
    </main>
  );
}
