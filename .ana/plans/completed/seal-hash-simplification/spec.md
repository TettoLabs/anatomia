# Spec: Seal hash simplification

**Created by:** AnaPlan
**Date:** 2026-04-25
**Scope:** .ana/plans/active/seal-hash-simplification/scope.md

## Approach

Three connected changes that remove the git-commit dependency from the seal system:

1. **Seal verification switches to content hash.** `verify.ts` currently does `git show {commit}:{file}` to compare sealed vs current contract. Replace with: read the contract file, hash it with SHA-256, compare to the `hash` field already stored in `.saves.json`. Guard on `sealHash` instead of `sealCommit` — if no hash exists, return UNVERIFIABLE.

2. **Scoped test search switches to merge-base.** `verify.ts` currently does `git diff {sealCommit}..HEAD` to find Build's changed files. Replace with `git diff $(git merge-base {artifactBranch} HEAD)..HEAD`. This is the same boundary the contract was saved on the artifact branch before the feature branch diverged. Follow the identical pattern already used in `artifact.ts` step 9b (lines 746-748) for `modules_touched`.

3. **`writeSaveMetadata` drops the commit field. Post-commit fixup deleted.** Remove the `git rev-parse HEAD` call and `commit` field from `writeSaveMetadata`. Delete step 9a in single-save (line 738) and step 8a in save-all (lines 1032-1037). The `SaveMetadata` interface becomes `{ saved_at: string; hash: string }`.

**Content hashing consistency:** `writeSaveMetadata` hashes `fs.readFileSync(filePath, 'utf-8')` — untrimmed raw content. The new seal check MUST also hash untrimmed content via `fs.readFileSync(contractPath, 'utf-8')`. Do NOT trim before hashing. The current git-show code trims both sides (verify.ts:122-123) — the new hash code must not follow that pattern.

**`modules_touched` is preserved.** Step 9b is NOT removed. Only step 9a (commit hash fixup) is removed. The pickup mechanism where build-report's post-commit `modules_touched` gets committed by the next verify-report save is unchanged.

## Output Mockups

### Seal INTACT (new format)
```
=== CONTRACT COMPLIANCE ===
  Contract: .ana/plans/active/my-feature/contract.yaml
  Seal: INTACT (hash sha256:a1b2c3d4e5f6...)
```

### Seal TAMPERED (new format)
```
=== CONTRACT COMPLIANCE ===
  Contract: .ana/plans/active/my-feature/contract.yaml
  Seal: TAMPERED (hash sha256:a1b2c3d4e5f6...)
```

### Seal UNVERIFIABLE (updated message)
```
=== CONTRACT COMPLIANCE ===
  Contract: .ana/plans/active/my-feature/contract.yaml
  Seal: UNVERIFIABLE (no saved contract hash)
```

## File Changes

### `packages/cli/src/commands/artifact.ts` (modify)
**What changes:** Three deletions: (1) `git rev-parse HEAD` call and `commit` field from `writeSaveMetadata`, (2) step 9a post-commit fixup in single-save, (3) step 8a post-commit fixup in save-all. `SaveMetadata` interface drops `commit`. Pre-check storage (line 602) drops `seal_commit`.
**Pattern to follow:** The remaining `writeSaveMetadata` structure — same read-merge-write pattern, just fewer fields.
**Why:** The commit field is the sole reason for the post-commit fixup. Without it, `.saves.json` is written once and committed. No dirty file. No branch-switch friction.

### `packages/cli/src/commands/verify.ts` (modify)
**What changes:** (1) Remove `sealCommit` from `ContractPreCheckResult` interface. (2) Seal check (lines 90-131) replaces `git show` with content hash comparison. Guard becomes `if (!sealHash)`. (3) Scoped search (lines 164-168) replaces `git diff {sealCommit}..HEAD` with merge-base pattern. (4) Return values at lines 140, 151, 250 drop `sealCommit`. (5) Display line 278 drops commit reference. (6) UNVERIFIABLE message (line 273) says "no saved contract hash".
**Pattern to follow:** The merge-base pattern at `artifact.ts:746-748`. The existing global search fallback at verify.ts:179-185 stays unchanged.
**Why:** Eliminates the git-subprocess seal check and the sealCommit dependency from scoped search.

### `packages/cli/src/utils/proofSummary.ts` (modify)
**What changes:** Line 697 — `seal_commit` extraction. Set to `null` unconditionally instead of reading `contractSave?.commit`. The `PreCheckData` interface (line 97-103) can optionally drop `seal_commit` but it's harmless to leave for backward compat with old `.saves.json` files.
**Pattern to follow:** Existing null-field pattern on ProofChainEntry.
**Why:** New saves have no `commit` field. Old proof chain entries keep their values — only new entries get `null`.

### `packages/cli/tests/commands/verify.test.ts` (modify)
**What changes:** (1) `createContractProject` helper — `.saves.json` must write a real SHA-256 hash of the contract content (not `sha256:abc123`). The seal check now compares hashes, so the fixture must match. (2) INTACT/TAMPERED tests work against hash comparison instead of git-show. (3) Scoped search tests replace `commit`-based `.saves.json` fixtures with hash-based fixtures and use a two-branch git setup (artifact branch + feature branch) so merge-base works.
**Pattern to follow:** The existing `createContractProject` helper structure. The scoped search tests (lines 401-538) already set up git repos — adapt the pattern for merge-base.
**Why:** Tests must exercise the new seal mechanism, not the old one.

### `packages/cli/tests/utils/proofSummary.test.ts` (modify)
**What changes:** (1) Line 128 assertion `expect(summary.seal_commit).toBe('def456')` becomes `expect(summary.seal_commit).toBeNull()`. (2) Lines 291-315 — the two `seal_commit` source tests. The "reads seal_commit from contract.commit" tests now expect `null` since `proofSummary.ts` no longer reads `contractSave?.commit`. These tests should verify that `seal_commit` is always `null` regardless of what's in `.saves.json`.
**Pattern to follow:** Existing test structure in the file.
**Why:** `seal_commit` is always `null` for new proof chain entries.

### `packages/cli/tests/commands/work.test.ts` (modify)
**What changes:** Fixture at line 959 has `seal_commit: 'def456'` — this is in a proof chain entry fixture, representing a previously-completed pipeline run. Leave it as-is if the test is asserting on display of old entries. If it's asserting on generation of new entries, update to `null`.
**Pattern to follow:** Check what the test actually asserts before changing.
**Why:** Old entries keep their values. Only new entries get `null`.

### `packages/cli/tests/commands/pr.test.ts` (modify)
**What changes:** Fixture at line 283 has `seal_commit: 'def456'` in a pre-check block. Since `artifact.ts` no longer writes `seal_commit` to the pre-check block, this fixture should drop `seal_commit` if the test exercises current behavior, or keep it if the test exercises display of old data.
**Pattern to follow:** Check what the test actually asserts before changing.
**Why:** Pre-check block no longer contains `seal_commit`.

## Acceptance Criteria

- [ ] AC1: `Seal: INTACT` when contract content matches its saved hash
- [ ] AC2: `Seal: TAMPERED` when contract content does not match its saved hash
- [ ] AC3: `Seal: TAMPERED` blocks verify-report save (existing behavior preserved)
- [ ] AC4: Scoped test search finds `@ana` tags in files changed since feature branch diverged from artifact branch
- [ ] AC5: Scoped test search falls back to global search when merge-base is unavailable (existing fallback preserved)
- [ ] AC6: `.saves.json` has no uncommitted changes after `ana artifact save verify-report`
- [ ] AC7: `git checkout main` works without stash after a full pipeline run on a feature branch
- [ ] AC8: New proof chain entries have `seal_commit: null`
- [ ] AC9: Old proof chain entries with existing `seal_commit` values are unaffected
- [ ] AC10: The `commit` field is no longer written to `.saves.json` by `writeSaveMetadata`
- [ ] AC11: Post-commit fixup (step 9a) does not exist in artifact save flow
- [ ] Tests pass: `(cd packages/cli && pnpm vitest run)`
- [ ] No build errors: `pnpm run build`
- [ ] No lint errors: `pnpm run lint`

## Testing Strategy

- **Unit tests (verify.test.ts):** INTACT/TAMPERED tests switch to hash-based comparison. `createContractProject` computes a real SHA-256 hash of the contract content and writes it to `.saves.json`. Scoped search tests set up a two-branch git scenario (artifact branch + feature branch with merge-base) instead of using sealCommit for the diff boundary.
- **Unit tests (proofSummary.test.ts):** `seal_commit` assertions expect `null`. The two source-priority tests verify that `seal_commit` is `null` regardless of `.saves.json` contents.
- **Edge cases:** UNVERIFIABLE when `.saves.json` missing (existing test stays). UNVERIFIABLE when `hash` field missing (verify guard handles this). Merge-base unavailable falls back to global search (existing fallback pattern).

## Dependencies

None. All changes are internal to the CLI package.

## Constraints

- **Backward compatibility:** Old `.saves.json` files with `commit` field must not cause errors. JSON deserialization silently ignores extra fields. Old proof chain entries with `seal_commit` values are not modified.
- **No trimming before hashing.** `writeSaveMetadata` hashes untrimmed content. The seal check must hash untrimmed content to match.
- **`modules_touched` must survive.** Step 9b is untouched. Only step 9a is removed.

## Gotchas

- **Do NOT trim before hashing.** The current `git show` code trims both sides (verify.ts:122-123). The new hash comparison must NOT trim — `writeSaveMetadata` hashes the raw `fs.readFileSync` output. If you trim, hashes won't match and every seal check will falsely report TAMPERED.
- **`readArtifactBranch` is not currently imported in verify.ts.** Add `import { readArtifactBranch } from '../utils/git-operations.js'`. Also add `import { createHash } from 'node:crypto'`.
- **Scoped search test setup is more complex with merge-base.** The old tests just captured a commit hash. The new tests need two branches: create commits on an "artifact branch" (e.g., main), then create a feature branch and add commits. `git merge-base main feature` gives the boundary. The `createContractProject` helper in verify.test.ts may need an option to set up this two-branch scenario, or the scoped search tests can do it manually as they already do (lines 417-437).
- **`pre-check.seal_commit` field in `.saves.json`.** `artifact.ts:602` writes `seal_commit: preCheckResult.sealCommit` — after removing `sealCommit` from `ContractPreCheckResult`, this line must be removed or it will write `undefined`.
- **proofSummary.test.ts fixture has `seal_commit: 'def456'` in the pre-check block (line 55).** This represents OLD data — leave it in the fixture. The test at line 128 changes because `generateProofSummary` no longer reads `contractSave?.commit` to populate `summary.seal_commit`.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions: `import { readArtifactBranch } from '../utils/git-operations.js'`
- Use `node:` prefix for built-ins: `import { createHash } from 'node:crypto'`
- Use `import type` for type-only imports, separate from value imports
- Prefer early returns over nested conditionals
- Always pass `--run` flag when invoking Vitest
- Test behavior, not implementation — assert on specific expected values
- Cover the error path: test UNVERIFIABLE, TAMPERED, and merge-base failure fallback

### Pattern Extracts

**merge-base pattern (artifact.ts:744-754) — follow this for scoped search:**
```typescript
  if (typeInfo.baseType === 'build-report') {
    try {
      const artBranch = readArtifactBranch(projectRoot);
      const mergeBase = execSync(
        `git merge-base ${artBranch} HEAD`,
        { encoding: 'utf-8', cwd: projectRoot, stdio: ['pipe', 'pipe', 'pipe'] }
      ).trim();
      const diffOutput = execSync(
        `git diff ${mergeBase} --name-only -- . ':!.ana'`,
        { encoding: 'utf-8', cwd: projectRoot, stdio: ['pipe', 'pipe', 'pipe'] }
      ).trim();
```

**Content hashing pattern (artifact.ts:62-63) — follow this for seal check:**
```typescript
  const hash = createHash('sha256').update(content).digest('hex');
```

**Current seal check to replace (verify.ts:117-131):**
```typescript
  let seal: 'INTACT' | 'TAMPERED' = 'INTACT';
  try {
    const relativePath = path.relative(projectRoot, contractPath);
    const sealedContent = execSync(
      `git show ${sealCommit}:${relativePath}`,
      { encoding: 'utf-8', cwd: projectRoot, stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();
    const currentContent = fs.readFileSync(contractPath, 'utf-8').trim();

    if (sealedContent !== currentContent) {
      seal = 'TAMPERED';
    }
  } catch {
    // If git show fails, contract was modified or commit doesn't exist
    seal = 'TAMPERED';
  }
```

### Checkpoint Commands

- After verify.ts changes: `(cd packages/cli && pnpm vitest run tests/commands/verify.test.ts)` — Expected: all seal and scoped search tests pass
- After artifact.ts changes: `(cd packages/cli && pnpm vitest run)` — Expected: full suite passes (artifact.ts changes affect multiple test files)
- After all changes: `(cd packages/cli && pnpm vitest run)` — Expected: 1476 tests pass, 97 test files
- Lint: `pnpm run lint`
- Build: `pnpm run build`

### Build Baseline
- Current tests: 1476 passed, 2 skipped (1478 total)
- Current test files: 97
- Command used: `(cd packages/cli && pnpm vitest run)`
- After build: expected 1476 tests in 97 files (no new tests needed — existing tests are updated)
- Regression focus: `verify.test.ts`, `proofSummary.test.ts`, `work.test.ts`, `pr.test.ts`, `proof.test.ts`
