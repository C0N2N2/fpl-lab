import { NextResponse } from "next/server";
import { FPL_BASE, type FplBootstrap } from "@/lib/fpl";
import { parseFeed, tagTeams, teamNews } from "@/lib/news";
import { cachedJson, cachedText } from "@/lib/cache";

const TTL = 900; // 15 minutes

const FEEDS = [
  { url: "https://feeds.bbci.co.uk/sport/football/rss.xml", source: "BBC Sport" },
  { url: "https://www.skysports.com/rss/12040", source: "Sky Sports" },
];

export async function GET() {
  let boot: FplBootstrap;
  try {
    boot = await cachedJson<FplBootstrap>(`${FPL_BASE}/bootstrap-static/`, TTL);
  } catch (err) {
    return NextResponse.json(
      {
        error: "Could not load FPL data",
        detail: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 502 },
    );
  }

  const feeds = await Promise.all(FEEDS.map((f) => cachedText(f.url, TTL)));
  const items = feeds
    .flatMap((xml, i) => (xml ? parseFeed(xml, FEEDS[i].source) : []))
    .filter((it) => it.title.length > 8);

  // De-duplicate near-identical headlines across sources.
  const seen = new Set<string>();
  const unique = items.filter((it) => {
    const key = it.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const tagged = tagTeams(unique, boot);
  const sorted = [...tagged].sort((a, b) => {
    const ta = a.published ? Date.parse(a.published) : 0;
    const tb = b.published ? Date.parse(b.published) : 0;
    return tb - ta;
  });

  const failed = feeds.filter((f) => f === null).length;

  return NextResponse.json({
    meta: {
      generatedAt: new Date().toISOString(),
      feedsRequested: FEEDS.length,
      feedsFailed: failed,
      headlineCount: sorted.length,
    },
    teams: boot.teams.map((t) => ({ id: t.id, name: t.name, short: t.short_name })),
    headlines: sorted.slice(0, 40),
    transfers: sorted.filter((i) => i.transfer).slice(0, 25),
    availability: teamNews(boot),
  });
}
