/**
 * Transfer suggestions.
 *
 * For every player in a squad, find the legal replacements that gain the most
 * projected points across the chosen horizon — respecting the bank, the
 * three-per-club limit and position, and never suggesting an unavailable
 * player.
 */

import type { Row } from "./api";
import { MAX_PER_CLUB } from "./squad";

export interface Suggestion {
  out: Row;
  in: Row;
  /** Projected points gained over the whole horizon. */
  gain: number;
  /** Points gained in the next gameweek alone. */
  gainNext: number;
  /** Positive means the move costs money, negative frees it. */
  spend: number;
  /** Bank left after the move. */
  bankAfter: number;
  /** Per-gameweek gain, aligned on gameweek number. */
  perGameweek: { gw: number; gain: number }[];
}

export interface TransferOptions {
  /** Money available outside the squad, in millions. */
  bank: number;
  /** Only suggest moves gaining at least this many points. */
  minGain?: number;
  /** How many suggestions to return. */
  limit?: number;
  /** Skip players the manager would rather keep. */
  exclude?: Set<number>;
}

/** Gameweek-by-gameweek difference between two players' projections. */
function perGameweekGain(out: Row, inn: Row): { gw: number; gain: number }[] {
  const byGw = new Map<number, { out: number; in: number }>();
  for (const f of out.fixtures) {
    byGw.set(f.gw, { out: (byGw.get(f.gw)?.out ?? 0) + f.points, in: byGw.get(f.gw)?.in ?? 0 });
  }
  for (const f of inn.fixtures) {
    const cur = byGw.get(f.gw) ?? { out: 0, in: 0 };
    byGw.set(f.gw, { out: cur.out, in: cur.in + f.points });
  }
  return [...byGw.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([gw, v]) => ({ gw, gain: Number((v.in - v.out).toFixed(2)) }));
}

/**
 * Rank single transfers by projected points gained.
 *
 * Only the best replacement for each squad player is kept, so the list reads
 * as distinct decisions rather than fifteen variations on the same swap.
 */
export function suggestTransfers(
  squad: Row[],
  pool: Row[],
  { bank, minGain = 0.5, limit = 12, exclude }: TransferOptions,
): Suggestion[] {
  if (squad.length === 0) return [];

  const squadIds = new Set(squad.map((p) => p.id));
  const clubCount = new Map<number, number>();
  for (const p of squad) clubCount.set(p.teamId, (clubCount.get(p.teamId) ?? 0) + 1);

  const candidatesByPosition = new Map<string, Row[]>();
  for (const p of pool) {
    if (squadIds.has(p.id) || !p.available) continue;
    const list = candidatesByPosition.get(p.position) ?? [];
    list.push(p);
    candidatesByPosition.set(p.position, list);
  }
  for (const list of candidatesByPosition.values()) {
    list.sort((a, b) => b.xpHorizon - a.xpHorizon);
  }

  const best: Suggestion[] = [];

  for (const out of squad) {
    if (exclude?.has(out.id)) continue;
    const budget = out.price + bank;
    const candidates = candidatesByPosition.get(out.position) ?? [];

    let top: Suggestion | null = null;

    for (const inn of candidates) {
      if (inn.price > budget) continue;

      // Selling `out` frees one slot at its club before `inn` is counted.
      const already = clubCount.get(inn.teamId) ?? 0;
      const effective = inn.teamId === out.teamId ? already - 1 : already;
      if (effective >= MAX_PER_CLUB) continue;

      const gain = inn.xpHorizon - out.xpHorizon;
      if (top && gain <= top.gain) continue;

      top = {
        out,
        in: inn,
        gain: Number(gain.toFixed(2)),
        gainNext: Number((inn.xp - out.xp).toFixed(2)),
        spend: Number((inn.price - out.price).toFixed(1)),
        bankAfter: Number((bank + out.price - inn.price).toFixed(1)),
        perGameweek: perGameweekGain(out, inn),
      };
    }

    if (top && top.gain >= minGain) best.push(top);
  }

  return best.sort((a, b) => b.gain - a.gain).slice(0, limit);
}

/**
 * Best pair of transfers, allowing the two moves to fund each other.
 *
 * Evaluated greedily: take the strongest single move, then re-run against the
 * squad and bank it leaves behind. That misses combinations where a weaker
 * first move unlocks a much better second, but it is fast and the result is
 * always legal.
 */
export function suggestPair(
  squad: Row[],
  pool: Row[],
  options: TransferOptions,
): Suggestion[] {
  const first = suggestTransfers(squad, pool, { ...options, limit: 1 })[0];
  if (!first) return [];

  const after = squad.filter((p) => p.id !== first.out.id).concat(first.in);
  const second = suggestTransfers(after, pool, {
    ...options,
    bank: first.bankAfter,
    exclude: new Set([first.in.id, ...(options.exclude ?? [])]),
    limit: 1,
  })[0];

  return second ? [first, second] : [first];
}
