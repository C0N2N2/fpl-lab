import { NextResponse } from "next/server";
import {
  FPL_BASE, normalise, upcomingByTeam, nextGameweek,
  type FplBootstrap, type FplFixture,
} from "@/lib/fpl";
import { projectPlayer } from "@/lib/predict";
import { computeStrengths } from "@/lib/strength";
import { bestEleven } from "@/lib/squad";
import { cachedJson } from "@/lib/cache";
import type { Row } from "@/lib/api";

const TTL_LEAGUE = 180;
const TTL_STATIC = 600;

/** Projecting every rival costs one upstream call each, so cap it. */
const MAX_PROJECTED = 20;

interface Standing {
  entry: number;
  entry_name: string;
  player_name: string;
  rank: number;
  last_rank: number;
  total: number;
  event_total: number;
}

interface LeagueResponse {
  league: { id: number; name: string };
  standings: { has_next: boolean; results: Standing[] };
}

interface PicksResponse {
  active_chip: string | null;
  picks: { element: number; position: number; is_captain: boolean; is_vice_captain: boolean }[];
}

async function json<T>(path: string, ttl: number): Promise<T | null> {
  try {
    return await cachedJson<T>(`${FPL_BASE}${path}`, ttl);
  } catch {
    return null;
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const leagueId = Number(id);
  const horizon = Math.min(
    38,
    Math.max(1, Number(new URL(request.url).searchParams.get("horizon") ?? 5)),
  );

  if (!Number.isInteger(leagueId) || leagueId <= 0) {
    return NextResponse.json(
      { error: "That doesn't look like a league ID", detail: "Expected a positive number." },
      { status: 400 },
    );
  }

  const league = await json<LeagueResponse>(
    `/leagues-classic/${leagueId}/standings/`,
    TTL_LEAGUE,
  );
  if (!league) {
    return NextResponse.json(
      {
        error: "League not found",
        detail:
          "FPL returned nothing for that ID. Open your league on the FPL site — the number in /leagues/<id>/standings/ is the one to use. Private leagues you are not in will not load.",
      },
      { status: 404 },
    );
  }

  const [boot, fixtures] = await Promise.all([
    json<FplBootstrap>("/bootstrap-static/", TTL_STATIC),
    json<FplFixture[]>("/fixtures/", TTL_STATIC),
  ]);
  if (!boot || !fixtures) {
    return NextResponse.json({ error: "Could not load FPL data" }, { status: 502 });
  }

  const gw = nextGameweek(boot);
  const currentGw = (gw?.id ?? 1) - 1;

  const players = normalise(boot);
  const byId = new Map(players.map((p) => [p.id, p]));
  const strengths = computeStrengths(boot, fixtures);
  const upcoming = upcomingByTeam(fixtures, boot, horizon);

  const played = new Map<number, number>();
  for (const f of fixtures) {
    if (!f.finished) continue;
    played.set(f.team_h, (played.get(f.team_h) ?? 0) + 1);
    played.set(f.team_a, (played.get(f.team_a) ?? 0) + 1);
  }

  const results = league.standings.results.slice(0, MAX_PROJECTED);

  const entries = await Promise.all(
    results.map(async (s) => {
      const picks =
        currentGw >= 1
          ? await json<PicksResponse>(`/entry/${s.entry}/event/${currentGw}/picks/`, TTL_LEAGUE)
          : null;

      const squad: Row[] = (picks?.picks ?? []).flatMap((pick) => {
        const p = byId.get(pick.element);
        if (!p) return [];
        const proj = projectPlayer(
          p, upcoming.get(p.teamId) ?? [], played.get(p.teamId) ?? 0, horizon, strengths,
        );
        return [{
          ...p,
          xp: Number(proj.next.total.toFixed(2)),
          xpHorizon: Number(proj.horizon.toFixed(2)),
          value: p.price > 0 ? Number((proj.horizon / p.price).toFixed(2)) : 0,
          differential: Number((proj.horizon / Math.max(1, Math.sqrt(p.ownership))).toFixed(2)),
          expectedMinutes: Math.round(proj.next.minutes.expected),
          breakdown: {},
          fixtures: [],
        } as Row];
      });

      // What their current XI projects, versus the best XI their 15 could field.
      const chosenIds = new Set(
        (picks?.picks ?? []).filter((p) => p.position <= 11).map((p) => p.element),
      );
      const captainId = (picks?.picks ?? []).find((p) => p.is_captain)?.element;
      const starters = squad.filter((p) => chosenIds.has(p.id));
      const captain = squad.find((p) => p.id === captainId);
      const currentXp = starters.reduce((x, p) => x + p.xp, 0) + (captain?.xp ?? 0);
      const optimal = bestEleven(squad, "xp");

      return {
        entry: s.entry,
        teamName: s.entry_name,
        managerName: s.player_name,
        rank: s.rank,
        lastRank: s.last_rank,
        total: s.total,
        lastGw: s.event_total,
        activeChip: picks?.active_chip ?? null,
        hasPicks: squad.length > 0,
        projectedXp: Number(currentXp.toFixed(1)),
        optimalXp: Number(optimal.total.toFixed(1)),
        /** Points being left on the bench or lost to the wrong armband. */
        leaking: Number(Math.max(0, optimal.total - currentXp).toFixed(1)),
        captain: captain?.name ?? null,
        squadXpHorizon: Number(squad.reduce((x, p) => x + p.xpHorizon, 0).toFixed(1)),
        topPlayers: [...squad]
          .sort((a, b) => b.xp - a.xp)
          .slice(0, 3)
          .map((p) => ({ name: p.name, team: p.teamShort, xp: p.xp })),
      };
    }),
  );

  return NextResponse.json({
    league: { id: league.league.id, name: league.league.name },
    meta: {
      horizon,
      currentGameweek: currentGw,
      nextGameweek: gw?.id ?? null,
      deadline: gw?.deadline_time ?? null,
      shown: entries.length,
      truncated: league.standings.results.length > MAX_PROJECTED || league.standings.has_next,
    },
    entries,
  });
}
