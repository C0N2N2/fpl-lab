"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchPlayers, fetchTeam,
  type Payload, type Position, type Row, type SquadPlayer, type TeamPayload,
} from "@/lib/api";
import { bestEleven } from "@/lib/squad";
import { suggestTransfers, type Suggestion } from "@/lib/transfers";
import { planTransfers, type Plan } from "@/lib/planner";
import { ErrorNote, FixtureRun, Hero, Loading, Panel, PanelHead, Pill, Tile } from "@/components/ui";
import { Pitch, PitchRow, PlayerToken } from "@/components/Pitch";

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

  const [planWeeks, setPlanWeeks] = useState(5);
  const [freeTransfers, setFreeTransfers] = useState(1);

  const plan: Plan | null = useMemo(() => {
    if (!team || !pool || squad.length < 15) return null;
    return planTransfers(squad, pool.players, {
      bank: team.manager.bank,
      freeTransfers,
      weeks: planWeeks,
    });
  }, [team, pool, squad, planWeeks, freeTransfers]);

  return (
    <main className="py-10">
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
          className="stat w-44 rounded-lg border border-line bg-panel px-3 py-2 text-sm outline-none"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg border border-line bg-strike px-5 py-2 text-sm font-bold text-white transition hover:bg-strike-deep disabled:opacity-60"
        >
          {busy ? "Loading…" : "Import team"}
        </button>

        <label className="stat flex items-center gap-2 text-xs text-chalk-mid">
          look ahead
          <select
            value={horizon}
            onChange={(e) => setHorizon(Number(e.target.value))}
            className="rounded-lg border border-line bg-panel px-2 py-1.5 text-xs"
          >
            {HORIZONS.map((h) => (
              <option key={h.value} value={h.value}>{h.label}</option>
            ))}
          </select>
        </label>

        <p className="text-xs text-chalk-mid">
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
                <span className="stat text-xs text-chalk-dim">
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
              <Panel className="border-strike">
                <PanelHead
                  title="Transfers worth making"
                  right={
                    <span className="stat text-xs text-chalk-dim">
                      gain across {gwSpan ? `GW${gwSpan.from}–${gwSpan.to}` : "the horizon"}
                      {" · "}£{team.manager.bank.toFixed(1)}m in bank
                    </span>
                  }
                />
                {transfers.length === 0 ? (
                  <p className="px-5 py-10 text-center text-sm text-chalk-mid">
                    No single transfer gains more than half a point over this horizon — your
                    squad is in good shape. Try a shorter look-ahead to find gameweek-specific
                    moves.
                  </p>
                ) : (
                  <>
                    <p className="border-b border-line-soft bg-panel-2 px-4 py-2 text-[12px] text-chalk-mid">
                      Each row is the best available upgrade for that player, judged
                      independently — <b className="text-chalk">not a sequence</b>. The same
                      incoming player can appear twice, and doing one move can invalidate
                      another. Make the top one, then reload to re-rank.
                    </p>
                    <ul className="divide-y divide-line-soft">
                      {transfers.map((t, i) => (
                        <TransferRow key={t.out.id} s={t} rank={i + 1} />
                      ))}
                    </ul>
                  </>
                )}
              </Panel>

              {plan && plan.steps.length > 0 && (
                <Panel>
                  <PanelHead
                    title="Multi-gameweek plan"
                    right={
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="stat flex items-center gap-1.5 text-xs text-chalk-mid">
                          weeks
                          <select
                            value={planWeeks}
                            onChange={(e) => setPlanWeeks(Number(e.target.value))}
                            className="rounded border border-line bg-panel px-1.5 py-0.5"
                          >
                            {[3, 5, 8].map((n) => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </label>
                        <label className="stat flex items-center gap-1.5 text-xs text-chalk-mid">
                          free now
                          <select
                            value={freeTransfers}
                            onChange={(e) => setFreeTransfers(Number(e.target.value))}
                            className="rounded border border-line bg-panel px-1.5 py-0.5"
                          >
                            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </label>
                      </div>
                    }
                  />
                  <div className="border-b border-line-soft bg-panel-2 px-4 py-3">
                    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
                      <span className="stat text-xs text-chalk-dim">
                        hold this squad → <b className="text-chalk">{plan.baselineXp.toFixed(1)}</b> pts
                      </span>
                      <span className="stat text-xs text-chalk-dim">
                        follow the plan → <b className="text-strike">{plan.totalXp.toFixed(1)}</b> pts
                      </span>
                      <span className="display text-2xl text-surge">
                        {plan.gain >= 0 ? "+" : ""}{plan.gain.toFixed(1)}
                      </span>
                      <span className="stat text-xs text-chalk-dim">
                        {plan.transferCount} transfer{plan.transferCount === 1 ? "" : "s"}
                        {plan.totalHits > 0 && `, ${plan.totalHits} pts of hits taken`}
                      </span>
                    </div>
                  </div>
                  <ul className="divide-y divide-line-soft">
                    {plan.steps.map((s) => (
                      <li key={s.gw} className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
                        <span className="display w-16 flex-none text-xl text-chalk-dim">GW{s.gw}</span>
                        <div className="min-w-[220px] flex-1">
                          {s.transfers.length === 0 ? (
                            <span className="stat text-xs text-chalk-dim">
                              roll the transfer — nothing worth doing
                            </span>
                          ) : (
                            <div className="flex flex-col gap-1">
                              {s.transfers.map((t) => (
                                <div key={t.out.id} className="text-sm">
                                  <span className="line-through decoration-strike decoration-2">
                                    {t.out.name}
                                  </span>
                                  <span className="mx-2 text-chalk-dim">→</span>
                                  <b className="text-surge">{t.in.name}</b>
                                  <span className="stat ml-2 text-[10px] text-chalk-dim">
                                    £{t.out.price.toFixed(1)} → £{t.in.price.toFixed(1)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="stat text-right text-[11px] text-chalk-dim">
                          <div>
                            <b className="text-chalk">{s.squadXp.toFixed(1)}</b> projected
                          </div>
                          {s.hit > 0 && <div className="text-strike">−{s.hit} hit</div>}
                          {s.captain && <div>(C) {s.captain.name}</div>}
                          <div>bank £{s.bank.toFixed(1)}m</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <p className="border-t border-line-soft px-4 py-2 text-[12px] text-chalk-mid">
                    Searched with a beam over legal squads, costing −4 for every transfer beyond
                    your free ones and banking unused transfers up to five. It assumes prices and
                    availability stay as they are today, so re-run it after each deadline.
                  </p>
                </Panel>
              )}

              {(shouldBench.length > 0 || shouldStart.length > 0 ||
                optimal.captain?.id !== captain?.id) && (
                <Panel className="border-flare bg-flare-wash">
                  <PanelHead title="Line-up changes for the next gameweek" />
                  <div className="flex flex-col gap-3 px-4 py-4">
                    {optimal.total - currentXp > 0.1 && (
                      <p className="text-sm text-chalk-mid">
                        Reordering your XI is worth about{" "}
                        <b className="text-chalk">+{(optimal.total - currentXp).toFixed(1)} points</b>{" "}
                        this gameweek ({optimal.formation}).
                      </p>
                    )}
                    {shouldStart.length > 0 && <Swap label="Start" tone="good" players={shouldStart} />}
                    {shouldBench.length > 0 && <Swap label="Bench" tone="red" players={shouldBench} />}
                    {optimal.captain && optimal.captain.id !== captain?.id && (
                      <p className="text-sm text-chalk-mid">
                        <b className="text-chalk">Captain:</b> model prefers{" "}
                        <b className="text-chalk">{optimal.captain.name}</b>{" "}
                        ({optimal.captain.xp.toFixed(2)} xP)
                        {captain && <> over {captain.name} ({captain.xp.toFixed(2)} xP)</>}.
                        {optimal.captain.position === "DEF" && (
                          <span className="text-chalk-dim">
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
                  right={<span className="stat text-xs text-chalk-dim">* = away fixture</span>}
                />
                <div className="p-4">
                  <Pitch
                    bench={bench.map((p) => {
                      const promote = shouldStart.some((s) => s.id === p.id);
                      const sell = transfers.find((t) => t.out.id === p.id);
                      return (
                        <PlayerToken
                          key={p.id}
                          name={p.name}
                          club={p.teamShort}
                          value={p.xp.toFixed(2)}
                          meta={`£${p.price.toFixed(1)}`}
                          muted
                          flag={promote ? "good" : !p.available ? "red" : undefined}
                          flagLabel={
                            promote ? "start me" : !p.available ? "out" : sell ? `+${sell.gain.toFixed(0)}` : undefined
                          }
                        />
                      );
                    })}
                  >
                    {LINES.map((pos) => {
                      const line = starters.filter((p) => p.position === pos);
                      if (!line.length) return null;
                      return (
                        <PitchRow key={pos}>
                          {line.map((p) => {
                            const drop = shouldBench.some((s) => s.id === p.id);
                            const sell = transfers.find((t) => t.out.id === p.id);
                            return (
                              <PlayerToken
                                key={p.id}
                                name={p.name}
                                club={p.teamShort}
                                value={p.xp.toFixed(2)}
                                meta={`£${p.price.toFixed(1)}`}
                                captain={p.isCaptain}
                                vice={p.isVice}
                                flag={
                                  !p.available ? "red" : drop ? "red" : sell ? "yellow" : undefined
                                }
                                flagLabel={
                                  !p.available ? "out"
                                  : drop ? "bench me"
                                  : sell ? `upgrade +${sell.gain.toFixed(0)}`
                                  : undefined
                                }
                              />
                            );
                          })}
                        </PitchRow>
                      );
                    })}
                  </Pitch>
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
      <span className="display w-6 text-2xl text-chalk-dim">{rank}</span>

      <div className="min-w-[150px] flex-1">
        <div className="stat text-[10px] uppercase tracking-wider text-strike">Out</div>
        <div className="font-bold line-through decoration-strike decoration-2">{s.out.name}</div>
        <div className="stat text-[10px] text-chalk-dim">
          {s.out.teamShort} · £{s.out.price.toFixed(1)} · {s.out.xpHorizon.toFixed(1)} xP
        </div>
        <div className="mt-1"><FixtureRun fixtures={s.out.fixtures.slice(0, 6)} size="xs" /></div>
      </div>

      <span className="display text-2xl text-chalk-dim">→</span>

      <div className="min-w-[150px] flex-1">
        <div className="stat text-[10px] uppercase tracking-wider text-surge">In</div>
        <div className="font-bold">{s.in.name}</div>
        <div className="stat text-[10px] text-chalk-dim">
          {s.in.teamShort} · £{s.in.price.toFixed(1)} · {s.in.xpHorizon.toFixed(1)} xP
        </div>
        <div className="mt-1"><FixtureRun fixtures={s.in.fixtures.slice(0, 6)} size="xs" /></div>
      </div>

      <div className="ml-auto text-right">
        <div className="display text-3xl text-surge">+{s.gain.toFixed(1)}</div>
        <div className="stat text-[10px] text-chalk-dim">
          pts · {positives}/{s.perGameweek.length} GWs better
        </div>
        <div className="stat mt-0.5 text-[10px]">
          {s.spend === 0 ? (
            <span className="text-chalk-dim">same price</span>
          ) : s.spend > 0 ? (
            <span className="text-strike">costs £{s.spend.toFixed(1)}m</span>
          ) : (
            <span className="text-surge">frees £{Math.abs(s.spend).toFixed(1)}m</span>
          )}
          <span className="text-chalk-dim"> · bank £{s.bankAfter.toFixed(1)}m</span>
        </div>
        <div className="stat text-[10px] text-chalk-dim">
          next GW {s.gainNext >= 0 ? "+" : ""}{s.gainNext.toFixed(2)}
        </div>
      </div>
    </li>
  );
}

function Swap({ label, players, tone }: { label: string; players: SquadPlayer[]; tone: "good" | "red" }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className={`stat font-bold uppercase ${tone === "good" ? "text-surge" : "text-strike"}`}>
        {label}
      </span>
      {players.map((p) => (
        <span key={p.id} className="rounded-md border border-line bg-panel px-2 py-0.5">
          <b>{p.name}</b> <span className="stat text-xs text-chalk-dim">{p.xp.toFixed(2)} xP</span>
        </span>
      ))}
    </div>
  );
}

function formatRank(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}
