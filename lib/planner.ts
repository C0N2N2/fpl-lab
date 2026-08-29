/**
 * Multi-gameweek transfer planner.
 *
 * Single-transfer suggestions answer "who is the best upgrade right now".
 * This answers the harder question: given one free transfer a week (bankable
 * to five) and a −4 hit for every extra, what sequence of moves over the next
 * several gameweeks scores the most?
 *
 * Searched with a beam rather than exhaustively — the full tree is
 * (candidates ^ transfers) ^ gameweeks, which is far too wide. A beam keeps
 * the best few squads alive at each step, which in practice finds the same
 * plan a human would after a lot of staring at a spreadsheet.
 */

import type { Position, Row } from "./api";
import { FORMATIONS, MAX_PER_CLUB, SQUAD_SIZE } from "./squad";

export const FREE_TRANSFER_CAP = 5;
export const HIT_COST = 4;

export interface PlannedTransfer {
  out: Row;
  in: Row;
}

export interface PlanStep {
  gw: number;
  transfers: PlannedTransfer[];
  /** Free transfers available before this gameweek's moves. */
  freeBefore: number;
  /** Points deducted for exceeding the free allowance. */
  hit: number;
  /** Best XI projection for this gameweek, captain doubled. */
  squadXp: number;
  /** squadXp minus the hit. */
  netXp: number;
  captain: Row | null;
  bank: number;
}

export interface Plan {
  steps: PlanStep[];
  /** Net points across the whole plan, hits included. */
  totalXp: number;
  totalHits: number;
  transferCount: number;
  /** Same squad held all the way through, for comparison. */
  baselineXp: number;
  gain: number;
}

/** A player's projection for one specific gameweek. */
function xpAt(p: Row, gw: number): number {
  let sum = 0;
  for (const f of p.fixtures) if (f.gw === gw) sum += f.points;
  return sum;
}

/** Best XI for a single gameweek, captain doubled. */
function bestXiAt(squad: Row[], gw: number): { total: number; captain: Row | null } {
  const byPos = (pos: Position) =>
    squad.filter((p) => p.position === pos).sort((a, b) => xpAt(b, gw) - xpAt(a, gw));

  const gk = byPos("GKP");
  const def = byPos("DEF");
  const mid = byPos("MID");
  const fwd = byPos("FWD");

  let best = { total: 0, captain: null as Row | null };

  for (const [d, m, f] of FORMATIONS) {
    if (!gk.length || def.length < d || mid.length < m || fwd.length < f) continue;
    const xi = [gk[0], ...def.slice(0, d), ...mid.slice(0, m), ...fwd.slice(0, f)];
    const base = xi.reduce((s, p) => s + xpAt(p, gw), 0);
    const captain = xi.reduce((a, b) => (xpAt(b, gw) > xpAt(a, gw) ? b : a), xi[0]);
    const total = base + xpAt(captain, gw);
    if (total > best.total) best = { total, captain };
  }
  return best;
}

function clubCounts(squad: Row[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const p of squad) m.set(p.teamId, (m.get(p.teamId) ?? 0) + 1);
  return m;
}

interface State {
  squad: Row[];
  bank: number;
  free: number;
  steps: PlanStep[];
  score: number;
}

export interface PlannerOptions {
  bank: number;
  /** Free transfers available now. */
  freeTransfers: number;
  /** How many gameweeks to plan. */
  weeks: number;
  /** Most transfers to consider in any single gameweek. */
  maxPerWeek?: number;
  /** Beam width — higher searches more, costs more time. */
  beam?: number;
  /** Candidate replacements considered per position. */
  poolPerPosition?: number;
}

/**
 * Enumerate the most promising single swaps from a squad for a given horizon.
 * Ranked by projected gain over the remaining weeks, not just the next one.
 */
function candidateSwaps(
  squad: Row[],
  pool: Map<Position, Row[]>,
  bank: number,
  weeks: number[],
): { out: Row; in: Row; gain: number; bank: number }[] {
  const held = new Set(squad.map((p) => p.id));
  const clubs = clubCounts(squad);
  const horizonXp = (p: Row) => weeks.reduce((s, gw) => s + xpAt(p, gw), 0);

  const out: { out: Row; in: Row; gain: number; bank: number }[] = [];

  for (const leaving of squad) {
    const budget = leaving.price + bank;
    const leavingXp = horizonXp(leaving);
    const candidates = pool.get(leaving.position) ?? [];

    for (const arriving of candidates) {
      if (held.has(arriving.id) || arriving.price > budget) continue;
      const already = clubs.get(arriving.teamId) ?? 0;
      const effective = arriving.teamId === leaving.teamId ? already - 1 : already;
      if (effective >= MAX_PER_CLUB) continue;

      const gain = horizonXp(arriving) - leavingXp;
      if (gain <= 0) continue;
      out.push({
        out: leaving,
        in: arriving,
        gain,
        bank: Number((bank + leaving.price - arriving.price).toFixed(1)),
      });
    }
  }

  return out.sort((a, b) => b.gain - a.gain);
}

export function planTransfers(
  squad: Row[],
  allPlayers: Row[],
  {
    bank,
    freeTransfers,
    weeks,
    maxPerWeek = 2,
    beam = 6,
    poolPerPosition = 30,
  }: PlannerOptions,
): Plan | null {
  if (squad.length < 15) return null;

  // Gameweeks actually present in the projection data.
  const allGws = [...new Set(squad.flatMap((p) => p.fixtures.map((f) => f.gw)))].sort(
    (a, b) => a - b,
  );
  const horizon = allGws.slice(0, weeks);
  if (!horizon.length) return null;

  // Trim the candidate pool: only available players, best few per position.
  const pool = new Map<Position, Row[]>();
  for (const pos of Object.keys(SQUAD_SIZE) as Position[]) {
    pool.set(
      pos,
      allPlayers
        .filter((p) => p.position === pos && p.available && p.expectedMinutes > 20)
        .sort((a, b) => b.xpHorizon - a.xpHorizon)
        .slice(0, poolPerPosition),
    );
  }

  let states: State[] = [
    { squad: [...squad], bank, free: Math.min(freeTransfers, FREE_TRANSFER_CAP), steps: [], score: 0 },
  ];

  horizon.forEach((gw, index) => {
    const remaining = horizon.slice(index);
    const next: State[] = [];

    for (const state of states) {
      const swaps = candidateSwaps(state.squad, pool, state.bank, remaining).slice(0, 12);

      // Consider doing nothing, one move, or two.
      for (let count = 0; count <= Math.min(maxPerWeek, swaps.length); count++) {
        const chosen: typeof swaps = [];
        const usedOut = new Set<number>();
        const usedIn = new Set<number>();

        for (const s of swaps) {
          if (chosen.length >= count) break;
          if (usedOut.has(s.out.id) || usedIn.has(s.in.id)) continue;
          chosen.push(s);
          usedOut.add(s.out.id);
          usedIn.add(s.in.id);
        }
        if (chosen.length < count) continue;

        let squadNext = [...state.squad];
        let bankNext = state.bank;
        for (const s of chosen) {
          squadNext = squadNext.filter((p) => p.id !== s.out.id).concat(s.in);
          bankNext = Number((bankNext + s.out.price - s.in.price).toFixed(1));
        }
        if (bankNext < 0) continue;

        const paid = Math.max(0, count - state.free);
        const hit = paid * HIT_COST;
        const { total, captain } = bestXiAt(squadNext, gw);

        next.push({
          squad: squadNext,
          bank: bankNext,
          free: Math.min(FREE_TRANSFER_CAP, Math.max(0, state.free - count) + 1),
          steps: [
            ...state.steps,
            {
              gw,
              transfers: chosen.map((s) => ({ out: s.out, in: s.in })),
              freeBefore: state.free,
              hit,
              squadXp: Number(total.toFixed(2)),
              netXp: Number((total - hit).toFixed(2)),
              captain,
              bank: bankNext,
            },
          ],
          score: state.score + total - hit,
        });
      }
    }

    states = next.sort((a, b) => b.score - a.score).slice(0, beam);
  });

  const best = states[0];
  if (!best) return null;

  const baselineXp = horizon.reduce((s, gw) => s + bestXiAt(squad, gw).total, 0);
  const totalHits = best.steps.reduce((s, x) => s + x.hit, 0);

  return {
    steps: best.steps,
    totalXp: Number(best.score.toFixed(1)),
    totalHits,
    transferCount: best.steps.reduce((s, x) => s + x.transfers.length, 0),
    baselineXp: Number(baselineXp.toFixed(1)),
    gain: Number((best.score - baselineXp).toFixed(1)),
  };
}
