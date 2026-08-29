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

/** Colour class for a difficulty rating on FPL's 1–5 scale. */
export function fdrClass(d: number): string {
  if (d <= 2) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  if (d === 3) return "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300";
  if (d === 4) return "bg-amber-500/20 text-amber-700 dark:text-amber-300";
  return "bg-rose-500/20 text-rose-700 dark:text-rose-300";
}
