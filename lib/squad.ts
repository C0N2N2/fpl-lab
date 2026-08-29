/** Squad rules, validation, and best-eleven selection. */

import type { Position, Row } from "./api";

export const BUDGET = 100.0;
export const MAX_PER_CLUB = 3;

export const SQUAD_SIZE: Record<Position, number> = {
  GKP: 2,
  DEF: 5,
  MID: 5,
  FWD: 3,
};

/** Valid starting-XI shapes: [defenders, midfielders, forwards]. */
export const FORMATIONS: [number, number, number][] = (() => {
  const out: [number, number, number][] = [];
  for (let d = 3; d <= 5; d++)
    for (let m = 2; m <= 5; m++)
      for (let f = 1; f <= 3; f++) if (d + m + f === 10) out.push([d, m, f]);
  return out;
})();

export interface SquadIssue {
  kind: "budget" | "position" | "club" | "size";
  message: string;
}

export function squadCost(players: Row[]): number {
  return players.reduce((s, p) => s + p.price, 0);
}

export function countByPosition(players: Row[]): Record<Position, number> {
  const c: Record<Position, number> = { GKP: 0, DEF: 0, MID: 0, FWD: 0 };
  for (const p of players) c[p.position]++;
  return c;
}

export function countByClub(players: Row[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const p of players) m.set(p.teamId, (m.get(p.teamId) ?? 0) + 1);
  return m;
}

/** Can this player be added without breaking a rule? Returns why not. */
export function blockedReason(squad: Row[], candidate: Row): string | null {
  if (squad.some((p) => p.id === candidate.id)) return "Already in squad";

  const byPos = countByPosition(squad);
  if (byPos[candidate.position] >= SQUAD_SIZE[candidate.position]) {
    return `${candidate.position} slots full (${SQUAD_SIZE[candidate.position]})`;
  }

  const clubs = countByClub(squad);
  if ((clubs.get(candidate.teamId) ?? 0) >= MAX_PER_CLUB) {
    return `Max ${MAX_PER_CLUB} from ${candidate.teamShort}`;
  }

  if (squadCost(squad) + candidate.price > BUDGET) return "Over budget";
  return null;
}

export function validate(squad: Row[]): SquadIssue[] {
  const issues: SquadIssue[] = [];
  const cost = squadCost(squad);
  if (cost > BUDGET) {
    issues.push({ kind: "budget", message: `£${(cost - BUDGET).toFixed(1)}m over budget` });
  }

  const byPos = countByPosition(squad);
  for (const pos of Object.keys(SQUAD_SIZE) as Position[]) {
    if (byPos[pos] > SQUAD_SIZE[pos]) {
      issues.push({ kind: "position", message: `Too many ${pos} (${byPos[pos]}/${SQUAD_SIZE[pos]})` });
    }
  }

  for (const [teamId, n] of countByClub(squad)) {
    if (n > MAX_PER_CLUB) {
      const short = squad.find((p) => p.teamId === teamId)?.teamShort ?? "club";
      issues.push({ kind: "club", message: `${n} players from ${short} (max ${MAX_PER_CLUB})` });
    }
  }
  return issues;
}

export function isComplete(squad: Row[]): boolean {
  const byPos = countByPosition(squad);
  return (
    (Object.keys(SQUAD_SIZE) as Position[]).every((p) => byPos[p] === SQUAD_SIZE[p]) &&
    validate(squad).length === 0
  );
}

export interface Eleven {
  xi: Row[];
  bench: Row[];
  captain: Row | null;
  vice: Row | null;
  formation: string;
  /** Projected points including the captain's doubled score. */
  total: number;
}

/**
 * Best starting XI by projected points.
 *
 * Players score independently, so for any given formation the optimum is just
 * the highest-scoring players in each position — we only need to compare the
 * handful of legal shapes.
 */
export function bestEleven(squad: Row[], key: "xp" | "xpHorizon" = "xp"): Eleven {
  const byPos = (pos: Position) =>
    squad.filter((p) => p.position === pos).sort((a, b) => b[key] - a[key]);

  const gk = byPos("GKP");
  const def = byPos("DEF");
  const mid = byPos("MID");
  const fwd = byPos("FWD");

  let best: Eleven | null = null;

  for (const [d, m, f] of FORMATIONS) {
    if (gk.length < 1 || def.length < d || mid.length < m || fwd.length < f) continue;
    const xi = [gk[0], ...def.slice(0, d), ...mid.slice(0, m), ...fwd.slice(0, f)];
    const base = xi.reduce((s, p) => s + p[key], 0);
    const ranked = [...xi].sort((a, b) => b[key] - a[key]);
    const captain = ranked[0] ?? null;
    const total = base + (captain ? captain[key] : 0);

    if (!best || total > best.total) {
      const chosen = new Set(xi.map((p) => p.id));
      best = {
        xi,
        bench: squad.filter((p) => !chosen.has(p.id)).sort((a, b) => b[key] - a[key]),
        captain,
        vice: ranked[1] ?? null,
        formation: `${d}-${m}-${f}`,
        total,
      };
    }
  }

  return (
    best ?? {
      xi: [], bench: [...squad], captain: null, vice: null, formation: "—", total: 0,
    }
  );
}

/**
 * Greedy auto-fill: repeatedly add the best-value legal player until the squad
 * is complete. Leaves room for the remaining slots by capping what any single
 * pick may cost.
 */
export function autoFill(squad: Row[], pool: Row[], key: "xp" | "xpHorizon" = "xpHorizon"): Row[] {
  const next = [...squad];
  const ranked = [...pool]
    .filter((p) => p.available && p.minutes > 0)
    .sort((a, b) => b[key] - a[key]);

  let guard = 0;
  while (!isComplete(next) && guard++ < 400) {
    const byPos = countByPosition(next);
    const needed = (Object.keys(SQUAD_SIZE) as Position[]).reduce(
      (s, p) => s + Math.max(0, SQUAD_SIZE[p] - byPos[p]),
      0,
    );
    if (needed === 0) break;

    // Keep at least £4.0m per remaining slot so the squad can always be completed.
    const spare = BUDGET - squadCost(next) - (needed - 1) * 4.0;

    const pick = ranked.find(
      (p) => p.price <= spare && blockedReason(next, p) === null,
    );
    if (!pick) break;
    next.push(pick);
  }
  return next;
}
