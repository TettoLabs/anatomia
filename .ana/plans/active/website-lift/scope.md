# Scope: Website Lift

**Created by:** Ana
**Date:** 2026-05-06

## Intent
Replace the throwaway `website/` prototype with the production-quality website that exists at `/Users/rsmith/Projects/anatomia_project/anatomia-website/`. Wire the proof feed to live data from the GitHub API. Ensure CI continues to work without the website blocking CLI releases.

## Complexity Assessment
- **Size:** medium
- **Files affected:** `website/` (full replacement — 67 files in, ~30 files out), `.github/workflows/release.yml` (1 line)
- **Blast radius:** Zero CLI impact. The website workspace is isolated — no shared code, no shared dependencies. CI and release workflows are the only cross-cutting concerns.
- **Estimated effort:** ~45 minutes build time
- **Multi-phase:** no

## Approach
Delete the old website contents, copy the prototype in (excluding build artifacts and per-package lockfile), wire the single data-fetching function to GitHub's raw content API with mock fallback, and add a workspace filter to the release workflow so website build failures can't block npm publish.

The prototype is complete and builds independently. This is a mechanical lift with one ~35-line wiring change.

## Acceptance Criteria
- AC1: `pnpm install` from monorepo root resolves all dependencies without conflicts
- AC2: `pnpm --filter anatomia-website build` succeeds with zero errors
- AC3: `pnpm --filter anatomia-website check` (lint + types + build) passes
- AC4: Dev server boots and all routes render: `/` (landing), `/docs` (quickstart), `/manifesto` (essay), `/contact` (channels), `/nonexistent` (custom 404)
- AC5: Proof feed shows real data from GitHub raw API, or graceful fallback to mock data if the API is unreachable
- AC6: `ProofEntry` type contract is unchanged — all 5 consuming components (Nav, Hero, ProofFeed, Footer, ticker) render without modification
- AC7: CLI tests still pass (`cd packages/cli && pnpm vitest run`) — zero regression
- AC8: No dependency conflicts between website and CLI workspaces
- AC9: Website build does not block CLI release workflow (`release.yml` uses `--filter anatomia-cli` for its build step)
- AC10: Pre-commit hook is unaffected (already scoped to `cd packages/cli`)

## Edge Cases & Risks
- **Dependency version conflicts:** Website uses React 19.2, CLI uses no React. pnpm workspace isolation handles this. If not, `.npmrc` with `shamefully-hoist=false` or `pnpm.overrides`.
- **TypeScript config:** Website has its own `tsconfig.json`. Must NOT extend the monorepo root tsconfig. Self-contained.
- **GitHub API rate limits:** Unauthenticated requests to `raw.githubusercontent.com` allow ~60/hour. With 5-minute ISR (`revalidate: 300`), the site makes ~12 requests/hour max. Well within limits.
- **Proof chain entry shape mismatch:** Several `ProofEntry` fields don't exist in `proof_chain.json` entries. See field mapping in "For AnaPlan" section. Display-only fields get pragmatic stubs.
- **CI timing:** Website build adds 30-60s to CI. Acceptable — catches website regressions. Only the release workflow gets filtered.

## Rejected Approaches
**Multi-scope (separate lift + wire):** The wiring is ~35 lines in one function. Two pipeline runs on the same directory for trivially different work. One scope.

**Keep the old website and merge:** Nothing in the old site is worth preserving. Delete and replace is faster and cleaner.

**Platform API instead of GitHub raw:** The platform doesn't exist yet. GitHub raw keeps the marketing site fully open source with zero infrastructure.

**Version field from CLI package.json:** Cross-package import creates a dependency coupling that shouldn't exist. Hardcode current version for Phase 1. Phase 2 fetches the latest git tag from GitHub API.

## Open Questions
None — all investigable questions resolved during scoping.

## Exploration Findings

### Patterns Discovered
- `website/lib/proof-feed.ts`: single `getProofFeed()` function, `mockFeed()` helper, `ProofEntry` type contract. Five consumers call `getProofFeed()` — Next.js deduplicates. Swapping mock to real is a one-function change.
- Pre-commit hook (`cd packages/cli`) is already CLI-scoped — no risk of website typecheck slowing commits.

### Constraints Discovered
- [TYPE-VERIFIED] release.yml build step (`release.yml`:28) — runs `pnpm build` which hits turbo, which builds both workspaces. Website failure would block npm publish.
- [TYPE-VERIFIED] test.yml build step (`test.yml`) — also runs `pnpm build` via turbo. Intentionally left unfiltered to catch website regressions.
- [OBSERVED] `pnpm-workspace.yaml` already includes `website` — no workspace config changes needed.
- [OBSERVED] `turbo.json` has generic `build`/`dev`/`lint` tasks with `.next/**` outputs — picks up website automatically.
- [OBSERVED] Prototype has `pnpm-lock.yaml` — must be deleted before copy. Monorepo uses root lockfile only.

### Test Infrastructure
- No website-specific tests. Verification is build + typecheck + lint + manual route check.
- CLI tests at `packages/cli/tests/` — must pass unchanged.

## For AnaPlan

### Structural Analog
The old `website/` workspace configuration — same workspace slot, same turbo integration, same pnpm-workspace.yaml entry. The replacement slots into the identical position.

### Relevant Code Paths
- `/Users/rsmith/Projects/anatomia_project/anatomia-website/` — the complete prototype (source of truth for the copy)
- `website/lib/proof-feed.ts` — the ONE function body that changes + new `mapEntry` helper
- `website/package.json` — already named `anatomia-website`, has `build`, `lint`, `check` scripts
- `.github/workflows/release.yml` line 28 — `pnpm build` needs `--filter anatomia-cli`
- `.ana/proof_chain.json` — the data source for the proof feed

### Patterns to Follow
- `website/MAINTENANCE_MANUAL.md` in the prototype — documents architecture decisions, how to extend, how to debug. Keep it.
- `website/MIGRATION_HANDOFF.md` in the prototype — instructions for this lift. Delete after lift completes.

### Known Gotchas
- Delete `node_modules`, `.next`, `.git`, and `pnpm-lock.yaml` from the prototype before copying — don't commit build artifacts or a conflicting lockfile
- The old `website/` has throwaway files (`COPY_IMPROVEMENTS.md`, `SITE_ARCHITECTURE.md`, `VISUAL_DESCRIPTION.md`, `anatomia-landing-10x-style.html`, `colors/`) — all deleted with the rest
- `ProofEntry` type is the contract. Components don't change. Only the data source changes.

### Field Mapping for `mapEntry`

The builder must resolve these mappings:

| ProofEntry field | Source | Approach |
|-----------------|--------|----------|
| `version` | NOT in proof chain | Hardcode current version (e.g., `"v1.0.2"`). Phase 2 fetches latest git tag. |
| `hash` | `hashes.scope` | First 7 chars of the scope hash. Not a git SHA but sufficient for display. |
| `ts` | `completed_at` | Direct mapping. |
| `kind` | NOT in proof chain | Infer from slug prefix: `fix-*` -> fix, default -> feature. Imperfect but sufficient for display. |
| `feat` | `feature` field | Direct mapping. |
| `feature_em` | NOT in proof chain | Extract first noun phrase from `feature`, or hardcode. Display-only — stub pragmatically. |
| `assertions` | `contract.total` | Direct mapping. |
| `passed` | `contract.satisfied` | Direct mapping. |
| `url` | Construct from slug | `#proof-{slug}` or link to PR if `pr_url` exists. |

The imperfect fields (`version`, `kind`, `feature_em`) are display-only. The ship log works without them. Map what's available cleanly, stub what isn't.

### Things to Investigate
- Whether the prototype's `eslint.config.mjs` and `postcss.config.mjs` need adjustments for the monorepo context — they work standalone but verify they don't conflict with root configs
- The `mapEntry` field mapping for `feature_em` — decide the extraction approach before building
