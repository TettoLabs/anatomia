# Verify Report: Fix Prisma schema detection bugs

**Result:** PASS
**Created by:** AnaVerify
**Date:** 2026-04-23
**Spec:** .ana/plans/active/fix-prisma-schema-detection/spec.md
**Branch:** feature/fix-prisma-schema-detection

## Pre-Check Results

```
=== CONTRACT COMPLIANCE ===
  Contract: .ana/plans/active/fix-prisma-schema-detection/contract.yaml
  Seal: INTACT (commit 15acf4b, hash sha256:a57a2d44cb2d1...)

  A001  ✓ COVERED  "When two schema files exist in the same project, the scanner picks the one with more data models"
  A002  ✓ COVERED  "The scanner identifies the correct file path when multiple schema candidates compete"
  A003  ✓ COVERED  "Dual schema candidates are both considered — the weaker one doesn't block the stronger"
  A004  ✓ COVERED  "A multi-file Prisma schema without a traditional anchor file is still detected"
  A005  ✓ COVERED  "Model counting works across multiple schema files in a directory"
  A006  ✓ COVERED  "The database provider is detected even in a multi-file schema layout"
  A007  ✓ COVERED  "No false alarm fires when a multi-file schema is successfully detected"
  A008  ✓ COVERED  "The database provider is found even when it lives in a supporting file, not the main schema"
  A009  ✓ COVERED  "Model count is accurate when provider lives in a separate file from the models"
  A010  ✓ COVERED  "A Prisma directory containing only SQL migration files does not trigger false schema detection"
  A011  ✓ COVERED  "Migration-only Prisma directories correctly report that no schema was found"
  A012  ✓ COVERED  "Existing monolith Prisma detection continues to work after the fix"
  A013  ✓ COVERED  "Existing monorepo sub-package Prisma detection continues to work after the fix"

  13 total · 13 covered · 0 uncovered
```

Tests: 1394 passed, 0 failed, 2 skipped (95 test files). Build: clean. Lint: clean.

## Contract Compliance

| ID   | Says                                                                                          | Status        | Evidence |
|------|-----------------------------------------------------------------------------------------------|---------------|----------|
| A001 | When two schema files exist in the same project, the scanner picks the one with more data models | ✅ SATISFIED  | `scanProject.test.ts:157` — `expect(result.schemas['prisma']!.modelCount).toBe(3)` with dual candidates (1 vs 3 models) |
| A002 | The scanner identifies the correct file path when multiple schema candidates compete           | ✅ SATISFIED  | `scanProject.test.ts:158` — `expect(result.schemas['prisma']!.path).toContain('schema.prisma')`, matcher `contains` matches contract |
| A003 | Dual schema candidates are both considered — the weaker one doesn't block the stronger         | ✅ SATISFIED  | `scanProject.test.ts:156` — `expect(result.schemas['prisma']!.found).toBe(true)`, dual files created at lines 149-150 |
| A004 | A multi-file Prisma schema without a traditional anchor file is still detected                 | ✅ SATISFIED  | `scanProject.test.ts:176` — `expect(result.schemas['prisma']!.found).toBe(true)`, no `schema.prisma` anchor, only `models.prisma` + `base.prisma` |
| A005 | Model counting works across multiple schema files in a directory                               | ✅ SATISFIED  | `scanProject.test.ts:177` — `expect(result.schemas['prisma']!.modelCount).toBe(3)`, 2 models in `models.prisma` + 1 in `base.prisma` |
| A006 | The database provider is detected even in a multi-file schema layout                           | ✅ SATISFIED  | `scanProject.test.ts:178` — `expect(result.schemas['prisma']!.provider).toBe('postgresql')` |
| A007 | No false alarm fires when a multi-file schema is successfully detected                         | ✅ SATISFIED  | `scanProject.test.ts:180` — `expect(result.blindSpots.find(b => b.area === 'Database' && /Prisma/.test(b.issue))).toBeUndefined()`, contract `not_contains` "Prisma" matched |
| A008 | The database provider is found even when it lives in a supporting file, not the main schema    | ✅ SATISFIED  | `scanProject.test.ts:198` — `expect(result.schemas['prisma']!.provider).toBe('postgresql')`, datasource only in `base.prisma` |
| A009 | Model count is accurate when provider lives in a separate file from the models                 | ✅ SATISFIED  | `scanProject.test.ts:199` — `expect(result.schemas['prisma']!.modelCount).toBeGreaterThan(0)`, contract `greater: 0` matched |
| A010 | A Prisma directory containing only SQL migration files does not trigger false schema detection  | ✅ SATISFIED  | `scanProject.test.ts:215` — `expect(result.schemas['prisma']).toBeDefined()`, contract `exists` matched by `toBeDefined()` |
| A011 | Migration-only Prisma directories correctly report that no schema was found                    | ✅ SATISFIED  | `scanProject.test.ts:216` — `expect(result.schemas['prisma']!.found).toBe(false)` |
| A012 | Existing monolith Prisma detection continues to work after the fix                             | ✅ SATISFIED  | `scanProject.test.ts:112` — `expect(result.schemas['prisma']!.modelCount).toBe(2)`, pre-existing test unchanged |
| A013 | Existing monorepo sub-package Prisma detection continues to work after the fix                 | ✅ SATISFIED  | `scanProject.test.ts:135` — `expect(result.schemas['prisma']!.path).toBe('packages/db/prisma/schema.prisma')`, pre-existing test unchanged |

## Independent Findings

**Prediction resolution:**

1. *"Census directory fallback doesn't filter `.prisma` files rigorously"* — **Not found.** `f.endsWith('.prisma')` at `census.ts:220` is correct; `.prisma.bak` doesn't match.

2. *"`path.relative()` might strip trailing slashes"* — **Not found.** Census manually appends `/` after `path.relative()` at `census.ts:225`. Scan-engine's second fallback also appends `/` via `path.dirname(f) + '/'` at `scan-engine.ts:291`. Both preserve the convention.

3. *"Deduplication could produce duplicates from differing path separators"* — **Not found.** `path.dirname()` normalizes consistently; the `Set` deduplication at `scan-engine.ts:291` is correct.

4. *"SQL-only test checks undefined rather than `found: false`"* — **Not found.** Test correctly checks both `toBeDefined()` (A010) and `found === false` (A011).

5. *"Sibling provider extraction doesn't handle multiple conflicting datasource blocks"* — **Confirmed as observation.** Both the directory handler (`scan-engine.ts:313-316`) and sibling handler (`scan-engine.ts:337-339`) use `if (!provider)` — first non-null wins, no conflict resolution. This is acceptable because Prisma itself disallows multiple datasource blocks, but worth noting.

**Surprise finding:** The census directory-only fallback at `census.ts:219` reads only the top level of `prisma/` via `readdirSync(prismaDir)`. A `.prisma` file nested under `prisma/subdirectory/foo.prisma` would NOT be detected by census, and the scan-engine glob fallback `**/prisma/*.prisma` also only matches one level deep. Deeply nested `.prisma` files would be missed entirely. Not a bug for any known Prisma layout, but a gap if someone uses nested subdirectories within their Prisma folder.

**Over-building check:** No scope creep. Changed files match spec exactly: `census.ts` (modify), `scan-engine.ts` (modify), `scanProject.test.ts` (modify). No new files, no new exports, no new parameters. Grepped new code for unused exports — none introduced.

**Code quality:** The diff is clean and tight — 26 lines added in census, 50 net lines added in scan-engine, 80 lines of tests. All changes stay in engine layer (no chalk, no ora). All empty catches follow the existing graceful-degradation pattern. `let` for `matches` is justified by the spec's guidance and keeps the logic linear.

## AC Walkthrough

- **AC1:** When both `prisma/schema.prisma` and `schema.prisma` exist, census reports both, scorer picks the one with more models. ✅ PASS — Census `break` removed (diff line +208 `foundPrismaFile = true` replaces `break`). Test creates both files, asserts `modelCount === 3` (the winner). Verified at `scanProject.test.ts:142-159`.

- **AC2:** Directory-only multi-file Prisma schema detected. ✅ PASS — Census fallback at `census.ts:215-232` checks for `.prisma` files in `prisma/`. Scan-engine directory handler at `scan-engine.ts:304-318` reads all files. Test at `scanProject.test.ts:162-181` confirms detection with no anchor file.

- **AC3:** Provider regex runs on all `.prisma` files, not just anchor. ✅ PASS — Sibling provider check at `scan-engine.ts:336-339` (`if (!provider)` then check sibling). Test at `scanProject.test.ts:184-200` has datasource only in `base.prisma`, asserts `provider === 'postgresql'`.

- **Edge case:** `prisma/` with only SQL files does not produce a schema entry. ✅ PASS — Census `hasPrismaFiles` check at `census.ts:220` returns false for directories with only subdirectories or `.sql` files. Test at `scanProject.test.ts:203-217` confirms `found === false`.

- **Tests pass:** ✅ PASS — 1394 passed, 0 failed, 2 skipped.

- **No build errors:** ✅ PASS — `pnpm run build` clean.

- **No lint errors:** ✅ PASS — `pnpm run lint` clean.

## Blockers

No blockers. All 13 contract assertions satisfied. All 7 acceptance criteria pass. No regressions — existing tests (A012, A013) unchanged and passing. Checked for: unused parameters in new code (none — `foundPrismaFile`, `isDirectory`, `relStr`, `absDir` all used), unhandled error paths (all new `try` blocks have empty catches matching engine convention), external assumptions (no new env vars or file system assumptions beyond what exists), sentinel test patterns (all assertions check specific values, no tautologies).

## Callouts

- **Code — First-provider-wins with no conflict detection:** `scan-engine.ts:313` and `scan-engine.ts:337` — both directory and sibling handlers use `if (!provider)` to take the first datasource block found. If a `.prisma` directory contains conflicting provider declarations (theoretically invalid Prisma, but possible in a broken project), the scanner silently picks whichever file `readdir` returns first. File system ordering is non-deterministic on some platforms. Acceptable because Prisma itself rejects multiple datasource blocks, but the scanner's behavior would be platform-dependent on malformed input.

- **Code — Census directory check is non-recursive:** `census.ts:219` — `readdirSync(prismaDir)` only checks top-level entries. The second fallback glob `**/prisma/*.prisma` in `scan-engine.ts:289` is also one level deep. A `prisma/subdir/models.prisma` layout would be missed by both paths. No known Prisma project uses nested subdirectories within the Prisma folder, but this is a documented gap.

- **Test — SQL-only edge case tests indirect path:** `scanProject.test.ts:210` — The test creates `prisma/migrations/001_init.sql`. Census's `readdirSync('prisma/')` sees `['migrations']` — a directory name, not a `.sql` file. The test passes because no direct `.prisma` files exist in `prisma/`, not because it explicitly filters `.sql` files. A more direct test would place `.sql` files directly in `prisma/` (e.g., `prisma/seed.sql`). The current test still validates the contract (A010, A011) correctly, but tests the directory-name-filter path, not the extension-filter path.

- **Test — A009 uses weak matcher when specific value is known:** `scanProject.test.ts:199` — `toBeGreaterThan(0)` when the test fixture has exactly 2 models. The contract specifies `greater: 0`, so the test matches the contract. But `toBe(2)` would catch regressions that `toBeGreaterThan(0)` wouldn't (e.g., if sibling counting broke and only returned 1 model).

- **Upstream — A002 uses `contains` matcher, allows ambiguous match:** Contract A002 says `target: schemas.prisma.path, matcher: contains, value: "schema.prisma"`. Both candidates (`prisma/schema.prisma` and `schema.prisma`) contain `"schema.prisma"`. The test passes regardless of which candidate wins — it can't distinguish them. The modelCount assertion (A001) indirectly proves the right candidate won, but A002 alone doesn't verify path correctness. A more precise value like `"prisma/schema.prisma"` would be unambiguous.

## Deployer Handoff

Straightforward bug fix. Three changes in two engine files — no new dependencies, no schema changes, no API changes, no migration needed. The `break` removal in census and directory handling in scan-engine are the core changes. Existing tests (monolith, monorepo sub-package) serve as regression guards.

The fix affects `ana scan` output for projects with multi-file Prisma schemas or dual `schema.prisma` files. No impact on projects with standard single-file layouts — those hit the same code path as before (census reports one file, scorer evaluates it, no directory handling needed).

## Verdict
**Shippable:** YES

13/13 contract assertions satisfied. 7/7 ACs pass. 1394 tests pass, 0 fail. Build clean. Lint clean. No regressions against existing Prisma tests. Code is tight, well-scoped, and follows engine conventions. The callouts are minor observations — none warrant blocking the ship.
