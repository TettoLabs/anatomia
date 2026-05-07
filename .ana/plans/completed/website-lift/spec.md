# Spec: Website Lift

**Created by:** AnaPlan
**Date:** 2026-05-06
**Scope:** .ana/plans/active/website-lift/scope.md

## Approach

Delete the old `website/` directory and replace it with the complete prototype from `/Users/rsmith/Projects/anatomia_project/anatomia-website/`. The prototype is a production-quality Next.js 16 site — 4 pages, 35 components, 67 files. It slots into the existing monorepo workspace configuration without changes to `pnpm-workspace.yaml` or `turbo.json`.

The one function that changes is `getProofFeed()` in `website/lib/proof-feed.ts`. Replace the mock return with a fetch to `raw.githubusercontent.com` for the repo's `proof_chain.json`, mapping each entry to the existing `ProofEntry` shape. When the fetch fails, fall back to the existing mock data. The `ProofEntry` type and all 5 consuming components stay untouched.

The release workflow gets a single-line filter change so website build failures can't block npm publish.

**Why this works mechanically:** `pnpm-workspace.yaml` already includes `website`. `turbo.json` already has `.next/**` in build outputs. The prototype's `package.json` is already named `anatomia-website`. After the copy, `pnpm install` from root resolves everything.

## Output Mockups

### Proof feed data (what `getProofFeed()` returns after wiring)

```json
[
  {
    "version": "v1.0.2",
    "hash": "4b9455a",
    "ts": "2026-05-06T20:09:59.799Z",
    "kind": "feature",
    "feat": "Worktrees V2 — Phase Timing + Danger Map + Prune",
    "feature_em": "Worktrees V2",
    "assertions": 23,
    "passed": 21,
    "url": "#proof-worktrees-v2-timing-danger-prune"
  },
  {
    "version": "v1.0.2",
    "hash": "15a42c0",
    "ts": "2026-05-06T19:17:33.185Z",
    "kind": "feature",
    "feat": "Rejection Cycle Artifact Preservation",
    "feature_em": "Rejection Cycle Artifact",
    "assertions": 16,
    "passed": 16,
    "url": "#proof-rejection-artifact-preservation"
  }
]
```

### Fallback behavior (GitHub unreachable)

The same mock data that exists today — 6 entries with relative timestamps. The site never errors due to a network issue.

## File Changes

### `website/` (full directory replacement)

**What changes:** Delete all existing contents (the throwaway prototype named `demo-site`), copy the production prototype from `/Users/rsmith/Projects/anatomia_project/anatomia-website/`. After copy, delete: `node_modules/`, `.next/`, `.git/` (if present), `pnpm-lock.yaml`, `tsconfig.tsbuildinfo`, and `MIGRATION_HANDOFF.md` (it's instructions for this lift — no longer needed). Keep `MAINTENANCE_MANUAL.md`.
**Why:** The old site has wrong brand colors, dead code, outdated copy, and different dependencies (`demo-site` vs `anatomia-website`). Nothing worth preserving.

### `website/lib/proof-feed.ts` (modify — after copy)

**What changes:** Replace the body of `getProofFeed()` to fetch from GitHub raw API, add a `mapEntry()` helper that maps proof chain entries to `ProofEntry` shape, keep `mockFeed()` as the fallback.
**Pattern to follow:** The existing function signature and `ProofEntry` type are the contract. Only the function body changes.
**Why:** This is the single data-fetching function. All 5 consuming components call it. Next.js deduplicates the call.

### `.github/workflows/release.yml` (modify)

**What changes:** Line 29: change `pnpm build` to `pnpm --filter anatomia-cli build`.
**Why:** Without this filter, a website build failure blocks npm publish. The test workflow (`test.yml`) stays unfiltered intentionally — it catches website regressions in CI.

## Acceptance Criteria

- [ ] AC1: `pnpm install` from monorepo root resolves all dependencies without conflicts
- [ ] AC2: `pnpm --filter anatomia-website build` succeeds with zero errors
- [ ] AC3: `pnpm --filter anatomia-website check` (lint + types + build) passes
- [ ] AC4: Dev server boots and all routes render: `/` (landing), `/docs` (quickstart), `/manifesto` (essay), `/contact` (channels), `/nonexistent` (custom 404)
- [ ] AC5: Proof feed shows real data from GitHub raw API, or graceful fallback to mock data if the API is unreachable
- [ ] AC6: `ProofEntry` type contract is unchanged — all 5 consuming components (Nav, Hero, ProofFeed, Footer, ticker) render without modification
- [ ] AC7: CLI tests still pass (`cd packages/cli && pnpm vitest run`) — zero regression
- [ ] AC8: No dependency conflicts between website and CLI workspaces
- [ ] AC9: Website build does not block CLI release workflow (`release.yml` uses `--filter anatomia-cli` for its build step)
- [ ] AC10: Pre-commit hook is unaffected (already scoped to `cd packages/cli`)
- [ ] AC11: No build errors or type errors introduced

## Testing Strategy

- **Unit tests:** None — the website has no test infrastructure (Next.js marketing site). Verification is through build + typecheck + lint.
- **Integration tests:** The build itself is the integration test — `pnpm --filter anatomia-website check` runs lint, typecheck, and build in sequence. If any component can't consume `ProofEntry`, the build fails.
- **Edge cases:**
  - GitHub API unreachable → `getProofFeed()` returns mock data (fallback path)
  - Malformed JSON from GitHub → catch block returns mock data
  - Empty `entries` array from proof chain → returns empty array (no crash)
- **CLI regression:** `cd packages/cli && pnpm vitest run` must pass unchanged — 95 test files, 1950 tests.

## Dependencies

- The prototype at `/Users/rsmith/Projects/anatomia_project/anatomia-website/` must exist and be buildable.
- `proof_chain.json` must be committed at `.ana/proof_chain.json` in the repo (it is — 58 entries).

## Constraints

- **`ProofEntry` type is the contract.** Do not modify the type definition. Components don't change. Only the data source changes.
- **No cross-workspace dependencies.** The website must not import anything from `packages/cli`. The only connection is the GitHub API reading proof chain data from the same repo.
- **Website's `tsconfig.json` is self-contained.** It does NOT extend `tsconfig.base.json` from the monorepo root. It uses `moduleResolution: "bundler"` (Next.js requirement) while the CLI uses `"Bundler"` from the base config. They're compatible but independent.
- **The website's ESLint config is self-contained.** Uses `eslint-config-next`, separate from the root's `typescript-eslint` config. No conflicts.

## Gotchas

- **Delete `pnpm-lock.yaml` from the copied prototype.** The monorepo uses a single root lockfile. A per-package lockfile causes resolution conflicts.
- **Delete `tsconfig.tsbuildinfo` from the copy.** It contains cached paths from the standalone location. Let the monorepo rebuild it.
- **Delete `MIGRATION_HANDOFF.md` after copy.** It's instructions for this lift — shipping it in the repo is confusing.
- **The old website's `package.json` is named `demo-site`.** The prototype's is named `anatomia-website`. After the swap, all `pnpm --filter` commands use `anatomia-website`.
- **`turbo.json` `globalDependencies` includes `tsconfig.base.json`.** The website doesn't use it, but turbo may invalidate website cache when the base config changes. Harmless — just means an extra rebuild occasionally.
- **`feature_em` extraction is imperfect.** "Fix Drizzle schema detection" → "Fix Drizzle schema". Good enough for a display-only field on a marketing site.
- **`version` is hardcoded to `v1.0.2`.** Phase 2 fetches the latest git tag. For now the version pill shows a static value.

## Build Brief

### Rules That Apply
- This is a Next.js website, not the CLI. The CLI coding standards (`.js` extensions, `node:` prefix, named exports, JSDoc) do NOT apply to website files. The website follows Next.js conventions.
- The website's ESLint uses `eslint-config-next` — different rules from the CLI's `typescript-eslint` setup.
- The website uses `@/*` path aliases (`tsconfig.json` paths). Imports look like `import { getProofFeed } from "@/lib/proof-feed"`.
- No test files for the website. Verification is `pnpm --filter anatomia-website check`.

### Pattern Extracts

**Current `getProofFeed()` and `ProofEntry` type — the contract (from `website/lib/proof-feed.ts` in prototype):**

```typescript
// lib/proof-feed.ts lines 21-33
export type ProofKind = "feature" | "fix" | "chore";

export interface ProofEntry {
  version: string;
  hash: string;
  ts: string;
  kind: ProofKind;
  feat: string;
  feature_em: string;
  assertions: number;
  passed: number;
  url: string;
}
```

```typescript
// lib/proof-feed.ts lines 65-67 — current body to replace
export async function getProofFeed(): Promise<ProofEntry[]> {
  return mockFeed();
}
```

**Proof chain entry structure (from `.ana/proof_chain.json` — most recent entry):**

```json
{
  "slug": "worktrees-v2-timing-danger-prune",
  "feature": "Worktrees V2 — Phase Timing + Danger Map + Prune",
  "result": "PASS",
  "contract": {
    "total": 23,
    "satisfied": 21
  },
  "hashes": {
    "scope": "sha256:4b9455adf11ba015a2bdd7343a68d6f79096c0f185f3172c0f13b2cee62ab1ea"
  },
  "completed_at": "2026-05-06T20:09:59.799Z"
}
```

**Field mapping (resolved decisions):**

| ProofEntry field | Source | Implementation |
|-----------------|--------|----------------|
| `version` | Hardcoded | `"v1.0.2"` |
| `hash` | `hashes.scope` | `entry.hashes.scope.slice(7, 14)` — skip `sha256:` prefix, take 7 chars |
| `ts` | `completed_at` | Direct mapping |
| `kind` | `slug` prefix | `entry.slug.startsWith("fix-") ? "fix" : "feature"` |
| `feat` | `feature` | Direct mapping |
| `feature_em` | `feature` | Split on ` — ` (em dash) first, take left side. Then take first 3 words. Handles "Worktrees V2 — Phase Timing..." → "Worktrees V2" |
| `assertions` | `contract.total` | Direct mapping |
| `passed` | `contract.satisfied` | Direct mapping |
| `url` | `slug` | `#proof-${entry.slug}` |

### Proof Context

No active proof findings for affected files.

### Checkpoint Commands

- After website copy + `pnpm install`: `pnpm --filter anatomia-website build` — Expected: build succeeds
- After `proof-feed.ts` wiring: `pnpm --filter anatomia-website check` — Expected: lint + types + build pass
- After release.yml change: `cd packages/cli && pnpm vitest run --run` — Expected: 1950 tests pass, 95 test files
- Final: `pnpm --filter anatomia-website check && cd packages/cli && pnpm vitest run --run` — Expected: all pass

### Build Baseline
- Current tests: 1950 passed, 2 skipped (95 test files)
- Command used: `cd packages/cli && pnpm vitest run`
- After build: expected 1950 tests in 95 files (no new tests — website has no test infrastructure)
- Regression focus: none — website changes touch zero CLI files. Only `release.yml` changes, and no CLI tests cover workflow files.
