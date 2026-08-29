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
  expectedMinutes: number;
  breakdown: Record<string, number>;
  fixtures: FixtureCell[];
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
  hasPicks: boolean;
  squad: SquadPlayer[];
}

export async function fetchTeam(entryId: number): Promise<TeamPayload> {
  const res = await fetch(`/api/team/${entryId}`);
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
