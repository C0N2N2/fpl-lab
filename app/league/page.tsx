"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchLeague, type LeagueEntry, type LeaguePayload } from "@/lib/api";
import { ErrorNote, Hero, Loading, Panel, PanelHead, Pill } from "@/components/ui";

const STORAGE_KEY = "fpl-lab.leagueId";

type Sort = "rank" | "projected" | "leaking" | "horizon";

export default function League() {
  const [input, setInput] = useState("");
  const [leagueId, setLeagueId] = useState<number | null>(null);
  const [horizon, setHorizon] = useState(5);
  const [data, setData] = useState<LeaguePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sort, setSort] = useState<Sort>("rank");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) { setInput(saved); setLeagueId(Number(saved)); }
    } catch { /* private mode — start empty */ }
  }, []);

  useEffect(() => {
    if (leagueId === null) return;
    let cancelled = false;
    setBusy(true);
    setError(null);
    fetchLeague(leagueId, horizon)
      .then((json) => {
        if (cancelled) return;
        setData(json);
        try { localStorage.setItem(STORAGE_KEY, String(leagueId)); } catch { /* ignore */ }
      })
      .catch((e: Error) => { if (!cancelled) { setError(e.message); setData(null); } })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [leagueId, horizon]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(input.trim());
    if (Number.isInteger(n) && n > 0) setLeagueId(n);
    else setError("Enter the numeric league ID from your FPL league URL.");
  }

  const entries = useMemo(() => {
    if (!data) return [];
    const e = [...data.entries];
    switch (sort) {
      case "rank": return e.sort((a, b) => a.rank - b.rank);
      case "projected": return e.sort((a, b) => b.projectedXp - a.projectedXp);
      case "leaking": return e.sort((a, b) => b.leaking - a.leaking);
      case "horizon": return e.sort((a, b) => b.squadXpHorizon - a.squadXpHorizon);
    }
  }, [data, sort]);

  const projectedLeader = useMemo(
    () => (data ? [...data.entries].sort((a, b) => b.projectedXp - a.projectedXp)[0] : null),
    [data],
  );

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
      <Hero
        kicker="Mini-league"
        title={<>Who&apos;s <span className="marker">actually</span> in front?</>}
        blurb="Load your league and see everyone's squad scored by the same model — who projects best next gameweek, who's leaking points on their bench, and who's captaining what."
      />

      <form onSubmit={submit} className="mb-6 flex flex-wrap items-center gap-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          inputMode="numeric"
          placeholder="e.g. 314"
          aria-label="FPL league ID"
          className="stat w-44 rounded-lg border-2 border-ink bg-surface px-3 py-2 text-sm outline-none"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg border-2 border-ink bg-red px-5 py-2 text-sm font-bold text-white shadow-[3px_3px_0_0_var(--ink)] transition hover:bg-red-hot disabled:opacity-60"
        >
          {busy ? "Loading…" : "Load league"}
        </button>
        <label className="stat flex items-center gap-2 text-xs text-ink-mid">
          look ahead
          <select
            value={horizon}
            onChange={(e) => setHorizon(Number(e.target.value))}
            className="rounded-lg border-2 border-ink bg-surface px-2 py-1.5 text-xs"
          >
            {[1, 3, 5, 10, 38].map((n) => (
              <option key={n} value={n}>{n === 38 ? "Rest of season" : `${n} GW`}</option>
            ))}
          </select>
        </label>
        <p className="text-xs text-ink-mid">
          The number in <span className="stat">/leagues/<b>123456</b>/standings/</span> — try{" "}
          <button type="button" onClick={() => { setInput("314"); setLeagueId(314); }} className="font-bold text-red underline">
            314
          </button>{" "}
          for the global league.
        </p>
      </form>

      {error && <ErrorNote title="Couldn't load that league" detail={error} />}
      {busy && !data && <Loading what="the league" />}

      {data && !error && (
        <div className="flex flex-col gap-5">
          <Panel>
            <PanelHead
              title={data.league.name}
              right={
                <span className="stat text-xs text-ink-soft">
                  GW{data.meta.currentGameweek} squads · projections for GW{data.meta.nextGameweek}
                  {data.meta.truncated && ` · top ${data.meta.shown} shown`}
                </span>
              }
            />
            {projectedLeader && (
              <p className="px-4 py-3 text-sm text-ink-mid">
                On the model, <b className="text-ink">{projectedLeader.teamName}</b> has the
                strongest squad for next gameweek at{" "}
                <b className="text-red">{projectedLeader.projectedXp.toFixed(1)} xP</b>
                {projectedLeader.captain && <> — captaining {projectedLeader.captain}</>}.
              </p>
            )}
          </Panel>

          <div className="flex flex-wrap gap-1">
            {([
              ["rank", "League rank"],
              ["projected", "Best next GW"],
              ["leaking", "Leaking most points"],
              ["horizon", "Best squad long-term"],
            ] as [Sort, string][]).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setSort(id)}
                aria-pressed={sort === id}
                className={`rounded-lg border-2 border-ink px-3 py-1.5 text-xs font-bold transition ${
                  sort === id ? "bg-red text-white" : "bg-surface text-ink-mid hover:bg-yellow-wash"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <Panel className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 border-ink bg-surface-2">
                    {["#", "Team", "Total", "Last GW", "Next GW xP", "Best possible", "Leaking", "Captain", "Top picks"].map((h) => (
                      <th key={h} className="stat px-3 py-3 text-left text-[10px] uppercase tracking-wider text-ink-soft">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => <LeagueLine key={e.entry} e={e} />)}
                </tbody>
              </table>
            </div>
          </Panel>

          {data.ownership.length > 0 && (
            <Panel className="overflow-hidden">
              <PanelHead
                title="Effective ownership in this league"
                right={
                  <span className="stat text-xs text-ink-soft">
                    across {data.meta.squadsCounted} squads
                  </span>
                }
              />
              <p className="border-b-2 border-line-soft bg-surface-2 px-4 py-2 text-[12px] text-ink-mid">
                <b className="text-ink">Effective ownership</b> counts starters plus captains a
                second time — it is the share of your league&apos;s points a player actually
                swings. Above 100% means he is captained widely. High EO players can&apos;t win you
                the league, only lose it; the low ones are where rank is made.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b-2 border-ink bg-surface-2">
                      {["Player", "Next GW xP", "Owned here", "Effective", "Captained by", "Owned globally", "Verdict"].map((h) => (
                        <th key={h} className="stat px-3 py-3 text-left text-[10px] uppercase tracking-wider text-ink-soft">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.ownership.slice(0, 20).map((o) => {
                      const rare = o.effectivePct <= 30;
                      const template = o.effectivePct >= 70;
                      return (
                        <tr key={o.id} className="border-b border-line-soft transition hover:bg-yellow-wash">
                          <td className="px-3 py-2">
                            <b>{o.name}</b>{" "}
                            <span className="stat text-[10px] text-ink-soft">
                              {o.teamShort} · {o.position} · £{o.price.toFixed(1)}
                            </span>
                          </td>
                          <td className="stat px-3 py-2 font-bold text-red">{o.xp.toFixed(2)}</td>
                          <td className="stat px-3 py-2 text-ink-mid">{o.ownedPct.toFixed(0)}%</td>
                          <td className="stat px-3 py-2 font-bold">{o.effectivePct.toFixed(0)}%</td>
                          <td className="stat px-3 py-2 text-ink-mid">{o.captainedBy || "—"}</td>
                          <td className="stat px-3 py-2 text-ink-soft">{o.globalPct.toFixed(1)}%</td>
                          <td className="px-3 py-2">
                            {template && <Pill tone="red">template</Pill>}
                            {rare && o.xp >= 3 && <Pill tone="good">differential</Pill>}
                            {!template && !rare && <Pill>middle</Pill>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}

          <p className="stat text-[10px] leading-relaxed text-ink-soft">
            &quot;Leaking&quot; is the gap between someone&apos;s current XI and the best XI their
            own fifteen could field — points lost to bench order or the wrong armband. Squads come
            from the last completed gameweek, so they update after each deadline. Private leagues
            you are not a member of will not load.
          </p>
        </div>
      )}
    </main>
  );
}

function LeagueLine({ e }: { e: LeagueEntry }) {
  const moved = e.lastRank > 0 ? e.lastRank - e.rank : 0;
  return (
    <tr className="border-b border-line-soft transition hover:bg-yellow-wash">
      <td className="stat px-3 py-2.5 font-bold">
        {e.rank}
        {moved !== 0 && (
          <span className={`ml-1 text-[10px] ${moved > 0 ? "text-good" : "text-red"}`}>
            {moved > 0 ? `▲${moved}` : `▼${Math.abs(moved)}`}
          </span>
        )}
      </td>
      <td className="px-3 py-2.5">
        <div className="font-bold">{e.teamName}</div>
        <div className="stat text-[10px] text-ink-soft">{e.managerName}</div>
      </td>
      <td className="stat px-3 py-2.5 font-bold">{e.total}</td>
      <td className="stat px-3 py-2.5 text-ink-mid">{e.lastGw}</td>
      <td className="stat px-3 py-2.5">
        {e.hasPicks ? <b className="text-red">{e.projectedXp.toFixed(1)}</b> : <span className="text-ink-soft">—</span>}
      </td>
      <td className="stat px-3 py-2.5 text-ink-mid">
        {e.hasPicks ? e.optimalXp.toFixed(1) : "—"}
      </td>
      <td className="stat px-3 py-2.5">
        {e.leaking > 0.1 ? (
          <span className="font-bold text-yellow-deep">−{e.leaking.toFixed(1)}</span>
        ) : (
          <span className="text-good">optimal</span>
        )}
      </td>
      <td className="px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[13px] font-semibold">{e.captain ?? "—"}</span>
          {e.activeChip && <Pill tone="yellow">{e.activeChip}</Pill>}
        </div>
      </td>
      <td className="px-3 py-2.5">
        <div className="stat flex flex-wrap gap-1 text-[10px] text-ink-soft">
          {e.topPlayers.map((p) => (
            <span key={p.name} className="rounded bg-surface-2 px-1.5 py-0.5">
              {p.name} {p.xp.toFixed(1)}
            </span>
          ))}
        </div>
      </td>
    </tr>
  );
}
