# Spec: Learn V3 Phase 1 — readCoAuthor + Variadic Close/Promote

**Created by:** AnaPlan
**Date:** 2026-05-01
**Scope:** .ana/plans/active/learn-v3-cli-commands/scope.md

## Approach

Three changes in one phase:

1. **Extract `readCoAuthor()`** into `git-operations.ts` following the `readBranchPrefix()` pattern — silent fallback to default, no process.exit. Replace 5 inline copies across `artifact.ts` (2), `work.ts` (1), `pr.ts` (1), and add to `proof.ts` close/promote commits.

2. **Make close variadic** — change `.argument('<id>', ...)` to `.argument('<ids...>', ...)`. Commander v12 correctly separates variadic args from options even when interleaved (verified). The action parameter becomes `string[]`. Loop over each ID: validate existence, check status, mutate. One commit for the batch. Add `--dry-run` flag that validates and reports without mutating or committing. JSON output returns a `results` array with per-finding outcome.

3. **Make promote variadic** — same argument change. One rule appended to the skill file regardless of ID count (first ID's summary as default `--text`). One commit for the batch. All findings marked `promoted` pointing to the same skill.

Both close and promote gain co-author trailers via `readCoAuthor()`. This is a bug fix — they currently commit without trailers.

## Output Mockups

### close — single ID (backward compatible)
```
✓ Closed F001: fixed in latest PR
  [validation] Missing request validation — src/api/payments.ts
  active → closed (by: human)

Chain: 5 runs · 3 active findings
```

### close — variadic
```
✓ Closed 3 findings: batch cleanup after triage
  F001 [validation] Missing request validation — src/api/payments.ts (active → closed)
  F002 [testing] No test for edge case — src/api/payments.ts (active → closed)
  F005 [code] Unused import — src/utils/helpers.ts (active → closed)

Chain: 5 runs · 1 active finding
```

### close — variadic with errors
```
✓ Closed 2 of 3 findings: batch cleanup
  F001 [validation] Missing request validation — src/api/payments.ts (active → closed)
  F002 [testing] No test for edge case — src/api/payments.ts (active → closed)
  ✗ F999 — not found (skipped)

Chain: 5 runs · 1 active finding
```

### close --dry-run
```
Dry run — no changes will be made.

Would close 2 findings:
  F001 [validation] Missing request validation — src/api/payments.ts (active → closed)
  F002 [testing] No test for edge case — src/api/payments.ts (active → closed)

Would skip 1:
  F999 — not found
```

### close --json (variadic)
```json
{
  "command": "proof close",
  "timestamp": "2026-05-01T10:00:00.000Z",
  "results": {
    "reason": "batch cleanup",
    "closed": [
      { "id": "F001", "category": "validation", "summary": "Missing request validation", "file": "src/api/payments.ts", "previous_status": "active" },
      { "id": "F002", "category": "testing", "summary": "No test for edge case", "file": "src/api/payments.ts", "previous_status": "active" }
    ],
    "skipped": [
      { "id": "F999", "reason": "not found" }
    ],
    "dry_run": false
  },
  "meta": { ... }
}
```

### promote — variadic
```
✓ Promoted 2 findings to coding-standards
  F001 [validation] Missing request validation — src/api/payments.ts (active → promoted)
  F002 [testing] No test for edge case — src/api/payments.ts (active → promoted)
  Rule: - Missing request validation
  Section: ## Rules
  File: .claude/skills/coding-standards/SKILL.md

Chain: 5 runs · 1 active finding
```

### commit messages (with co-author)
```
[proof] Close F001, F002: batch cleanup

Co-authored-by: Ana <build@anatomia.dev>
```

```
[proof] Promote F001, F002 to coding-standards

Co-authored-by: Ana <build@anatomia.dev>
```

## File Changes

### `src/utils/git-operations.ts` (modify)
**What changes:** Add `readCoAuthor()` export. Same fallback-on-error pattern as `readBranchPrefix()` — reads `.ana/ana.json`, returns `coAuthor` field, falls back to `'Ana <build@anatomia.dev>'` on any failure.
**Pattern to follow:** `readBranchPrefix()` in the same file (lines 62-83).
**Why:** Eliminates 5 identical inline copies. Single source of truth for the co-author trailer value.

### `src/commands/proof.ts` (modify)
**What changes:** Two subcommand rewrites — close and promote. Both change from single `<id>` to variadic `<ids...>`. Close gains `--dry-run` flag. Both gain co-author trailer on commits via `readCoAuthor()`. Output format changes for multi-ID: per-finding result lines instead of single-finding detail. JSON envelope gains `closed`/`skipped` arrays (close) or `promoted`/`skipped` arrays (promote). Both produce one commit for the batch. Promote appends one rule regardless of ID count.
**Pattern to follow:** Existing close subcommand (lines 388-571) is the base. The variadic change wraps the find-and-mutate logic in a loop, collecting results. The commit and output sections consolidate.
**Why:** Learn runs close 15-20 times per session. Batching IDs per call is a 10x reduction in git ceremonies.

### `src/commands/artifact.ts` (modify)
**What changes:** Replace 2 inline coAuthor reads (around lines 1046-1055 and 1307-1313) with `readCoAuthor()` import.
**Pattern to follow:** How `readArtifactBranch` is already imported and called in this file.
**Why:** Dedup. The inline reads are identical 6-line blocks.

### `src/commands/work.ts` (modify)
**What changes:** Replace 1 inline coAuthor read (around lines 958-965) with `readCoAuthor()` import.
**Pattern to follow:** Same as artifact.ts.
**Why:** Dedup.

### `src/commands/pr.ts` (modify)
**What changes:** Replace 1 inline coAuthor read (around lines 248-256) with `readCoAuthor()` import.
**Pattern to follow:** Same as artifact.ts.
**Why:** Dedup.

### `tests/utils/git-operations.test.ts` (modify)
**What changes:** Add tests for `readCoAuthor()` — reads from ana.json, falls back on missing file, falls back on missing field, falls back on parse error.
**Pattern to follow:** Existing `readBranchPrefix` tests in the same file.
**Why:** New export needs tests.

### `tests/commands/proof.test.ts` (modify)
**What changes:** Add variadic close tests (multi-ID, partial failures, dry-run, JSON envelope with arrays). Add variadic promote tests (multi-ID, single rule appended). Add co-author trailer tests for close and promote (use `git log -1 --pretty=%B` to check body). Existing single-ID tests should still pass — variadic with one ID is backward compatible.
**Pattern to follow:** Existing `createCloseTestProject` and `createPromoteTestProject` helpers. Add `coAuthor` to `ana.json` in test setup (see `artifact.test.ts` line 833 for the pattern).
**Why:** All new behavior needs test coverage.

## Acceptance Criteria

- [ ] `readCoAuthor()` exists in `git-operations.ts`, exported, with JSDoc
- [ ] All 5 inline coAuthor reads replaced with `readCoAuthor()` call (2 in artifact.ts, 1 in work.ts, 1 in pr.ts, plus import added)
- [ ] `ana proof close F001 --reason "test"` still works (single ID backward compat)
- [ ] `ana proof close F001 F002 --reason "test"` closes both, one commit
- [ ] `ana proof close F001 F999 --reason "test"` closes F001, reports F999 as skipped, still commits
- [ ] `ana proof close F001 --dry-run --reason "test"` shows what would happen, no mutation, no commit
- [ ] Close commit message includes co-author trailer from `readCoAuthor()`
- [ ] `ana proof promote F001 --skill coding-standards` still works (single ID backward compat)
- [ ] `ana proof promote F001 F002 --skill coding-standards` promotes both, one rule appended using first ID's summary
- [ ] Promote commit message includes co-author trailer from `readCoAuthor()`
- [ ] Close and promote JSON output returns per-finding results when multiple IDs passed
- [ ] All new/modified commands have tests
- [ ] `(cd packages/cli && pnpm vitest run)` passes with no regressions
- [ ] No build errors

## Testing Strategy

- **Unit tests (git-operations.test.ts):** `readCoAuthor` — 4 cases: reads from config, falls back on missing file, falls back on missing field, falls back on corrupt JSON. Follow `readBranchPrefix` test structure.
- **Integration tests (proof.test.ts):**
  - Close variadic: multi-ID success, partial failure (mix of valid + invalid IDs), dry-run, JSON envelope shape
  - Close co-author: verify `git log -1 --pretty=%B` contains `Co-authored-by:` trailer. Update `createCloseTestProject` to include `coAuthor` in ana.json.
  - Promote variadic: multi-ID success, single rule appended to skill file, all findings marked promoted
  - Promote co-author: same `%B` check
  - Backward compat: existing single-ID tests must pass unchanged
- **Edge cases:**
  - Close with all IDs invalid — should exit with error, no commit
  - Close with mix of active and already-closed findings — close the active ones, skip the closed
  - Promote with all IDs invalid — same pattern
  - Dry-run with `--json` flag — returns results with `dry_run: true`

## Dependencies

None — this is the foundation phase.

## Constraints

- Backward compatibility: single-ID invocations must produce identical behavior (exit codes, output format for human-readable, JSON shape for single results)
- Co-author trailer format: `Co-authored-by: {value from readCoAuthor()}` appended to commit message body with `\n\n` separator
- Close must still `process.exit(1)` when ALL IDs fail. When some succeed, exit 0.
- `--reason` is still required for close (not optional)

## Gotchas

- Commander variadic args change the action parameter from `string` to `string[]`. Every reference to `id` in close/promote handlers becomes `ids` (array). The type signature changes from `(id: string, options: ...)` to `(ids: string[], options: ...)`.
- Existing close tests use `git log --pretty=%s` (subject only). Adding co-author to the commit body doesn't break these. New trailer tests must use `%B` (full body).
- `createCloseTestProject` doesn't include `coAuthor` in ana.json — new trailer tests need to add it. Either modify the helper to accept `coAuthor` option, or update ana.json after calling the helper.
- Promote's duplicate detection (word overlap check) runs once against the single rule text — not once per finding. The batch doesn't change this behavior.
- When building the commit message for variadic close, if IDs list is long, truncate: `[proof] Close F001, F002, ... (5 total): reason`. Same pattern for promote.
- The `readCoAuthor` import in proof.ts joins the existing import line: `import { readArtifactBranch, getCurrentBranch, readCoAuthor } from '../utils/git-operations.js';`

## Build Brief

### Rules That Apply
- All imports use `.js` extensions and `node:` prefix for built-ins
- Use `import type` for type-only imports, separate from value imports
- Explicit return types on all exported functions
- Exported functions require `@param` and `@returns` JSDoc tags
- Early returns over nested conditionals
- Named exports only, no defaults
- Always use `--run` with vitest to avoid watch mode hang

### Pattern Extracts

**readBranchPrefix (git-operations.ts:62-83) — pattern for readCoAuthor:**
```typescript
export function readBranchPrefix(projectRoot?: string): string {
  const anaJsonPath = path.join(projectRoot ?? process.cwd(), '.ana', 'ana.json');

  if (!fs.existsSync(anaJsonPath)) {
    return 'feature/';
  }

  let config: Record<string, unknown>;
  try {
    const content = fs.readFileSync(anaJsonPath, 'utf-8');
    config = JSON.parse(content);
  } catch {
    return 'feature/';
  }

  const prefix = config['branchPrefix'];
  if (typeof prefix !== 'string') {
    return 'feature/';
  }

  return prefix;
}
```

**coAuthor inline read (artifact.ts:1046-1055) — what gets replaced:**
```typescript
  const anaJsonPath = path.join(projectRoot, '.ana', 'ana.json');
  let coAuthor = 'Ana <build@anatomia.dev>';
  try {
    const anaJsonContent = fs.readFileSync(anaJsonPath, 'utf-8');
    const config: { coAuthor?: string } = JSON.parse(anaJsonContent);
    coAuthor = config.coAuthor || 'Ana <build@anatomia.dev>';
  } catch {
    // Use fallback if ana.json can't be read
  }
```

**Close commit without trailer (proof.ts:533-535) — add trailer here:**
```typescript
        const commitMessage = `[proof] Close ${id}: ${options.reason}`;
        const commitResult = spawnSync('git', ['commit', '-m', commitMessage], { stdio: 'pipe', cwd: proofRoot });
```

**Artifact.test.ts coAuthor test (lines 826-851) — pattern for trailer tests:**
```typescript
  describe('coAuthor from config', () => {
    it('uses coAuthor from ana.json when present', async () => {
      await createTestProject({ artifactBranch: 'main', currentBranch: 'main' });
      const anaJsonPath = path.join(tempDir, '.ana', 'ana.json');
      const meta = JSON.parse(await fs.readFile(anaJsonPath, 'utf-8'));
      meta.coAuthor = 'Custom Bot <bot@example.com>';
      await fs.writeFile(anaJsonPath, JSON.stringify(meta), 'utf-8');
      // ... save artifact, check commit message
      const message = getLastCommitMessage();
      expect(message).toContain('Co-authored-by: Custom Bot <bot@example.com>');
    });
  });
```

### Proof Context
- `proof.ts`: 10 active findings. Most relevant: "options.skill typed as non-optional but can be undefined" (affects promote handler signature — be aware during variadic refactor). SEVERITY_ORDER duplication noted but out of scope.
- `git-operations.ts`: No active findings.
- `artifact.ts`, `work.ts`, `pr.ts`: No findings relevant to coAuthor dedup.

### Checkpoint Commands

- After `readCoAuthor` added: `(cd packages/cli && pnpm vitest run tests/utils/git-operations.test.ts)` — Expected: all git-operations tests pass including new ones
- After close variadic: `(cd packages/cli && pnpm vitest run tests/commands/proof.test.ts)` — Expected: all proof tests pass including new variadic tests
- After all changes: `(cd packages/cli && pnpm vitest run)` — Expected: 93 test files pass, all 1702+ tests pass
- Lint: `pnpm run lint`

### Build Baseline
- Current tests: 1702 passed, 2 skipped (1704 total)
- Current test files: 93 passed
- Command used: `(cd packages/cli && pnpm vitest run)`
- After build: expected ~1730+ tests (readCoAuthor ~4, close variadic ~8, close trailer ~2, promote variadic ~4, promote trailer ~2)
- Regression focus: `proof.test.ts` (existing close/promote tests), `artifact.test.ts` (coAuthor tests), `work.test.ts` (complete tests)
