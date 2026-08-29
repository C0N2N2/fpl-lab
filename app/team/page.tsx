"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchPlayers, fetchTeam,
  type Payload, type Position, type Row, type SquadPlayer, type TeamPayload,
} from "@/lib/api";
import { bestEleven } from "@/lib/squad";
import { suggestTransfers, type Suggestion } from "@/lib/transfers";
import { ErrorNote, FixtureRun, Hero, Loading, Panel, PanelHead, Pill, Tile } from "@/components/ui";

const STORAGE_KEY = "fpl-lab.entryId";
const LINES: Position[] = ["GKP", "DEF", "MID", "FWD"];

/** 38 asks for every remaining fixture; the API returns however many exist. */
const HORIZONS = [
  { value: 1, label: "Next GW" },
  { value: 3, label: "3 GWs" },
  { value: 5, label: "5 GWs" },
  { value: 10, label: "10 GWs" },
  { value: 38, label: "Rest of season" },
];

export default function MyTeam() {
  const [input, setInput] = useState("");
  const [entryId, setEntryId] = useState<number | null>(null);
  const [horizon, setHorizon] = useState(38);

  const [team, setTeam] = useState<TeamPayload | null>(null);
  const [pool, setPool] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) { setInput(saved); setEntryId(Number(saved)); }
    } catch { /* private mode — start empty */ }
  }, []);

  useEffect(() => {
    if (entryId === null) return;
    let cancelled = false;
    setBusy(true);
    setError(null);
    Promise.all([fetchTeam(entryId, horizon), fetchPlayers(horizon)])
      .then(([t, p]) => {
        if (cancelled) return;
        setTeam(t);
        setPool(p);
        try { localStorage.setItem(STORAGE_KEY, String(entryId)); } catch { /* ignore */ }
      })
      .catch((e: Error) => { if (!cancelled) { setError(e.message); setTeam(null); } })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [entryId, horizon]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(input.trim());
    if (Number.isInteger(n) && n > 0) setEntryId(n);
    else setError("Enter the numeric team ID from your FPL URL.");
  }

  const squad = team?.squad ?? [];
  const starters = useMemo(() => squad.filter((p) => !p.benched), [squad]);
  const bench = useMemo(
    () => squad.filter((p) => p.benched).sort((a, b) => a.slot - b.slot),
    [squad],
  );
  const captain = squad.find((p) => p.isCaptain) ?? null;
  const optimal = useMemo(() => bestEleven(squad, "xp"), [squad]);

  const currentXp = useMemo(
    () => starters.reduce((s, p) => s + p.xp, 0) + (captain ? captain.xp : 0),
    [starters, captain],
  );

  const optimalIds = new Set(optimal.xi.map((p) => p.id));
  const shouldBench = starters.filter((p) => !optimalIds.has(p.id));
  const shouldStart = bench.filter((p) => optimalIds.has(p.id));

  const transfers = useMemo(() => {
    if (!team || !pool || squad.length === 0) return [];
    return suggestTransfers(squad, pool.players, {
      bank: team.manager.bank,
      minGain: 0.5,
      limit: 8,
    });
  }, [team, pool, squad]);

  const gwSpan = useMemo(() => {
    const gws = squad.flatMap((p) => p.fixtures.map((f) => f.gw));
    if (!gws.length) return null;
    return { from: Math.min(...gws), to: Math.max(...gws), count: new Set(gws).size };
  }, [squad]);

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
      <Hero
        kicker="Import"
        title={<>Your team, <span className="marker">scored</span></>}
        blurb="Paste your FPL team ID for a full read: every player's projection, whether your XI is the best one available, who to captain, and the transfers worth making from here to the end of the season."
      />

      <form onSubmit={submit} className="mb-6 flex flex-wrap items-center gap-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          inputMode="numeric"
          placeholder="e.g. 1234567"
          aria-label="FPL team ID"
          className="stat w-44 rounded-lg border-2 border-ink bg-surface px-3 py-2 text-sm outline-none"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg border-2 border-ink bg-red px-5 py-2 text-sm font-bold text-white shadow-[3px_3px_0_0_var(--ink)] transition hover:bg-red-hot disabled:opacity-60"
        >
          {busy ? "Loading…" : "Import team"}
        </button>

        <label className="stat flex items-center gap-2 text-xs text-ink-mid">
          look ahead
          <select
            value={horizon}
            onChange={(e) => setHorizon(Number(e.target.value))}
            className="rounded-lg border-2 border-ink bg-surface px-2 py-1.5 text-xs"
          >
            {HORIZONS.map((h) => (
              <option key={h.value} value={h.value}>{h.label}</option>
            ))}
          </select>
        </label>

        <p className="text-xs text-ink-mid">
          Your ID is the number in <span className="stat">/entry/<b>1234567</b>/event/…</span>
        </p>
      </form>

      {error && <ErrorNote title="Couldn't import that team" detail={error} />}
      {busy && !team && <Loading what="your team" />}

      {team && !error && (
        <div className="flex flex-col gap-6">
          <Panel>
            <PanelHead
              title={team.manager.teamName || "Your team"}
              right={
                <span className="stat text-xs text-ink-soft">
                  {team.manager.managerName} · GW{team.manager.currentEvent}
                  {team.manager.activeChip && ` · chip: ${team.manager.activeChip}`}
                </span>
              }
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
              <Tile label="Total pts" value={team.manager.overallPoints} />
              <Tile
                label="Overall rank"
                value={team.manager.overallRank ? formatRank(team.manager.overallRank) : "—"}
              />
              <Tile label="Last GW" value={team.manager.gameweekPoints} tone="yellow" />
              <Tile label="Squad value" value={`£${team.manager.squadValue.toFixed(1)}`} />
              <Tile label="In bank" value={`£${team.manager.bank.toFixed(1)}`} />
              <Tile
                label="Next GW xP"
                value={currentXp.toFixed(1)}
                tone="red"
                sub="your XI, captain doubled"
              />
            </div>
          </Panel>

          {!team.hasPicks && (
            <ErrorNote
              title="No picks published yet"
              detail="FPL only exposes a squad once a gameweek has started. Try again after the next deadline."
            />
          )}

          {team.hasPicks && (
            <>
              <Panel className="border-red">
                <PanelHead
                  title="Transfers worth making"
                  right={
                    <span className="stat text-xs text-ink-soft">
                      gain across {gwSpan ? `GW${gwSpan.from}–${gwSpan.to}` : "the horizon"}
                      {" · "}£{team.manager.bank.toFixed(1)}m in bank
                    </span>
                  }
                />
                {transfers.length === 0 ? (
                  <p className="px-5 py-10 text-center text-sm text-ink-mid">
                    No single transfer gains more than half a point over this horizon — your
                    squad is in good shape. Try a shorter look-ahead to find gameweek-specific
                    moves.
                  </p>
                ) : (
                  <>
                    <p className="border-b-2 border-line-soft bg-surface-2 px-4 py-2 text-[12px] text-ink-mid">
                      Each row is the best available upgrade for that player, judged
                      independently — <b className="text-ink">not a sequence</b>. The same
                      incoming player can appear twice, and doing one move can invalidate
                      another. Make the top one, then reload to re-rank.
                    </p>
                    <ul className="divide-y-2 divide-line-soft">
                      {transfers.map((t, i) => (
                        <TransferRow key={t.out.id} s={t} rank={i + 1} />
                      ))}
                    </ul>
                  </>
                )}
              </Panel>

              {(shouldBench.length > 0 || shouldStart.length > 0 ||
                optimal.captain?.id !== captain?.id) && (
                <Panel className="border-yellow bg-yellow-wash">
                  <PanelHead title="Line-up changes for the next gameweek" />
                  <div className="flex flex-col gap-3 px-4 py-4">
                    {optimal.total - currentXp > 0.1 && (
                      <p className="text-sm text-ink-mid">
                        Reordering your XI is worth about{" "}
                        <b className="text-ink">+{(optimal.total - currentXp).toFixed(1)} points</b>{" "}
                        this gameweek ({optimal.formation}).
                      </p>
                    )}
                    {shouldStart.length > 0 && <Swap label="Start" tone="good" players={shouldStart} />}
                    {shouldBench.length > 0 && <Swap label="Bench" tone="red" players={shouldBench} />}
                    {optimal.captain && optimal.captain.id !== captain?.id && (
                      <p className="text-sm text-ink-mid">
                        <b className="text-ink">Captain:</b> model prefers{" "}
                        <b className="text-ink">{optimal.captain.name}</b>{" "}
                        ({optimal.captain.xp.toFixed(2)} xP)
                        {captain && <> over {captain.name} ({captain.xp.toFixed(2)} xP)</>}.
                        {optimal.captain.position === "DEF" && (
                          <span className="text-ink-soft">
                            {" "}Note: this ranks by average, which can favour a defender —
                            captaincy also rewards a high ceiling.
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </Panel>
              )}

              <Panel>
                <PanelHead
                  title="Your squad"
                  right={<span className="stat text-xs text-ink-soft">* = away fixture</span>}
                />
                <div className="flex flex-col gap-3 p-4">
                  {LINES.map((pos) => {
                    const line = starters.filter((p) => p.position === pos);
                    if (!line.length) return null;
                    return (
                      <div key={pos} className="flex flex-wrap items-stretch gap-2">
                        <span className="stat w-9 flex-none pt-3 text-[10px] uppercase text-ink-soft">
                          {pos}
                        </span>
                        {line.map((p) => (
                          <Card
                            key={p.id}
                            p={p}
                            flagOut={shouldBench.some((s) => s.id === p.id)}
                            sellFor={transfers.find((t) => t.out.id === p.id)}
                          />
                        ))}
                      </div>
                    );
                  })}
                  {bench.length > 0 && (
                    <div className="mt-1 flex flex-wrap items-stretch gap-2 rounded-lg bg-surface-2 p-2">
                      <span className="stat w-9 flex-none pt-3 text-[10px] uppercase text-ink-soft">
                        Sub
                      </span>
                      {bench.map((p) => (
                        <Card
                          key={p.id}
                          p={p}
                          muted
                          flagIn={shouldStart.some((s) => s.id === p.id)}
                          sellFor={transfers.find((t) => t.out.id === p.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </Panel>
            </>
          )}
        </div>
      )}
    </main>
  );
}

function TransferRow({ s, rank }: { s: Suggestion; rank: number }) {
  const positives = s.perGameweek.filter((g) => g.gain > 0).length;
  return (
    <li className="flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3">
      <span className="display w-6 text-2xl text-ink-soft">{rank}</span>

      <div className="min-w-[150px] flex-1">
        <div className="stat text-[10px] uppercase tracking-wider text-red">Out</div>
        <div className="font-bold line-through decoration-red decoration-2">{s.out.name}</div>
        <div className="stat text-[10px] text-ink-soft">
          {s.out.teamShort} · £{s.out.price.toFixed(1)} · {s.out.xpHorizon.toFixed(1)} xP
        </div>
        <div className="mt-1"><FixtureRun fixtures={s.out.fixtures.slice(0, 6)} size="xs" /></div>
      </div>

      <span className="display text-2xl text-ink-soft">→</span>

      <div className="min-w-[150px] flex-1">
        <div className="stat text-[10px] uppercase tracking-wider text-good">In</div>
        <div className="font-bold">{s.in.name}</div>
        <div className="stat text-[10px] text-ink-soft">
          {s.in.teamShort} · £{s.in.price.toFixed(1)} · {s.in.xpHorizon.toFixed(1)} xP
        </div>
        <div className="mt-1"><FixtureRun fixtures={s.in.fixtures.slice(0, 6)} size="xs" /></div>
      </div>

      <div className="ml-auto text-right">
        <div className="display text-3xl text-good">+{s.gain.toFixed(1)}</div>
        <div className="stat text-[10px] text-ink-soft">
          pts · {positives}/{s.perGameweek.length} GWs better
        </div>
        <div className="stat mt-0.5 text-[10px]">
          {s.spend === 0 ? (
            <span className="text-ink-soft">same price</span>
          ) : s.spend > 0 ? (
            <span className="text-red">costs £{s.spend.toFixed(1)}m</span>
          ) : (
            <span className="text-good">frees £{Math.abs(s.spend).toFixed(1)}m</span>
          )}
          <span className="text-ink-soft"> · bank £{s.bankAfter.toFixed(1)}m</span>
        </div>
        <div className="stat text-[10px] text-ink-soft">
          next GW {s.gainNext >= 0 ? "+" : ""}{s.gainNext.toFixed(2)}
        </div>
      </div>
    </li>
  );
}

function Swap({ label, players, tone }: { label: string; players: SquadPlayer[]; tone: "good" | "red" }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className={`stat font-bold uppercase ${tone === "good" ? "text-good" : "text-red"}`}>
        {label}
      </span>
      {players.map((p) => (
        <span key={p.id} className="rounded-md border-2 border-ink bg-surface px-2 py-0.5">
          <b>{p.name}</b> <span className="stat text-xs text-ink-soft">{p.xp.toFixed(2)} xP</span>
        </span>
      ))}
    </div>
  );
}

function Card({
  p, muted, flagOut, flagIn, sellFor,
}: {
  p: SquadPlayer;
  muted?: boolean;
  flagOut?: boolean;
  flagIn?: boolean;
  sellFor?: Suggestion;
}) {
  return (
    <div
      className={`min-w-[150px] flex-1 rounded-lg border-2 px-2.5 py-2 ${
        muted ? "border-line bg-surface" : "border-ink bg-surface"
      } ${flagOut ? "!border-red" : ""} ${flagIn ? "!border-good" : ""}`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="truncate text-sm font-bold">{p.name}</span>
        {p.isCaptain && <Pill tone="red">C</Pill>}
        {p.isVice && !p.isCaptain && <Pill>V</Pill>}
      </div>
      <div className="stat flex items-center justify-between text-[10px] text-ink-soft">
        <span>{p.teamShort} £{p.price.toFixed(1)}</span>
        <span className="font-bold text-red">{p.xp.toFixed(2)}</span>
      </div>
      <div className="mt-1"><FixtureRun fixtures={p.fixtures.slice(0, 5)} size="xs" /></div>
      <div className="mt-1 flex flex-wrap gap-1">
        {!p.available && <Pill tone="red">out</Pill>}
        {sellFor && <Pill tone="yellow">upgrade +{sellFor.gain.toFixed(1)}</Pill>}
      </div>
    </div>
  );
}

function formatRank(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}
