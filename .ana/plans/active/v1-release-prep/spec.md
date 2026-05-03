# Spec: V1 Release Prep

**Created by:** AnaPlan
**Date:** 2026-05-03
**Scope:** .ana/plans/active/v1-release-prep/scope.md

## Approach

Three categories of work, all config/metadata/ceremony — zero production logic changes beyond version fallback strings.

1. **Package hardening:** Update 6 fields in `packages/cli/package.json` (version, description, keywords, homepage, author, files), change 3 source fallbacks from `'0.2.0'` to `'0.0.0'`, update 54 test fixture occurrences from `'0.2.0'` to `'1.0.0'`, add release workflow and release script.

2. **Community infrastructure:** Create 6 new files — SECURITY.md, CODE_OF_CONDUCT.md, bug report template, feature request template, PR template, dependabot config.

3. **Repo cleanup:** Delete 2 untracked files, add `website/.ana/` to .gitignore.

The requirements doc at `../../anatomia_reference/v1_Release/RELEASE_PREP_REQUIREMENTS.md` contains exact target values for every package.json field, the complete release.yml YAML, and community file specifications. Follow it as the source of truth.

**Critical version distinction:** Test fixtures use `'1.0.0'` (realistic data representing a project initialized with Anatomia 1.0.0). Source fallbacks use `'0.0.0'` (generic "unknown version" sentinel that never goes stale). These are different decisions for different reasons — don't conflate them.

**types.test.ts correction:** The scope's AC9 says change all `toBe('0.2.0')` to `toBe('1.0.0')`. This is correct for the 2 assertions in `anaJsonSchema.test.ts` (they test schema round-trip of fixture data). But `types.test.ts:36` asserts on `createEmptyAnalysisResult().version`, which is changing to `'0.0.0'` per AC8. That assertion must become `toBe('0.0.0')`, not `toBe('1.0.0')`.

## Output Mockups

After all changes, `npm pack --dry-run` in `packages/cli/` should show:

```
npm notice Tarball Contents
npm notice 1.5kB  package.json
npm notice ...    dist/...
npm notice 5.2kB  README.md
npm notice 1.1kB  LICENSE
npm notice 2.3kB  CHANGELOG.md
```

It must NOT show `docs/`, `ARCHITECTURE.md`, or `CONTRIBUTING.md`.

## File Changes

### `packages/cli/package.json` (modify)
**What changes:** 6 fields updated — version to `"1.0.0"`, description to functional sentence, keywords array replaced (drop `ai-assistant`, add `context-engineering`/`code-verification`/`proof-chain`/`pipeline`), homepage to `"https://anatomia.dev"`, author to object form `{ "name": "TettoLabs", "url": "https://anatomia.dev" }`, files array to `["dist"]`. Also remove `typescript` and `verification` from keywords — the target keyword list is exact.
**Pattern to follow:** Standard package.json conventions. The requirements doc has the exact current→target table.
**Why:** npm search results, package page, and tarball contents all derive from these fields. Current values are placeholder/dev-era.

### `packages/cli/src/commands/init/state.ts` (modify)
**What changes:** Lines 152 and 154 — change `'0.2.0'` to `'0.0.0'` in both the `|| '0.2.0'` fallback and the catch block return.
**Pattern to follow:** The `'0.0.0'` sentinel — a version that's clearly "not a real release."
**Why:** Hardcoded `'0.2.0'` goes stale on every bump. `'0.0.0'` never goes stale.

### `packages/cli/src/engine/types/index.ts` (modify)
**What changes:** Line 115 — change `version: '0.2.0'` to `version: '0.0.0'` in `createEmptyAnalysisResult()`.
**Pattern to follow:** Same `'0.0.0'` sentinel as state.ts.
**Why:** Same reason — fallback versions must not track real releases.

### 7 test files (modify)
**What changes:** Global find-and-replace of `'0.2.0'` → `'1.0.0'` across all 7 test files (54 occurrences total). Exception: `tests/engine/types.test.ts:36` changes to `'0.0.0'` because it tests `createEmptyAnalysisResult()`.
**Files:**
- `tests/helpers/test-project.ts` (1 occurrence)
- `tests/engine/types.test.ts` (1 occurrence → `'0.0.0'`)
- `tests/engine/integration/parsed-integration.test.ts` (1 occurrence)
- `tests/commands/init.test.ts` (2 occurrences)
- `tests/commands/init/anaJsonSchema.test.ts` (5 occurrences, includes 2 `toBe` assertions)
- `tests/engine/analyzers/patterns/performance.test.ts` (2 occurrences)
- `tests/engine/analyzers/patterns/confirmation.test.ts` (42 occurrences)
**Why:** Test fixtures represent realistic data. A project initialized with Anatomia 1.0.0 will have `anaVersion: '1.0.0'`.

### `package.json` (root) (modify)
**What changes:** Add `"release": "cd packages/cli && npm version"` to scripts.
**Why:** One-liner for future version bumps: `pnpm release patch` → bumps, creates commit + tag.

### `.github/workflows/release.yml` (create)
**What changes:** New release workflow triggered by `v*` tags. Steps: checkout, pnpm setup, node 22 setup, install, build, copy root docs into package, test, `npm publish --provenance --access public`, create GitHub release.
**Pattern to follow:** The exact YAML from the requirements doc (Section 3). Key details: `id-token: write` permission for provenance, `--provenance` flag, `secrets.NPM_TOKEN`.
**Why:** Automated, provenance-signed publishing. Manual `npm publish` is error-prone.

### `SECURITY.md` (create)
**What changes:** Vulnerability reporting policy at repo root. Email-based reporting (not public issues), response time commitment, scope, safe harbor.
**Pattern to follow:** GitHub's recommended template, adapted to Anatomia voice (terse, direct). Use `security@anatomia.dev` as the reporting email.
**Why:** Signals a production-quality project. Required for enterprise adoption.

### `CODE_OF_CONDUCT.md` (create)
**What changes:** Contributor Covenant v2.1 verbatim at repo root. Do NOT customize the language.
**Pattern to follow:** https://www.contributor-covenant.org/version/2/1/code_of_conduct/ — copy the canonical Markdown. Set contact method to `conduct@anatomia.dev`.
**Why:** Corporate adopters check for this specific standard text.

### `.github/ISSUE_TEMPLATE/bug_report.yml` (create)
**What changes:** YAML-based structured form with fields: OS (dropdown: macOS, Linux, Windows), Node version (text), CLI version (text), Steps to reproduce (textarea), Expected behavior (textarea), Actual behavior (textarea), Scan output (textarea, optional).
**Pattern to follow:** GitHub's YAML issue form syntax. See requirements doc Section 4.
**Why:** Structured reports > freeform reports for triage.

### `.github/ISSUE_TEMPLATE/feature_request.yml` (create)
**What changes:** YAML-based structured form with fields: Use case (textarea), Proposed solution (textarea), Alternatives considered (textarea), Additional context (textarea, optional).
**Why:** Same as bug report — structured > freeform.

### `.github/PULL_REQUEST_TEMPLATE.md` (create)
**What changes:** PR template with Summary, Test plan, and checklist (tests pass, build succeeds, lint passes).
**Pattern to follow:** Exact content from requirements doc Section 4.
**Why:** Every PR gets a consistent structure.

### `.github/dependabot.yml` (create)
**What changes:** Dependabot config covering npm (`/packages/cli`) and github-actions (`/`) ecosystems, weekly schedule.
**Pattern to follow:** Exact YAML from requirements doc Section 4.
**Why:** Automated dependency updates.

### `.gitignore` (modify)
**What changes:** Add `website/.ana/` entry with comment.
**Why:** Website's Anatomia context is separate from CLI's and should not be committed.

### `proof-chain-agent-integration.md` (delete)
**What changes:** Delete from filesystem. Untracked file — use `rm`, not `git rm`.
**Why:** Investigation artifact from a previous session. Not source material.

### `packages/cli/AGENTS.md` (delete)
**What changes:** Delete from filesystem. Untracked file — use `rm`, not `git rm`.
**Why:** Stale generated copy. Not tracked.

## Acceptance Criteria

- [ ] AC1: `packages/cli/package.json` version is `"1.0.0"`
- [ ] AC2: `packages/cli/package.json` description is `"Verified AI development. Scan your project, generate context, verify every change through a four-agent pipeline."`
- [ ] AC3: `packages/cli/package.json` keywords include `context-engineering`, `code-verification`, `proof-chain`, `pipeline` and do NOT include `ai-assistant`
- [ ] AC4: `packages/cli/package.json` homepage is `"https://anatomia.dev"`
- [ ] AC5: `packages/cli/package.json` author is `{ "name": "TettoLabs", "url": "https://anatomia.dev" }`
- [ ] AC6: `packages/cli/package.json` files array is `["dist"]`
- [ ] AC7: `getCliVersion()` fallbacks in `src/commands/init/state.ts` are `'0.0.0'`
- [ ] AC8: `createEmptyAnalysisResult()` version in `src/engine/types/index.ts` is `'0.0.0'`
- [ ] AC9: All test fixture `anaVersion` values updated from `'0.2.0'` to `'1.0.0'` across 7 files (54 occurrences). Two assertions in `anaJsonSchema.test.ts` changed to `toBe('1.0.0')`. One assertion in `types.test.ts` changed to `toBe('0.0.0')`.
- [ ] AC10: `.github/workflows/release.yml` exists with `v*` tag trigger, `--provenance` flag, `id-token: write`, full pipeline, GitHub release creation
- [ ] AC11: Root `package.json` scripts includes `"release": "cd packages/cli && npm version"`
- [ ] AC12: `SECURITY.md` exists at repo root
- [ ] AC13: `CODE_OF_CONDUCT.md` exists at repo root (Contributor Covenant v2.1)
- [ ] AC14: `.github/ISSUE_TEMPLATE/bug_report.yml` exists with structured form
- [ ] AC15: `.github/ISSUE_TEMPLATE/feature_request.yml` exists with structured form
- [ ] AC16: `.github/PULL_REQUEST_TEMPLATE.md` exists
- [ ] AC17: `.github/dependabot.yml` exists covering npm and github-actions
- [ ] AC18: `website/.ana/` is in root `.gitignore`
- [ ] AC19: `proof-chain-agent-integration.md` deleted
- [ ] AC20: `packages/cli/AGENTS.md` deleted
- [ ] AC21: `npm pack --dry-run` shows dist/, README.md, LICENSE, CHANGELOG.md — NOT docs/, ARCHITECTURE.md, or CONTRIBUTING.md
- [ ] AC22: Full test suite passes: `cd packages/cli && pnpm vitest run`
- [ ] AC23: `pnpm build` succeeds

## Testing Strategy

- **Unit tests:** No new tests required. This is metadata, config, and ceremony. The existing 1804 tests cover the affected source code paths.
- **Fixture updates:** Mechanical find-and-replace. After the change, grep for `'0.2.0'` in `packages/cli/tests/` — must return zero results. Also grep in `packages/cli/src/` — must return zero results.
- **Verification:** `npm pack --dry-run` in `packages/cli/` confirms tarball contents. `pnpm build` confirms no build regression. Full test suite confirms no fixture/assertion mismatch.

## Dependencies

- v1-documentation-overhaul must be merged (it is — commit 7dcfd49). It added `prepublishOnly` and the current `files` array.
- v1-code-changes should be merged first (it changed `--version` output format to `anatomia-cli/{version}`). Check if merged before building.

## Constraints

- The `files` array replacement is safe because npm auto-includes README.md, LICENSE, and CHANGELOG.md from the package directory regardless of the `files` field. The docs scope's `prepublishOnly` copies these from root into `packages/cli/`.
- CODE_OF_CONDUCT.md must use Contributor Covenant v2.1 verbatim — do not customize the language.
- SECURITY.md must direct reports to email, not public GitHub issues.

## Gotchas

- **Do NOT use `npm version 1.0.0`** during implementation. It creates a commit and tag. Set `"version": "1.0.0"` directly in package.json.
- **Do NOT change version fallbacks to `'1.0.0'`.** Use `'0.0.0'`. The fallback is a sentinel, not a version tracker.
- **types.test.ts assertion goes to `'0.0.0'`, not `'1.0.0'`.** It tests `createEmptyAnalysisResult()`, whose version changes to `'0.0.0'`. The scope's AC9 is slightly imprecise here — follow this spec.
- **The untracked files are not git-tracked.** Use `rm`, not `git rm`. `git rm` will error because these files aren't in the index.
- **The `files` array replaces the ENTIRE current array** with `["dist"]`. Do not append — replace.
- **After the fixture changes, verify zero remaining `'0.2.0'`** in both `packages/cli/src/` and `packages/cli/tests/`. This catches missed occurrences.
- **The `.github/ISSUE_TEMPLATE/` directory must be created** — it doesn't exist yet. Only `.github/workflows/` exists.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions and `node:` prefix for built-ins (not relevant here — no new imports).
- Commit each logical change separately — package metadata, source fallbacks, test fixtures, community files, cleanup could be separate commits.
- Pre-commit hook runs typecheck and lint but NOT tests. Run `pnpm vitest run` manually after changes.
- Use `[v1-release-prep]` prefix for commit messages per pipeline convention.
- Co-author trailer: `Ana <build@anatomia.dev>` (from ana.json).

### Pattern Extracts

**Version fallback pattern (state.ts:141-156):**
```typescript
export async function getCliVersion(): Promise<string> {
  try {
    // Detect bundle vs dev context
    const moduleUrl = new URL('.', import.meta.url);
    const isBundle = !moduleUrl.pathname.includes('/src/');
    const pkgPath = isBundle
      ? new URL('../package.json', import.meta.url) // dist/index.js → ../package.json = cli/package.json
      : new URL('../../package.json', import.meta.url); // src/commands/init.ts → ../../package.json = cli/package.json

    const content = await fs.readFile(pkgPath, 'utf-8');
    const pkg = JSON.parse(content);
    return pkg.version || '0.2.0';   // ← change to '0.0.0'
  } catch {
    return '0.2.0';                   // ← change to '0.0.0'
  }
}
```

**createEmptyAnalysisResult (types/index.ts:102-117):**
```typescript
export function createEmptyAnalysisResult(): AnalysisResult {
  return {
    projectType: 'unknown',
    framework: null,
    confidence: {
      projectType: 0.0,
      framework: 0.0,
    },
    indicators: {
      projectType: [],
      framework: [],
    },
    detectedAt: new Date().toISOString(),
    version: '0.2.0',                // ← change to '0.0.0'
  };
}
```

### Proof Context
No active proof findings for affected files.

### Checkpoint Commands

- After package.json changes: `pnpm build` — Expected: builds successfully
- After source fallback changes: `cd packages/cli && pnpm vitest run` — Expected: failures (test fixtures still say `'0.2.0'`)
- After test fixture updates: `cd packages/cli && pnpm vitest run` — Expected: 1804 tests pass, 2 skipped
- After all changes: `cd packages/cli && npm pack --dry-run` — Expected: dist/, README.md, LICENSE, CHANGELOG.md present; no docs/, ARCHITECTURE.md, CONTRIBUTING.md
- Lint: `cd packages/cli && pnpm lint`
- Zero remaining: `grep -r "'0.2.0'" packages/cli/src/ packages/cli/tests/` — Expected: 0 results

### Build Baseline
- Current tests: 1804 passed, 2 skipped (1806 total)
- Current test files: 93
- Command used: `cd packages/cli && pnpm vitest run`
- After build: 1804 passed, 2 skipped, 93 test files (no new tests — fixture updates only)
- Regression focus: `tests/engine/types.test.ts` (assertion changes to `'0.0.0'`), `tests/commands/init/anaJsonSchema.test.ts` (2 assertions change to `'1.0.0'`)
