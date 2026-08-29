"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchLive, fetchMatches,
  type LivePayload, type LivePlayer, type Match, type MatchesPayload, type Position,
} from "@/lib/api";
import { ErrorNote, Hero, Loading, Panel, PanelHead, Pill, Tile } from "@/components/ui";
import { Pitch, PitchRow, PlayerToken } from "@/components/Pitch";

const STORAGE_KEY = "fpl-lab.entryId";
const LINES: Position[] = ["GKP", "DEF", "MID", "FWD"];
const REFRESH_MS = 60_000;

export default function Live() {
  const [input, setInput] = useState("");
  const [entryId, setEntryId] = useState<number | null>(null);
  const [data, setData] = useState<LivePayload | null>(null);
  const [matches, setMatches] = useState<MatchesPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [auto, setAuto] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) { setInput(saved); setEntryId(Number(saved)); }
    } catch { /* private mode — start empty */ }
  }, []);

  /** Matches load on their own — the page is useful without a team ID. */
  const loadMatches = useCallback(async () => {
    try {
      setMatches(await fetchMatches());
      setUpdatedAt(new Date());
    } catch { /* the squad panel surfaces errors; don't double-report */ }
  }, []);

  const load = useCallback(async (id: number) => {
    setBusy(true);
    try {
      const json = await fetchLive(id);
      setData(json);
      setError(null);
      setUpdatedAt(new Date());
      try { localStorage.setItem(STORAGE_KEY, String(id)); } catch { /* ignore */ }
    } catch (e) {
      setError((e as Error).message);
      setData(null);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { void loadMatches(); }, [loadMatches]);

  useEffect(() => {
    if (entryId === null) return;
    void load(entryId);
  }, [entryId, load]);

  // Poll while anything is still to happen; stop once the gameweek is done.
  useEffect(() => {
    if (!auto) return;
    const squadPending = data
      ? data.total.playersPlaying > 0 || data.total.playersToPlay > 0
      : false;
    const matchesPending = matches
      ? matches.meta.live > 0 || matches.meta.upcoming > 0
      : false;
    if (!squadPending && !matchesPending) return;

    const t = setInterval(() => {
      void loadMatches();
      if (entryId !== null) void load(entryId);
    }, REFRESH_MS);
    return () => clearInterval(t);
  }, [auto, entryId, data, matches, load, loadMatches]);

  /** Team ids of the user's players, so matches can highlight them. */
  const myTeams = useMemo(() => {
    const m = new Map<string, LivePlayer[]>();
    for (const p of data?.squad ?? []) {
      const list = m.get(p.teamShort) ?? [];
      list.push(p);
      m.set(p.teamShort, list);
    }
    return m;
  }, [data]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(input.trim());
    if (Number.isInteger(n) && n > 0) setEntryId(n);
    else setError("Enter the numeric team ID from your FPL URL.");
  }

  const starters = useMemo(() => data?.squad.filter((p) => !p.benched) ?? [], [data]);
  const bench = useMemo(
    () => (data?.squad.filter((p) => p.benched) ?? []).sort((a, b) => a.slot - b.slot),
    [data],
  );

  const inPlay = (data?.total.playersPlaying ?? 0) > 0 || (data?.total.playersToPlay ?? 0) > 0;

  return (
    <main className="py-10">
      <Hero
        kicker="Live"
        title={<>Points as they <span className="marker">happen</span></>}
        blurb="Your gameweek score updating in real time, including provisional bonus worked out from live BPS before FPL publishes it."
        right={
          data ? (
            <div className="rounded-xl border border-line bg-strike px-6 py-3 text-white ">
              <div className="display text-5xl">{data.total.live}</div>
              <div className="stat text-[11px] font-semibold">
                GW{data.meta.gameweek}
                {data.total.hit > 0 && ` · after −${data.total.hit} hit`}
              </div>
            </div>
          ) : null
        }
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
          {busy ? "Loading…" : "Track team"}
        </button>
        {data && (
          <>
            <button
              type="button"
              onClick={() => entryId && void load(entryId)}
              className="rounded-lg border border-line bg-panel px-4 py-2 text-sm font-bold text-chalk-mid transition hover:bg-flare-wash"
            >
              Refresh now
            </button>
            <label className="stat flex cursor-pointer items-center gap-2 text-xs text-chalk-mid">
              <input
                type="checkbox" checked={auto}
                onChange={(e) => setAuto(e.target.checked)}
                className="accent-[var(--strike)]"
              />
              auto-refresh every minute
            </label>
            {updatedAt && (
              <span className="stat text-[11px] text-chalk-dim">
                updated {updatedAt.toLocaleTimeString()}
              </span>
            )}
          </>
        )}
      </form>

      {matches && (
        <Panel className="mb-5">
          <PanelHead
            title={`Match centre · GW${matches.meta.gameweek}`}
            right={
              <span className="stat text-xs text-chalk-dim">
                {matches.meta.live > 0 && <b className="text-strike">{matches.meta.live} live</b>}
                {matches.meta.live > 0 && " · "}
                {matches.meta.upcoming} to kick off · {matches.meta.finished} done
              </span>
            }
          />
          <div className="grid gap-px bg-line sm:grid-cols-2 xl:grid-cols-3">
            {matches.matches.map((m) => (
              <MatchCard key={m.id} m={m} mine={myTeams} />
            ))}
          </div>
        </Panel>
      )}

      {error && <ErrorNote title="Couldn't load live points" detail={error} />}
      {busy && !data && <Loading what="live scores" />}

      {data && !error && (
        <div className="flex flex-col gap-5">
          <Panel>
            <PanelHead
              title={inPlay ? "Gameweek in progress" : "Gameweek complete"}
              right={
                data.activeChip ? <Pill tone="yellow">{data.activeChip}</Pill> : null
              }
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
              <Tile label="Live points" value={data.total.live} tone="red" sub="XI, captain counted" />
              <Tile label="Still to play" value={data.total.playersToPlay} tone="yellow" />
              <Tile label="Playing now" value={data.total.playersPlaying} />
              <Tile label="Finished" value={data.total.playersDone} />
              <Tile label="On the bench" value={data.total.benchPoints} sub="not counted" />
              <Tile
                label="FPL says"
                value={data.total.official ?? "—"}
                sub="official, lags bonus"
              />
            </div>
          </Panel>

          <Panel>
            <PanelHead
              title="Your XI"
              right={<span className="stat text-xs text-chalk-dim">provisional bonus shown in yellow</span>}
            />
            <div className="p-4">
              <Pitch
                bench={bench.map((p) => (
                  <PlayerToken
                    key={p.id}
                    name={p.name}
                    club={p.teamShort}
                    value={String(p.points + p.provisionalBonus)}
                    meta={`${p.minutes}′`}
                    muted
                    {...liveFlag(p)}
                  />
                ))}
              >
                {LINES.map((pos) => {
                  const line = starters.filter((p) => p.position === pos);
                  if (!line.length) return null;
                  return (
                    <PitchRow key={pos}>
                      {line.map((p) => (
                        <PlayerToken
                          key={p.id}
                          name={p.name}
                          club={p.teamShort}
                          value={String(p.multiplier > 1 ? p.counted : p.points + p.provisionalBonus)}
                          meta={p.started ? `${p.minutes}′` : "to play"}
                          captain={p.isCaptain}
                          vice={p.isVice}
                          {...liveFlag(p)}
                        />
                      ))}
                    </PitchRow>
                  );
                })}
              </Pitch>
            </div>
          </Panel>

          <p className="stat text-[10px] leading-relaxed text-chalk-dim">
            Bonus is only official once a match ends. Until then we rank every player in each
            fixture by live BPS and award 3/2/1 the way FPL will — so your total moves before
            theirs does. Auto-refresh stops once all your players have finished.
          </p>
        </div>
      )}
    </main>
  );
}

function MatchCard({ m, mine }: { m: Match; mine: Map<string, LivePlayer[]> }) {
  const kickoff = m.kickoff
    ? new Date(m.kickoff).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : "";
  const involved = [...(mine.get(m.home.short) ?? []), ...(mine.get(m.away.short) ?? [])];
  const scored = new Set(m.goals.map((g) => g.playerId));
  const assisted = new Set(m.assists.map((g) => g.playerId));

  return (
    <div className={`bg-panel p-3 ${m.status === "live" ? "ring-1 ring-inset ring-strike" : ""}`}>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="stat text-[10px] uppercase tracking-wider text-chalk-dim">
          {m.status === "live" && <b className="text-strike">{m.minute}′ live</b>}
          {m.status === "half" && <b className="text-strike">half time</b>}
          {m.status === "upcoming" && `kicks off ${kickoff}`}
          {m.status === "ended" && "full time · bonus pending"}
          {m.status === "final" && "full time"}
        </span>
        {involved.length > 0 && <Pill tone="yellow">{involved.length} of yours</Pill>}
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold">{m.home.short}</span>
        <span className="display text-2xl">
          {m.home.score ?? "–"} <span className="text-chalk-dim">:</span> {m.away.score ?? "–"}
        </span>
        <span className="text-sm font-bold">{m.away.short}</span>
      </div>

      {(m.goals.length > 0 || m.bonus.length > 0 || m.topBps.length > 0) && (
        <div className="mt-2 flex flex-col gap-1 border-t border-line-soft pt-2">
          {m.goals.length > 0 && (
            <div className="stat text-[10px] leading-relaxed text-chalk-mid">
              <span className="text-chalk-dim">⚽ </span>
              {m.goals.map((g, i) => (
                <span key={`${g.playerId}-${i}`}>
                  {i > 0 && ", "}
                  <span className={involved.some((p) => p.id === g.playerId) ? "font-bold text-strike" : ""}>
                    {g.name}{g.value > 1 ? ` ×${g.value}` : ""}
                  </span>
                </span>
              ))}
            </div>
          )}
          {m.assists.length > 0 && (
            <div className="stat text-[10px] leading-relaxed text-chalk-dim">
              🅰 {m.assists.map((a) => a.name).join(", ")}
            </div>
          )}
          {m.bonus.length > 0 ? (
            <div className="stat text-[10px] text-surge">
              bonus {m.bonus.map((b) => `${b.name} +${b.value}`).join(", ")}
            </div>
          ) : m.topBps.length > 0 ? (
            <div className="stat text-[10px] text-flare">
              bonus race {m.topBps.slice(0, 3).map((b) => `${b.name} ${b.value}`).join(" · ")}
            </div>
          ) : null}
          {m.reds.length > 0 && (
            <div className="stat text-[10px] text-strike">
              🟥 {m.reds.map((r) => r.name).join(", ")}
            </div>
          )}
        </div>
      )}

      {involved.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1 border-t border-line-soft pt-2">
          {involved.map((p) => (
            <span
              key={p.id}
              className={`stat rounded px-1.5 py-0.5 text-[9px] font-semibold ${
                scored.has(p.id) || assisted.has(p.id)
                  ? "bg-surge-wash text-surge"
                  : p.benched
                    ? "bg-panel-2 text-chalk-dim"
                    : "bg-flare-wash text-flare"
              }`}
            >
              {p.name} {p.multiplier > 1 ? p.counted : p.points + p.provisionalBonus}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Ring colour and label for a player's live state. */
function liveFlag(p: LivePlayer): { flag?: "red" | "yellow" | "good"; flagLabel?: string } {
  if (p.goals > 0) return { flag: "good", flagLabel: p.goals > 1 ? `${p.goals} goals` : "goal" };
  if (p.assists > 0) return { flag: "good", flagLabel: "assist" };
  if (p.provisionalBonus > 0) return { flag: "yellow", flagLabel: `+${p.provisionalBonus} bonus?` };
  if (p.started && !p.finished) return { flag: "yellow", flagLabel: "live" };
  return {};
}
