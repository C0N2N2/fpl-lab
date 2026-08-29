/**
 * Types and fetching for the official Fantasy Premier League API.
 *
 * The FPL endpoints send no CORS headers, so every call here must run on the
 * server (route handlers, server components) — never from the browser.
 */

export const FPL_BASE = "https://fantasy.premierleague.com/api";

export type ElementTypeId = 1 | 2 | 3 | 4; // GKP, DEF, MID, FWD

export interface FplTeam {
  id: number;
  name: string;
  short_name: string;
  strength_overall_home: number;
  strength_overall_away: number;
  strength_attack_home: number;
  strength_attack_away: number;
  strength_defence_home: number;
  strength_defence_away: number;
}

export interface FplElementType {
  id: ElementTypeId;
  singular_name_short: string; // GKP | DEF | MID | FWD
  plural_name: string;
}

/** Numeric fields arrive as strings from the API; we parse them in `normalise`. */
export interface FplElement {
  id: number;
  code: number;
  web_name: string;
  first_name: string;
  second_name: string;
  team: number;
  element_type: ElementTypeId;
  now_cost: number; // tenths of a million
  status: string; // a | d | i | s | u | n
  news: string;
  chance_of_playing_next_round: number | null;
  minutes: number;
  starts: number;
  total_points: number;
  event_points: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  goals_conceded: number;
  saves: number;
  bonus: number;
  bps: number;
  yellow_cards: number;
  red_cards: number;
  defensive_contribution: number;
  cost_change_event: number;
  cost_change_start: number;
  transfers_in_event: number;
  transfers_out_event: number;
  form: string;
  points_per_game: string;
  selected_by_percent: string;
  value_form: string;
  ict_index: string;
  expected_goals: string;
  expected_assists: string;
  expected_goal_involvements: string;
  expected_goals_conceded: string;
  expected_goals_per_90: number;
  expected_assists_per_90: number;
  expected_goal_involvements_per_90: number;
  expected_goals_conceded_per_90: number;
  clean_sheets_per_90: number;
  defensive_contribution_per_90: number;
  starts_per_90: number;
  saves_per_90: number;
}

export interface FplEvent {
  id: number;
  name: string;
  deadline_time: string;
  finished: boolean;
  is_current: boolean;
  is_next: boolean;
  average_entry_score: number;
}

export interface FplBootstrap {
  elements: FplElement[];
  teams: FplTeam[];
  element_types: FplElementType[];
  events: FplEvent[];
}

export interface FplFixture {
  id: number;
  event: number | null;
  finished: boolean;
  kickoff_time: string | null;
  team_h: number;
  team_a: number;
  team_h_score: number | null;
  team_a_score: number | null;
  team_h_difficulty: number;
  team_a_difficulty: number;
}

/* ------------------------------------------------------------------ */
/* Normalised shapes used by the rest of the app                       */
/* ------------------------------------------------------------------ */

export type Position = "GKP" | "DEF" | "MID" | "FWD";

export const POSITION_BY_TYPE: Record<ElementTypeId, Position> = {
  1: "GKP",
  2: "DEF",
  3: "MID",
  4: "FWD",
};

export interface Player {
  id: number;
  name: string;
  fullName: string;
  teamId: number;
  team: string;
  teamShort: string;
  position: Position;
  price: number; // in millions
  status: string;
  news: string;
  chanceNext: number | null;
  available: boolean;

  minutes: number;
  starts: number;
  points: number;
  pointsPerGame: number;
  form: number;
  ownership: number;

  goals: number;
  assists: number;
  cleanSheets: number;
  goalsConceded: number;
  saves: number;
  bonus: number;
  defcon: number;

  xG: number;
  xA: number;
  xGI: number;
  xGC: number;
  xG90: number;
  xA90: number;
  xGI90: number;
  xGC90: number;
  cs90: number;
  defcon90: number;
  starts90: number;
  saves90: number;

  /** Price movement, in millions. */
  priceChangeEvent: number;
  priceChangeSeason: number;
  /** Net transfers this gameweek — the pressure behind the next price move. */
  netTransfers: number;
}

export interface Fixture {
  gw: number;
  opponentId: number;
  opponent: string;
  home: boolean;
  difficulty: number;
}

const num = (v: string | number | null | undefined): number => {
  const n = typeof v === "number" ? v : parseFloat(v ?? "0");
  return Number.isFinite(n) ? n : 0;
};

/** A player is unavailable if flagged, or explicitly 0% to play next round. */
function isAvailable(e: FplElement): boolean {
  if (e.chance_of_playing_next_round === 0) return false;
  return e.status === "a";
}

export function normalise(boot: FplBootstrap): Player[] {
  const teams = new Map(boot.teams.map((t) => [t.id, t]));

  return boot.elements.map((e) => {
    const team = teams.get(e.team);
    return {
      id: e.id,
      name: e.web_name,
      fullName: `${e.first_name} ${e.second_name}`.trim(),
      teamId: e.team,
      team: team?.name ?? "Unknown",
      teamShort: team?.short_name ?? "???",
      position: POSITION_BY_TYPE[e.element_type],
      price: e.now_cost / 10,
      status: e.status,
      news: e.news ?? "",
      chanceNext: e.chance_of_playing_next_round,
      available: isAvailable(e),

      minutes: e.minutes,
      starts: e.starts,
      points: e.total_points,
      pointsPerGame: num(e.points_per_game),
      form: num(e.form),
      ownership: num(e.selected_by_percent),

      goals: e.goals_scored,
      assists: e.assists,
      cleanSheets: e.clean_sheets,
      goalsConceded: e.goals_conceded,
      saves: e.saves,
      bonus: e.bonus,
      defcon: e.defensive_contribution ?? 0,

      xG: num(e.expected_goals),
      xA: num(e.expected_assists),
      xGI: num(e.expected_goal_involvements),
      xGC: num(e.expected_goals_conceded),
      xG90: num(e.expected_goals_per_90),
      xA90: num(e.expected_assists_per_90),
      xGI90: num(e.expected_goal_involvements_per_90),
      xGC90: num(e.expected_goals_conceded_per_90),
      cs90: num(e.clean_sheets_per_90),
      defcon90: num(e.defensive_contribution_per_90),
      starts90: num(e.starts_per_90),
      saves90: num(e.saves_per_90),

      priceChangeEvent: (e.cost_change_event ?? 0) / 10,
      priceChangeSeason: (e.cost_change_start ?? 0) / 10,
      netTransfers: (e.transfers_in_event ?? 0) - (e.transfers_out_event ?? 0),
    };
  });
}

/**
 * Upcoming fixtures per team, keyed by team id.
 * Only unfinished fixtures with a scheduled gameweek are included.
 */
export function upcomingByTeam(
  fixtures: FplFixture[],
  boot: FplBootstrap,
  count = 5,
): Map<number, Fixture[]> {
  const short = new Map(boot.teams.map((t) => [t.id, t.short_name]));
  const out = new Map<number, Fixture[]>();

  const pending = fixtures
    .filter((f) => !f.finished && f.event !== null)
    .sort((a, b) => (a.event ?? 0) - (b.event ?? 0));

  for (const f of pending) {
    const gw = f.event as number;
    const home: Fixture = {
      gw,
      opponentId: f.team_a,
      opponent: short.get(f.team_a) ?? "???",
      home: true,
      difficulty: f.team_h_difficulty,
    };
    const away: Fixture = {
      gw,
      opponentId: f.team_h,
      opponent: short.get(f.team_h) ?? "???",
      home: false,
      difficulty: f.team_a_difficulty,
    };
    for (const [teamId, fx] of [
      [f.team_h, home],
      [f.team_a, away],
    ] as const) {
      const list = out.get(teamId) ?? [];
      if (list.length < count) list.push(fx);
      out.set(teamId, list);
    }
  }
  return out;
}

export function nextGameweek(boot: FplBootstrap): FplEvent | undefined {
  return boot.events.find((e) => e.is_next) ?? boot.events.find((e) => !e.finished);
}
