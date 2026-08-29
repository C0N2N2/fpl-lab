import { NextResponse } from "next/server";
import { FPL_BASE, normalise, nextGameweek, type FplBootstrap } from "@/lib/fpl";
import { cachedJson } from "@/lib/cache";

/** Live data changes minute to minute during matches. */
const TTL_LIVE = 45;
const TTL_STATIC = 600;
const TTL_PICKS = 120;

interface LiveElement {
  id: number;
  stats: {
    minutes: number;
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
    total_points: number;
    starts: number;
  };
}

interface PicksResponse {
  active_chip: string | null;
  picks: {
    element: number;
    position: number;
    multiplier: number;
    is_captain: boolean;
    is_vice_captain: boolean;
  }[];
  entry_history: { event: number; points: number; total_points: number; event_transfers_cost: number };
}

async function json<T>(path: string, ttl: number): Promise<T | null> {
  try {
    return await cachedJson<T>(`${FPL_BASE}${path}`, ttl);
  } catch {
    return null;
  }
}

/**
 * Bonus is only published once a match ends. While it is in progress FPL
 * exposes BPS, so we rank the players in each fixture ourselves to show
 * provisional bonus — the same thing LiveFPL does.
 */
function provisionalBonus(
  live: LiveElement[],
  teamOf: Map<number, number>,
  fixturePairs: Map<number, number>,
): Map<number, number> {
  const out = new Map<number, number>();

  // Group players by the match they are playing in.
  const groups = new Map<number, LiveElement[]>();
  for (const el of live) {
    if (el.stats.minutes === 0) continue;
    if (el.stats.bonus > 0) continue; // already final
    const team = teamOf.get(el.id);
    if (team === undefined) continue;
    const match = fixturePairs.get(team);
    if (match === undefined) continue;
    const list = groups.get(match) ?? [];
    list.push(el);
    groups.set(match, list);
  }

  for (const players of groups.values()) {
    const ranked = [...players].sort((a, b) => b.stats.bps - a.stats.bps);
    if (!ranked.length) continue;
    // Ties share the higher award, exactly as FPL does.
    const award = (index: number) => (index === 0 ? 3 : index === 1 ? 2 : index === 2 ? 1 : 0);
    let position = 0;
    for (let i = 0; i < ranked.length; i++) {
      if (i > 0 && ranked[i].stats.bps < ranked[i - 1].stats.bps) position = i;
      const pts = award(position);
      if (pts > 0) out.set(ranked[i].id, pts);
    }
  }
  return out;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const entryId = Number(id);
  if (!Number.isInteger(entryId) || entryId <= 0) {
    return NextResponse.json(
      { error: "That doesn't look like an FPL team ID", detail: "Expected a positive number." },
      { status: 400 },
    );
  }

  const boot = await json<FplBootstrap>("/bootstrap-static/", TTL_STATIC);
  if (!boot) return NextResponse.json({ error: "Could not load FPL data" }, { status: 502 });

  const current = boot.events.find((e) => e.is_current) ?? nextGameweek(boot);
  const gwParam = Number(new URL(request.url).searchParams.get("gw"));
  const gw = Number.isInteger(gwParam) && gwParam > 0 ? gwParam : current?.id ?? 1;

  const [live, picks, fixtures] = await Promise.all([
    json<{ elements: LiveElement[] }>(`/event/${gw}/live/`, TTL_LIVE),
    json<PicksResponse>(`/entry/${entryId}/event/${gw}/picks/`, TTL_PICKS),
    json<{ id: number; event: number | null; team_h: number; team_a: number; finished: boolean; started: boolean }[]>(
      "/fixtures/",
      TTL_STATIC,
    ),
  ]);

  if (!live) {
    return NextResponse.json(
      { error: "No live data for that gameweek", detail: `FPL returned nothing for gameweek ${gw}.` },
      { status: 404 },
    );
  }
  if (!picks) {
    return NextResponse.json(
      {
        error: "No squad for that gameweek",
        detail: "FPL publishes picks once a gameweek starts. Try again after the deadline.",
      },
      { status: 404 },
    );
  }

  const players = normalise(boot);
  const byId = new Map(players.map((p) => [p.id, p]));
  const teamOf = new Map(players.map((p) => [p.id, p.teamId]));

  // team id -> fixture id, for grouping BPS by match
  const pairs = new Map<number, number>();
  for (const f of fixtures ?? []) {
    if (f.event !== gw) continue;
    pairs.set(f.team_h, f.id);
    pairs.set(f.team_a, f.id);
  }
  const started = new Set(
    (fixtures ?? []).filter((f) => f.event === gw && f.started).flatMap((f) => [f.team_h, f.team_a]),
  );
  const finishedTeams = new Set(
    (fixtures ?? []).filter((f) => f.event === gw && f.finished).flatMap((f) => [f.team_h, f.team_a]),
  );

  const liveById = new Map(live.elements.map((e) => [e.id, e]));
  const bonusGuess = provisionalBonus(live.elements, teamOf, pairs);

  const squad = picks.picks.flatMap((pick) => {
    const p = byId.get(pick.element);
    const l = liveById.get(pick.element);
    if (!p || !l) return [];

    const provisional = bonusGuess.get(pick.element) ?? 0;
    const raw = l.stats.total_points + provisional;

    return [{
      id: p.id,
      name: p.name,
      teamShort: p.teamShort,
      position: p.position,
      price: p.price,
      slot: pick.position,
      benched: pick.position > 11,
      isCaptain: pick.is_captain,
      isVice: pick.is_vice_captain,
      multiplier: pick.multiplier,
      minutes: l.stats.minutes,
      points: l.stats.total_points,
      provisionalBonus: provisional,
      bonus: l.stats.bonus,
      bps: l.stats.bps,
      goals: l.stats.goals_scored,
      assists: l.stats.assists,
      cleanSheet: l.stats.clean_sheets > 0,
      defcon: l.stats.defensive_contribution,
      /** What this player contributes to the score, armband included. */
      counted: pick.multiplier * raw,
      started: started.has(p.teamId),
      finished: finishedTeams.has(p.teamId),
    }];
  });

  const starters = squad.filter((p) => !p.benched);
  const livePoints = starters.reduce((s, p) => s + p.counted, 0);
  const hit = picks.entry_history?.event_transfers_cost ?? 0;

  const playing = starters.filter((p) => p.started && !p.finished).length;
  const toPlay = starters.filter((p) => !p.started).length;

  return NextResponse.json({
    meta: {
      gameweek: gw,
      isCurrent: current?.id === gw,
      generatedAt: new Date().toISOString(),
    },
    total: {
      live: livePoints - hit,
      raw: livePoints,
      hit,
      official: picks.entry_history?.points ?? null,
      benchPoints: squad.filter((p) => p.benched).reduce((s, p) => s + p.points, 0),
      playersPlaying: playing,
      playersToPlay: toPlay,
      playersDone: starters.length - playing - toPlay,
    },
    activeChip: picks.active_chip,
    squad,
  });
}
