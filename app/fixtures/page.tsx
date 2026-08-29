"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchTicker, type TickerPayload, type TickerRow } from "@/lib/api";
import { ErrorNote, Hero, Loading, Panel, PanelHead, Pill } from "@/components/ui";
import { fdrClass } from "@/components/ui";

type Sort = "difficulty" | "attack" | "defence" | "alpha";

export default function Fixtures() {
  const [data, setData] = useState<TickerPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [span, setSpan] = useState(8);
  const [sort, setSort] = useState<Sort>("difficulty");

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    fetchTicker(span)
      .then((json) => { if (!cancelled) setData(json); })
      .catch((e: Error) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [span]);

  const rows = useMemo(() => {
    if (!data) return [];
    const r = [...data.rows];
    switch (sort) {
      case "difficulty": return r.sort((a, b) => a.averageDifficulty - b.averageDifficulty);
      case "attack": return r.sort((a, b) => b.attack - a.attack);
      case "defence": return r.sort((a, b) => a.leak - b.leak);
      case "alpha": return r.sort((a, b) => a.team.localeCompare(b.team));
    }
  }, [data, sort]);

  const window = data?.rows[0]?.cells.map((c) => c.gw) ?? [];

  return (
    <main className="py-10">
      <Hero
        kicker="Fixture ticker"
        title={<>Who has the <span className="marker">easy run</span>?</>}
        blurb="Every club against its next fixtures, coloured by difficulty re-rated on actual results rather than FPL's preseason ratings. Sorted easiest-first, so the teams to buy from are at the top."
        right={
          data ? (
            <div className="rounded-xl border border-line bg-flare px-5 py-3 text-chalk ">
              <div className="display text-3xl">
                GW {data.summary.from}–{data.summary.to}
              </div>
              <div className="stat text-[11px] font-semibold">
                re-rated on {data.meta.matchesPlayed} matches
              </div>
            </div>
          ) : null
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <label className="stat flex items-center gap-2 text-xs text-chalk-mid">
          show
          <select
            value={span}
            onChange={(e) => setSpan(Number(e.target.value))}
            className="rounded-lg border border-line bg-panel px-2 py-1.5 text-xs"
          >
            {[5, 8, 12, 20].map((n) => <option key={n} value={n}>{n} gameweeks</option>)}
          </select>
        </label>

        <div className="flex flex-wrap gap-1">
          {([
            ["difficulty", "Easiest fixtures"],
            ["attack", "Best attack"],
            ["defence", "Best defence"],
            ["alpha", "A–Z"],
          ] as [Sort, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setSort(id)}
              aria-pressed={sort === id}
              className={`rounded-lg border border-line px-3 py-1.5 text-xs font-bold transition ${
                sort === id ? "bg-strike text-white" : "bg-panel text-chalk-mid hover:bg-flare-wash"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorNote title="Couldn't load fixtures" detail={error} />}
      {!data && !error && <Loading what="the fixture list" />}

      {data && (
        <>
          {(data.summary.doubles.length > 0 || data.summary.blanks.length > 0) && (
            <Panel className="mb-5 border-flare bg-flare-wash">
              <PanelHead title="Doubles and blanks in this window" />
              <div className="flex flex-col gap-2 px-4 py-3 text-sm">
                {data.summary.doubles.map((d) => (
                  <p key={`d${d.gw}`}>
                    <b>GW{d.gw} double:</b>{" "}
                    <span className="stat">{d.teams.join(", ")}</span>{" "}
                    <span className="text-chalk-dim">— the gameweeks Bench Boost and Triple Captain are built for.</span>
                  </p>
                ))}
                {data.summary.blanks.map((b) => (
                  <p key={`b${b.gw}`}>
                    <b>GW{b.gw} blank:</b>{" "}
                    <span className="stat">{b.teams.join(", ")}</span>{" "}
                    <span className="text-chalk-dim">— these players score nothing; a Free Hit covers it.</span>
                  </p>
                ))}
              </div>
            </Panel>
          )}

          <Panel className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line bg-panel-2">
                    <th className="stat sticky left-0 z-10 bg-panel-2 px-3 py-3 text-left text-[10px] uppercase tracking-wider text-chalk-dim">
                      Club
                    </th>
                    <th className="stat px-2 py-3 text-right text-[10px] uppercase tracking-wider text-chalk-dim" title="Mean re-rated difficulty across the window — lower is easier">
                      FDR
                    </th>
                    <th className="stat px-2 py-3 text-right text-[10px] uppercase tracking-wider text-chalk-dim" title="Expected goals scored minus conceded across the window">
                      Net xG
                    </th>
                    {window.map((gw) => (
                      <th key={gw} className="stat px-2 py-3 text-center text-[10px] uppercase tracking-wider text-chalk-dim">
                        {gw}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => <TickerLine key={r.teamId} row={r} />)}
                </tbody>
              </table>
            </div>
          </Panel>

          <p className="stat mt-4 text-[10px] leading-relaxed text-chalk-dim">
            Lower-case suffix * marks an away fixture. Colour comes from expected goals conceded,
            recalculated from results — hover a cell to see FPL&apos;s own rating alongside it.
            Doubles show both opponents in one cell; blanks are struck through.
          </p>
        </>
      )}
    </main>
  );
}

function TickerLine({ row }: { row: TickerRow }) {
  return (
    <tr className="border-b border-line-soft transition hover:bg-flare-wash">
      <th scope="row" className="sticky left-0 z-10 bg-panel px-3 py-2 text-left">
        <div className="flex items-baseline gap-2">
          <span className="font-bold">{row.short}</span>
          <span className="hidden text-[11px] text-chalk-dim sm:inline">{row.team}</span>
        </div>
      </th>
      <td className={`stat px-2 py-2 text-right font-bold ${
        row.averageDifficulty <= 2.4 ? "text-surge" : row.averageDifficulty >= 3.6 ? "text-strike" : "text-chalk-mid"
      }`}>
        {row.averageDifficulty.toFixed(2)}
      </td>
      <td className={`stat px-2 py-2 text-right ${row.netExpectedGoals >= 0 ? "text-surge" : "text-strike"}`}>
        {row.netExpectedGoals > 0 ? "+" : ""}{row.netExpectedGoals.toFixed(1)}
      </td>
      {row.cells.map((c) => (
        <td key={c.gw} className="px-1 py-1.5 text-center">
          {c.blank ? (
            <span className="stat rounded bg-strike-wash px-1.5 py-1 text-[10px] font-bold text-strike line-through">
              blank
            </span>
          ) : (
            <div className="flex flex-col gap-0.5">
              {c.fixtures.map((f, i) => (
                <span
                  key={i}
                  title={`${f.opponent} ${f.home ? "(H)" : "(A)"} · expected to concede ${f.expectedConceded}, score ${f.expectedScored} · FPL rates ${f.difficulty}, results say ${f.rerated}`}
                  className={`stat rounded px-1.5 py-1 text-[10px] font-semibold ${fdrClass(f.rerated)}`}
                >
                  {f.opponent}{f.home ? "" : "*"}
                </span>
              ))}
              {c.double && <Pill tone="yellow">double</Pill>}
            </div>
          )}
        </td>
      ))}
    </tr>
  );
}
