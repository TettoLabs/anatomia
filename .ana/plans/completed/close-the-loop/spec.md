# Spec: Close the Loop

**Created by:** AnaPlan
**Date:** 2026-04-28
**Scope:** .ana/plans/active/close-the-loop/scope.md

## Approach

Four connected changes that give the proof chain a management surface, a stable JSON contract, a delivery mechanism to Build, and improved safety in `work complete`.

**Core extraction:** Extract chain health computation from `writeProofChain` (work.ts:977-996) into a shared `computeChainHealth()` function in `utils/proofSummary.ts`. This function returns the `meta.findings` object used by every `--json` response. Both close, audit, and the contract wrapper on existing commands call it.

**JSON contract wrapper:** A `wrapJsonResponse(command, results, chainPath)` utility that reads the chain, calls `computeChainHealth`, and returns `{ command, timestamp, results, meta }`. A matching `wrapJsonError(command, errorCode, message, context, chainPath)` for error responses. Both live in `utils/proofSummary.ts` alongside `computeChainHealth`. Every `--json` code path calls one of these two functions.

**Close subcommand:** Follows `saveArtifact`'s git pattern exactly — branch validation → pull with conflict handling → read chain → mutate finding → write chain → regenerate PROOF_CHAIN.md → stage → commit → push. Registration follows the existing `contextCommand` pattern in `registerProofCommand`.

**Audit subcommand:** Read-only. No branch check. Reads proof_chain.json, filters active findings, groups by file (descending count), caps at top 8 files / top 3 per file. Checks `anchor_present` by reading files and searching for anchor text. Uses `formatContextResult`'s chalk conventions (dim for category, gray for metadata).

**Build delivery:** Add `### Proof Context` subsection to the Plan template's Build Brief, positioned between `### Pattern Extracts` and `### Checkpoint Commands`. This follows the structural subsection pattern that has 100% compliance across 23 specs.

**Work complete hardening:** Fix the pull error catch at work.ts:1058-1064 to warn on non-conflict failures (matching saveArtifact's pattern). Add a one-line nudge after the summary output when active > 20 AND zero human closures exist in the chain.

## Output Mockups

### `ana proof close F003 --reason "addressed in stripe-payments"`

```
✓ Closed F003: addressed in stripe-payments
  [validation] Missing request validation — src/api/payments.ts
  active → closed (by: human)

Chain: 23 runs · 56 active findings
```

### `ana proof close F003 --reason "fixed" --json`

```json
{
  "command": "proof close",
  "timestamp": "2026-04-28T10:30:00.000Z",
  "results": {
    "finding": {
      "id": "F003",
      "category": "validation",
      "summary": "Missing request validation",
      "file": "src/api/payments.ts",
      "severity": "blocker",
      "entry_slug": "stripe-payments",
      "entry_feature": "Stripe Payment Integration"
    },
    "previous_status": "active",
    "new_status": "closed",
    "reason": "fixed",
    "closed_by": "human"
  },
  "meta": {
    "chain_runs": 23,
    "findings": { "active": 56, "closed": 32, "lesson": 21, "promoted": 0, "total": 109 }
  }
}
```

### `ana proof close` errors

```
Error: --reason is required.
  Proof closures must explain why the finding no longer applies.
  Usage: ana proof close {id} --reason "explanation"
```

```
Error: Finding "F999" not found.
  Run `ana proof audit` to see active findings.
```

```
Error: Finding "F003" is already closed.
  Closed by: human on 2026-04-25
  Reason: addressed in stripe-payments
```

```
Error: Wrong branch. Switch to `main` to close findings.
  Run: git checkout main
```

### `ana proof audit`

```
Proof Audit: 57 active findings across 14 files

  src/commands/work.ts (5 findings)
    [validation] Missing input sanitization on slug parameter
           age: 28d | anchor: ✓ | severity: blocker
           from: Fix Artifact Save
    [error-handling] Silent catch swallows non-conflict pull errors
           age: 3d | anchor: ✓ | severity: observation
           from: Clean Ground
    [testing] Integration test missing for multi-phase complete
           age: 14d | anchor: ✓ | severity: note
           from: Structured Findings

  src/commands/proof.ts (3 findings)
    [contract] JSON output shape inconsistent across subcommands
           age: 3d | anchor: ✓ | severity: blocker
           from: Clean Ground
    [testing] No test for corrupt proof_chain.json handling
           age: 28d | anchor: ✗ | severity: —
           from: Findings Lifecycle
    [error-handling] Missing findProjectRoot error boundary
           age: 28d | anchor: ✓ | severity: —
           from: Findings Lifecycle

  ... and 6 more files (49 findings)
```

### `ana proof audit --json`

```json
{
  "command": "proof audit",
  "timestamp": "2026-04-28T10:30:00.000Z",
  "results": {
    "total_active": 57,
    "by_file": [
      {
        "file": "src/commands/work.ts",
        "count": 5,
        "findings": [
          {
            "id": "F003",
            "category": "validation",
            "summary": "Missing input sanitization on slug parameter",
            "file": "src/commands/work.ts",
            "anchor": "validateSlug",
            "anchor_present": true,
            "line": 142,
            "age_days": 28,
            "severity": "blocker",
            "related_assertions": ["A003", "A004"],
            "entry_slug": "fix-artifact-save",
            "entry_feature": "Fix Artifact Save"
          }
        ],
        "overflow": 2
      }
    ]
  },
  "meta": {
    "chain_runs": 23,
    "findings": { "active": 57, "closed": 31, "lesson": 21, "promoted": 0, "total": 109 }
  }
}
```

### Existing commands restructured (`ana proof --json`)

```json
{
  "command": "proof",
  "timestamp": "2026-04-28T10:30:00.000Z",
  "results": {
    "entries": [...]
  },
  "meta": {
    "chain_runs": 23,
    "findings": { "active": 57, "closed": 31, "lesson": 21, "promoted": 0, "total": 109 }
  }
}
```

### `work complete` nudge (after existing summary)

```
✓ PASS — Stripe Payment Integration
  22/22 covered · 20/22 satisfied · 2 deviations
  Chain: 24 runs · 57 active findings
→ Run `ana proof audit` to review active findings
```

### `work complete` pull warning (non-conflict failure)

```
⚠ Warning: Pull failed (network error). Continuing with local data.
  Run `git pull` manually to sync before completing.
```

## File Changes

### `packages/cli/src/utils/proofSummary.ts` (modify)
**What changes:** Add three exported functions: `computeChainHealth(chain)` returning `{ chain_runs, findings: { active, closed, lesson, promoted, total } }`, `wrapJsonResponse(command, results, chain)` returning the 4-key envelope, and `wrapJsonError(command, code, message, context, chain)` returning the error envelope. The chain parameter is the parsed `ProofChain` object (already read by the caller).
**Pattern to follow:** Existing `getProofContext` in the same file — pure function, takes data, returns typed result.
**Why:** Every `--json` response needs identical `meta` computation. Without extraction, the health counting logic would be copy-pasted into close, audit, and the three existing commands.

### `packages/cli/src/commands/proof.ts` (modify)
**What changes:** Register `close` and `audit` subcommands following the existing `contextCommand` pattern. Wrap existing `--json` outputs at lines 242, 285, 315 with `wrapJsonResponse`. Add structured error handling for close (branch check, pull, finding lookup, already-closed, reason-required). Audit implementation with file grouping, truncation, and anchor_present checking.
**Pattern to follow:** `contextCommand` registration (proof.ts:295-329) for subcommand wiring. `saveArtifact` (artifact.ts:944-962) for close's git operations. `formatContextResult` (proof.ts:340-388) for audit's chalk formatting.
**Why:** This is where proof subcommands live. The close and audit commands are the primary deliverable.

### `packages/cli/src/commands/work.ts` (modify)
**What changes:** (1) Replace inline health counting at lines 977-996 with a call to `computeChainHealth`. (2) Fix pull error handling at lines 1058-1064 to warn on non-conflict failures instead of silently continuing. (3) Add nudge line after summary output at line 1303 when active > 20 AND zero human closures in chain.
**Pattern to follow:** `saveArtifact`'s error handling (artifact.ts:953-961) for the pull fix — same message pattern with chalk.yellow for warning.
**Why:** (1) Eliminates duplicated health logic. (2) Prevents stale-data bugs when network fails. (3) Drives discovery of `ana proof audit`.

### `packages/cli/templates/.claude/agents/ana-plan.md` (modify)
**What changes:** Add `### Proof Context` subsection between `### Pattern Extracts` and `### Checkpoint Commands` in the Build Brief spec format section. Include curation instruction: top 2-3 findings per affected file, prioritize by severity, skip notes unless directly relevant to the build, flag assertion overlap with current contract.
**Pattern to follow:** Existing structural subsections (`### Rules That Apply`, `### Pattern Extracts`) — same heading level, same instructional style.
**Why:** Delivers institutional memory to Build. The structural subsection pattern has 100% compliance across 23 specs. Without this, Build has zero awareness of findings that could inform its implementation.

### `.claude/agents/ana-plan.md` (modify)
**What changes:** Mirror the template change — add identical `### Proof Context` subsection. This is the dogfood copy used by this project's own pipeline.
**Pattern to follow:** Same content as the template change.
**Why:** The live agent definition must stay in sync with the template. Otherwise this project's pipeline doesn't benefit from its own feature.

### `packages/cli/tests/commands/proof.test.ts` (modify)
**What changes:** Add test suites for close (success, error codes, JSON shape), audit (grouping, truncation, zero-findings, JSON shape), and JSON contract (existing commands now return 4-key envelope).
**Pattern to follow:** Existing test structure in the same file — `createProofChain` helper, `runProof` helper, process.chdir to tempDir, FORCE_COLOR=0.
**Why:** Every acceptance criterion needs mechanical verification.

### `packages/cli/tests/commands/work.test.ts` (modify)
**What changes:** Add tests for pull warning on non-conflict failure and for the audit nudge (active > 20 with zero human closures → nudge appears; after first human close → nudge disappears).
**Pattern to follow:** Existing `work complete` test structure in the same file.
**Why:** AC15 and AC16 need verification.

## Acceptance Criteria

- [ ] AC1: `ana proof close {id} --reason "text"` sets finding status to `closed` with `closed_reason`, `closed_at`, `closed_by: 'human'`, regenerates PROOF_CHAIN.md, commits `[proof] Close {id}: {reason}`, and pushes.
- [ ] AC2: `ana proof close` requires the artifact branch. Wrong branch produces structured error with code `WRONG_BRANCH`.
- [ ] AC3: `ana proof close` runs `git pull --rebase` before reading proof_chain.json, following `saveArtifact`'s error handling pattern.
- [ ] AC4: `ana proof close` with a nonexistent finding ID produces structured error with code `FINDING_NOT_FOUND`.
- [ ] AC5: `ana proof close` on an already-closed finding produces structured error with code `ALREADY_CLOSED`, including `closed_by` and `closed_reason` from the existing closure.
- [ ] AC6: `ana proof close` without `--reason` produces structured error with code `REASON_REQUIRED`.
- [ ] AC7: `ana proof close --json` returns `{ command, timestamp, results: { finding, previous_status, new_status, reason, closed_by }, meta }` on success.
- [ ] AC8: All `--json` error responses follow `{ command, timestamp, error: { code, message, ...context }, meta }`.
- [ ] AC9: `ana proof audit` lists active findings grouped by file, top 3 per file, top 8 files, with overflow.
- [ ] AC10: Each audit finding displays three lines: `[category] summary`, `age: Nd | anchor: ✓/✗ | severity: {level}`, `from: Feature Name`.
- [ ] AC11: `ana proof audit --json` returns `{ command, timestamp, results: { total_active, by_file }, meta }` with full finding objects.
- [ ] AC12: Existing `ana proof --json`, `ana proof {slug} --json`, `ana proof context --json` restructured into 4-key contract.
- [ ] AC13: `meta` on every command contains `{ chain_runs, findings: { active, closed, lesson, promoted, total } }`.
- [ ] AC14: Plan template includes `### Proof Context` as structural subsection in Build Brief.
- [ ] AC15: `work complete` shows nudge when active > 20 AND zero human closures.
- [ ] AC16: `work complete`'s pull error handling warns on non-conflict failures.
- [ ] AC17: Closing a lesson shows the `lesson → closed` transition in terminal output.
- [ ] Tests pass with `cd packages/cli && pnpm vitest run`
- [ ] No build errors with `pnpm run build`
- [ ] No lint errors with `pnpm run lint`

## Testing Strategy

- **Unit tests (proof.test.ts):** Test close with success path (finding mutated, JSON shape correct), all error codes (WRONG_BRANCH, FINDING_NOT_FOUND, ALREADY_CLOSED, REASON_REQUIRED), lesson → closed transition. Test audit with various finding counts (0, 5, 200), file grouping, overflow caps, anchor_present computation. Test JSON contract on existing commands (proof list, proof slug, proof context).
- **Unit tests (work.test.ts):** Test pull warning appears on simulated non-conflict git failure. Test nudge appears when active > 20 and zero human closures. Test nudge absent when human closures exist.
- **Edge cases:** Corrupt proof_chain.json → PARSE_ERROR. No proof_chain.json → NO_PROOF_CHAIN. Finding with no severity field → display `—`. Anchor text in a deleted file → `anchor_present: false`. Zero active findings in audit → clean message.

Git operations in close tests should mock `execSync` for git commands (branch check, pull, commit, push) following the existing test pattern of `vi.mock` for child_process. The actual chain mutation logic should be tested against real temp-directory proof_chain.json files.

## Dependencies

- `computeChainHealth` must be extracted before close/audit/contract-wrapper can use it.
- Close and audit both depend on the JSON wrapper utilities.
- Template change is independent of code changes.

## Constraints

- **JSON contract is permanent.** The `{ command, timestamp, results, meta }` shape and `meta.findings` fields become additive-only after merge. New fields can be added in future; nothing removed or renamed.
- **`closed_by` typing.** Must be `'human'` for manual close. Types already support this (types/proof.ts:77).
- **Commit format.** Close commits use `[proof] Close {id}: {reason}` — not the slug-prefix format used by artifact saves.
- **No breaking changes to existing terminal output.** Only `--json` output shapes change. Human-readable output for existing commands stays identical.
- **Pre-commit hooks run tsc, lint, and tests.** All changes must pass before commit.

## Gotchas

- **Commander parent option inheritance.** The `proof` parent command defines `--json`. Subcommands access it via `proofCommand.opts()` (see proof.ts:312-313). Close and audit must read `--json` from both their own options AND parent opts, using the same `|| parentOpts['json']` pattern as contextCommand.
- **`writeProofChain` in work.ts is async (uses `fsPromises`), but the health counting is sync logic.** The extracted `computeChainHealth` should be a synchronous pure function that takes the parsed chain object. The caller handles file I/O.
- **Close must find the finding across ALL entries.** A finding ID like "F003" exists on a specific entry. Iterate all entries' findings arrays to find the match. Finding IDs are unique across the chain (assigned sequentially by verify).
- **`generateDashboard` import.** Close needs to call `generateDashboard` after mutation to regenerate PROOF_CHAIN.md. This is already exported from `utils/proofSummary.ts`.
- **Audit's `entry_slug` and `entry_feature` fields** come from the parent entry object, not the finding itself. When iterating findings, track which entry they belong to.
- **Age calculation.** Use the entry's `completed_at` date, not the current date minus some stored date. Age = days since the entry was completed.
- **The nudge in work complete** must read the chain AFTER `writeProofChain` has been called (which may auto-close findings). Use the stats object already returned by `writeProofChain` for the active count. For human-closure check, scan all findings in the chain for any with `closed_by === 'human'`.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions and `node:` prefix for built-ins.
- Use `import type` for type-only imports, separate from value imports.
- Explicit return types on all exported functions.
- Exported functions require `@param` and `@returns` JSDoc tags.
- Error handling: commands surface errors with `chalk.red` + `process.exit(1)`. Engine/utils return defaults.
- Early returns over nested conditionals.
- Pre-commit hooks enforce tsc, lint, and vitest. All must pass.

### Pattern Extracts

**saveArtifact git pull pattern** (artifact.ts:944-962):
```typescript
  // 7. Pull before commit (artifact branch only)
  if (typeInfo.category === 'planning') {
    try {
      // Check if remote exists first
      const remotes = execSync('git remote', { stdio: 'pipe', encoding: 'utf-8', cwd: projectRoot }).trim();
      if (remotes) {
        execSync('git pull --rebase', { stdio: 'pipe', encoding: 'utf-8', cwd: projectRoot });
      }
      // If no remotes, skip pull (e.g., in tests or new repos)
    } catch (error) {
      // Only error if it's an actual conflict, not a "no remote" error
      const errorMessage = error instanceof Error ? error.message : '';
      if (errorMessage.includes('conflict') || errorMessage.includes('Cannot rebase')) {
        console.error(chalk.red('Error: Pull failed due to conflicts. Resolve conflicts and try again.'));
        process.exit(1);
      }
      // Otherwise, continue (e.g., no upstream branch configured yet)
    }
  }
```

**Chain health counting** (work.ts:977-996):
```typescript
  // Compute chain health counts
  const runs = chain.entries.length;
  let totalFindings = 0;
  let activeCount = 0;
  let lessonsCount = 0;
  let promotedCount = 0;
  let closedCount = 0;

  for (const e of chain.entries) {
    for (const f of e.findings || []) {
      totalFindings++;
      switch (f.status) {
        case 'active': activeCount++; break;
        case 'lesson': lessonsCount++; break;
        case 'promoted': promotedCount++; break;
        case 'closed': closedCount++; break;
        default: activeCount++; break; // undefined = active
      }
    }
  }
```

**Context subcommand registration** (proof.ts:295-329):
```typescript
  const contextCommand = new Command('context')
    .description('Query proof chain for context about specific files')
    .argument('<files...>', 'File paths to query')
    .option('--json', 'Output JSON format')
    .action(async (files: string[], options: { json?: boolean }) => {
      const proofRoot = findProjectRoot();
      const proofChainPath = path.join(proofRoot, '.ana', 'proof_chain.json');

      // Check if proof chain exists
      if (!fs.existsSync(proofChainPath)) {
        console.log('No proof chain found. Complete pipeline cycles to build proof context.');
        return;
      }

      const results = getProofContext(files, proofRoot);

      // Check both own --json and parent's --json
      const parentOpts = proofCommand.opts();
      const useJson = options.json || parentOpts['json'];

      if (useJson) {
        console.log(JSON.stringify({ results }, null, 2));
        return;
      }
```

**formatContextResult chalk conventions** (proof.ts:360-370):
```typescript
    for (const finding of result.findings) {
      const anchor = finding.anchor ? ` ${finding.anchor} —` : '';
      let truncatedSummary = finding.summary;
      if (truncatedSummary.length > 250) {
        const lastSpace = truncatedSummary.lastIndexOf(' ', 250);
        const cutPoint = lastSpace > 0 ? lastSpace : 250;
        truncatedSummary = truncatedSummary.substring(0, cutPoint) + '...';
      }
      lines.push(`  ${chalk.dim(`[${finding.category}]`)}${anchor} ${truncatedSummary}`);
      lines.push(`         ${chalk.gray(`From: ${finding.from}`)}`);
      lines.push('');
    }
```

### Proof Context

No active proof findings exist for proof.ts or work.ts that are relevant to this build (the findings about these files ARE the things being fixed by this scope).

### Checkpoint Commands

- After `computeChainHealth` extraction: `cd packages/cli && pnpm vitest run --run tests/commands/work.test.ts` — Expected: existing work tests still pass (no regression from extraction)
- After close + audit implementation: `cd packages/cli && pnpm vitest run --run tests/commands/proof.test.ts` — Expected: all new + existing proof tests pass
- After all changes: `cd packages/cli && pnpm vitest run` — Expected: all 1575+ tests pass
- Lint: `pnpm run lint`
- Build: `pnpm run build`

### Build Baseline
- Current tests: 1575 passed, 2 skipped (1577 total)
- Current test files: 97 passed
- Command used: `cd packages/cli && pnpm vitest run`
- After build: expected ~1615+ tests in 97 test files (new tests add to existing proof.test.ts and work.test.ts)
- Regression focus: `tests/commands/proof.test.ts` (existing JSON output assertions will break when wrapped in contract), `tests/commands/work.test.ts` (health counting extraction could break if import path wrong)
