# Spec: Dynamic marketing stats — wire command count and version fallback

**Created by:** AnaPlan
**Date:** 2026-05-16
**Scope:** .ana/plans/active/dynamic-marketing-stats/scope.md

## Approach

Create `website/lib/marketing-stats.ts` as a safe accessor layer over existing `lib/docs-data/` functions. It wraps `getCommandCount()` and `getBuildMeta()` in try/catch with hardcoded fallbacks matching the current values. Components import from marketing-stats, never directly from docs-data for marketing display values.

Data flow:
- `marketing-stats.ts` → `SystemSection.tsx` (server component reads dynamic values)
- SystemSection constructs a modified specStrip array replacing the "cli" item value
- SystemSection passes `commandCount` as a new prop to Drawer
- Drawer uses `commandCount` for the CLI drawer's `meta` display and computes `moreCount = commandCount - 6`
- Separately, `proof-feed.ts` replaces `VERSION_FALLBACK` with a call to marketing-stats

Follow the structural pattern of `website/lib/proof-feed.ts` — a data-layer module with fallbacks consumed by multiple components. The functional analog is `website/lib/docs-data/commands.ts` — a cached readFileSync accessor.

## Output Mockups

SpecStrip renders (with 32 commands from extraction):
```
format: markdown  lock-in: zero  ships: 5 agents  skills: 8 matched  context: 4 files  cli: 32 commands  install: ~3s
```

CLI drawer meta (Drawer component):
```
32 commands
```

ManPage "more" line (with moreCount = 32 - 6 = 26):
```
+ 26 more · init, setup, verify, proof, config, agents
```

VERSION_FALLBACK when GitHub tags API fails:
```
v1.0.2
```
(read from build-meta.json which has `"version": "1.0.2"`, prepended with `v`)

Fallback behavior (missing extraction data — same as today):
```
cli: 26 commands    ← specStrip
26 commands         ← drawer meta
+ 20 more           ← manPage
v1.1.0              ← VERSION_FALLBACK
```

## File Changes

### `website/lib/marketing-stats.ts` (create)
**What changes:** New module — safe accessor for marketing-relevant values from extraction data.
**Pattern to follow:** `website/lib/proof-feed.ts` for the fallback pattern (try/catch, return hardcoded default). `website/lib/docs-data/commands.ts` for the accessor call.
**Why:** Centralizes fallback logic so components never deal with missing data. Without this, every consumer would need its own try/catch.

Exports:
- `getMarketingCommandCount(): number` — calls `getCommandCount()` from docs-data, returns fallback `26` on failure.
- `getMarketingVersion(): string` — calls `getBuildMeta().version`, prepends `v`, returns fallback `"v1.1.0"` on failure.

### `website/components/system/SystemSection.tsx` (modify)
**What changes:** Import `getMarketingCommandCount` from marketing-stats. Construct a new specStrip array where the "cli" item uses the dynamic value. Pass `commandCount` as a new prop to Drawer.
**Pattern to follow:** Line 7 already imports `cliPkg` from outside copy.ts — same pattern for importing marketing-stats.
**Why:** Server component is the correct place to read dynamic data and pass it down to the client component.

### `website/components/system/Drawer.tsx` (modify)
**What changes:** Accept a new `commandCount` prop. Use it to override `drawer.meta` for the CLI drawer (id: "cli" — drawer index 3, num "04"). Compute `moreCount = commandCount - 6` and pass to ManPage instead of `drawer.manPage.moreCount`.
**Pattern to follow:** Already receives and uses `version` prop in the same way.
**Why:** Drawer is `"use client"` — can't call server-side readFileSync functions. Dynamic values must arrive as props.

### `website/lib/proof-feed.ts` (modify)
**What changes:** Replace the hardcoded `VERSION_FALLBACK = "v1.1.0"` with a call to `getMarketingVersion()` from marketing-stats.
**Pattern to follow:** The existing fallback structure stays — `getLatestVersion()` returns `VERSION_FALLBACK` on API failure. The change is only where `VERSION_FALLBACK` gets its value.
**Why:** Keeps the version fallback honest — tracks the actual latest published version from build-meta.json instead of a manually-updated string that has already drifted.

## Acceptance Criteria

- [x] AC1: The System section specStrip displays the command count from commands.json (currently 32), not the hardcoded "26 commands."
- [x] AC2: The CLI drawer meta displays the same dynamic command count.
- [x] AC3: The manPage moreCount is computed as `totalCommands - 6`, matching the 6 explicitly shown commands.
- [x] AC4: VERSION_FALLBACK in proof-feed.ts reads from build-meta.json instead of a hardcoded string.
- [x] AC5: If `data/docs/commands.json` or `data/docs/build-meta.json` is missing or malformed, all values fall back to sensible hardcoded defaults (the current values serve as defaults).
- [x] AC6: copy.ts is not modified — its `as const` export and editorial content stay untouched.
- [x] AC7: The website builds and renders correctly with `pnpm build` in the website directory.
- [x] AC8: No TypeScript errors introduced.

## Testing Strategy

- **Unit tests:** Create `website/lib/__tests__/marketing-stats.test.ts`. Test both success path (mock readFileSync returning valid JSON) and failure path (mock readFileSync throwing, verify fallback values returned). Follow pattern from existing docs-data tests if any exist; otherwise use Vitest with `vi.mock('node:fs')`.
- **Edge cases:**
  - commands.json exists but has malformed JSON → returns fallback 26
  - commands.json exists but `totalCommands` field missing → returns fallback 26
  - build-meta.json exists but version field missing → returns fallback "v1.1.0"
  - Happy path → returns actual values with `v` prefix on version
- **Integration:** `pnpm build` in website directory succeeds without errors. This is the primary verification that everything wires correctly.

## Dependencies

- `data/docs/commands.json` must exist (written by `extract-docs-data.ts` at build time). marketing-stats handles absence gracefully.
- `data/docs/build-meta.json` must exist (same). Same graceful handling.
- `website/lib/docs-data/commands.ts` and `website/lib/docs-data/meta.ts` — existing accessor functions. Already exported from `lib/docs-data/index.ts`.

## Constraints

- copy.ts must not be modified (AC6). The `as const` export and literal types are a design contract.
- Drawer is `"use client"` — cannot import modules that use `readFileSync`. All server-side reads happen in SystemSection.
- ManPage already receives `version` from `cliPkg.version` via Drawer — that's the CLI package version, NOT the marketing stat. Don't conflate these.

## Gotchas

- **The "cli" drawer is identified by `drawer.id`**, not by array index. Use `drawer.id === "cli"` or check for the presence of `manPage` to identify which drawer gets the dynamic meta. Looking at copy.ts: drawer 04 (The CLI) has id that needs checking — verify the actual `id` field value in copy.ts drawers array before using it for matching.
- **moreCount must be computed in Drawer, not SystemSection.** Drawer knows about manPage structure; SystemSection shouldn't. Pass `commandCount` and let Drawer compute `commandCount - 6`.
- **The `v` prefix on version.** `getBuildMeta().version` returns `"1.0.2"`. `VERSION_FALLBACK` is `"v1.1.0"`. The accessor must prepend `v`. Get this wrong and the version pill shows `1.0.2` without the prefix.
- **Module cache in docs-data accessors.** `getCommandCount()` caches at module scope. If the file is missing on first call, it throws and the cache stays null. Subsequent calls would retry (because `cached` is still null). This is fine — marketing-stats catches the throw regardless.
- **`Drawer sectionRef prop is defined but never passed`** — known proof finding, not related to this change. Don't clean it up in this build.

## Build Brief

### Rules That Apply
- Named exports only, no default exports.
- `import type` for type-only imports, separate from value imports.
- Explicit return types on all exported functions.
- Exported functions require `@param` and `@returns` JSDoc tags.
- Early returns over nested conditionals.
- 2-space indentation.

### Pattern Extracts

From `website/lib/docs-data/commands.ts` (the accessor pattern — lines 1-23):
```typescript
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { CommandsData, CommandGroup } from './types';

const DATA_PATH = join(process.cwd(), 'data', 'docs', 'commands.json');

let cached: CommandsData | null = null;

function load(): CommandsData {
  if (!cached) {
    cached = JSON.parse(readFileSync(DATA_PATH, 'utf-8')) as CommandsData;
  }
  return cached;
}

export function getCommandCount(): number {
  return load().totalCommands;
}
```

From `website/lib/proof-feed.ts` (the fallback pattern — line 59 and usage):
```typescript
const VERSION_FALLBACK = "v1.1.0";

export async function getLatestVersion(): Promise<string> {
  try {
    const res = await fetch(GITHUB_TAGS_URL, { ... });
    if (!res.ok) return VERSION_FALLBACK;
    // ...
  } catch {
    return VERSION_FALLBACK;
  }
}
```

From `website/components/system/SystemSection.tsx` (line 51, 54 — passing data to children):
```typescript
<SpecStrip items={copy.system.specStrip} />
<Drawer version={cliPkg.version} />
```

From `website/components/system/Drawer.tsx` (lines 117-120 — manPage data assembly):
```typescript
<ManPage
  data={{
    version,
    commands: drawer.manPage.commands,
    moreCount: drawer.manPage.moreCount,
    moreNames: drawer.manPage.moreNames,
  }}
/>
```

### Proof Context
- `proof-feed.ts`: "version field hardcoded to v1.0.2 in proof feed mapping" — this build partially addresses this by making VERSION_FALLBACK dynamic. The mapEntry version comes from getLatestVersion() which already fetches from GitHub.
- `Drawer.tsx`: "Drawer type narrowing uses in-operator check" — not related to this change, but be aware when adding the `manPage` conditional logic.

### Checkpoint Commands

- After creating `marketing-stats.ts`: `(cd website && npx tsc --noEmit)` — Expected: no type errors
- After all component changes: `(cd website && pnpm build)` — Expected: build succeeds
- Lint: `pnpm run lint`
- CLI tests (regression check): `(cd packages/cli && pnpm vitest run)` — Expected: 2336 tests pass

### Build Baseline
- Current tests: 2336 passed, 2 skipped (104 test files)
- Command used: `(cd packages/cli && pnpm vitest run)`
- After build: expected 2336 + new marketing-stats tests
- Regression focus: website build. No CLI tests should be affected since changes are website-only.
