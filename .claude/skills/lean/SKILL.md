---
name: lean
description: Token-efficient way of working in fpl-lab without lowering quality. Use at the start of any coding, debugging, review or question task in this repo — it replaces broad exploration with a prebuilt repo map and a log of past learnings, and sets rules for targeted reads, batched tool calls and short replies. Also use when the user says "save tokens", "be efficient" or "/lean".
---

# Lean work

Goal: spend tokens on thinking and verifying, not on re-discovering the repo or repeating text.
Quality bar is unchanged: every change is still read-before-edit, type-checked and verified.

## 1. Orient from memory, not exploration

1. Read `repo-map.md` (this folder) — every source file with its line count and exports. Use it to
   pick the 1–3 files that matter instead of `ls`/`find`/Explore sweeps.
2. Read `LEARNINGS.md` (this folder) — gotchas already paid for. Don't rediscover them.
3. Architecture in one line: FPL API → `app/api/*/route.ts` (server proxy, cached via `lib/cache.ts`)
   → pure logic in `lib/*.ts` (`predict`, `planner`, `squad`, `strength`, `ticker`, `transfers`, …)
   → client fetchers in `lib/api.ts` → pages in `app/*/page.tsx` using `components/ui.tsx`.
4. Only search when the map can't answer. Then use `Grep` with a precise pattern and
   `output_mode: "files_with_matches"` first, content second.

## 2. Read narrowly

- Files over ~150 lines: `Grep -n` for the symbol, then `Read` with `offset`/`limit` around it.
- Never re-read a file you already have in context, or one you just edited (Edit fails loudly).
- Don't read `package-lock.json`, `public/*`, `.next/`, `node_modules/` except the Next docs below.
- Next.js 16 differs from training data (see `AGENTS.md`). Before using an unfamiliar Next API,
  read only the one relevant guide: `ls node_modules/next/dist/docs/`, then grep inside it. Don't
  load the whole docs tree. Record what you learned in `LEARNINGS.md` so next time is free.

## 3. Act in few, batched calls

- Independent calls (several reads, greps, `git status` + `git diff`) go in one message.
- Prefer one `Edit` with enough context to be unique over several small ones; use `replace_all`
  for renames.
- Chain shell steps with `&&` and trim output: `| tail -20`, `--quiet`, `git diff --stat` before
  full diffs.
- Don't spawn subagents for things a single Grep/Read answers — each starts cold and re-reads.

## 4. Verify cheaply but always

Cheapest check that actually proves the change, in this order:
1. `npx tsc --noEmit -p . 2>&1 | head -30` — types (if `node_modules` is missing: `npm ci --silent` once).
2. For pure `lib/` logic: a throwaway `npx tsx -e '…'` call on the function with a real-ish input.
3. `npm run build 2>&1 | tail -30` only when routing/config/server code changed.
4. Run the app (`/run` skill) only for UI behaviour the above can't show.
Report failures with the trimmed output; never claim "verified" without running something.

## 5. Write short

- Replies: lead with the result, then only what the user needs to act on. No restating the
  request, no listing files you didn't change, no recap of the diff they can see.
- Code: no explanatory comments for obvious lines; match existing style in the file.
- Don't paste large file contents or command output back to the user — cite `path:line`.

## 6. Learn (keep this skill getting cheaper)

At the end of a task, if you hit something non-obvious that cost real effort, append ONE line to
`LEARNINGS.md` under the right heading: `- <fact> — <where/why>` (≤ 25 words). Examples worth
logging: a Next 16 API difference, an FPL API field quirk, a command that fails here, a file that
owns a surprising responsibility. Don't log things the map or code already makes obvious. If an
entry turns out wrong, fix or delete it.

If you added, removed or renamed source files or exports, run:
```bash
bash .claude/skills/lean/scripts/map.sh
```

## What NOT to cut

Never save tokens by: skipping the read before an edit, guessing an API instead of checking the
docs, skipping verification, or dropping edge cases the user asked about. Lean means less waste,
not less rigour.
