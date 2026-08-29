/**
 * Live match centre.
 *
 * Built entirely from FPL's own `/fixtures/` endpoint, which carries the
 * running score, the match minute and a per-player event feed while games are
 * in progress — the same source that drives the official site.
 *
 * The obvious third-party options were checked and rejected: SofaScore and
 * ESPN both return 403 to server-side requests regardless of headers, and
 * football-data.org requires a key. Depending on an undocumented endpoint that
 * actively blocks datacentre traffic would break the moment it was deployed.
 */

import type { FplBootstrap, Player } from "./fpl";

/** Event categories FPL publishes per fixture. */
export type StatKey =
  | "goals_scored" | "assists" | "own_goals" | "penalties_saved" | "penalties_missed"
  | "yellow_cards" | "red_cards" | "saves" | "bonus" | "bps" | "defensive_contribution";

export interface RawFixture {
  id: number;
  event: number | null;
  finished: boolean;
  finished_provisional: boolean;
  started: boolean;
  minutes: number;
  kickoff_time: string | null;
  team_h: number;
  team_a: number;
  team_h_score: number | null;
  team_a_score: number | null;
  stats?: { identifier: StatKey; a: { value: number; element: number }[]; h: { value: number; element: number }[] }[];
}

export interface MatchEvent {
  playerId: number;
  name: string;
  value: number;
  side: "home" | "away";
}

export type MatchStatus = "upcoming" | "live" | "half" | "ended" | "final";

export interface Match {
  id: number;
  gw: number;
  kickoff: string | null;
  status: MatchStatus;
  minute: number;
  home: { id: number; name: string; short: string; score: number | null };
  away: { id: number; name: string; short: string; score: number | null };
  goals: MatchEvent[];
  assists: MatchEvent[];
  reds: MatchEvent[];
  /** Provisional or confirmed bonus, whichever FPL has published. */
  bonus: MatchEvent[];
  /** Top BPS in the match, used to project bonus before it is awarded. */
  topBps: MatchEvent[];
}

/**
 * `finished` means the bonus has been applied; `finished_provisional` means
 * the whistle has gone but FPL is still processing. They are different states
 * and the distinction matters while points are still moving.
 */
function statusOf(f: RawFixture): MatchStatus {
  if (!f.started) return "upcoming";
  if (f.finished) return "final";
  if (f.finished_provisional) return "ended";
  if (f.minutes >= 45 && f.minutes <= 46) return "half";
  return "live";
}

export function buildMatches(
  boot: FplBootstrap,
  fixtures: RawFixture[],
  gw: number,
  players: Player[],
): Match[] {
  const teams = new Map(boot.teams.map((t) => [t.id, t]));
  const names = new Map(players.map((p) => [p.id, p.name]));

  const pick = (f: RawFixture, key: StatKey): MatchEvent[] => {
    const block = f.stats?.find((s) => s.identifier === key);
    if (!block) return [];
    const out: MatchEvent[] = [];
    for (const side of ["h", "a"] as const) {
      for (const e of block[side]) {
        out.push({
          playerId: e.element,
          name: names.get(e.element) ?? `#${e.element}`,
          value: e.value,
          side: side === "h" ? "home" : "away",
        });
      }
    }
    return out;
  };

  return fixtures
    .filter((f) => f.event === gw)
    .sort((a, b) => {
      const order = (f: RawFixture) =>
        statusOf(f) === "live" || statusOf(f) === "half" ? 0 : f.started ? 1 : 2;
      const d = order(a) - order(b);
      if (d !== 0) return d;
      return (a.kickoff_time ?? "").localeCompare(b.kickoff_time ?? "");
    })
    .map((f) => {
      const h = teams.get(f.team_h);
      const a = teams.get(f.team_a);
      const bps = pick(f, "bps").sort((x, y) => y.value - x.value);

      return {
        id: f.id,
        gw,
        kickoff: f.kickoff_time,
        status: statusOf(f),
        minute: f.minutes,
        home: {
          id: f.team_h,
          name: h?.name ?? "?",
          short: h?.short_name ?? "?",
          score: f.team_h_score,
        },
        away: {
          id: f.team_a,
          name: a?.name ?? "?",
          short: a?.short_name ?? "?",
          score: f.team_a_score,
        },
        goals: pick(f, "goals_scored"),
        assists: pick(f, "assists"),
        reds: pick(f, "red_cards"),
        bonus: pick(f, "bonus").sort((x, y) => y.value - x.value),
        topBps: bps.slice(0, 5),
      };
    });
}
