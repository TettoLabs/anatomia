# Verify Report: V1 Documentation Overhaul

**Result:** FAIL
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

Tests: 1803 passed, 1 failed, 2 skipped. Build: passed. Lint: passed.

The failing test (`documentation.test.ts:277`) is a regression introduced by this build — it expects `packages/cli/README.md` to exist on disk, but this build deleted it from git tracking.

## Contract Compliance

| ID | Says | Status | Evidence |
|----|------|--------|----------|
| A001 | The root README exists and is between 150 and 200 lines | ✅ SATISFIED | `wc -l README.md` → 150 lines |
| A002 | The README contains exactly 9 second-level sections | ❌ UNSATISFIED | `grep -c "^## " README.md` → 7. Sections: Install, Quick start, What it does, Commands, Works with, Development, License |
| A003 | The README has CI, npm, and license badges | ✅ SATISFIED | Lines 3-5: CI badge, npm badge, MIT license badge |
| A004 | The README has an install section with npm install command | ✅ SATISFIED | Line 12: `npm install -g anatomia-cli` |
| A005 | The README states the Claude Code boundary clearly | ✅ SATISFIED | Line 26: "The pipeline requires Claude Code" + line 134: "Built for Claude Code" |
| A006 | The README contains no hedge words | ✅ SATISFIED | `grep -iE` for hedge word pattern returns nothing |
| A007 | All proof subcommands are visible in the README | ✅ SATISFIED | Line 84: `ana proof health` present, plus health/audit/promote/stale/context all listed lines 115-122 |
| A008 | The README contains a scan output example block | ✅ SATISFIED | Lines 35-54: full scan output block with `ana scan` context |
| A009 | The changelog opens the 1.0.0 entry with First stable release | ✅ SATISFIED | CHANGELOG.md line 12: "First stable release." |
| A010 | The changelog follows Keep a Changelog format with version header | ✅ SATISFIED | Line 10: `## [1.0.0] - 2026-05-XX` |
| A011 | The changelog has an Unreleased section | ✅ SATISFIED | Line 8: `## [Unreleased]` |
| A012 | The changelog has GitHub compare links in the footer | ✅ SATISFIED | Line 67: `https://github.com/TettoLabs/anatomia/compare/v1.0.0...HEAD` |
| A013 | The changelog does not reference any deleted features | ✅ SATISFIED | grep for mode/analysis.md/handlebars/anatomia-analyzer/ENTRY.md/.meta.json/snapshot.json returns nothing |
| A014 | The changelog groups features by product surface | ✅ SATISFIED | Line 16: `#### Scan engine` present, followed by Context generation, Pipeline, Proof chain, Learn agent, Setup, Infrastructure |
| A015 | The old changelog is preserved as an internal archive | ✅ SATISFIED | `CHANGELOG-internal.md` exists with full sprint history |
| A016 | The archive has a header explaining it is internal history | ✅ SATISFIED | Line 1: "# Internal Development History (Pre-1.0)" |
| A017 | The contributor guide has no stale line number references | ✅ SATISFIED | `grep -nE "line [0-9]|L[0-9]"` returns nothing in CONTRIBUTING.md |
| A018 | The contributor guide has no sprint jargon | ✅ SATISFIED | grep for S1x/S2x/Sprint returns nothing |
| A019 | All test commands in CONTRIBUTING use vitest run | ✅ SATISFIED | grep for bare "pnpm test" returns nothing; all test commands use `pnpm vitest run` |
| A020 | CONTRIBUTING opens with cross-reference to ARCHITECTURE | ✅ SATISFIED | Line 3: "Read [ARCHITECTURE.md](ARCHITECTURE.md) first" |
| A021 | The contributor guide includes detectRemix in the framework example | ✅ SATISFIED | Line 151: `detectRemix,` in the framework-registry code example |
| A022 | The architecture doc describes the census-based scan pipeline | ✅ SATISFIED | Line 115: "`buildCensus()` creates the shared project model" |
| A023 | The architecture doc does not mention the deleted analyze function | ✅ SATISFIED | grep for `analyze()` returns nothing |
| A024 | The architecture doc does not mention the deleted monorepo detector | ✅ SATISFIED | grep for `detectors/monorepo.ts` returns nothing |
| A025 | The architecture doc has no sprint jargon | ✅ SATISFIED | grep for sprint references returns nothing |
| A026 | ARCHITECTURE opens with cross-reference to CONTRIBUTING | ✅ SATISFIED | Line 4: "Read [CONTRIBUTING.md](CONTRIBUTING.md) to understand how to change them" |
| A027 | The architecture doc lists the sampling module | ✅ SATISFIED | Line 64: `sampling/` and `proportionalSampler.ts` in module layout |
| A028 | The build step copies the README from root before building | ✅ SATISFIED | prepublishOnly: `cp ../../README.md ./README.md && cp ../../CHANGELOG.md ./CHANGELOG.md && pnpm build && pnpm test` |
| A029 | The build step copies the CHANGELOG from root before building | ✅ SATISFIED | Same script, `cp ../../CHANGELOG.md ./CHANGELOG.md` before `pnpm build` |
| A030 | A gitignore exists in the CLI package to exclude build artifacts | ✅ SATISFIED | `packages/cli/.gitignore` exists |
| A031 | The gitignore excludes the README copy | ✅ SATISFIED | File contains `README.md` |
| A032 | The gitignore excludes the CHANGELOG copy | ✅ SATISFIED | File contains `CHANGELOG.md` |
| A033 | No document contains emoji characters | ✅ SATISFIED | grep for emoji ranges across all 4 docs returns nothing |
| A034 | No document contains sprint reference jargon | ✅ SATISFIED | grep for S1x/S2x/Sprint across all 4 docs returns nothing |

**Summary:** 33/34 SATISFIED, 1 UNSATISFIED (A002).

## Independent Findings

**Prediction resolution:**
1. Dogfood test regression from deleted file — **CONFIRMED.** `documentation.test.ts:277` expects `packages/cli/README.md` to exist. The builder followed the spec ("Zero test changes") but the spec didn't account for this test's dependency on the deleted file. This is a genuine regression — the test suite fails.
2. Section count mismatch — **CONFIRMED.** The spec mockup itself shows 7 `##` headings, but the contract says 9. The builder correctly followed the mockup. This is a planner error in the contract assertion value.
3. `npm pack --dry-run` untestable — **CONFIRMED.** Since `packages/cli/README.md` doesn't exist on disk (only created at prepublish time), `npm pack --dry-run` cannot confirm inclusion. The `files` array lists them, which is the correct belt-and-suspenders approach.

**What I didn't predict:**
- The README Development section links use absolute GitHub URLs (`https://github.com/TettoLabs/anatomia/blob/main/packages/cli/CONTRIBUTING.md`) while the spec's Gotchas section says "Use relative links between CONTRIBUTING.md and ARCHITECTURE.md — they live in the same directory." However, the README lives at root, not in `packages/cli/`, so absolute URLs are actually correct here. The relative link guidance was specifically for the cross-references BETWEEN CONTRIBUTING and ARCHITECTURE (which correctly use relative links). Not a real issue.

## AC Walkthrough

- **AC1:** README structure — ⚠️ PARTIAL — 150 lines (✅), 3 badges (✅), install section (✅), commands grouped (✅), proof subcommands (✅), scan block (✅), Claude Code boundary (✅), but only **7** second-level sections instead of 9. The spec mockup itself shows 7, suggesting the "9" in AC1 was a miscount by the planner.
- **AC2:** CHANGELOG — ✅ PASS — Keep a Changelog format, "First stable release." opening, product surface grouping, [Unreleased] section, footer compare links, zero deleted feature references.
- **AC3:** Archive — ✅ PASS — CHANGELOG-internal.md exists with "Internal Development History" header.
- **AC4:** CONTRIBUTING — ✅ PASS — Zero line-number citations, zero sprint references, test commands use `pnpm vitest run`, cross-reference to ARCHITECTURE present, detectRemix in example.
- **AC5:** ARCHITECTURE — ✅ PASS — Census-based `scanProject()` pipeline described with `buildCensus()`, no `analyze()` reference, no `detectors/monorepo.ts` reference, sampling module listed, cross-reference to CONTRIBUTING present.
- **AC6:** prepublishOnly — ✅ PASS — Script copies both files before build: `cp ../../README.md ./README.md && cp ../../CHANGELOG.md ./CHANGELOG.md && pnpm build && pnpm test`
- **AC7:** gitignore + git removal — ✅ PASS — `.gitignore` exists with README.md and CHANGELOG.md entries; `git ls-files` returns empty for both (not tracked).
- **AC8:** Zero emoji — ✅ PASS — grep across all 4 docs returns nothing.
- **AC9:** Zero sprint references — ✅ PASS — grep across all 4 docs returns nothing.
- **AC10:** Zero hedge words in README — ✅ PASS — grep for hedge word pattern returns nothing.
- **AC11:** Cross-references — ✅ PASS — CONTRIBUTING line 3 references ARCHITECTURE.md; ARCHITECTURE line 4 references CONTRIBUTING.md. Both use relative links.
- **AC12:** No build errors — ✅ PASS — `pnpm run build` succeeds cleanly.
- **AC13:** files array — ✅ PASS — `["dist","docs","ARCHITECTURE.md","CONTRIBUTING.md","CHANGELOG.md","README.md"]` includes both.

## Blockers

1. **Test regression:** `packages/cli/tests/engine/detectors/documentation.test.ts:277` fails. The test expects `packages/cli/README.md` to exist on the filesystem. This build deleted it (correctly, per spec). The spec said "Zero test changes" but this constraint conflicts with the delete operation. The test must be updated to either skip the README.md check or account for the file being a build artifact. This is a regression — tests pass on main, fail on this branch.

2. **A002 UNSATISFIED — 7 sections vs 9:** The README has 7 second-level (`##`) headings. The contract asserts exactly 9. The spec mockup also shows 7, suggesting this is a planner miscount. Two resolution paths: (a) restructure the README to have 9 `##` sections (e.g., promote "Scan + init" and "The pipeline" subsections), or (b) accept that the contract value is wrong. Either way, the mechanical check fails.

## Findings

- **Test — Dogfood test expects deleted file:** `packages/cli/tests/engine/detectors/documentation.test.ts:277` — asserts `packages/cli/README.md` exists in documentation inventory. File was deliberately deleted from git tracking by this build. The spec's "Zero test changes" constraint made this a trap — the builder followed instructions correctly but the constraint was incompatible with the file deletion. Needs a one-line fix: remove or adjust the assertion for `packages/cli/README.md`.

- **Upstream — Contract A002 value stale:** Contract says "exactly 9 second-level sections" but the spec mockup lists 7 `##` headings (Install, Quick start, What it does, Commands, Works with, Development, License). The builder followed the mockup correctly. Update contract value to 7 on next seal, or restructure README to have 9 sections if that was the true intent.

- **Code — prepublishOnly relies on relative ../../ path:** `packages/cli/package.json` — if the monorepo ever restructures package depth, this breaks silently. Low risk given current stability, but worth noting for future moves.

- **Code — npm pack verification gap:** `packages/cli/package.json` — README.md and CHANGELOG.md are in the `files` array but can't be verified with `npm pack --dry-run` because they only exist after prepublishOnly runs. The `files` array declaration is correct; this is an inherent limitation of the copy-on-publish approach.

- **Code — README Development section uses absolute GitHub URLs:** `README.md:146` — links to CONTRIBUTING.md and ARCHITECTURE.md use `https://github.com/TettoLabs/anatomia/blob/main/packages/cli/...`. This is actually correct since the README lives at root and the files are in `packages/cli/`. Not a bug, but noted because the spec's gotchas section about "relative links" could be misread as applying here.

- **Upstream — Spec "Zero test changes" constraint was incompatible with scope:** The spec simultaneously required deleting `packages/cli/README.md` from git and zero test changes. The dogfood test's dependency on that file made these mutually exclusive. Future specs that delete tracked files should audit dogfood tests as part of the impact assessment.

## Deployer Handoff

Two items need resolution before merge:

1. **Fix the dogfood test** — either update `documentation.test.ts:277` to not expect `packages/cli/README.md`, or add a comment explaining the file is a prepublishOnly artifact. One-line change.

2. **Resolve A002** — decide whether the README should have 9 `##` sections (restructure) or the contract had a bad value (accept 7 and note in build report). The spec mockup shows 7; this is likely a planner miscount. If accepting 7, no code change needed — just acknowledge in the next cycle.

After those fixes, re-verify. Everything else is clean — the documentation quality is high, the voice is consistent, no hedge words, no sprint jargon, no emoji, cross-references work, prepublishOnly is correct, gitignore is correct.

## Verdict

**Shippable:** NO

One test regression (dogfood test expects deleted file) and one UNSATISFIED contract assertion (7 sections vs 9 required). The test fix is trivial — one line. The section count issue is likely a contract error rather than a build error, but it needs a decision before shipping.
