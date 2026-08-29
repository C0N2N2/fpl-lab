/**
 * Expected-points model.
 *
 * Builds a per-gameweek points projection from a player's per-90 underlying
 * rates, shrunk toward a positional baseline, then scaled by fixture
 * difficulty and expected minutes.
 *
 * Every scoring constant lives in SCORING so the model stays easy to retune
 * when FPL changes its rules.
 */

import type { Fixture, Player, Position } from "./fpl";

/* ------------------------------------------------------------------ */
/* FPL scoring rules                                                    */
/* ------------------------------------------------------------------ */

export const SCORING = {
  appearance60: 2,
  appearanceSub: 1,
  goal: { GKP: 10, DEF: 6, MID: 5, FWD: 4 } as Record<Position, number>,
  assist: 3,
  cleanSheet: { GKP: 4, DEF: 4, MID: 1, FWD: 0 } as Record<Position, number>,
  savesPerPoint: 3,
  concededPerMinus: 2, // -1 point per 2 conceded (GKP, DEF)
  defcon: {
    points: 2,
    threshold: { GKP: 99, DEF: 10, MID: 12, FWD: 12 } as Record<Position, number>,
  },
};

/** Fallback per-90 rates when a player has too few minutes to trust. */
const BASELINE: Record<Position, { xG90: number; xA90: number; xGC90: number; defcon90: number }> = {
  GKP: { xG90: 0.0, xA90: 0.01, xGC90: 1.45, defcon90: 0 },
  DEF: { xG90: 0.05, xA90: 0.06, xGC90: 1.45, defcon90: 6.2 },
  MID: { xG90: 0.14, xA90: 0.13, xGC90: 1.45, defcon90: 5.4 },
  FWD: { xG90: 0.33, xA90: 0.12, xGC90: 1.45, defcon90: 2.4 },
};

/**
 * Minutes of evidence before a player's own rates are trusted over the
 * baseline. At 450 minutes (~5 full games) the split is 50/50.
 */
const SHRINK_MINUTES = 450;

/** Fixture difficulty (1 easiest … 5 hardest) → attacking output multiplier. */
const ATTACK_BY_FDR: Record<number, number> = { 1: 1.3, 2: 1.15, 3: 1.0, 4: 0.85, 5: 0.72 };

/** Fixture difficulty → multiplier on goals the player's team concedes. */
const CONCEDE_BY_FDR: Record<number, number> = { 1: 0.7, 2: 0.82, 3: 1.0, 4: 1.22, 5: 1.45 };

const HOME_ATTACK = 1.06;
const AWAY_ATTACK = 0.94;
const HOME_CONCEDE = 0.92;
const AWAY_CONCEDE = 1.08;

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Poisson P(X = k). */
function poissonPmf(lambda: number, k: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let logP = -lambda + k * Math.log(lambda);
  for (let i = 2; i <= k; i++) logP -= Math.log(i);
  return Math.exp(logP);
}

/** Poisson P(X >= k), summed up to a safe ceiling. */
function poissonAtLeast(lambda: number, k: number): number {
  if (k <= 0) return 1;
  if (lambda <= 0) return 0;
  let below = 0;
  for (let i = 0; i < k; i++) below += poissonPmf(lambda, i);
  return clamp(1 - below, 0, 1);
}

/** Blend a player's own rate toward the positional baseline by sample size. */
function shrink(own: number, base: number, minutes: number): number {
  const w = minutes / (minutes + SHRINK_MINUTES);
  return own * w + base * (1 - w);
}

export interface MinutesEstimate {
  /** Probability the player features at all. */
  pPlay: number;
  /** Probability they reach 60 minutes, given they feature. */
  pSixty: number;
  /** Expected minutes on the pitch. */
  expected: number;
}

/**
 * Estimate playing time from minutes per team game so far, then apply the
 * injury/availability flags FPL publishes.
 */
export function estimateMinutes(p: Player, teamGamesPlayed: number): MinutesEstimate {
  const games = Math.max(1, teamGamesPlayed);
  const perGame = clamp(p.minutes / games, 0, 90);

  // No history yet (new signing, or gameweek 1) — fall back to a neutral prior.
  const raw = p.minutes === 0 && teamGamesPlayed <= 1 ? 45 : perGame;

  let pPlay = clamp(raw / 75, 0, 0.97);
  let pSixty = clamp((raw - 20) / 60, 0, 0.95);

  if (!p.available) {
    pPlay *= 0.15;
    pSixty *= 0.15;
  } else if (p.chanceNext !== null && p.chanceNext < 100) {
    const f = p.chanceNext / 100;
    pPlay *= f;
    pSixty *= f;
  }

  return { pPlay, pSixty, expected: raw * (p.available ? 1 : 0.15) };
}

export interface Projection {
  total: number;
  appearance: number;
  goals: number;
  assists: number;
  cleanSheet: number;
  saves: number;
  conceded: number;
  defcon: number;
  bonus: number;
  /** Expected goals the player's team concedes in this fixture. */
  lambdaConceded: number;
  minutes: MinutesEstimate;
}

/**
 * Project points for a single fixture.
 * Returns a zeroed projection when the player has no fixture that gameweek.
 */
export function projectFixture(
  p: Player,
  fixture: Fixture | undefined,
  teamGamesPlayed: number,
): Projection {
  const mins = estimateMinutes(p, teamGamesPlayed);
  const empty: Projection = {
    total: 0, appearance: 0, goals: 0, assists: 0, cleanSheet: 0,
    saves: 0, conceded: 0, defcon: 0, bonus: 0, lambdaConceded: 0, minutes: mins,
  };
  if (!fixture) return empty;

  const base = BASELINE[p.position];
  const share = mins.expected / 90; // fraction of a full match

  const atkMult =
    (ATTACK_BY_FDR[fixture.difficulty] ?? 1) * (fixture.home ? HOME_ATTACK : AWAY_ATTACK);
  const concedeMult =
    (CONCEDE_BY_FDR[fixture.difficulty] ?? 1) * (fixture.home ? HOME_CONCEDE : AWAY_CONCEDE);

  // --- attacking ---
  const xG90 = shrink(p.xG90, base.xG90, p.minutes) * atkMult;
  const xA90 = shrink(p.xA90, base.xA90, p.minutes) * atkMult;
  const goals = xG90 * share * SCORING.goal[p.position];
  const assists = xA90 * share * SCORING.assist;

  // --- clean sheet / conceding ---
  const xGC90 = shrink(p.xGC90, base.xGC90, p.minutes) * concedeMult;
  const lambdaConceded = xGC90;
  const pCleanSheet = Math.exp(-lambdaConceded) * mins.pSixty;
  const cleanSheet = pCleanSheet * SCORING.cleanSheet[p.position];

  let conceded = 0;
  if (p.position === "GKP" || p.position === "DEF") {
    // -1 for every 2 conceded while on the pitch
    conceded = -(lambdaConceded * share) / SCORING.concededPerMinus;
  }

  // --- saves (goalkeepers only) ---
  const saves =
    p.position === "GKP"
      ? (shrink(p.saves90, 2.9, p.minutes) * share) / SCORING.savesPerPoint
      : 0;

  // --- defensive contribution ---
  const threshold = SCORING.defcon.threshold[p.position];
  let defcon = 0;
  if (threshold < 99) {
    const rate = shrink(p.defcon90, base.defcon90, p.minutes) * share;
    defcon = poissonAtLeast(rate, threshold) * SCORING.defcon.points;
  }

  // --- appearance ---
  const appearance =
    mins.pSixty * SCORING.appearance60 +
    Math.max(0, mins.pPlay - mins.pSixty) * SCORING.appearanceSub;

  // --- bonus ---
  // Rough: players who generate returns tend to collect bonus. Scale the
  // attacking + clean-sheet expectation rather than modelling BPS directly.
  const bonus = clamp((goals + assists + cleanSheet) * 0.22, 0, 1.6) * mins.pPlay;

  const total =
    appearance + goals + assists + cleanSheet + saves + conceded + defcon + bonus;

  return {
    total: Math.max(0, total),
    appearance, goals, assists, cleanSheet, saves, conceded, defcon, bonus,
    lambdaConceded, minutes: mins,
  };
}

export interface PlayerProjection {
  next: Projection;
  /** Sum of `total` across the requested horizon. */
  horizon: number;
  perGameweek: { gw: number; opponent: string; home: boolean; difficulty: number; points: number }[];
}

/** Project the next `n` fixtures for a player. */
export function projectPlayer(
  p: Player,
  fixtures: Fixture[],
  teamGamesPlayed: number,
  n = 5,
): PlayerProjection {
  const slice = fixtures.slice(0, n);
  const perGameweek = slice.map((f) => {
    const proj = projectFixture(p, f, teamGamesPlayed);
    return {
      gw: f.gw,
      opponent: f.opponent,
      home: f.home,
      difficulty: f.difficulty,
      points: proj.total,
    };
  });
  return {
    next: projectFixture(p, slice[0], teamGamesPlayed),
    horizon: perGameweek.reduce((s, g) => s + g.points, 0),
    perGameweek,
  };
}
