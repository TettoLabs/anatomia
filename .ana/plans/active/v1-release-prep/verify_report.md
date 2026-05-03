# Verify Report: V1 Release Prep

**Result:** PASS
**Created by:** AnaVerify
**Date:** 2026-05-03
**Spec:** .ana/plans/active/v1-release-prep/spec.md
**Branch:** feature/v1-release-prep

## Pre-Check Results
```
=== CONTRACT COMPLIANCE ===
  Contract: /Users/rsmith/Projects/anatomia_project/anatomia/.ana/plans/active/v1-release-prep/contract.yaml
  Seal: INTACT (hash sha256:74b1e3043bda384dc8caad2f8d2f4eb375bd5dae6431b69924d4298457e0d5ed)
```

Tests: 1807 passed, 2 skipped (1809 total), 93 test files. Build: success. Lint: success.

## Contract Compliance
| ID | Says | Status | Evidence |
|----|------|--------|----------|
| A001 | Package version is set to 1.0.0 | ✅ SATISFIED | `packages/cli/package.json:3` — `"version": "1.0.0"` |
| A002 | Package description tells strangers what the tool does | ✅ SATISFIED | `packages/cli/package.json:4` — exact match |
| A003 | Keywords include context-engineering | ✅ SATISFIED | `packages/cli/package.json:14` — present in array |
| A004 | Keywords include proof-chain | ✅ SATISFIED | `packages/cli/package.json:16` — present in array |
| A005 | The generic ai-assistant keyword is removed | ✅ SATISFIED | `packages/cli/package.json:11-22` — not in keywords array |
| A006 | Package homepage points to anatomia.dev | ✅ SATISFIED | `packages/cli/package.json:28` — `"https://anatomia.dev"` |
| A007 | Author includes the company URL | ✅ SATISFIED | `packages/cli/package.json:33-35` — `{ "name": "TettoLabs", "url": "https://anatomia.dev" }` |
| A008 | Only compiled code ships to npm | ✅ SATISFIED | `packages/cli/package.json:39-41` — `"files": ["dist"]` |
| A009 | Version fallback uses 0.0.0 sentinel | ✅ SATISFIED | `packages/cli/src/commands/init/state.ts:152` — `|| '0.0.0'` |
| A010 | Version fallback in catch uses 0.0.0 | ✅ SATISFIED | `packages/cli/src/commands/init/state.ts:154` — `return '0.0.0'` |
| A011 | Empty analysis result uses 0.0.0 | ✅ SATISFIED | `packages/cli/src/engine/types/index.ts:115` — `version: '0.0.0'` |
| A012 | No test files reference 0.2.0 | ✅ SATISFIED | `grep -r "'0.2.0'" packages/cli/tests/` returns zero results |
| A013 | No source files reference 0.2.0 | ✅ SATISFIED | `grep -r "'0.2.0'" packages/cli/src/` returns zero results |
| A014 | Schema round-trip preserves 1.0.0 | ✅ SATISFIED | `packages/cli/tests/commands/init/anaJsonSchema.test.ts:34` — `toBe('1.0.0')` |
| A015 | Empty analysis result test asserts 0.0.0 | ✅ SATISFIED | `packages/cli/tests/engine/types.test.ts:36` — `toBe('0.0.0')` |
| A016 | Release workflow triggers on v* tags | ✅ SATISFIED | `.github/workflows/release.yml:5` — `tags: ['v*']` |
| A017 | Published packages include provenance | ✅ SATISFIED | `.github/workflows/release.yml:34` — `--provenance` |
| A018 | Workflow has id-token write permission | ✅ SATISFIED | `.github/workflows/release.yml:12` — `id-token: write` |
| A019 | Release script is one-liner | ✅ SATISFIED | `package.json:12` — `"release": "cd packages/cli && npm version"` |
| A020 | SECURITY.md exists | ✅ SATISFIED | File present at repo root, 35 lines |
| A021 | CODE_OF_CONDUCT.md exists | ✅ SATISFIED | File present at repo root, 85 lines |
| A022 | Code of conduct is Contributor Covenant | ✅ SATISFIED | `CODE_OF_CONDUCT.md:2` — "Contributor Covenant Code of Conduct" |
| A023 | Bug report template exists | ✅ SATISFIED | `.github/ISSUE_TEMPLATE/bug_report.yml` — 63 lines, YAML form |
| A024 | Feature request template exists | ✅ SATISFIED | `.github/ISSUE_TEMPLATE/feature_request.yml` — 33 lines, YAML form |
| A025 | PR template exists | ✅ SATISFIED | `.github/PULL_REQUEST_TEMPLATE.md` — 12 lines |
| A026 | Dependabot config exists | ✅ SATISFIED | `.github/dependabot.yml` — covers npm and github-actions, weekly |
| A027 | Gitignore includes website/.ana/ | ✅ SATISFIED | `.gitignore:71` — `website/.ana/` |
| A028 | proof-chain-agent-integration.md deleted | ✅ SATISFIED | `test -f` returns false |
| A029 | packages/cli/AGENTS.md deleted | ✅ SATISFIED | `test -f` returns false |
| A030 | npm pack excludes ARCHITECTURE.md | ✅ SATISFIED | `npm pack --dry-run` output grep for ARCHITECTURE returns empty |
| A031 | npm pack includes dist/ | ✅ SATISFIED | `npm pack --dry-run` shows 12+ dist/ entries |
| A032 | All tests pass | ✅ SATISFIED | 1807 passed, 2 skipped, exit code 0 |
| A033 | Build succeeds | ✅ SATISFIED | `pnpm run build` — "2 successful, 2 total" |

## Independent Findings

**Prediction resolution:**
1. "Missed 0.2.0 occurrence" — **Not found.** `grep -r "'0.2.0'" packages/cli/src/ packages/cli/tests/` returns zero.
2. "Keywords array slightly off" — **Not found.** Array matches spec exactly: includes context-engineering, code-verification, proof-chain, pipeline; excludes ai-assistant.
3. "npm pack includes something unexpected" — **Confirmed (minor).** Pack doesn't include README.md or CHANGELOG.md in dry-run because prepublishOnly hasn't run. This is expected behavior — npm auto-includes README only from the package directory, and prepublishOnly copies it there.
4. "Community files off-template" — **Not found.** CoC is verbatim Contributor Covenant v2.1. SECURITY.md uses correct email. Bug/feature templates have correct YAML form syntax.
5. "Release workflow subtle issue" — **Partially confirmed.** See findings below about duplicated doc-copy logic.

**What I didn't predict:** The test count increased from baseline (1804 → 1807). This suggests other work merged into main since the spec was written. Not a concern — all pass.

## AC Walkthrough
- ✅ AC1: `packages/cli/package.json` version is `"1.0.0"` — line 3
- ✅ AC2: Description matches exact string — line 4
- ✅ AC3: Keywords include all 4 required terms, exclude ai-assistant — lines 14-16
- ✅ AC4: Homepage is `"https://anatomia.dev"` — line 28
- ✅ AC5: Author is `{ "name": "TettoLabs", "url": "https://anatomia.dev" }` — lines 33-35
- ✅ AC6: Files array is `["dist"]` — lines 39-41
- ✅ AC7: Both fallbacks in state.ts are `'0.0.0'` — lines 152, 154
- ✅ AC8: createEmptyAnalysisResult version is `'0.0.0'` — types/index.ts:115
- ✅ AC9: Zero `0.2.0` in src/ and tests/. anaJsonSchema.test.ts asserts `toBe('1.0.0')` at lines 34, 162. types.test.ts asserts `toBe('0.0.0')` at line 36.
- ✅ AC10: release.yml has v* trigger, --provenance, id-token: write, full pipeline, gh release create
- ✅ AC11: Root package.json has `"release": "cd packages/cli && npm version"` — line 12
- ✅ AC12: SECURITY.md exists at repo root
- ✅ AC13: CODE_OF_CONDUCT.md exists, Contributor Covenant v2.1
- ✅ AC14: bug_report.yml exists with OS dropdown, Node version, CLI version, steps, expected, actual, scan output fields
- ✅ AC15: feature_request.yml exists with use case, proposed solution, alternatives, context fields
- ✅ AC16: PULL_REQUEST_TEMPLATE.md exists with summary, test plan, checklist
- ✅ AC17: dependabot.yml exists covering npm (/packages/cli) and github-actions (/) weekly
- ✅ AC18: `.gitignore:71` contains `website/.ana/`
- ✅ AC19: proof-chain-agent-integration.md deleted (confirmed via filesystem check)
- ✅ AC20: packages/cli/AGENTS.md deleted (confirmed via filesystem check)
- ✅ AC21: npm pack shows dist/ entries, no ARCHITECTURE.md/CONTRIBUTING.md/docs/
- ✅ AC22: Full test suite passes — 1807 passed, 2 skipped
- ✅ AC23: `pnpm build` succeeds

## Blockers

No blockers. All 33 contract assertions satisfied. All 23 acceptance criteria pass. No regressions (test count actually increased from 1804 baseline to 1807 due to unrelated main-branch merges). Checked for: unused exports in new files (none — no new source exports), unhandled error paths (N/A — no new code logic), external state assumptions in release workflow (uses standard `secrets.NPM_TOKEN` which is documented), spec gaps requiring undocumented decisions (none found — all decisions align with spec guidance).

## Findings

- **Code — npm pack dry-run omits README.md/CHANGELOG.md:** `packages/cli/package.json:50` — prepublishOnly copies these into the package dir before publish. During dry-run they aren't present. This is correct behavior but means you can't verify README inclusion without running prepublishOnly first. Not a bug — just a deployment-time-only verification.

- **Code — Release script requires semver argument with no guard:** `package.json:12` — `"release": "cd packages/cli && npm version"` without an argument prints current version and exits 0. Running `pnpm release` without `patch`/`minor`/`major` is a no-op, not an error. Harmless but could confuse first-time users.

- **Code — Duplicated doc-copy logic:** `.github/workflows/release.yml:30` copies README/CHANGELOG separately from prepublishOnly (`packages/cli/package.json:50`). Two places encode the same knowledge: "root docs go into packages/cli before publish." If a third doc is added (e.g., MIGRATION.md), one copy path will miss it. Not a blocker — the workflow explicitly runs both paths, so today they don't conflict.

- **Test — No @ana tagged tests for this contract:** This build modifies test fixtures and source fallbacks but adds no new dedicated tests. Assertions are verified by source inspection (reading values in files) and grep output. This is appropriate for a metadata-only change — but it means the proof chain has no test-level traceability for these assertions.

## Deployer Handoff

1. **NPM_TOKEN secret required.** The release workflow uses `secrets.NPM_TOKEN`. Ensure this is configured in GitHub repo settings before tagging.
2. **First publish.** This is version 1.0.0 — there's no previous version on npm. The first `npm publish` will claim the package name. Verify `anatomia-cli` is available or owned.
3. **Tag to release.** After merge: `git tag v1.0.0 && git push origin v1.0.0` triggers the workflow.
4. **prepublishOnly runs on `npm publish`** inside the workflow (step: `npm publish`). It will re-build and re-test. The earlier workflow steps (build, test) provide a fast-fail gate.

## Verdict
**Shippable:** YES

All 33 assertions satisfied. All 23 ACs pass. Tests green, build green, lint green. Zero remaining `0.2.0` references. Community files are standard-compliant. Release infrastructure is complete. This is a clean metadata/ceremony build with no logic changes — exactly what the spec prescribed.
