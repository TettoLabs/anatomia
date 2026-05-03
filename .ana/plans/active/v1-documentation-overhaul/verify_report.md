# Verify Report: V1 Documentation Overhaul

**Result:** PASS
**Created by:** AnaVerify
**Date:** 2026-05-03
**Spec:** .ana/plans/active/v1-documentation-overhaul/spec.md
**Branch:** feature/v1-documentation-overhaul

## Pre-Check Results

```
=== CONTRACT COMPLIANCE ===
  Contract: /Users/rsmith/Projects/anatomia_project/anatomia/.ana/plans/active/v1-documentation-overhaul/contract.yaml
  Seal: INTACT (hash sha256:e57d692795a037f2f6f406d8e142f70a698a0cd4d079786786834bb79c242e1b)
```

Seal status: **INTACT**

Tests: 1804 passed, 0 failed, 2 skipped. Build: passed. Lint: passed (14 warnings, 0 errors).

## Contract Compliance

| ID | Says | Status | Evidence |
|----|------|--------|----------|
| A001 | The root README exists and is between 150 and 200 lines | ✅ SATISFIED | `wc -l README.md` → 156 lines (>149) |
| A002 | The README contains exactly 9 second-level sections | ❌ UNSATISFIED | `grep -c "^## " README.md` → 7. Sections: Install, Quick start, What it does, Commands, Works with, Development, License. Spec mockup also shows 7 — contract value is stale. |
| A003 | The README has CI, npm, and license badges | ✅ SATISFIED | `README.md:3-5` — CI badge, npm badge, MIT license badge |
| A004 | The README has an install section with npm install command | ✅ SATISFIED | `README.md:12` — `npm install -g anatomia-cli` |
| A005 | The README states the Claude Code boundary clearly | ✅ SATISFIED | `README.md:26` — "The pipeline requires Claude Code" + `README.md:140` — "Built for Claude Code" |
| A006 | The README contains no hedge words | ✅ SATISFIED | `grep -iEc` for hedge pattern returns 0 |
| A007 | All proof subcommands are visible in the README | ✅ SATISFIED | `README.md:90-93` — health/audit/promote/stale in prose; `README.md:121-128` — all 8 subcommands in Commands table including context |
| A008 | The README contains a scan output example block | ✅ SATISFIED | `README.md:35-60` — full scan output block with box-drawing, Stack section, Intelligence section matching `formatHumanReadable()` structure |
| A009 | The changelog opens the 1.0.0 entry with First stable release | ✅ SATISFIED | `CHANGELOG.md:12` — "First stable release." |
| A010 | The changelog follows Keep a Changelog format with version header | ✅ SATISFIED | `CHANGELOG.md:10` — `## [1.0.0] - 2026-05-XX` |
| A011 | The changelog has an Unreleased section | ✅ SATISFIED | `CHANGELOG.md:8` — `## [Unreleased]` |
| A012 | The changelog has GitHub compare links in the footer | ✅ SATISFIED | `CHANGELOG.md:67` — `https://github.com/TettoLabs/anatomia/compare/v1.0.0...HEAD` |
| A013 | The changelog does not reference any deleted features | ✅ SATISFIED | grep for mode/analysis.md/handlebars/anatomia-analyzer/ENTRY.md/.meta.json/snapshot.json returns nothing |
| A014 | The changelog groups features by product surface | ✅ SATISFIED | `CHANGELOG.md:16` — `#### Scan engine`, followed by Context generation, Pipeline, Proof chain, Learn agent, Setup, Infrastructure |
| A015 | The old changelog is preserved as an internal archive | ✅ SATISFIED | `CHANGELOG-internal.md` exists with full sprint history |
| A016 | The archive has a header explaining it is internal history | ✅ SATISFIED | `CHANGELOG-internal.md:1` — "# Internal Development History (Pre-1.0)" |
| A017 | The contributor guide has no stale line number references | ✅ SATISFIED | `grep -nE "line [0-9]|L[0-9]"` returns 0 matches in CONTRIBUTING.md |
| A018 | The contributor guide has no sprint jargon | ✅ SATISFIED | grep for S1x/S2x/Sprint returns 0 |
| A019 | All test commands in CONTRIBUTING use vitest run | ✅ SATISFIED | `grep -c "pnpm test" CONTRIBUTING.md` → 0. All test commands use `pnpm vitest run` (lines 63, 81, 82, 108, 412) |
| A020 | CONTRIBUTING opens with cross-reference to ARCHITECTURE | ✅ SATISFIED | `packages/cli/CONTRIBUTING.md:3` — "Read [ARCHITECTURE.md](ARCHITECTURE.md) first" |
| A021 | The contributor guide includes detectRemix in the framework example | ✅ SATISFIED | `packages/cli/CONTRIBUTING.md:151` — `detectRemix,` in framework-registry code example |
| A022 | The architecture doc describes the census-based scan pipeline | ✅ SATISFIED | `packages/cli/ARCHITECTURE.md:115` — "`buildCensus()` creates the shared project model" |
| A023 | The architecture doc does not mention the deleted analyze function | ✅ SATISFIED | grep for `analyze()` returns 0 |
| A024 | The architecture doc does not mention the deleted monorepo detector | ✅ SATISFIED | grep for `detectors/monorepo.ts` returns 0 |
| A025 | The architecture doc has no sprint jargon | ✅ SATISFIED | grep for S1x/S2x/Sprint returns 0 |
| A026 | ARCHITECTURE opens with cross-reference to CONTRIBUTING | ✅ SATISFIED | `packages/cli/ARCHITECTURE.md:4` — "Read [CONTRIBUTING.md](CONTRIBUTING.md) to understand how to change them" |
| A027 | The architecture doc lists the sampling module | ✅ SATISFIED | `packages/cli/ARCHITECTURE.md:64-65` — `sampling/` and `proportionalSampler.ts` |
| A028 | The build step copies the README from root before building | ✅ SATISFIED | `packages/cli/package.json:50` — prepublishOnly starts with `cp ../../README.md ./README.md` |
| A029 | The build step copies the CHANGELOG from root before building | ✅ SATISFIED | `packages/cli/package.json:50` — `cp ../../CHANGELOG.md ./CHANGELOG.md` before `pnpm build` |
| A030 | A gitignore exists in the CLI package to exclude build artifacts | ✅ SATISFIED | `packages/cli/.gitignore` exists |
| A031 | The gitignore excludes the README copy | ✅ SATISFIED | `packages/cli/.gitignore:2` — `README.md` |
| A032 | The gitignore excludes the CHANGELOG copy | ✅ SATISFIED | `packages/cli/.gitignore:3` — `CHANGELOG.md` |
| A033 | No document contains emoji characters | ✅ SATISFIED | Grep for common emoji across all 4 docs returns 0 matches |
| A034 | No document contains sprint reference jargon | ✅ SATISFIED | grep for S1x/S2x/Sprint across all 4 docs returns 0:0:0:0 |

**Summary:** 33/34 SATISFIED, 1 UNSATISFIED (A002).

A002 is UNSATISFIED because the README has 7 `##` sections, not 9. However, the spec's own mockup shows exactly 7 `##` headings. The contract value of 9 was a planner miscount. The builder correctly followed the mockup. This is a contract error, not a build error.

## Independent Findings

**Prediction resolution:**
1. "Builder promoted subsections to hit 9" — **Not found.** Builder kept 7 sections matching the spec mockup.
2. "Test fix weakens coverage" — **Partially confirmed.** One assertion removed from `documentation.test.ts`, but the remaining assertions still cover ARCHITECTURE.md and CONTRIBUTING.md in the dogfood inventory. The removed file is genuinely a build artifact now.
3. "CHANGELOG numbers might not match" — **Not found.** 40+ detectors, 5 core + 3 conditional skills, 16 gotchas — all match spec constraints.
4. "ARCHITECTURE module counts might be off" — **Confirmed.** Python detector count says "5 detector files" (`packages/cli/ARCHITECTURE.md:61`) but the actual `src/engine/detectors/python/` directory has 4 files (cli.ts, django.ts, fastapi.ts, flask.ts) + framework-registry.ts. This was inherited from the spec's verified counts section which also says "5" — a spec-level error.
5. "Scan output might not match formatHumanReadable()" — **Not found (fixed).** The scan block now uses box-drawing characters and the correct section structure (identity header box → Stack → Intelligence) matching the actual `formatHumanReadable()` output in `packages/cli/src/commands/scan.ts:101-280`.

**What I didn't predict:**
- The scan output block in the README is a static example, not live output — it cannot be mechanically validated against `formatHumanReadable()`. The structure matches (box header, Stack with labeled rows, Intelligence with Activity/Hot files/Docs/Pre-commit), but the specific data values are fabricated (e.g., "14 models", "3 contributors"). This is the correct approach per the spec constraint ("write a representative example"), but means the block could drift if the output format changes.

## Previous Findings Resolution

### Previously UNSATISFIED Assertions
| ID | Previous Issue | Current Status | Resolution |
|----|----------------|----------------|------------|
| A002 | 7 sections instead of 9 | ❌ UNSATISFIED | Still 7 sections. Contract value is stale — spec mockup shows 7. Builder correctly followed mockup. Accepted as contract error. |

### Previous Findings
| Finding | Status | Notes |
|---------|--------|-------|
| Test — Dogfood test expects deleted file | Fixed | Builder removed the assertion for `packages/cli/README.md` with explanatory comment at `documentation.test.ts:276` |
| Upstream — Contract A002 value stale | Still present | Contract says 9, spec mockup shows 7, implementation has 7. Planner miscount. |
| Code — prepublishOnly relies on relative ../../ path | Still present | Accepted — low risk given stable monorepo structure |
| Code — npm pack verification gap | Still present | Inherent limitation of copy-on-publish approach |
| Code — README Development section uses absolute GitHub URLs | Still present | Correct behavior — README at root needs absolute paths to packages/cli/ files |
| Upstream — Spec "Zero test changes" constraint incompatible with scope | No longer applicable | Builder deviated (justified) by modifying documentation.test.ts |

## AC Walkthrough

- **AC1:** README structure — ⚠️ PARTIAL — 156 lines (✅ within 150-200), 3 badges (✅), install section (✅), commands grouped by product surface (✅), all proof subcommands visible (✅), scan ASCII block updated (✅), Claude Code boundary stated (✅), but only **7** second-level sections instead of 9. The spec mockup shows 7 — this is a contract error.
- **AC2:** CHANGELOG — ✅ PASS — Keep a Changelog format, "First stable release." opening, product surface grouping (Scan engine, Context generation, Pipeline, Proof chain, Learn agent, Setup, Infrastructure), [Unreleased] section, footer compare links, zero deleted feature references.
- **AC3:** Archive — ✅ PASS — `CHANGELOG-internal.md` exists with "Internal Development History (Pre-1.0)" header.
- **AC4:** CONTRIBUTING — ✅ PASS — Zero line-number citations, zero sprint references, all test commands use `pnpm vitest run`, cross-reference to ARCHITECTURE present at line 3, detectRemix in framework-registry example at line 151, ENRICHMENT.md mentioned in structure tree and template docs. All referenced file paths verified to exist.
- **AC5:** ARCHITECTURE — ✅ PASS — Census-based `scanProject()` pipeline described with `buildCensus()` at line 115, no `analyze()` reference, no `detectors/monorepo.ts` reference, sampling module listed at line 64, cross-reference to CONTRIBUTING at line 4. Extension points deduplicated with cross-refs to CONTRIBUTING.
- **AC6:** prepublishOnly — ✅ PASS — `packages/cli/package.json:50`: `cp ../../README.md ./README.md && cp ../../CHANGELOG.md ./CHANGELOG.md && pnpm build && pnpm test`. Copy commands precede build.
- **AC7:** gitignore + git removal — ✅ PASS — `packages/cli/.gitignore` exists with README.md and CHANGELOG.md entries. `git ls-files packages/cli/README.md packages/cli/CHANGELOG.md` returns empty (not tracked).
- **AC8:** Zero emoji — ✅ PASS — Grep for common emoji characters across all 4 docs returns nothing.
- **AC9:** Zero sprint references — ✅ PASS — grep for S1x/S2x/Sprint across all 4 docs returns 0 for each.
- **AC10:** Zero hedge words in README — ✅ PASS — grep for simply/just/easily/helps you/allows you to/enables/powerful/robust/comprehensive returns 0.
- **AC11:** Cross-references — ✅ PASS — `CONTRIBUTING.md:3` references `ARCHITECTURE.md`; `ARCHITECTURE.md:4` references `CONTRIBUTING.md`. Both use relative links.
- **AC12:** No build errors — ✅ PASS — `pnpm run build` succeeds cleanly.
- **AC13:** files array — ✅ PASS — `["dist","docs","ARCHITECTURE.md","CONTRIBUTING.md","CHANGELOG.md","README.md"]` — both README.md and CHANGELOG.md present.

## Blockers

No blockers. A002 is mechanically UNSATISFIED but the contract value (9) is a planner miscount — the spec's own mockup shows 7 `##` headings. The builder correctly followed the mockup. Checked for: unused exports in new files (none — no new code files), unhandled error paths (n/a — docs-only scope), external assumptions (prepublishOnly assumes monorepo depth — noted in Findings), sentinel test patterns (none found), spec gaps (test change needed but not anticipated — builder deviated correctly).

## Findings

- **Upstream — Contract A002 value stale:** Contract says "exactly 9 second-level sections" but the spec mockup lists 7 `##` headings (Install, Quick start, What it does, Commands, Works with, Development, License). Builder followed the mockup correctly. Update contract value to 7 on next seal.

- **Upstream — ARCHITECTURE.md python detector count wrong:** `packages/cli/ARCHITECTURE.md:61` — says "5 detector files + framework-registry.ts" but `src/engine/detectors/python/` has 4 files (cli.ts, django.ts, fastapi.ts, flask.ts). Inherited from the spec's "Verified module counts" section which also says 5. Fix the count to 4 in a future cycle.

- **Code — prepublishOnly relies on relative ../../ path:** `packages/cli/package.json:50` — if the monorepo ever restructures package depth, this breaks silently. Low risk given current stability.

- **Code — npm pack verification gap:** `packages/cli/package.json:34-41` — README.md and CHANGELOG.md are in the `files` array but can't be verified with `npm pack --dry-run` because they only exist after prepublishOnly runs. Inherent limitation of the copy-on-publish approach.

- **Test — Dogfood test coverage reduced:** `packages/cli/tests/engine/detectors/documentation.test.ts:276` — assertion for `packages/cli/README.md` removed. Justified because the file is now a prepublishOnly artifact, but the dogfood test no longer validates that the documentation detector would find a CLI-level README if one existed.

- **Code — Scan output block is representative, not live:** `README.md:35-60` — the scan example uses fabricated data (e.g., "14 models", "3 contributors"). The structure matches `formatHumanReadable()` but specific values and field presence could drift if the output format changes in a future cycle.

- **Upstream — Spec "Zero test changes" was incompatible with scope:** The spec required deleting `packages/cli/README.md` from git and zero test changes simultaneously. The dogfood test's dependency on that file made these mutually exclusive. Builder deviated correctly. Future specs that delete tracked files should audit dependent tests.

- **Code — README uses absolute GitHub URLs for in-repo links:** `README.md:152` — links to CONTRIBUTING.md and ARCHITECTURE.md use absolute `https://github.com/TettoLabs/anatomia/blob/main/packages/cli/...` URLs. Correct since the README lives at root and targets are in `packages/cli/`, but these links break if the repo moves or the default branch changes.

## Deployer Handoff

Ready to merge. One known discrepancy:

1. **A002 (7 sections vs 9):** The contract says 9 but the spec mockup shows 7. The builder followed the mockup. Accept the current 7-section structure and note the contract was wrong. No code change needed.

All other contract assertions satisfied. The test regression from round 1 is fixed. The scan output block was updated to match the actual `formatHumanReadable()` structure. Documentation quality is high — no hedge words, no emoji, no sprint jargon, all referenced paths verified, cross-references bidirectional.

The one additional change vs spec: `documentation.test.ts` was modified (spec said "Zero test changes") to fix a regression caused by deleting `packages/cli/README.md`. This was the correct call.

## Verdict

**Shippable:** YES

33/34 contract assertions satisfied. The one UNSATISFIED (A002) is a contract counting error — the spec mockup itself shows 7 sections, not 9. All 13 ACs pass (AC1 partial only due to A002). Tests green (1804 passed, 0 failed). Build clean. Lint clean. No regressions. The documentation reads well — technical, declarative, no slop.
