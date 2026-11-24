# Learnings

One line per hard-won fact. Read at the start of a task; append at the end. Keep it under ~60 lines —
merge or prune stale entries.

## Next.js 16
- `AGENTS.md` warns APIs differ from training data — guides live in `node_modules/next/dist/docs/` (needs `npm ci` first).

## FPL API / data
- FPL API sends no CORS headers — all upstream calls must go through `app/api/*/route.ts`, never from the client.
- Route responses are cached ~10 min via `lib/cache.ts` (`cachedJson`/`cachedText`); stale data while testing is expected.

## Environment / tooling
- Fresh cloud sessions have no `node_modules`; run `npm ci --silent` before `tsc`/`build`.
- No test runner or lint script in `package.json`; verify with `tsc --noEmit`, `npx tsx -e`, or `next build`.

## Codebase quirks
- `Position`, `MatchEvent`, `MatchStatus`, `NewsItem`, `TickerFixture` types exist in both `lib/api.ts` (client) and their server `lib/*.ts` module — change both.
