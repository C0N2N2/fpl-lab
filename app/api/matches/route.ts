import { NextResponse } from "next/server";
import { FPL_BASE, normalise, nextGameweek, type FplBootstrap } from "@/lib/fpl";
import { buildMatches, type RawFixture } from "@/lib/matches";
import { cachedJson } from "@/lib/cache";

/** Short enough to feel live, long enough not to hammer FPL. */
const TTL_LIVE = 30;
const TTL_STATIC = 600;

export async function GET(request: Request) {
  try {
    const boot = await cachedJson<FplBootstrap>(`${FPL_BASE}/bootstrap-static/`, TTL_STATIC);

    const current = boot.events.find((e) => e.is_current) ?? nextGameweek(boot);
    const asked = Number(new URL(request.url).searchParams.get("gw"));
    const gw = Number.isInteger(asked) && asked > 0 ? asked : current?.id ?? 1;

    const fixtures = await cachedJson<RawFixture[]>(`${FPL_BASE}/fixtures/`, TTL_LIVE);
    const players = normalise(boot);
    const matches = buildMatches(boot, fixtures, gw, players);

    const live = matches.filter((m) => m.status === "live" || m.status === "half").length;
    const upcoming = matches.filter((m) => m.status === "upcoming").length;

    return NextResponse.json({
      meta: {
        gameweek: gw,
        isCurrent: current?.id === gw,
        live,
        upcoming,
        finished: matches.length - live - upcoming,
        generatedAt: new Date().toISOString(),
      },
      matches,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Could not load matches",
        detail: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 502 },
    );
  }
}
