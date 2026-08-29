/**
 * Team strength, re-rated on results as the season progresses.
 *
 * FPL publishes a fixture difficulty rating (1–5) and a set of strength
 * numbers, but both are fixed in preseason and never move. A side that ships
 * four goals in its opening match still carries whatever rating it was given
 * in July.
 *
 * This module derives attack and defence ratings from actual results, then
 * blends them with FPL's preseason numbers by how much football has been
 * played — so early gameweeks lean on the prior and later ones on reality.
 */

import type { FplBootstrap, FplFixture, FplTeam } from "./fpl";

/** Goals per team per match across a typical Premier League season. */
export const LEAGUE_AVG_GOALS = 1.45;

/** Matches of evidence before observed form outweighs the preseason prior. */
const SHRINK_MATCHES = 4;

/** Multiplier applied to the expected goals of the home / away side. */
const HOME_BOOST = 1.12;
const AWAY_BOOST = 0.89;

export interface TeamStrength {
  id: number;
  name: string;
  short: string;
  played: number;
  goalsFor: number;
  goalsAgainst: number;
  /** 1.0 = league-average attack. Higher scores more. */
  attack: number;
  /** 1.0 = league-average leakiness. Higher concedes more. */
  leak: number;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** Blend observed rate toward a prior by sample size. */
function blend(observed: number, prior: number, played: number): number {
  const w = played / (played + SHRINK_MATCHES);
  return observed * w + prior * (1 - w);
}

/** How far a one-step change in FPL's overall strength moves attack / leak. */
const STRENGTH_STEP = 0.18;

/**
 * Preseason priors from FPL's published team strength.
 *
 * FPL exposes `strength_attack_*` and `strength_defence_*`, but as of the
 * 2026/27 data they are all zero — only `strength_overall_home` /
 * `strength_overall_away` are populated, on a 1–5 scale where higher is
 * stronger. We centre those on the league mean and spread attack and leakiness
 * in opposite directions. If none of the fields carry signal, every team gets a
 * neutral 1.0 and the model leans entirely on results.
 */
function priorsFrom(teams: FplTeam[]) {
  const overall = teams.map(
    (t) => ((t.strength_overall_home ?? 0) + (t.strength_overall_away ?? 0)) / 2,
  );
  const usable = overall.some((v) => v > 0);
  const avg = mean(overall.filter((v) => v > 0)) || 1;

  const priors = new Map<number, { attack: number; leak: number }>();
  teams.forEach((t, i) => {
    if (!usable || overall[i] <= 0) {
      priors.set(t.id, { attack: 1, leak: 1 });
      return;
    }
    const delta = overall[i] - avg;
    priors.set(t.id, {
      attack: Math.max(0.4, 1 + STRENGTH_STEP * delta),
      leak: Math.max(0.4, 1 - STRENGTH_STEP * delta),
    });
  });
  return priors;
}

export function computeStrengths(
  boot: FplBootstrap,
  fixtures: FplFixture[],
): Map<number, TeamStrength> {
  const priors = priorsFrom(boot.teams);
  const tally = new Map<number, { played: number; gf: number; ga: number }>();

  for (const t of boot.teams) tally.set(t.id, { played: 0, gf: 0, ga: 0 });

  for (const f of fixtures) {
    if (!f.finished || f.team_h_score === null || f.team_a_score === null) continue;
    const h = tally.get(f.team_h);
    const a = tally.get(f.team_a);
    if (h) { h.played++; h.gf += f.team_h_score; h.ga += f.team_a_score; }
    if (a) { a.played++; a.gf += f.team_a_score; a.ga += f.team_h_score; }
  }

  const out = new Map<number, TeamStrength>();
  for (const t of boot.teams) {
    const s = tally.get(t.id) ?? { played: 0, gf: 0, ga: 0 };
    const prior = priors.get(t.id) ?? { attack: 1, leak: 1 };

    const obsAttack = s.played ? s.gf / s.played / LEAGUE_AVG_GOALS : prior.attack;
    const obsLeak = s.played ? s.ga / s.played / LEAGUE_AVG_GOALS : prior.leak;

    out.set(t.id, {
      id: t.id,
      name: t.name,
      short: t.short_name,
      played: s.played,
      goalsFor: s.gf,
      goalsAgainst: s.ga,
      // clamp so one freak result can't produce an absurd rating
      attack: Math.min(2.2, Math.max(0.35, blend(obsAttack, prior.attack, s.played))),
      leak: Math.min(2.2, Math.max(0.35, blend(obsLeak, prior.leak, s.played))),
    });
  }
  return out;
}

/** Expected goals for `team` against `opponent`. */
export function expectedGoalsFor(
  team: TeamStrength | undefined,
  opponent: TeamStrength | undefined,
  home: boolean,
): number {
  const atk = team?.attack ?? 1;
  const leak = opponent?.leak ?? 1;
  return LEAGUE_AVG_GOALS * atk * leak * (home ? HOME_BOOST : AWAY_BOOST);
}

/**
 * A 1–5 difficulty rating derived from how many goals the opponent is expected
 * to score against this team — the same scale as FPL's, but responsive to
 * results. Used for display alongside FPL's static number.
 */
export function derivedDifficulty(expectedConceded: number): number {
  if (expectedConceded < 0.95) return 1;
  if (expectedConceded < 1.25) return 2;
  if (expectedConceded < 1.6) return 3;
  if (expectedConceded < 2.05) return 4;
  return 5;
}
