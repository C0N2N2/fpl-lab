/**
 * Small in-memory TTL cache for upstream FPL responses.
 *
 * Next's built-in fetch data cache refuses payloads over 2MB, and
 * `bootstrap-static` is ~2.2MB — so it silently goes uncached and every
 * visitor would hit the FPL API directly. This keeps a copy in module scope
 * instead, which survives for the life of a warm server instance.
 *
 * In-flight requests are shared, so a burst of visitors on a cold instance
 * produces one upstream call rather than one per visitor.
 */

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

interface Entry<T> {
  value: T;
  expires: number;
}

const store = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export interface CacheStats {
  key: string;
  ageSeconds: number;
  fresh: boolean;
}

/** Fetch JSON with a TTL cache keyed on the URL. */
export async function cachedJson<T>(url: string, ttlSeconds: number): Promise<T> {
  const now = Date.now();
  const hit = store.get(url) as Entry<T> | undefined;
  if (hit && hit.expires > now) return hit.value;

  const pending = inflight.get(url) as Promise<T> | undefined;
  if (pending) return pending;

  const request = (async () => {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      // We manage freshness here; don't also populate Next's data cache.
      cache: "no-store",
    });
    if (!res.ok) {
      // Serve stale rather than failing outright if we have anything at all.
      if (hit) return hit.value;
      throw new Error(`${new URL(url).pathname} responded ${res.status}`);
    }
    const json = (await res.json()) as T;
    store.set(url, { value: json, expires: Date.now() + ttlSeconds * 1000 });
    return json;
  })().finally(() => {
    inflight.delete(url);
  });

  inflight.set(url, request);
  return request;
}

/** Fetch text (RSS) with the same TTL cache. */
export async function cachedText(url: string, ttlSeconds: number): Promise<string | null> {
  const now = Date.now();
  const hit = store.get(url) as Entry<string> | undefined;
  if (hit && hit.expires > now) return hit.value;

  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, cache: "no-store" });
    if (!res.ok) return hit?.value ?? null;
    const text = await res.text();
    store.set(url, { value: text, expires: Date.now() + ttlSeconds * 1000 });
    return text;
  } catch {
    return hit?.value ?? null;
  }
}

/** Age of each cached key, for diagnostics. */
export function cacheStats(): CacheStats[] {
  const now = Date.now();
  return [...store.entries()].map(([key, e]) => ({
    key: new URL(key).pathname,
    ageSeconds: Math.max(0, Math.round((now - (e.expires - 0)) / 1000)),
    fresh: e.expires > now,
  }));
}
