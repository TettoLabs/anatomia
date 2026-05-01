# Spec: Learn V3 Phase 2 — Strengthen Subcommand

**Created by:** AnaPlan
**Date:** 2026-05-01
**Scope:** .ana/plans/active/learn-v3-cli-commands/scope.md

## Approach

Add `ana proof strengthen <ids...> --skill <name> --reason "..."` as a new subcommand on the proof command. This is the commit ceremony for Learn's skill file edits — Learn edits the skill file, then runs `strengthen` to stage, commit, and mark findings as promoted atomically.

The command follows the close subcommand's structure (branch check → pull → read chain → find findings → mutate → write → commit → push → output) but with two key differences:

1. **Verifies uncommitted changes exist** for the specific skill file via `git diff --name-only`. If the skill file has no uncommitted changes, the command exits with a clear error — Learn must edit first, then run the command.
2. **Sets status to `promoted`** (not `closed`) with `promoted_to` pointing to the skill file path. This is consistent with what `promote` does — both result in a finding linked to a skill. The difference is ownership: `promote` writes the rule, `strengthen` verifies someone else wrote it.

The command is variadic (same pattern as Phase 1's close/promote). Multiple finding IDs can be strengthened in one call — they all point to the same skill file, same commit.

Commit message format: `[learn] Strengthen {skill-name}: {reason}` — note the `[learn]` prefix, not `[proof]`. This distinguishes Learn's maintenance commits from proof system commits.

`--force` flag allows strengthening already-closed findings (same pattern as promote's `--force`).

## Output Mockups

### strengthen — success
```
✓ Strengthened 2 findings → coding-standards
  F001 [validation] Missing request validation — src/api/payments.ts (active → promoted)
  F002 [testing] No test for edge case — src/api/payments.ts (active → promoted)
  Skill: .claude/skills/coding-standards/SKILL.md
  Reason: Added validation rule after recurring pattern

Chain: 5 runs · 1 active finding
```

### strengthen — no uncommitted changes
```
Error: No uncommitted changes to .claude/skills/coding-standards/SKILL.md
  Edit the skill file first, then run this command to commit the changes.
  Usage: ana proof strengthen <ids...> --skill coding-standards --reason "..."
```

### strengthen --json
```json
{
  "command": "proof strengthen",
  "timestamp": "2026-05-01T10:00:00.000Z",
  "results": {
    "skill": "coding-standards",
    "skill_path": ".claude/skills/coding-standards/SKILL.md",
    "reason": "Added validation rule after recurring pattern",
    "strengthened": [
      { "id": "F001", "category": "validation", "summary": "Missing request validation", "file": "src/api/payments.ts", "previous_status": "active" },
      { "id": "F002", "category": "testing", "summary": "No test for edge case", "file": "src/api/payments.ts", "previous_status": "active" }
    ],
    "skipped": []
  },
  "meta": { ... }
}
```

### commit message
```
[learn] Strengthen coding-standards: Added validation rule after recurring pattern

Co-authored-by: Ana <build@anatomia.dev>
```

## File Changes

### `src/commands/proof.ts` (modify)
**What changes:** Add `strengthen` subcommand registered via `proofCommand.addCommand()`. Follows the same command registration pattern as close/promote. Uses `readCoAuthor()` from Phase 1 for the commit trailer. The command goes between the promote and audit subcommands in the file.
**Pattern to follow:** Close subcommand (lines 388-571) for overall structure. Promote subcommand for the `--force` flag pattern on already-closed findings.
**Why:** Eliminates the ISSUE-29 failure mode where Learn's skill edits went uncommitted.

### `tests/commands/proof.test.ts` (modify)
**What changes:** Add strengthen test section. Create a `createStrengthenTestProject` helper that extends `createPromoteTestProject` with an uncommitted skill file edit (write to skill file after initial commit, without staging). Tests: success path, no uncommitted changes error, skill not found, finding not found, already-closed with `--force`, variadic, JSON output, commit message format (`[learn]` prefix), co-author trailer.
**Pattern to follow:** `createPromoteTestProject` helper (line 1939) for test setup. The strengthen helper adds one step: after the initial commit, modify the skill file to create uncommitted changes.
**Why:** New subcommand needs full test coverage.

## Acceptance Criteria

- [ ] `ana proof strengthen F001 --skill coding-standards --reason "Added rule"` succeeds when skill file has uncommitted changes
- [ ] Command verifies uncommitted changes via `git diff --name-only` filtered to the skill file path
- [ ] Command exits with clear error when no uncommitted changes exist for the skill file
- [ ] Finding status set to `promoted` (not `closed`) with `promoted_to` pointing to skill file
- [ ] `--force` flag allows strengthening already-closed findings
- [ ] Variadic: `strengthen F001 F002 --skill coding-standards --reason "..."` works
- [ ] Commit message format: `[learn] Strengthen {skill-name}: {reason}` (not `[proof]`)
- [ ] Commit includes co-author trailer from `readCoAuthor()`
- [ ] `--json` flag returns structured output matching the JSON envelope pattern
- [ ] Git stages the skill file, proof_chain.json, and PROOF_CHAIN.md in one commit
- [ ] All new commands have tests
- [ ] `(cd packages/cli && pnpm vitest run)` passes with no regressions
- [ ] No build errors

## Testing Strategy

- **Integration tests (proof.test.ts):**
  - Success: skill file has uncommitted changes, finding exists and is active, command succeeds
  - No changes: skill file has no uncommitted changes, command exits with `NO_UNCOMMITTED_CHANGES` error
  - Skill not found: `--skill nonexistent` exits with `SKILL_NOT_FOUND`
  - Finding not found: invalid ID exits with `FINDING_NOT_FOUND`
  - Already closed: without `--force` exits with `ALREADY_CLOSED`, with `--force` succeeds
  - Already promoted: exits with `ALREADY_PROMOTED`
  - Variadic: multiple IDs, all strengthened in one commit
  - Wrong branch: exits with `WRONG_BRANCH`
  - JSON output: envelope shape matches pattern
  - Commit message: contains `[learn]` prefix, skill name, reason
  - Co-author trailer: `git log -1 --pretty=%B` contains `Co-authored-by:`
- **Edge cases:**
  - All IDs invalid — error, no commit
  - Mix of valid and invalid IDs — strengthen valid, skip invalid, still commit
  - Reason with special characters (quotes, newlines) — passes through to commit message safely via `spawnSync`

## Dependencies

Phase 1 must be complete — `readCoAuthor()` must exist in `git-operations.ts`, and close/promote must be variadic (so the test helpers are updated).

## Constraints

- `--skill` and `--reason` are both required (no defaults)
- The command checks `git diff --name-only` for the specific skill file path (`.claude/skills/{name}/SKILL.md`), not any uncommitted changes globally
- Status is `promoted`, not `closed` — this is deliberate. The finding was resolved by encoding knowledge into a skill rule. The `promoted_to` field links the finding to the specific skill file.
- Branch check required — this command modifies the proof chain

## Gotchas

- The `git diff --name-only` check must look for the skill file path relative to the repo root: `.claude/skills/{name}/SKILL.md`. The diff output uses repo-relative paths, so the comparison is direct string matching.
- `git diff --name-only` only shows unstaged changes. If Learn staged the file already (unlikely but possible), use `git diff --name-only HEAD` to catch both staged and unstaged changes. Better: check both `git diff --name-only` and `git diff --name-only --cached` and accept either.
- The `--reason` value goes into the commit message via `spawnSync` (not `execSync`), so special characters in the reason don't cause shell injection. This is already the pattern used by close and promote.
- The strengthen command must stage the skill file explicitly (`git add {skillRelPath}`) along with proof chain files. Don't rely on `git add -A` — that could stage unrelated changes.
- `createStrengthenTestProject` needs to write to the skill file AFTER the initial commit to create uncommitted changes. Writing before the commit and then modifying after is more robust — ensures the file is tracked and has a diff.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions and `node:` prefix for built-ins
- Explicit return types on exported functions, JSDoc on exports
- Early returns over nested conditionals
- Error handling: chalk.red + process.exit(1) for commands
- Use `spawnSync` for git commit (not `execSync`) — existing pattern

### Pattern Extracts

**Close subcommand structure (proof.ts:388-571) — command skeleton:**
```typescript
  const closeCommand = new Command('close')
    .description('Close an active finding with a reason')
    .argument('<id>', 'Finding ID to close (e.g., F003)')
    .option('--reason <reason>', 'Why this finding no longer applies')
    .option('--json', 'Output JSON format')
    .action(async (id: string, options: { reason?: string; json?: boolean }) => {
      const proofRoot = findProjectRoot();
      const proofChainPath = path.join(proofRoot, '.ana', 'proof_chain.json');
      const parentOpts = proofCommand.opts();
      const useJson = options.json || parentOpts['json'];

      // Helper: output error and exit
      const exitError = (code: string, message: string, context: Record<string, unknown> = {}): void => {
        // ... error envelope pattern
      };

      // Validate required options
      // Branch check
      // Pull
      // Read chain
      // Find finding(s)
      // Mutate
      // Write chain
      // Regenerate dashboard
      // Git: stage, commit, push
      // Output
    });
```

**Promote --force pattern (proof.ts:724-732):**
```typescript
      // Check if already closed (allow with --force)
      if (foundFinding.status === 'closed' && !options.force) {
        exitError('ALREADY_CLOSED', `Finding "${id}" is already closed.`, {
          closed_by: foundFinding.closed_by ?? 'unknown',
          closed_at: foundFinding.closed_at ?? 'unknown',
          closed_reason: foundFinding.closed_reason ?? '',
        });
        return;
      }
```

**createPromoteTestProject helper (proof.test.ts:1939-1983) — base for strengthen helper:**
```typescript
  async function createPromoteTestProject(entries: unknown[], options?: { branch?: string; skillContent?: string; skillName?: string; noSkill?: boolean }): Promise<void> {
    const branch = options?.branch ?? 'main';
    const skillName = options?.skillName ?? 'coding-standards';
    // ... git init, ana.json, proof chain, skill file, initial commit
    execSync('git add -A && git commit -m "init"', { cwd: tempDir, stdio: 'ignore' });
    execSync(`git branch -M ${branch}`, { cwd: tempDir, stdio: 'ignore' });
  }
```

### Proof Context
- `proof.ts`: "options.skill typed as non-optional but can be undefined" — relevant to strengthen's `--skill` option. Type it correctly as potentially undefined in the options interface, then validate with early return before use.

### Checkpoint Commands

- After strengthen implementation: `(cd packages/cli && pnpm vitest run tests/commands/proof.test.ts)` — Expected: all proof tests pass
- After all changes: `(cd packages/cli && pnpm vitest run)` — Expected: 93 test files pass
- Lint: `pnpm run lint`

### Build Baseline
- Current tests: 1702 passed (after Phase 1 this will be higher — use actual count from Phase 1 build report)
- Current test files: 93
- Command used: `(cd packages/cli && pnpm vitest run)`
- After build: expected ~12-15 new tests for strengthen
- Regression focus: `proof.test.ts` (existing promote tests share similar test infrastructure)
