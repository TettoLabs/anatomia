# Verify Report: Add project kind detection

**Result:** FAIL
**Created by:** AnaVerify
**Date:** 2026-04-15
**Spec:** .ana/plans/active/add-project-kind-detection/spec.md
**Branch:** feature/add-project-kind-detection

## Pre-Check Results
```
=== CONTRACT COMPLIANCE ===
  Contract: .ana/plans/active/add-project-kind-detection/contract.yaml
  Seal: INTACT (commit c86a2a2, hash sha256:e24cd4dbe8775...)

  A001  ✓ COVERED  "The scan result includes a project kind classification"
  A002  ✓ COVERED  "Scanning a Node CLI project with a bin field detects it as a CLI tool"
  A003  ✓ COVERED  "Detection works without reading the filesystem"
  A004  ✓ COVERED  "New projects default to unknown kind until classified"
  A005  ✓ COVERED  "A project with a bin field in package.json is classified as a CLI tool"
  A006  ✓ COVERED  "A project with CLI dependencies like commander is classified as a CLI tool"
  A007  ✓ COVERED  "A project with a browser framework like React is classified as a web app"
  A008  ✓ COVERED  "A project with a server framework and no browser UI is classified as an API server"
  A009  ✓ COVERED  "A project with both server and browser frameworks is classified as full-stack"
  A010  ✓ COVERED  "A project exporting a library without CLI or framework signals is classified as a library"
  A011  ✓ COVERED  "A project with no recognizable signals is classified as unknown"
  A012  ✓ COVERED  "Non-Node projects are not falsely classified"
  A013  ✓ COVERED  "The bin field takes priority over library export markers"
  A014  ✓ COVERED  "CLI dependencies take priority over library export markers"
  A015  ✓ COVERED  "Project descriptions use the kind for accurate labels like CLI tool or library"
  A016  ✓ COVERED  "The census tracks whether each package declares CLI binaries"

  16 total · 16 covered · 0 uncovered
```

Seal: INTACT. Tests: 1106 passed, 0 failed, 0 skipped (86 test files). Build: clean. Lint: clean. Baseline was 1074 tests in 85 files — 32 new tests in 1 new test file.

**Pre-check caveat:** A015 is a false positive. Pre-check found `@ana A015` in `tests/commands/proof.test.ts:296` — that tag belongs to the proof-list-view feature's contract, not this one. No test in `projectKind.test.ts` or any other file carries an `@ana A015` tag for this feature's assertion.

## Contract Compliance

| ID   | Says                                                                      | Status          | Evidence |
|------|---------------------------------------------------------------------------|-----------------|----------|
| A001 | The scan result includes a project kind classification                     | ✅ SATISFIED     | projectKind.test.ts:211 — `expect(result).toHaveProperty('projectKind')` on `createEmptyEngineResult()`. Also verified: `engineResult.ts:61` declares `projectKind: ProjectKind` on `EngineResult`. |
| A002 | Scanning a Node CLI project with a bin field detects it as a CLI tool      | ✅ SATISFIED     | projectKind.test.ts:196-206 — Anatomia-like input (hasBin + commander + exports), asserts `result.kind === 'cli'`. Live test confirmed: `node dist/index.js scan --json` on Anatomia → `projectKind: "cli"`. |
| A003 | Detection works without reading the filesystem                             | ✅ SATISFIED     | projectKind.test.ts:186-191 — reads source file, asserts `not.toContain('node:fs')`. Matches contract matcher `not_contains` / value `node:fs`. Manually verified: `projectKind.ts` has zero `node:fs` or `node:path` imports. |
| A004 | New projects default to unknown kind until classified                      | ✅ SATISFIED     | projectKind.test.ts:220-224 — `expect(result.projectKind).toBe('unknown')`. Verified: `engineResult.ts:322` — `projectKind: 'unknown'` in factory. |
| A005 | A project with a bin field in package.json is classified as a CLI tool     | ✅ SATISFIED     | projectKind.test.ts:22 — `makeInput({ hasBin: true })`, asserts `result.kind === 'cli'`. |
| A006 | A project with CLI dependencies like commander is classified as a CLI tool | ✅ SATISFIED     | projectKind.test.ts:34-52 — Tests commander, yargs, meow, cac. All assert `result.kind === 'cli'`. |
| A007 | A project with a browser framework like React is classified as a web app   | ✅ SATISFIED     | projectKind.test.ts:58-75 — Tests Next.js, React, Vue, Svelte. All assert `result.kind === 'web-app'`. |
| A008 | A project with a server framework and no browser UI is classified as an API server | ✅ SATISFIED | projectKind.test.ts:80-93 — Tests Express, Fastify, Hono without browser deps. All assert `result.kind === 'api-server'`. |
| A009 | A project with both server and browser frameworks is classified as full-stack | ✅ SATISFIED   | projectKind.test.ts:98-111 — Tests Express+React, Fastify+Vue, NestJS+next. All assert `result.kind === 'full-stack'`. |
| A010 | A project exporting a library without CLI or framework signals is classified as a library | ✅ SATISFIED | projectKind.test.ts:116-129 — Tests hasMain, hasExports, and both. All assert `result.kind === 'library'`. |
| A011 | A project with no recognizable signals is classified as unknown            | ✅ SATISFIED     | projectKind.test.ts:134-137 — `makeInput()` (all defaults, no signals), asserts `result.kind === 'unknown'`. |
| A012 | Non-Node projects are not falsely classified                               | ✅ SATISFIED     | projectKind.test.ts:142-156 — Tests python (with hasBin!), go (with commander!), rust. All assert `result.kind === 'unknown'` despite having signals that would classify Node projects. |
| A013 | The bin field takes priority over library export markers                    | ✅ SATISFIED     | projectKind.test.ts:160-168 — hasBin+hasMain and hasBin+hasExports both return `cli`. |
| A014 | CLI dependencies take priority over library export markers                 | ✅ SATISFIED     | projectKind.test.ts:173-181 — commander+hasMain and yargs+hasExports both return `cli`. |
| A015 | Project descriptions use the kind for accurate labels like CLI tool or library | ❌ UNSATISFIED | Pre-check false positive: `@ana A015` in `proof.test.ts:296` belongs to a different feature's contract (proof-list-view). No test in this feature's files exercises the scaffold-generators.ts projectKind branch (lines 36-47). The code IS correct — `scaffold-generators.ts:38-44` maps kinds to labels, and line 46 prefixes with framework/language. But no test proves it. |
| A016 | The census tracks whether each package declares CLI binaries               | ❌ UNSATISFIED | projectKind.test.ts:229-233 — Test asserts `expect(buildCensus).toBeDefined()`, which is a sentinel: it passes regardless of whether `hasBin` exists on SourceRoot. The import succeeding doesn't prove `hasBin` is on the type. The field DOES exist (verified: `census.ts:23` declares `hasBin: boolean` on SourceRoot, and all 3 construction paths set it), but the test doesn't assert this. |

## Independent Findings

**Code quality is high.** The detector follows the `deployment.ts` pattern precisely: pure function, typed input/output, no filesystem reads. Signal priority is clean — early returns make the precedence obvious and testable. The census wiring correctly adds `hasBin` to all three SourceRoot construction paths (no-package-json at line 305, single-repo at line 317, monorepo at line 331). The scan-engine integration reads `main`/`module`/`exports` from package.json at the call site (not census), per spec.

**Framework name casing mismatch (latent bug):** The detector's `BROWSER_FRAMEWORKS` and `SERVER_FRAMEWORKS` sets use display names (`"Koa"`, `"SvelteKit"`, `"Nuxt"`, `"Astro"`, `"Solid"`, `"Adonis"`). But `getFrameworkDisplayName()` in `displayNames.ts` only maps frameworks that are in `FRAMEWORK_DISPLAY_NAMES`. Frameworks NOT in that map fall through to the raw internal key (lowercase). Currently detected frameworks that would be affected:
- `'koa'` (internal) → display `'koa'` (not in map) → detector checks `SERVER_FRAMEWORKS.has('koa')` → false (set has `'Koa'`). **Koa projects would be misclassified as library/unknown instead of api-server.**
- `'react-router'` (internal) → display `'React Router'` (in map) → detector checks `BROWSER_FRAMEWORKS.has('React Router')` → false (set has no 'React Router'). **React Router v7 projects would be misclassified.**

Other frameworks in the detector sets (Nuxt, Astro, SvelteKit, Solid, Adonis) are not currently detected by the framework detector, so the mismatch is dormant for now.

**Test quality for A001-A014:** Excellent. Tests use the `makeInput()` helper pattern, each assertion is specific (`toBe('cli')` not `toBeDefined()`), the non-Node tests smartly include would-be-matching signals (hasBin on python, commander on go) to prove the short-circuit works. No sentinel patterns.

**Two test gaps prevent PASS:**
1. **A015** — No test exercises the scaffold-generators.ts projectKind branch (lines 36-47). The existing scaffold test (`all-scaffolds.test.ts:30`) uses `createEmptyEngineResult()` which has `projectKind: 'unknown'`, so the new branch is never hit. Fix: add a test with `projectKind: 'cli'` and assert output contains `'CLI tool'`.
2. **A016** — The test is a sentinel. `expect(buildCensus).toBeDefined()` doesn't verify `hasBin` on SourceRoot. Fix: import a `SourceRoot` value (e.g., from a mock census) and assert `'hasBin' in sourceRoot`, or construct a minimal SourceRoot and check the property.

**Over-building check:** No over-building detected. The CLI_DEPS set is comprehensive but reasonable (12 entries). The detector doesn't export anything unused. No extra parameters on `detectProjectKind`. The `ProjectKindResult` interface is lean (just `kind`).

## AC Walkthrough

- **AC1:** `projectKind` field exists on `EngineResult` with correct union type → ✅ PASS. `engineResult.ts:61` declares `projectKind: ProjectKind`. Type defined at `projectKind.ts:9`: `'cli' | 'library' | 'web-app' | 'api-server' | 'full-stack' | 'unknown'`.
- **AC2:** Scanning Anatomia produces `projectKind: 'cli'` → ✅ PASS. Live test: `node dist/index.js scan --json` → `projectKind: "cli"`.
- **AC3:** Detection is a pure function → ✅ PASS. `projectKind.ts` has zero filesystem imports. Input interface takes plain data. No side effects.
- **AC4:** `createEmptyEngineResult()` includes `projectKind: 'unknown'` → ✅ PASS. `engineResult.ts:322`.
- **AC5:** Scaffold generator uses `projectKind` → ✅ PASS. `scaffold-generators.ts:36-47` maps projectKind to labels. Monorepo takes precedence, unknown falls through to existing logic. Code verified correct.
- **AC6:** Unit tests cover all 6 classification outcomes → ✅ PASS. cli (lines 20-52), web-app (56-76), api-server (79-93), full-stack (97-111), library (115-130), unknown (133-137).
- **AC7:** Non-Node returns unknown → ✅ PASS. Tests at lines 141-156 cover python, go, rust — all return unknown even with matching signals.
- **Tests pass:** ✅ PASS. 1106 passed, 0 failed.
- **Build clean:** ✅ PASS. `pnpm run build` succeeds, typecheck passes.
- **Lint clean:** ✅ PASS. `pnpm run lint` succeeds with no warnings.

## Blockers

Two contract assertions are UNSATISFIED due to test gaps:

1. **A015 (scaffold description):** No test tagged `@ana A015` exercises the projectKind-to-label path in `scaffold-generators.ts`. Pre-check reported COVERED due to a stale tag in `proof.test.ts` from a different feature. **Fix:** Add a test in `projectKind.test.ts` that imports `generateProjectContextScaffold`, passes an EngineResult with `projectKind: 'cli'` and `stack.language: 'TypeScript'`, and asserts output contains `'CLI tool'`. Tag with `// @ana A015`.

2. **A016 (hasBin on SourceRoot):** Current test (`projectKind.test.ts:229-233`) is a sentinel — `expect(buildCensus).toBeDefined()` passes regardless of whether `hasBin` exists. **Fix:** Import the `SourceRoot` type and construct a type-safe object, or assert `hasBin` property directly on a census output. Alternatively, build a minimal SourceRoot with `hasBin: true` and assert the field value.

## Callouts

**Code — Framework name coupling is fragile:** `projectKind.ts:43-64` uses display names in `BROWSER_FRAMEWORKS` and `SERVER_FRAMEWORKS` sets, but depends on `getFrameworkDisplayName()` returning those exact strings. Two currently-detectable frameworks fail this contract: Koa (`'koa'` → not mapped → raw key `'koa'` ≠ `'Koa'` in set) and React Router (`'React Router'` not in BROWSER_FRAMEWORKS). This works today because Koa and React Router projects are rare edge cases and the contract tests don't exercise them, but it's a latent misclassification bug. Consider: either (a) lowercase both the input and the set contents, or (b) use internal framework keys instead of display names.

**Code — `hasBrowserDep` check in full-stack path mixes abstraction levels:** `projectKind.ts:105-107` checks both `BROWSER_FRAMEWORKS` display names and lowercase npm package names (`'react'`, `'vue'`, `'next'`). This works but creates two parallel lists of browser UI signals that could drift. The BROWSER_FRAMEWORKS set uses display names ("React", "Next.js") while the inline array uses npm names ("react", "next"). A future maintainer adding a framework to one list could miss the other.

**Test — Priority tests don't cover framework-vs-CLI precedence:** Tests cover bin-over-library (A013) and CLI-dep-over-library (A014), but don't test bin-over-framework or CLI-dep-over-framework. For example: a project with `hasBin: true` AND `frameworkName: 'Express'` — the priority chain says `cli` wins, but no test proves it.

**Test — A016 sentinel pattern:** `expect(buildCensus).toBeDefined()` is a textbook sentinel — it asserts on an import's existence, which passes whether or not `hasBin` is on `SourceRoot`. The comment ("compile-time check via import") overstates what the test does. TypeScript compilation IS evidence, but the test's assertion isn't.

**Upstream — Pre-check false positive on cross-feature tag reuse:** Pre-check found `@ana A015` in `proof.test.ts:296`, which belongs to the proof-list-view feature's contract. The tool doesn't scope tag searches to the current feature. This masked a real gap — A015 has no test for this feature. Future improvement: scope `@ana` tag searches to files modified in the feature branch.

## Deployer Handoff

**What changed:** New `projectKind` field on EngineResult. Pure-function detector classifies Node projects as cli/library/web-app/api-server/full-stack/unknown. Census now tracks `hasBin` on each SourceRoot. Scaffold generator produces better descriptions ("TypeScript CLI tool" instead of "TypeScript project").

**What to watch after merge:**
- Existing scan tests (83 tests in scan.test.ts) all pass — no regressions.
- The `projectKind` field appears in `scan.json` output. Existing consumers that don't know about it will ignore it (additive change).
- The scaffold description change is visible in `ana init` output — verify on a fresh project that the description looks correct.

**Before merging:** Two test gaps must be fixed (A015 scaffold test, A016 sentinel replacement). These are the only items blocking PASS.

## Verdict
**Shippable:** NO

The implementation is correct — all code paths work as specified, all ACs are functionally met, live testing confirms `projectKind: 'cli'` on Anatomia. The FAIL is entirely about two test gaps: A015 (no test for scaffold projectKind branch — pre-check was fooled by a stale tag from another feature) and A016 (sentinel test that doesn't assert what the contract requires). Both are straightforward 5-minute fixes. The latent Koa/React Router framework name mismatch is a callout, not a blocker — those paths aren't exercised by this feature's contract.
