# Scope: V1 Release Prep

**Created by:** Ana
**Date:** 2026-05-03

## Intent

Final preparation for publishing `anatomia-cli@1.0.0` to npm. Package metadata, release workflow, community files, repo cleanup, version bump. This is the third of three V1 scopes — docs and code changes must be merged first. After this scope ships and merges, the publish ceremony is: tag, push, verify.

## Complexity Assessment

- **Size:** medium
- **Files affected:** packages/cli/package.json (metadata + version), packages/cli/src/commands/init/state.ts (version fallbacks), packages/cli/src/engine/types/index.ts (version fallback), 7 test files (fixture version update), root package.json (release script), .github/workflows/release.yml (new), SECURITY.md (new), CODE_OF_CONDUCT.md (new), .github/ISSUE_TEMPLATE/bug_report.yml (new), .github/ISSUE_TEMPLATE/feature_request.yml (new), .github/PULL_REQUEST_TEMPLATE.md (new), .github/dependabot.yml (new), .gitignore (addition)
- **Blast radius:** The `files` array change stops internal docs from shipping to npm — verify with `npm pack --dry-run`. The version fallback changes touch source code but only fallback paths that fire when package.json is unreadable. Test fixture updates are mechanical find-and-replace (54 occurrences across 7 files). All other changes are additive (new files) or metadata-only.
- **Estimated effort:** 2-3 hours
- **Multi-phase:** no

## Approach

Three categories of work: package hardening (metadata + version + files array + release workflow), community infrastructure (6 new files), and repo cleanup (delete untracked files + gitignore). The version bump to 1.0.0 is the headline — everything else supports it.

**AnaPlan: before writing the spec, read the requirements file.** It contains exact current→target values for every package.json field, the version management strategy with blast radius analysis, the release workflow YAML, community file specifications, and acceptance criteria.

- `../../anatomia_reference/v1_Release/RELEASE_PREP_REQUIREMENTS.md`

**Dependency:** This scope assumes v1-documentation-overhaul and v1-code-changes are already merged to main. The docs scope added the `prepublishOnly` copy step and gitignored the CLI copies. The code changes scope fixed the `--version` output format to `anatomia-cli/{version}`. This scope sets the version to `1.0.0` so the output becomes `anatomia-cli/1.0.0`.

## Acceptance Criteria

- AC1: `packages/cli/package.json` version is `"1.0.0"`
- AC2: `packages/cli/package.json` description is `"Verified AI development. Scan your project, generate context, verify every change through a four-agent pipeline."`
- AC3: `packages/cli/package.json` keywords include `context-engineering`, `code-verification`, `proof-chain`, `pipeline` and do NOT include `ai-assistant`
- AC4: `packages/cli/package.json` homepage is `"https://anatomia.dev"`
- AC5: `packages/cli/package.json` author is `{ "name": "TettoLabs", "url": "https://anatomia.dev" }`
- AC6: `packages/cli/package.json` files array is `["dist"]`
- AC7: `getCliVersion()` fallbacks in `src/commands/init/state.ts` are `'0.0.0'` — not `'0.2.0'`, not `'1.0.0'`
- AC8: `createEmptyAnalysisResult()` version in `src/engine/types/index.ts` is `'0.0.0'`
- AC9: All test fixture `anaVersion` values updated from `'0.2.0'` to `'1.0.0'` across all 7 files (54 occurrences). Two assertions in `anaJsonSchema.test.ts` that use `toBe('0.2.0')` changed to `toBe('1.0.0')`.
- AC10: `.github/workflows/release.yml` exists with `v*` tag trigger, `--provenance` flag, `id-token: write` permission, full build+test+publish pipeline, GitHub release creation
- AC11: Root `package.json` scripts includes `"release": "cd packages/cli && npm version"`
- AC12: `SECURITY.md` exists at repo root with vulnerability reporting policy
- AC13: `CODE_OF_CONDUCT.md` exists at repo root (Contributor Covenant v2.1)
- AC14: `.github/ISSUE_TEMPLATE/bug_report.yml` exists with structured form (OS, Node version, CLI version, repro steps)
- AC15: `.github/ISSUE_TEMPLATE/feature_request.yml` exists with structured form
- AC16: `.github/PULL_REQUEST_TEMPLATE.md` exists with summary, test plan, checklist
- AC17: `.github/dependabot.yml` exists covering npm and github-actions ecosystems
- AC18: `website/.ana/` is in root `.gitignore`
- AC19: `proof-chain-agent-integration.md` deleted from filesystem
- AC20: `packages/cli/AGENTS.md` deleted from filesystem
- AC21: `npm pack --dry-run` in packages/cli shows dist/, README.md, LICENSE, CHANGELOG.md — does NOT show docs/, ARCHITECTURE.md, or CONTRIBUTING.md
- AC22: Full test suite passes: `cd packages/cli && pnpm vitest run`
- AC23: `pnpm build` succeeds

## Edge Cases & Risks

- **`files: ["dist"]` must still include README/LICENSE/CHANGELOG.** npm auto-includes these from the package directory regardless of the `files` array. The docs scope's `prepublishOnly` copies README.md and CHANGELOG.md from root into packages/cli/ before build. Verify with `npm pack --dry-run` after the change.
- **Test fixture version update is mechanical but wide.** 54 occurrences across 7 files. A missed occurrence means a test uses `'0.2.0'` while the package says `'1.0.0'`. Grep after the change to confirm zero remaining `'0.2.0'` in test files.
- **The version fallback `'0.0.0'` must not be `'1.0.0'`.** If someone hardcodes `'1.0.0'` as the fallback, it goes stale on the next bump. `'0.0.0'` is the generic "unknown" sentinel that never needs updating.
- **The release workflow requires `NPM_TOKEN` secret.** The workflow will fail on first run if the secret isn't configured in GitHub repo settings. This is a manual prerequisite, not a code change. Note it in the post-merge checklist.
- **The `files` array value depends on the docs scope being merged first.** The current array (after docs scope) is `["dist", "docs", "ARCHITECTURE.md", "CONTRIBUTING.md", "CHANGELOG.md", "README.md"]`. This scope replaces it entirely with `["dist"]`. If the docs scope hasn't merged, the starting state is different. The replacement is the same either way — `["dist"]` — but the Build agent should verify the current state before editing.

## Rejected Approaches

- **Use `npm version 1.0.0` for the bump.** This creates a commit and tag, which we don't want mid-scope. The Build agent sets `"version": "1.0.0"` directly. `npm version` is for future bumps (1.0.1+) after the release workflow exists.
- **Deprecate anatomia-analyzer instead of unpublish.** Deprecation leaves a ghost page on npm. Unpublish removes it entirely. We meet the requirements for unpublish (<300 downloads, no external dependents). Unpublish is cleaner.
- **Change version fallbacks to `'1.0.0'`.** Creates a new hardcoded version that goes stale on the next bump. `'0.0.0'` is a generic sentinel that says "version unknown" — never goes stale, never gets confused with a real release.

## Open Questions

None. All decisions resolved in the requirements doc.

## Exploration Findings

### Constraints Discovered
- [TYPE-VERIFIED] `package.json` version is the single source of truth — read by index.ts and getCliVersion() at runtime
- [TYPE-VERIFIED] Three hardcoded `'0.2.0'` fallbacks exist in source: state.ts:152, state.ts:154, types/index.ts:115
- [TYPE-VERIFIED] 54 test fixture occurrences of `'0.2.0'` across 7 files, 2 with `toBe('0.2.0')` assertions
- [TYPE-VERIFIED] npm auto-includes README.md, LICENSE, CHANGELOG.md from package directory regardless of `files` array
- [TYPE-VERIFIED] `anatomia-analyzer` has zero references in the codebase, near-zero npm downloads, and a test that asserts it's absent from deps
- [TYPE-VERIFIED] GitHub repo homepage currently shows `anatomia-blush.vercel.app` (Vercel auto-generated)

### Test Infrastructure
- `tests/commands/init/anaJsonSchema.test.ts` — 2 assertions use `toBe('0.2.0')`, must change to `toBe('1.0.0')`
- `tests/helpers/test-project.ts` — shared fixture factory, 1 occurrence
- `tests/commands/init.test.ts` — 2 occurrences
- `tests/engine/analyzers/patterns/confirmation.test.ts` — fixture data
- `tests/engine/analyzers/patterns/performance.test.ts` — fixture data
- `tests/engine/types.test.ts` — fixture data
- `tests/engine/integration/parsed-integration.test.ts` — fixture data

## For AnaPlan

### Structural Analog
`fix-ci-failures` — that scope touched config files (CI workflow), package.json, and test fixtures across multiple files. Same shape: config + metadata + mechanical test updates.

### Relevant Code Paths
- `packages/cli/package.json` — the primary file, 6 fields changing
- `src/commands/init/state.ts:141-155` — `getCliVersion()` with the fallbacks
- `src/engine/types/index.ts:102-117` — `createEmptyAnalysisResult()` with the version field
- `tests/helpers/test-project.ts:27` — shared fixture factory

### Patterns to Follow
- The release.yml workflow YAML is specified exactly in the requirements doc. Follow it.
- The community files (SECURITY, CoC, issue templates, PR template, dependabot) use standard templates. Don't over-customize.
- The version fallback pattern: `'0.0.0'` everywhere, never a specific version.

### Known Gotchas
- Do NOT use `npm version 1.0.0` during the build. Set the version directly in package.json.
- Do NOT change version fallbacks to `'1.0.0'`. Use `'0.0.0'`.
- Do NOT forget the 2 `toBe('0.2.0')` assertions in anaJsonSchema.test.ts — they must change to `toBe('1.0.0')`.
- The `files` array replaces the ENTIRE current array with `["dist"]`. Do not append to the existing array.
- The untracked files (`proof-chain-agent-integration.md`, `packages/cli/AGENTS.md`) are deleted from the filesystem, not `git rm`'d — they're not tracked.
- `SECURITY.md` uses email for reporting, NOT public GitHub issues. This is a security best practice.
- `CODE_OF_CONDUCT.md` uses Contributor Covenant v2.1 VERBATIM. Do not customize the language.

### Things to Investigate
- Verify that `npm pack --dry-run` still includes README.md and CHANGELOG.md after changing `files` to `["dist"]`. The prepublishOnly copy + npm auto-include should handle this, but verify.

### Post-Merge Ceremony (not part of the build — manual steps after PR merges)
1. Ensure `NPM_TOKEN` secret exists in GitHub repo settings
2. `git tag v1.0.0 && git push --follow-tags` — triggers release.yml
3. Verify: npm page shows correct README, description, keywords, homepage, Provenance badge
4. Verify: `npx anatomia-cli@1.0.0 --version` returns `anatomia-cli/1.0.0`
5. Verify: `npx anatomia-cli@1.0.0 scan .` works in a fresh directory
6. `npm unpublish anatomia-analyzer --force` (fallback: `npm deprecate`)
7. `gh repo edit TettoLabs/anatomia --homepage "https://anatomia.dev"`
8. Verify: `npm view anatomia-analyzer` returns 404
