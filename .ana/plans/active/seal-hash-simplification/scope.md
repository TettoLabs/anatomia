# Scope: Seal hash simplification

**Created by:** Ana
**Date:** 2026-04-25

## Intent

Simplify the contract seal system from git-commit-based verification to content-hash-based verification. This eliminates the post-commit `.saves.json` fixup that makes the file permanently dirty and blocks branch switches on every pipeline run.

The developer asked: "Is the seal system real utility or a toy?" The answer: the gate is real (blocking verify-report save when the contract changes after Plan wrote it), but the implementation is over-engineered. Using `git show {commit}:{file}` to detect tampering is more machinery than needed — a SHA-256 content hash comparison answers the same question. The commit-based approach created a dependency on knowing the exact commit hash at save time, which is impossible before the commit exists, which led to the post-commit fixup, which leaves `.saves.json` dirty, which blocks every branch switch in the completion flow.

Remove the cause. Don't work around the consequence.

## Complexity Assessment
- **Size:** medium
- **Files affected:** 5 production files, 4 test files
  - `packages/cli/src/commands/artifact.ts` — remove post-commit fixup (step 9a in single-save and step 8a in save-all), stop recording commit hash in `writeSaveMetadata`, update pre-check storage (lines 600-603) to drop `seal_commit`
  - `packages/cli/src/commands/verify.ts` — seal check uses content hash instead of git show, scoped search uses merge-base instead of sealCommit, remove `sealCommit` from `ContractPreCheckResult` interface, display line drops commit reference, add `readArtifactBranch` and `createHash` imports
  - `packages/cli/src/utils/proofSummary.ts` — seal_commit becomes null for new entries
  - `packages/cli/src/types/proof.ts` — no schema change (seal_commit is already `string | null`)
  - `packages/cli/tests/commands/verify.test.ts` — update seal tests to use hash comparison
  - `packages/cli/tests/utils/proofSummary.test.ts` — update seal_commit expectations
  - `packages/cli/tests/commands/work.test.ts` — minor fixture updates
  - `packages/cli/tests/commands/proof.test.ts` — fixture data (seal_commit in old entries stays)
  - `packages/cli/tests/commands/pr.test.ts` — fixture data has `seal_commit` in pre-check block, minor update
- **Blast radius:** The seal gate behavior is unchanged — INTACT/TAMPERED still works, verify-report save is still blocked on TAMPERED. What changes is the mechanism (hash comparison instead of git show) and a side effect elimination (no dirty .saves.json). Proof chain entries from previous runs keep their seal_commit values. New entries get `null`.
- **Estimated effort:** 1-2 hours implementation
- **Multi-phase:** no

## Approach

Three connected changes that remove the commit hash dependency:

1. **Seal verification switches to content hash.** `verify.ts` currently does `git show {commit}:{file}` to retrieve sealed content and compares it to current content. Replace with: hash the current contract content with SHA-256, compare to `sealHash` already stored in `.saves.json`. Same INTACT/TAMPERED gate. No git subprocess. No commit hash needed.

2. **Scoped test search switches to merge-base.** `verify.ts` currently does `git diff {sealCommit}..HEAD` to find files Build changed. Replace with `git diff $(git merge-base {artifactBranch} HEAD)..HEAD`. This is the same boundary — the contract was saved on main before the feature branch was created. The `modules_touched` computation in `artifact.ts` step 9b already uses this exact pattern.

3. **`writeSaveMetadata` stops recording commit hash. Post-commit fixup deleted.** The `commit` field was the only reason for the fixup. Without it, `.saves.json` is written once (pre-commit), committed with the artifact, and never rewritten. The file is never dirty. Branch switches work.

`seal_commit` in new proof chain entries becomes `null`. Old entries retain their (accurate) values. The type already allows `null`.

## Acceptance Criteria

- AC1: `Seal: INTACT` when contract content matches its saved hash
- AC2: `Seal: TAMPERED` when contract content does not match its saved hash
- AC3: `Seal: TAMPERED` blocks verify-report save (existing behavior preserved)
- AC4: Scoped test search finds `@ana` tags in files changed since feature branch diverged from artifact branch
- AC5: Scoped test search falls back to global search when merge-base is unavailable (existing fallback preserved)
- AC6: `.saves.json` has no uncommitted changes after `ana artifact save verify-report`
- AC7: `git checkout main` works without stash after a full pipeline run on a feature branch
- AC8: New proof chain entries have `seal_commit: null`
- AC9: Old proof chain entries with existing `seal_commit` values are unaffected
- AC10: The `commit` field is no longer written to `.saves.json` by `writeSaveMetadata`
- AC11: Post-commit fixup (step 9a) does not exist in artifact save flow

## Edge Cases & Risks

- **Old `.saves.json` files with commit field.** Verify might encounter `.saves.json` files from before this change that still have `commit` but no meaningful change needed — hash comparison doesn't read the `commit` field. Backward compatible by default.
- **No `.saves.json` at all.** Already handled — verify returns `UNVERIFIABLE`. Unchanged.
- **No `hash` field in `.saves.json`.** Old entries might lack it. Verify should return `UNVERIFIABLE` (same as current behavior for missing `commit`).
- **Content hash mismatch from whitespace — RESOLVED.** Investigated: `writeSaveMetadata` hashes `fs.readFileSync(filePath, 'utf-8')` — untrimmed raw content (artifact.ts:63,707). The current `git show` seal check trims both sides (verify.ts:122-123, `.trim()`). The new hash-based seal check MUST hash untrimmed content via `fs.readFileSync(contractPath, 'utf-8')` to match the saved hash. Do NOT trim before hashing. This is simpler and more correct than the current approach.
- **merge-base unavailable.** Feature branch might not have a merge-base with the artifact branch (orphan branch, shallow clone). The existing fallback to global test search handles this — `catch` block falls through to global search.
- **`modules_touched` still written post-commit in step 9b.** This is NOT removed. It's still written after the build-report commit, and it's still picked up by the subsequent verify-report save (which reads the full `.saves.json` and commits it). The mechanism that carries `modules_touched` into the committed version is unchanged. Only step 9a (the commit hash fixup) is removed.
- **seal_commit display.** Line 278 in verify.ts shows `(commit abc1234, hash sha256:...)`. With no commit, this becomes just the hash display. The `UNVERIFIABLE` message at line 273 references "no saved contract commit" — should be updated to reference hash.

## Rejected Approaches

**Add a second commit after verify-report save to commit the fixup.** Eliminates the dirty file but adds ~9 seconds of pre-commit hook time (build + typecheck + lint) to every verify-report save. Treats the symptom — the fixup still exists, we're just committing it.

**Have `work complete` handle the branch switch (stash, checkout, pull).** Band-aid at one friction point. The dirty file still exists, still blocks any other branch switch during the pipeline, still confuses `git status`. Hides the problem instead of removing it.

**Stop the fixup but keep the commit hash dependency.** Verify would read the stale (off-by-one) commit hash. `git show` would retrieve the wrong version. Seal check would falsely report TAMPERED on every run. Broken.

**Keep the inaccurate commit hash as archival data.** The stale hash points to the parent of the seal commit, not the seal commit itself. `git show {stale}:contract.yaml` returns the wrong content (or nothing on first save). Storing inaccurate data that looks authoritative is worse than storing nothing — someone will try to use it and waste time debugging.

## Open Questions

None. All design decisions resolved during investigation.

## Exploration Findings

### Patterns Discovered

- **The accidental pickup mechanism (artifact.ts).** `writeSaveMetadata` reads the full `.saves.json` and writes it back. Post-commit data from one save (corrected hash, modules_touched) gets committed by the next save. Only the LAST save's post-commit data stays uncommitted. This mechanism is preserved — only step 9a (hash fixup) is removed, not step 9b (modules_touched).
- **merge-base pattern already exists (artifact.ts:746-748).** Step 9b uses `git merge-base {artifactBranch} HEAD` to find changed files. The scoped test search in verify.ts can use the same pattern.
- **Content hash is already recorded (artifact.ts:63).** `writeSaveMetadata` already computes SHA-256 and stores it as `hash` field. This is the seal — it just wasn't used as one.

### Constraints Discovered

- [TYPE-VERIFIED] `seal_commit: string | null` on ProofChainEntry (proof.ts:38) — null is already valid, no schema change needed
- [TYPE-VERIFIED] `sealCommit?: string | undefined` on ContractPreCheckResult (verify.ts:29) — REMOVE from interface. Downstream: return values at verify.ts:140,151,250 drop the field; artifact.ts:602 stops writing `seal_commit` to pre-check block in `.saves.json`
- [OBSERVED] Verify display (verify.ts:278) shows commit hash to user — needs display update
- [OBSERVED] UNVERIFIABLE message (verify.ts:273) says "no saved contract commit" — needs text update
- [OBSERVED] proofSummary.test.ts (line 128, 301, 314) asserts specific seal_commit values — needs update
- [OBSERVED] verify.test.ts fixtures write `.saves.json` with commit field — need update to test hash-based seal

### Test Infrastructure

- `packages/cli/tests/commands/verify.test.ts` — `createContractProject` helper writes `.saves.json` fixtures. The INTACT/TAMPERED tests (lines 173-226) need to switch from commit-based to hash-based verification.
- `packages/cli/tests/utils/proofSummary.test.ts` — seal_commit assertions at lines 128, 301, 314 need to expect null for new entries.
- `packages/cli/tests/commands/work.test.ts` — seal_commit in fixtures, minor updates.
- `packages/cli/tests/commands/proof.test.ts` — fixture data for display tests, seal_commit in old entries stays as-is.

## For AnaPlan

### Structural Analog

The `modules_touched` computation in `artifact.ts` (lines 743-764) is the closest structural match for the merge-base scoped search. Same pattern: `git merge-base {artifactBranch} HEAD`, then `git diff` from that point. The verify.ts scoped search should follow this pattern.

### Relevant Code Paths

- `packages/cli/src/commands/artifact.ts` lines 45-73: `writeSaveMetadata` — remove `commit` field recording and `git rev-parse HEAD` call
- `packages/cli/src/commands/artifact.ts` lines 59-60: `execSync('git rev-parse HEAD')` — DELETE (no longer needed)
- `packages/cli/src/commands/artifact.ts` lines 600-603: pre-check storage — drop `seal_commit: preCheckResult.sealCommit` from the saved pre-check block
- `packages/cli/src/commands/artifact.ts` lines 735-738: step 9a single-save fixup — DELETE
- `packages/cli/src/commands/artifact.ts` lines 1032-1037: step 8a save-all fixup — DELETE
- `packages/cli/src/commands/verify.ts` lines 27-30: `ContractPreCheckResult` interface — remove `sealCommit` field
- `packages/cli/src/commands/verify.ts` lines 90-131: seal check — replace git show with content hash comparison. Guard on `sealHash` instead of `sealCommit`
- `packages/cli/src/commands/verify.ts` lines 140,151,250: return values — drop `sealCommit` field
- `packages/cli/src/commands/verify.ts` lines 159-178: scoped test search — replace `sealCommit` with merge-base (needs `readArtifactBranch` import from `../utils/git-operations.js` and `createHash` from `node:crypto`)
- `packages/cli/src/commands/verify.ts` lines 268-278: display — drop commit reference, update UNVERIFIABLE message
- `packages/cli/src/utils/proofSummary.ts` lines 693-697: seal_commit extraction — set to null (stop reading `contractSave?.commit`)
- `packages/cli/src/utils/proofSummary.ts` lines 97-99: `PreCheckData` interface — `seal_commit` field is dead (never read), can be left or removed

### Patterns to Follow

- The merge-base pattern at artifact.ts:746-748
- The existing global search fallback at verify.ts:179-185
- Content hashing with `createHash('sha256')` already used in writeSaveMetadata

### Known Gotchas

- **Content hashing consistency — RESOLVED.** `writeSaveMetadata` hashes `fs.readFileSync(filePath, 'utf-8')` (untrimmed). Verify must hash `fs.readFileSync(contractPath, 'utf-8')` (also untrimmed). Do NOT trim before hashing. The current git-show code trims (verify.ts:122-123) — the new hash code must not follow that pattern.
- **`modules_touched` survives — VERIFIED.** Step 9b is NOT removed. Only step 9a is removed. The pickup mechanism works: build-report save writes `modules_touched` post-commit (step 9b) → verify-report save reads the full `.saves.json` at step 8b (pre-commit) which includes `modules_touched` → commits it. Removing step 9a does not affect this flow. Confirmed by tracing the data through the proof-chain-health-signal pipeline run.
- **`readArtifactBranch` not imported in verify.ts — RESOLVED.** verify.ts currently imports only from `commander`, `chalk`, `node:child_process`, `node:fs`, `node:path`, `yaml`, `glob`, and `../utils/validators.js`. The scoped search needs `readArtifactBranch` from `../utils/git-operations.js`. The seal check needs `createHash` from `node:crypto`. Both are new imports.
- **`SaveMetadata` interface change.** The `commit` field in `SaveMetadata` (artifact.ts:33-35) should be removed or made optional. Old `.saves.json` files will still have it — readers must tolerate its presence. `writeSaveMetadata` stops writing it. The interface should reflect this: remove `commit` from `SaveMetadata`, change the type to `{ saved_at: string; hash: string }`.
- **`pre-check.seal_commit` is dead data.** `proofSummary.ts` has `PreCheckData.seal_commit` (line 99) but nothing reads it. `artifact.ts:602` writes it. After this change, `sealCommit` no longer exists on `ContractPreCheckResult`, so artifact.ts:602 must stop writing it. The `PreCheckData` interface field can be left for backward compatibility with old `.saves.json` files or removed — either is safe.

### Things to Investigate

None. All questions resolved during investigation.
