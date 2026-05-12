# Scope: Hygiene debt cleanup

**Created by:** Ana
**Date:** 2026-05-12

## Intent

Three independent sources of recurring development noise — git pull warnings during `work complete`, Dependabot false positives on test fixtures, and transitive dependency vulnerability alerts. All share the same root cause: incremental maintenance that wasn't done, accumulating into confusing signals. The user wants to clean house — eliminate the noise permanently with minimal regression risk.

## Complexity Assessment
- **Kind:** chore
- **Size:** small — 3 independent mechanical changes, no feature logic
- **Files affected:**
  - `packages/cli/src/commands/work.ts` (3 lines changed — add `--autostash` flag)
  - `packages/cli/tests/engine/fixtures/python/requirements.txt/simple.txt` (fictional package names)
  - `packages/cli/tests/engine/fixtures/python/requirements.txt/with-extras.txt` (fictional package names)
  - `packages/cli/tests/engine/fixtures/node/package.json/simple.txt` (fictional package names)
  - `templates/.claude/skills/testing-standards/SKILL.md` (one rule addition)
  - `.gitignore` (commit existing change — `.mcp.json` entry)
  - `pnpm-lock.yaml` (updated by `pnpm update`)
- **Blast radius:** Low. `--autostash` only changes git behavior during pull. Fixture content changes are format-preserving — same structure, different names. `pnpm update` stays within semver ranges.
- **Estimated effort:** ~30 minutes of Build time
- **Multi-phase:** no

## Approach

Three independent fixes for three symptoms of accumulated hygiene debt:

1. **Git sync fragility.** Add `--autostash` to all `pull --rebase` calls in work.ts. This makes the CLI robust to normal working-tree state (uncommitted edits, local config changes) instead of silently skipping the sync and leaving the local branch desynchronized. The current behavior warns and continues without actually pulling — this compounds across work items.

2. **Fixture security false positives.** Replace real package names in all ecosystem manifest fixture files with fictional ones. The scanner tests parse format, not resolve packages — `my-framework==2.0.1` tests identically to `flask==2.0.1`. This kills both security alerts AND version update noise permanently, for current fixtures and as a pattern for future ones. Encode the convention as a testing-standards skill rule.

3. **Transitive dependency patches.** Run `pnpm update` within semver ranges to pick up available patches. Research confirms: minimatch 9.0.5→9.0.9 (production, via glob's `^9.0.4` range), picomatch 4.0.3→4.0.4 (production, within `^4.0.0`), postcss/rollup/flatted (dev-only). All patches exist within current semver constraints — no major bumps needed.

Also commit the existing `.gitignore` change (`.mcp.json` entry) which is project convention, not local state.

## Acceptance Criteria
- AC1: All three `git pull --rebase` calls in work.ts include `--autostash`
- AC2: All fixture manifest files (python requirements.txt, node package.json) use fictional package names that don't correspond to real packages with known vulnerabilities
- AC3: Fixture format is preserved — same structure, line count, and syntactic patterns so existing parser tests pass without modification
- AC4: `pnpm update` (no `--latest`) has been run and lockfile updated
- AC5: `pnpm audit` reports fewer findings than the current 20 (target: 0, acceptable: ≤3 dev-only)
- AC6: Testing-standards skill includes a rule about fictional package names in fixture manifests
- AC7: `.gitignore` includes the `.mcp.json` entry (committed, not just local)
- AC8: All existing tests pass (`pnpm vitest run` in packages/cli)

## Edge Cases & Risks

- **`--autostash` conflict on pop:** If stashed changes conflict with pulled content, git leaves conflict markers after pop. This is correct behavior — the developer sees the conflict immediately. No worse than the current state where the pull is silently skipped.
- **`pnpm update` breaking something:** Semver-only updates should be safe, but transitive changes can surprise. AC8 (tests pass) catches regressions.
- **Fixture name choice:** Fictional names must not accidentally match real npm/PyPI packages. Use obviously-fake names like `my-framework`, `test-lib`, `example-orm`.
- **Future fixture additions:** The testing-standards rule is the prevention mechanism. When Build agents create new scanner fixtures, the rule guides them to fictional names.

## Rejected Approaches

- **`dependabot.yml` ignore rules for fixture paths.** Only controls version update PRs, not security advisory alerts (which are the actual noise). Fictional names solve both.
- **`pnpm update --latest` (major version bumps).** glob 10→13 risks API breakage throughout the codebase. typescript 5→6 just released — too early for production CLI tooling. web-tree-sitter 0.25→0.26 could break WASM loading in the deep scanner. None are motivated by exploitable vulnerabilities in a CLI processing local files. Defer until specifically needed.
- **CI `pnpm audit` gate.** Over-engineering for a CLI with zero network attack surface. Quarterly manual `pnpm update` within semver is proportional to actual risk.
- **Splitting into three separate pipeline runs.** All changes are mechanical, non-overlapping, and small. Three pipeline runs for config-level work is overhead that doesn't serve verification.

## Open Questions

None — all resolved during scoping.

## Exploration Findings

### Patterns Discovered
- `work.ts:1202, 1283, 1762` — three `pull --rebase` call sites. Lines 1202 and 1283 are in `work complete` (initial pull and retry after untracked file cleanup). Line 1762 is in `work start`.
- `work.ts:1288-1299` — when non-conflict pull failure occurs in `work complete`, warns and continues without syncing. The branch silently falls behind.
- `work.ts:1762-1769` — when non-conflict pull failure occurs in `work start`, silently continues with zero output. Even less visible than `work complete`.

### Constraints Discovered
- [TYPE-VERIFIED] glob 10.x pins `minimatch: '^9.0.4'` (npm registry) — 9.0.6+ (patched) resolves within range, confirmed via `npm view`
- [TYPE-VERIFIED] picomatch 4.0.4 (patched) exists within `^4.0.0` range (npm registry) — resolves via `pnpm update`
- [TYPE-VERIFIED] glob@10.5.0 is already latest 10.x (npm registry) — no glob update itself, only its transitive minimatch
- [OBSERVED] Node fixtures use directory-named-as-manifest pattern (`package.json/simple.txt`) — same structure as python fixtures that were flagged. Ticking bomb.
- [OBSERVED] `with-extras.txt` contains uvicorn, sqlalchemy, requests — all real packages with vulnerability histories

### Test Infrastructure
- Fixture files are read by parser tests in `packages/cli/tests/engine/` — tests validate format detection, not package resolution. Fictional names are safe.

## For AnaPlan

### Structural Analog
`work.ts` lines 1202-1300 — the `work complete` pull logic with its retry handling. The `--autostash` addition follows the same pattern at all three sites.

### Relevant Code Paths
- `packages/cli/src/commands/work.ts:1198-1301` — `work complete` pull + untracked file recovery
- `packages/cli/src/commands/work.ts:1759-1770` — `work start` pull
- `packages/cli/tests/engine/fixtures/python/requirements.txt/simple.txt` — `flask==2.0.1`, `django>=3.0`, `requests>=2.0`
- `packages/cli/tests/engine/fixtures/python/requirements.txt/with-extras.txt` — `requests[security]>=2.0`, `uvicorn[standard]==0.20.0`, `sqlalchemy[postgresql]>=1.4`
- `packages/cli/tests/engine/fixtures/node/package.json/simple.txt` — `express`, `next`, `vitest`
- `templates/.claude/skills/testing-standards/SKILL.md` — where the fixture naming rule goes

### Patterns to Follow
- Fixture files preserve exact format structure (line count, syntax patterns, extras notation) — only names change
- `--autostash` is a single flag addition to existing `['pull', '--rebase']` arrays — no control flow changes
- Testing-standards skill rules follow existing rule format in the SKILL.md template

### Known Gotchas
- The `pnpm update` must run at workspace root, not inside packages/cli. pnpm hoists differently per workspace.
- Don't modify the `work complete` retry logic (lines 1204-1285) — it handles a different problem (untracked files from worktree agents). `--autostash` handles unstaged changes, which is orthogonal.
- After `pnpm update`, run `pnpm audit` to verify actual resolution count. If minimatch 3.1.2 persists via eslint, it's dev-only and acceptable.

### Things to Investigate
None — all questions resolved during scoping.
