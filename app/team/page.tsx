"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchTeam, type Position, type SquadPlayer, type TeamPayload } from "@/lib/api";
import { bestEleven } from "@/lib/squad";
import { ErrorNote, FixtureRun, Hero, Loading, Panel, PanelHead, Pill, Tile } from "@/components/ui";

const STORAGE_KEY = "fpl-lab.entryId";
const LINES: Position[] = ["GKP", "DEF", "MID", "FWD"];

export default function MyTeam() {
  const [input, setInput] = useState("");
  const [entryId, setEntryId] = useState<number | null>(null);
  const [data, setData] = useState<TeamPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setInput(saved);
        setEntryId(Number(saved));
      }
    } catch {
      /* private mode — just start empty */
    }
  }, []);

  useEffect(() => {
    if (entryId === null) return;
    let cancelled = false;
    setBusy(true);
    setError(null);
    fetchTeam(entryId)
      .then((json) => {
        if (cancelled) return;
        setData(json);
        try { localStorage.setItem(STORAGE_KEY, String(entryId)); } catch { /* ignore */ }
      })
      .catch((e: Error) => { if (!cancelled) { setError(e.message); setData(null); } })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [entryId]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(input.trim());
    if (Number.isInteger(n) && n > 0) setEntryId(n);
    else setError("Enter the numeric team ID from your FPL URL.");
  }

  const squad = data?.squad ?? [];
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
  const gain = optimal.total - currentXp;

  // Players in the XI the model would bench, and bench players it would start.
  const optimalIds = new Set(optimal.xi.map((p) => p.id));
  const shouldBench = starters.filter((p) => !optimalIds.has(p.id));
  const shouldStart = bench.filter((p) => optimalIds.has(p.id));

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
      <Hero
        kicker="Import"
        title={<>Your team, <span className="marker">scored</span></>}
        blurb="Paste your FPL team ID and see every player's projection, whether your XI is the best one available, and who the model would captain."
      />

      <form onSubmit={submit} className="mb-6 flex flex-wrap items-center gap-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          inputMode="numeric"
          placeholder="e.g. 1234567"
          aria-label="FPL team ID"
          className="stat w-48 rounded-lg border-2 border-ink bg-surface px-3 py-2 text-sm outline-none"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg border-2 border-ink bg-red px-5 py-2 text-sm font-bold text-white shadow-[3px_3px_0_0_var(--ink)] transition hover:bg-red-hot disabled:opacity-60"
        >
          {busy ? "Loading…" : "Import team"}
        </button>
        <p className="text-xs text-ink-mid">
          Find it on the FPL site under <em>Points</em> — the number in
          <span className="stat"> /entry/<b>1234567</b>/event/…</span>
        </p>
      </form>

      {error && <ErrorNote title="Couldn't import that team" detail={error} />}
      {busy && !data && <Loading what="your team" />}

      {data && !error && (
        <div className="flex flex-col gap-6">
          <Panel>
            <PanelHead
              title={data.manager.teamName || "Your team"}
              right={
                <span className="stat text-xs text-ink-soft">
                  {data.manager.managerName} · GW{data.manager.currentEvent}
                  {data.manager.activeChip && ` · chip: ${data.manager.activeChip}`}
                </span>
              }
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
              <Tile label="Total pts" value={data.manager.overallPoints} />
              <Tile
                label="Overall rank"
                value={data.manager.overallRank ? formatRank(data.manager.overallRank) : "—"}
              />
              <Tile label="Last GW" value={data.manager.gameweekPoints} tone="yellow" />
              <Tile label="Squad value" value={`£${data.manager.squadValue.toFixed(1)}`} />
              <Tile label="In bank" value={`£${data.manager.bank.toFixed(1)}`} />
              <Tile
                label="Next GW xP"
                value={currentXp.toFixed(1)}
                tone="red"
                sub="your XI, captain doubled"
              />
            </div>
          </Panel>

          {!data.hasPicks && (
            <ErrorNote
              title="No picks published yet"
              detail="FPL only exposes a squad once a gameweek has started. Try again after the next deadline."
            />
          )}

          {data.hasPicks && (
            <>
              {(shouldBench.length > 0 || shouldStart.length > 0 || optimal.captain?.id !== captain?.id) && (
                <Panel className="border-yellow bg-yellow-wash">
                  <PanelHead title="What the model would change" />
                  <div className="flex flex-col gap-3 px-4 py-4">
                    {gain > 0.1 && (
                      <p className="text-sm text-ink-mid">
                        Reordering your XI is worth about{" "}
                        <b className="text-ink">+{gain.toFixed(1)} points</b> this gameweek
                        ({optimal.formation}).
                      </p>
                    )}
                    {shouldStart.length > 0 && (
                      <Swap label="Start" tone="good" players={shouldStart} />
                    )}
                    {shouldBench.length > 0 && (
                      <Swap label="Bench" tone="red" players={shouldBench} />
                    )}
                    {optimal.captain && optimal.captain.id !== captain?.id && (
                      <p className="text-sm text-ink-mid">
                        <b className="text-ink">Captain:</b> model prefers{" "}
                        <b className="text-ink">{optimal.captain.name}</b> ({optimal.captain.xp.toFixed(2)} xP)
                        {captain && <> over {captain.name} ({captain.xp.toFixed(2)} xP)</>}.
                        {optimal.captain.position === "DEF" && (
                          <span className="text-ink-soft">
                            {" "}Note: the model ranks by average, which can favour a defender —
                            captaincy rewards a high ceiling too.
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
                  right={
                    <span className="stat text-xs text-ink-soft">
                      sorted by position · * = away fixture
                    </span>
                  }
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
                          <Card key={p.id} p={p} recommendedOut={shouldBench.some((s) => s.id === p.id)} />
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
                        <Card key={p.id} p={p} muted recommendedIn={shouldStart.some((s) => s.id === p.id)} />
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

function Swap({
  label, players, tone,
}: {
  label: string;
  players: SquadPlayer[];
  tone: "good" | "red";
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className={`stat font-bold uppercase ${tone === "good" ? "text-good" : "text-red"}`}>
        {label}
      </span>
      {players.map((p) => (
        <span key={p.id} className="rounded-md border-2 border-ink bg-surface px-2 py-0.5">
          <b>{p.name}</b>{" "}
          <span className="stat text-xs text-ink-soft">{p.xp.toFixed(2)} xP</span>
        </span>
      ))}
    </div>
  );
}

function Card({
  p, muted, recommendedOut, recommendedIn,
}: {
  p: SquadPlayer;
  muted?: boolean;
  recommendedOut?: boolean;
  recommendedIn?: boolean;
}) {
  return (
    <div
      className={`min-w-[150px] flex-1 rounded-lg border-2 px-2.5 py-2 ${
        muted ? "border-line bg-surface" : "border-ink bg-surface"
      } ${recommendedOut ? "!border-red" : ""} ${recommendedIn ? "!border-good" : ""}`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="truncate text-sm font-bold">{p.name}</span>
        {p.isCaptain && <Pill tone="red">C</Pill>}
        {p.isVice && !p.isCaptain && <Pill>V</Pill>}
      </div>
      <div className="stat flex items-center justify-between text-[10px] text-ink-soft">
        <span>
          {p.teamShort} £{p.price.toFixed(1)}
        </span>
        <span className="font-bold text-red">{p.xp.toFixed(2)}</span>
      </div>
      <div className="mt-1">
        <FixtureRun fixtures={p.fixtures.slice(0, 5)} size="xs" />
      </div>
      {!p.available && (
        <div className="mt-1">
          <Pill tone="red">out</Pill>
        </div>
      )}
    </div>
  );
}

function formatRank(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}
