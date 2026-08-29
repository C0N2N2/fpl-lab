/** Shapes returned by /api/players, shared between the explorer and builder. */

export type Position = "GKP" | "DEF" | "MID" | "FWD";

export const POSITIONS: Position[] = ["GKP", "DEF", "MID", "FWD"];

export interface FixtureCell {
  gw: number;
  opponent: string;
  home: boolean;
  /** FPL's preseason rating. */
  difficulty: number;
  /** Re-rated on results. */
  rerated: number;
  points: number;
}

export interface Row {
  id: number;
  name: string;
  team: string;
  teamShort: string;
  teamId: number;
  position: Position;
  price: number;
  available: boolean;
  news: string;
  chanceNext: number | null;
  minutes: number;
  points: number;
  form: number;
  ownership: number;
  xG90: number;
  xA90: number;
  xGC90: number;
  defcon90: number;
  xp: number;
  xpHorizon: number;
  value: number;
  differential: number;
  expectedMinutes: number;
  priceChangeEvent: number;
  priceChangeSeason: number;
  netTransfers: number;
  breakdown: Record<string, number>;
  fixtures: FixtureCell[];
}

/* ---------------- fixture ticker ---------------- */

export interface TickerFixture {
  opponent: string;
  opponentId: number;
  home: boolean;
  difficulty: number;
  rerated: number;
  expectedConceded: number;
  expectedScored: number;
}

export interface TickerCell {
  gw: number;
  fixtures: TickerFixture[];
  blank: boolean;
  double: boolean;
}

export interface TickerRow {
  teamId: number;
  team: string;
  short: string;
  attack: number;
  leak: number;
  cells: TickerCell[];
  averageDifficulty: number;
  netExpectedGoals: number;
  matchCount: number;
}

export interface TickerPayload {
  meta: { span: number; nextGameweek: number | null; deadline: string | null; matchesPlayed: number };
  summary: {
    from: number;
    to: number;
    doubles: { gw: number; teams: string[] }[];
    blanks: { gw: number; teams: string[] }[];
  };
  rows: TickerRow[];
}

export async function fetchTicker(span: number): Promise<TickerPayload> {
  const res = await fetch(`/api/fixtures?span=${span}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.detail ?? json.error ?? "Request failed");
  return json as TickerPayload;
}

/* ---------------- mini-league ---------------- */

export interface LeagueEntry {
  entry: number;
  teamName: string;
  managerName: string;
  rank: number;
  lastRank: number;
  total: number;
  lastGw: number;
  activeChip: string | null;
  hasPicks: boolean;
  projectedXp: number;
  optimalXp: number;
  leaking: number;
  captain: string | null;
  squadXpHorizon: number;
  topPlayers: { name: string; team: string; xp: number }[];
}

export interface LeagueOwnership {
  id: number;
  name: string;
  teamShort: string;
  position: Position;
  price: number;
  xp: number;
  /** Share of league squads holding this player. */
  ownedPct: number;
  /** Starters plus captains again — the share of league points they swing. */
  effectivePct: number;
  captainedBy: number;
  /** Ownership across the whole game, for contrast. */
  globalPct: number;
}

export interface LeaguePayload {
  league: { id: number; name: string };
  meta: {
    horizon: number;
    currentGameweek: number;
    nextGameweek: number | null;
    deadline: string | null;
    shown: number;
    truncated: boolean;
    squadsCounted: number;
  };
  entries: LeagueEntry[];
  ownership: LeagueOwnership[];
}

export async function fetchLeague(leagueId: number, horizon: number): Promise<LeaguePayload> {
  const res = await fetch(`/api/league/${leagueId}?horizon=${horizon}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.detail ?? json.error ?? "Request failed");
  return json as LeaguePayload;
}

/* ---------------- live gameweek ---------------- */

export interface LivePlayer {
  id: number;
  name: string;
  teamShort: string;
  position: Position;
  price: number;
  slot: number;
  benched: boolean;
  isCaptain: boolean;
  isVice: boolean;
  multiplier: number;
  minutes: number;
  points: number;
  provisionalBonus: number;
  bonus: number;
  bps: number;
  goals: number;
  assists: number;
  cleanSheet: boolean;
  defcon: number;
  counted: number;
  started: boolean;
  finished: boolean;
}

export interface LivePayload {
  meta: { gameweek: number; isCurrent: boolean; generatedAt: string };
  total: {
    live: number;
    raw: number;
    hit: number;
    official: number | null;
    benchPoints: number;
    playersPlaying: number;
    playersToPlay: number;
    playersDone: number;
  };
  activeChip: string | null;
  squad: LivePlayer[];
}

export async function fetchLive(entryId: number, gw?: number): Promise<LivePayload> {
  const res = await fetch(`/api/live/${entryId}${gw ? `?gw=${gw}` : ""}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.detail ?? json.error ?? "Request failed");
  return json as LivePayload;
}

export interface TeamRow {
  id: number;
  name: string;
  short: string;
  attack: number;
  leak: number;
  goalsFor: number;
  goalsAgainst: number;
}

export interface Payload {
  meta: {
    nextGameweek: number | null;
    deadline: string | null;
    horizon: number;
    playerCount: number;
    matchesPlayed: number;
  };
  teams: TeamRow[];
  players: Row[];
}

export async function fetchPlayers(horizon: number): Promise<Payload> {
  const res = await fetch(`/api/players?horizon=${horizon}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.detail ?? json.error ?? "Request failed");
  return json as Payload;
}

/** A player in an imported FPL squad, with its slot and armband. */
export interface SquadPlayer extends Row {
  slot: number;
  benched: boolean;
  isCaptain: boolean;
  isVice: boolean;
}

export interface Manager {
  id: number;
  teamName: string;
  managerName: string;
  overallPoints: number;
  overallRank: number | null;
  gameweekPoints: number;
  gameweekRank: number | null;
  currentEvent: number;
  bank: number;
  squadValue: number;
  activeChip: string | null;
}

export interface TeamPayload {
  manager: Manager;
  meta: { horizon: number };
  hasPicks: boolean;
  squad: SquadPlayer[];
}

export async function fetchTeam(entryId: number, horizon: number): Promise<TeamPayload> {
  const res = await fetch(`/api/team/${entryId}?horizon=${horizon}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.detail ?? json.error ?? "Request failed");
  return json as TeamPayload;
}

/* ---------------- news ---------------- */

export interface NewsItem {
  title: string;
  link: string;
  published: string | null;
  source: string;
  teamIds: number[];
  transfer: boolean;
}

export interface TeamNewsEntry {
  playerId: number;
  name: string;
  position: string;
  price: number;
  news: string;
  chance: number | null;
  status: string;
  ownership: number;
}

export interface NewsPayload {
  meta: { generatedAt: string; feedsRequested: number; feedsFailed: number; headlineCount: number };
  teams: { id: number; name: string; short: string }[];
  headlines: NewsItem[];
  transfers: NewsItem[];
  availability: { teamId: number; team: string; short: string; entries: TeamNewsEntry[] }[];
}

export async function fetchNews(): Promise<NewsPayload> {
  const res = await fetch("/api/news");
  const json = await res.json();
  if (!res.ok) throw new Error(json.detail ?? json.error ?? "Request failed");
  return json as NewsPayload;
}
