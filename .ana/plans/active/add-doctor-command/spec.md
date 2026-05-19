# Spec: ana doctor — unified project health diagnostic

**Created by:** AnaPlan
**Date:** 2026-05-19
**Scope:** .ana/plans/active/add-doctor-command/scope.md

## Approach

Create a new `ana doctor` command that orchestrates existing data sources into a unified health dashboard. The command reads from five modules — `update-check.ts`, `scan-freshness.ts`, `check.ts`, `proofSummary.ts`, and filesystem reads of `.ana/plans/active/` — and formats results into six status lines across five diagnostic dimensions.

Doctor is an assembly command. Every health-checking function already exists and is tested. Doctor calls them, interprets their results, and formats output. No health logic is reimplemented in doctor.ts.

Three small exports need to be added to check.ts to support doctor's needs:
- `discoverSkills()` — currently private. Doctor needs skill enumeration for the skills dimension.
- `countPopulatedContextSections()` — currently private. Doctor needs raw section counts for JSON mode (avoiding chalk-formatted strings from `checkContextForDashboard()`).
- `PROJECT_CONTEXT_SECTIONS` — currently a private const. Doctor needs the total count for the "N/N sections populated" display.

For terminal output, doctor uses `checkContextForDashboard()` and `checkSkill()` which return chalk-formatted symbols. For JSON output, doctor calls the raw underlying functions directly (`countPopulatedContextSections`, `readSetupProgress`, `countEntriesInSection`) to avoid chalk formatting in structured data.

The JSON envelope is doctor-specific: `{ command, timestamp, results }`. It does NOT use `wrapJsonResponse` from proofSummary.ts — that wraps results inside a proof chain health meta section, which would be confusing for a command that IS the health overview.

Maturity detection uses explicit thresholds from the proof chain entry count and scan age. These thresholds are constants at the top of doctor.ts, not buried in conditionals.

Stale work detection reads `.saves.json` files on the artifact branch under `.ana/plans/active/*/`. For each active work item, it finds the most recent `saved_at` timestamp across all artifact types. Items stalled >14 days surface as ⚠ lines. Worktree existence is treated as "in progress" — if a worktree exists for the slug, the item is not considered stalled regardless of timestamp age.

## Output Mockups

**Compact view** (new project: scan <1 day, zero proof runs):
```
ana doctor

  ✓ CLI v1.1.1 (current)
  ✓ Scan fresh (today, deep)
  ○ Context — scaffold (run: claude --agent ana-setup)
  ○ Skills — scaffold defaults
  ○ Proof chain — no pipeline runs yet

Everything's set up. Next: claude --agent ana-setup
```

**After setup, before first pipeline run:**
```
ana doctor

  ✓ CLI v1.1.1 (current)
  ✓ Scan fresh (today, deep)
  ✓ Context — 6/6 sections populated
  ✓ Skills — 5 of 5 enriched
  ○ Proof chain — no pipeline runs yet

Ready for your first pipeline run. Next: claude --agent ana
```

**Established project (10+ runs):**
```
ana doctor

  ✓ CLI v1.1.1 (current)
  ✓ Scan fresh (2d ago, 8 commits)
  ✓ Context — 6/6 sections populated
  ✓ Skills — 5 of 5 enriched
  ✓ Proof chain — 10 runs, 3 active findings, improving

All healthy.
```

**Problems detected:**
```
ana doctor

  ✗ CLI v1.1.1 → v1.3.0 available
    Run: npm update -g anatomia-cli
  ✗ Scan stale (23d, 87 commits since scan)
    Run: ana init
  ✓ Context — 6/6 sections populated
  ○ Skills — 3 of 5 enriched (deployment, ai-patterns still scaffold)
  ✓ Proof chain — 42 runs, 8 active findings (2 risk), stable

  ⚠ fix-auth-timeout: stalled 14d at ready-for-plan

2 issues found. Fix the ✗ items above.
```

**Setup in progress:**
```
  ○ Context — setup in progress (resume: claude --agent ana-setup)
```

**Setup complete but thin:**
```
  ○ Context — scaffold (setup completed but sections thin)
```

**Setup never started:**
```
  ○ Context — scaffold (run: claude --agent ana-setup)
```

**JSON output** (`ana doctor --json`):
```json
{
  "command": "doctor",
  "timestamp": "2026-05-19T12:00:00.000Z",
  "results": {
    "maturity": "established",
    "dimensions": {
      "cli_version": {
        "status": "pass",
        "current": "1.1.1",
        "latest": null,
        "project_version": "1.1.1"
      },
      "scan_freshness": {
        "status": "pass",
        "days_since_scan": 2,
        "commits_since_scan": 8,
        "depth": "deep"
      },
      "context": {
        "status": "pass",
        "sections_populated": 6,
        "sections_total": 6,
        "setup_state": "complete"
      },
      "skills": {
        "status": "pass",
        "enriched": 5,
        "total": 5,
        "scaffold_defaults": []
      },
      "proof_chain": {
        "status": "pass",
        "runs": 42,
        "active_findings": 8,
        "risk_findings": 2,
        "trend": "stable"
      }
    },
    "stale_work": [],
    "overall": "pass"
  }
}
```

**Worktree guard:**
```
Run from the main project directory, not from a worktree.
```

**No .ana/ directory:**
```
No Anatomia installation found. Run: ana init
```

## File Changes

### `packages/cli/src/commands/doctor.ts` (create)
**What changes:** New command file. Imports from update-check.ts, scan-freshness.ts, check.ts, proofSummary.ts. Registers `ana doctor` with `--json` option. Contains the action handler, dimension assessment functions, terminal formatter, and JSON formatter.
**Pattern to follow:** `proof.ts` health subcommand for the orchestrate-and-format pattern. `check.ts` for ✓/○/✗ symbol rendering with chalk.
**Why:** This is the entire feature. Without it, no `ana doctor` command exists.

### `packages/cli/src/commands/check.ts` (modify)
**What changes:** Export three currently-private symbols: `discoverSkills()`, `countPopulatedContextSections()`, and `PROJECT_CONTEXT_SECTIONS`. No logic changes — only adding `export` keyword to the existing declarations.
**Pattern to follow:** Existing exports in the same file (e.g., `checkSkill`, `readSetupProgress`).
**Why:** Doctor needs skill discovery, raw section counts, and the canonical section list. Without these exports, doctor would duplicate the logic — creating the drift the design principles warn against.

### `packages/cli/src/index.ts` (modify)
**What changes:** Import `registerDoctorCommand` and call it in the GETTING STARTED group, after `registerSetupCommand`.
**Pattern to follow:** The existing import/register pattern for all other commands in this file.
**Why:** Without registration, the command doesn't appear in the CLI.

### `packages/cli/tests/commands/doctor.test.ts` (create)
**What changes:** Test file covering all six dimensions, maturity detection, JSON output, exit codes, worktree guard, and no-ana guard.
**Pattern to follow:** `check-dashboard.test.ts` for fixture setup with `createTestProject`-style temp directories, and `proof.test.ts` for testing JSON envelope structure.
**Why:** The command must be tested. Contract assertions map to test blocks.

### `website/scripts/extract-docs-data.ts` (modify)
**What changes:** Add `Doctor: 'src/commands/doctor.ts'` to the `funcToFile` map (currently at line 448-459).
**Pattern to follow:** The 10 existing entries in the same map.
**Why:** Without this entry, the prebuild extraction script can't find doctor.ts, and the command is invisible in commands.json, the search index, and llms.txt.

### `website/content/docs/guides/troubleshooting.mdx` (modify)
**What changes:** Two edits: (1) Add a new TroubleCard "How do I know if my installation is healthy?" under "Getting through the gate" that points to `ana doctor`. (2) Update the existing "Version mismatch warning" card to mention `ana doctor` as a diagnostic alongside `ana work status`.
**Pattern to follow:** Existing TroubleCard components in the same file.
**Why:** Doctor is the canonical answer to "is my installation healthy?" — the troubleshooting guide should say so.

### `website/content/docs/start.mdx` (modify)
**What changes:** Two edits: (1) After Step 2 (Initialize), add a note that `ana doctor` verifies the installation is healthy. (2) In the Updating section, mention `ana doctor` as the primary health check after updates, alongside the existing `ana work status` mention.
**Pattern to follow:** Existing prose style and Callout components in start.mdx.
**Why:** New users need to know doctor exists at the moment they'd naturally want it — right after init and right after updating.

### `README.md` (modify)
**What changes:** Two edits: (1) Add `ana doctor` to Quick Start after `ana init commit`. (2) Add a row to the Commands table under "Scan and init": `ana doctor | Check project health and configuration. --json for CI`.
**Pattern to follow:** Existing Quick Start code block and markdown table format.
**Why:** README is the front door. Doctor belongs in both the quick start flow and the command reference.

## Acceptance Criteria

- [x] AC1: `ana doctor` with no flags prints a human-readable dashboard with one status line per dimension (6 lines: CLI, scan, context, skills, proof, plus optional stale work lines)
- [x] AC2: `ana doctor --json` prints structured JSON matching the envelope schema above
- [x] AC3: Exit code is 0 when no ✗ items exist, 1 when any ✗ exists. Yellow (○) does not affect exit code.
- [x] AC4: A project with zero proof chain entries and scan age < 1 day shows the compact welcome view with a "Next:" CTA
- [x] AC5: A project with 10+ proof chain entries shows the full diagnostic dashboard without the welcome CTA
- [x] AC6: Doctor calls existing functions from update-check.ts, scan-freshness.ts, check.ts, and proofSummary.ts — no health-checking logic is reimplemented in doctor.ts
- [x] AC7: Running `ana doctor` in a directory without `.ana/` prints "No Anatomia installation found. Run: ana init" and exits 1
- [x] AC8: Each ✗ line includes an actionable fix command (e.g., "Run: npm update -g anatomia-cli", "Run: ana init")
- [x] AC9: Skills dimension names which skills are still scaffold-default when not all are enriched
- [x] AC10: Stale work items (>14 days at any stage) appear as ⚠ lines after the five dimensions
- [x] AC11: `website/scripts/extract-docs-data.ts` `funcToFile` map includes `Doctor: 'src/commands/doctor.ts'`
- [x] AC12: `README.md` Quick Start section includes `ana doctor` and the Commands table has a `ana doctor` row under "Scan and init"
- [x] AC13: `website/content/docs/guides/troubleshooting.mdx` has a new TroubleCard for "How do I know if my installation is healthy?" and the "Version mismatch warning" card mentions `ana doctor`
- [x] AC14: `website/content/docs/start.mdx` mentions `ana doctor` after init and in the Updating section
- [x] AC15: Running `ana doctor` from inside a worktree prints "Run from the main project directory, not from a worktree." and exits 1
- [x] AC16: Context dimension with `setupPhase` at intermediate value shows "setup in progress (resume: claude --agent ana-setup)"
- [x] AC17: Context dimension with `setupPhase` "complete" but scaffold-quality sections shows "scaffold (setup completed but sections thin)"
- [x] AC18: Context dimension with no `setupPhase` (setup never started) shows "scaffold (run: claude --agent ana-setup)"
- [x] AC19: Tests pass with `pnpm run test -- --run`
- [x] AC20: No build errors with `pnpm run build`

## Testing Strategy

- **Unit tests:** Test each dimension assessment function in isolation using temp directories with crafted fixture files. Follow `check-dashboard.test.ts` pattern: `fs.mkdtemp` for temp dirs, create `.ana/` structure with specific fixture data, call the function, assert the result.
- **Integration tests:** Test the full `runDoctor()` function (the action handler, extracted as a testable function) with different project states. Capture console output and exit code.
- **Edge cases:**
  - No `.ana/` directory → error message + exit 1
  - Partial `.ana/` (missing scan.json, missing proof_chain.json) → graceful degradation per dimension
  - Empty proof chain (0 entries) → yellow, not red
  - First run with no npm cache → green CLI version (no known issue)
  - Worktree directory → guard message + exit 1
  - All three setupPhase branches: intermediate, complete-but-thin, absent
  - JSON output structure validation for every dimension status combination
  - Stale work items: item stalled >14d at ready-for-plan, item with worktree (not stalled), item stalled at ready-for-build without worktree

## Dependencies

All data source functions already exist and are exported (or will be after the three check.ts exports are added):
- `checkForUpdates()` from `update-check.ts`
- `checkScanFreshness()` from `scan-freshness.ts`
- `checkContextForDashboard()`, `checkSkill()`, `readSetupProgress()`, `countEntriesInSection()`, `countPopulatedContextSections()`, `discoverSkills()`, `PROJECT_CONTEXT_SECTIONS` from `check.ts`
- `computeHealthReport()` from `proofSummary.ts`
- `findProjectRoot()` from `validators.ts`
- `isWorktreeDirectory()` from `worktree.ts`
- `getCliVersion()` from `init/state.ts`

## Constraints

- Doctor MUST NOT add code to `proofSummary.ts` (2330+ lines, proof chain flagged as past comfort threshold).
- Doctor is read-only. No file writes, no git operations.
- `checkScanFreshness()` returns null in CI. Doctor must handle this — show green or note unavailability.
- `checkForUpdates()` spawns a background npm check when cache is missing. First doctor run may have no npm data — show green.
- Exit code 0 for all-pass or yellow-only. Exit code 1 only when at least one red (✗) exists.
- Pre-commit hooks run tsc, lint, and tests. Doctor must pass all three.

## Gotchas

- `discoverSkills()` in check.ts is NOT exported. Add `export` before writing doctor.ts, or imports will fail at compile time.
- `countPopulatedContextSections()` and `PROJECT_CONTEXT_SECTIONS` in check.ts are NOT exported. Same treatment needed.
- `checkContextForDashboard()` returns chalk-formatted strings with ANSI codes. For JSON mode, use the raw functions. For terminal mode, the chalk strings are fine — doctor renders them directly.
- The `funcToFile` map key in `extract-docs-data.ts` must be `Doctor` (PascalCase matching `registerDoctorCommand`). A typo here means the command exists but is invisible in docs.
- Commander's `commandsGroup()` sets the heading for ALL subsequent registrations until the next call. Doctor must be registered after `registerSetupCommand` and before the `program.commandsGroup('PIPELINE')` line.
- `readSetupProgress()` reads from `.ana/state/setup-progress.json`. This file is deleted when setup completes. So: `setupPhase === 'complete'` in ana.json means the progress file won't exist. Doctor checks `setupPhase` from ana.json first, then falls back to the progress file for intermediate states.
- ana.json's `setupPhase` field: absent means setup never started, `'guided'` (or similar intermediate values) means in-progress, `'complete'` means done. Doctor checks for the three states: `=== 'complete'`, truthy-but-not-complete, and falsy/absent.
- `buildCommandTree()` parser in extract-docs-data.ts relies on Commander method chains following specific regex patterns. Doctor's `.description()` and `.option()` calls must be standard single-line strings, not multiline template literals.
- `worktreeExists()` from worktree.ts checks if a worktree directory exists for a given slug. Use this for the stale work "in progress" signal. Verify it's exported before importing — check the same file that exports `isWorktreeDirectory`.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions and `node:` prefix for built-ins.
- Use `import type` for type-only imports, separate from value imports.
- Prefer named exports. No default exports.
- Explicit return types on all exported functions.
- Exported functions require `@param` and `@returns` JSDoc tags.
- Early returns over nested conditionals.
- Command files surface errors with `chalk.red` + `process.exit(1)`. Engine functions never — but doctor is a command, not engine.
- Use `| null` for fields that were checked and found empty. Reserve `?:` for fields that may not have been checked.
- Always use `--run` flag when running vitest to avoid watch mode hangs.

### Pattern Extracts

**proof.ts health subcommand — orchestrate-and-format pattern** (from `packages/cli/src/commands/proof.ts`, lines 2126-2170):
```typescript
  const healthCommand = new Command('health')
    .description('Display proof chain health dashboard')
    .option('--json', 'Output JSON format')
    .action(async (options: { json?: boolean }) => {
      const proofRoot = findProjectRoot();
      const proofChainPath = path.join(proofRoot, '.ana', 'proof_chain.json');
      const parentOpts = proofCommand.opts();
      const useJson = options.json || parentOpts['json'];

      // Read chain (no branch check — health is read-only)
      if (!fs.existsSync(proofChainPath)) {
        if (useJson) {
          console.log(JSON.stringify(wrapJsonResponse('proof health', {
            runs: 0,
            trajectory: { risks_per_run_last5: null, risks_per_run_all: null, trend: 'insufficient_data', unclassified_count: 0 },
            hot_modules: [],
            promotion_candidates: [],
            promotions: [],
            verification: computeFirstPassRate([]),
          }, { entries: [] }), null, 2));
        } else {
          console.log(formatHealthDisplay(0));
        }
        return;
      }

      let chain: ProofChain;
      try {
        chain = JSON.parse(fs.readFileSync(proofChainPath, 'utf-8'));
      } catch {
        console.error(chalk.red('Error: Failed to parse proof_chain.json'));
        process.exit(1);
        return;
      }

      const report = computeHealthReport(chain);

      if (useJson) {
        console.log(JSON.stringify(wrapJsonResponse('proof health', report, chain), null, 2));
        return;
      }

      // Terminal display
      console.log(formatHealthDisplay(report));
    });
```

**check.ts — ✓/○/✗ symbol pattern with chalk** (from `packages/cli/src/commands/check.ts`, lines 873-908):
```typescript
export async function checkContextForDashboard(cwd: string, filename: string): Promise<{ symbol: string; description: string }> {
  const filePath = path.join(cwd, '.ana', 'context', filename);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const baseName = filename.replace('.md', '');
    const config = FILE_CONFIGS[baseName];

    if (baseName === 'design-principles') {
      if (fileHasRealContent(content)) {
        return { symbol: chalk.green('✓'), description: 'populated' };
      }
      return { symbol: chalk.yellow('○'), description: 'empty (optional — add anytime)' };
    }

    if (baseName === 'project-context' && config) {
      const headers = checkHeaders(content, config);
      if (!headers.pass) {
        return { symbol: chalk.red('✗'), description: `missing sections: ${headers.duplicates.join(', ')}` };
      }
      const populated = countPopulatedContextSections(content, PROJECT_CONTEXT_SECTIONS);
      const total = PROJECT_CONTEXT_SECTIONS.length;
      if (populated === 0) {
        return { symbol: chalk.yellow('○'), description: 'scaffold (setup will enrich)' };
      }
      if (populated < total) {
        return { symbol: chalk.yellow('○'), description: `${populated}/${total} sections populated` };
      }
      return { symbol: chalk.green('✓'), description: `${populated}/${total} sections populated` };
    }
```

**work.ts — worktree guard pattern** (from `packages/cli/src/commands/work.ts`, lines 1161-1166):
```typescript
  if (isWorktreeDirectory()) {
    console.error(chalk.red('Error: Run work complete from the main project directory, not from a worktree.'));
    process.exit(1);
  }
```

**check-dashboard.test.ts — temp dir test setup pattern** (from `packages/cli/tests/commands/check-dashboard.test.ts`, lines 27-35):
```typescript
let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-check-dashboard-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
});
```

### Proof Context
- `packages/cli/src/index.ts` — `commandsGroup()` is Commander v14-specific. Registration order matters for help display grouping.
- `packages/cli/src/commands/check.ts` — `readAnaJson` called twice in check.ts (known issue). Doctor should read ana.json once at the start.
- `packages/cli/src/commands/doctor.ts` — no prior findings (new file).

### Checkpoint Commands
- After `check.ts` exports added: `cd packages/cli && pnpm vitest run tests/commands/check-dashboard.test.ts tests/commands/check.test.ts tests/commands/setup-completion.test.ts --run` — Expected: existing tests still pass (no regressions from adding `export`)
- After `doctor.ts` + `doctor.test.ts` created: `cd packages/cli && pnpm vitest run tests/commands/doctor.test.ts --run` — Expected: all doctor tests pass
- After all changes: `pnpm run test -- --run` — Expected: 2489+ tests pass across 109+ test files
- Lint: `cd packages/cli && pnpm run lint`
- Build: `pnpm run build`

### Build Baseline
- Current tests: 2489 passed, 2 skipped
- Current test files: 108 passed
- Command used: `pnpm run test -- --run`
- After build: expected 2489 + new doctor tests, in 109+ test files
- Regression focus: `check-dashboard.test.ts`, `check.test.ts`, `setup-completion.test.ts` (all import from check.ts which is being modified)
