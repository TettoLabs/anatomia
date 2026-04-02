# Spec: ana proof {slug}

**Created by:** AnaPlan
**Date:** 2026-04-01
**Scope:** .ana/plans/active/proof-command/scope.md

## Approach

New standalone command following the `scan.ts` pattern. Read-only operation that reads `.ana/proof_chain.json`, finds the entry matching the provided slug, and renders a terminal card. The card uses box-drawing characters and chalk colors matching `ana scan`.

Import `ProofChainEntry` from `work.ts` rather than redefining — the interface at lines 652-668 matches proof_chain.json exactly and avoids drift.

The command structure mirrors scan.ts:
- Commander command definition with argument and `--json` flag
- Separate format functions for human-readable and JSON output
- Same BOX constant and chalk color scheme
- Error handling with helpful messages

## Output Mockups

### Terminal Output (default)

```
┌─────────────────────────────────────────────────────────────────────┐
│  ana proof                                                          │
│  Stripe Payment Integration                         2026-04-01 16:30│
└─────────────────────────────────────────────────────────────────────┘

  Result: PASS

  Contract
  ────────
  20/22 satisfied · 0 unsatisfied · 2 deviated

  Assertions
  ──────────
  ✓ Creating a payment returns a successful response
  ✓ Payment response includes a client secret for the frontend
  ⚠ Webhook updates order status to paid
  ✓ Invalid webhooks are rejected before processing
  ...

  Timing
  ──────
  Total        90 min
  Think        10 min
  Plan         25 min
  Build        40 min
  Verify       15 min

  Deviations
  ──────────
  A003: Webhook updates order status to paid
        → Used event mock instead of DB assertion

```

### Terminal Output (no deviations)

When there are no deviations, omit the Deviations section entirely.

### Error Output (slug not found)

```
Error: No proof found for slug "nonexistent"

Run `ana work status` to see completed work items.
```

### Error Output (proof_chain.json missing)

```
Error: No proof chain found at .ana/proof_chain.json

Complete work items with `ana work complete {slug}` to generate proof entries.
```

### JSON Output (--json)

```json
{
  "slug": "stripe-payments",
  "feature": "Stripe Payment Integration",
  "result": "PASS",
  "author": { "name": "Developer", "email": "dev@example.com" },
  "contract": {
    "total": 22,
    "covered": 22,
    "uncovered": 0,
    "satisfied": 20,
    "unsatisfied": 0,
    "deviated": 2
  },
  "assertions": [
    { "id": "A001", "says": "Creating a payment returns success", "status": "SATISFIED" },
    { "id": "A003", "says": "Webhook updates order", "status": "DEVIATED", "deviation": "used event mock" }
  ],
  "acceptance_criteria": { "total": 7, "met": 7 },
  "timing": {
    "total_minutes": 90,
    "think": 10,
    "plan": 25,
    "build": 40,
    "verify": 15
  },
  "hashes": { "scope": "sha256:...", "contract": "sha256:..." },
  "seal_commit": "abc123",
  "completed_at": "2026-04-01T16:30:00Z"
}
```

## File Changes

Note: The machine-readable `file_changes` list is in contract.yaml. This section provides prose context for the builder.

### packages/cli/src/commands/proof.ts (create)

**What changes:** New command file implementing `ana proof {slug}`. Exports `proofCommand` for registration.

**Pattern to follow:** `scan.ts` — same BOX constant, same `formatHumanReadable` pattern (build lines array, join at end), same chalk color scheme (cyan for box, bold for headers, gray for secondary text, green/red/yellow for status).

**Why:** This is the core deliverable. Without it, no command exists.

### packages/cli/src/index.ts (modify)

**What changes:** Import and register `proofCommand`. Add after existing command registrations.

**Pattern to follow:** Existing command registrations (lines 16-24, 35-44). Import at top, `program.addCommand(proofCommand)` in the registration block.

**Why:** Command won't be accessible without registration.

### packages/cli/tests/commands/proof.test.ts (create)

**What changes:** Test file covering all acceptance criteria. Uses temp directories for isolation, `execSync` to run CLI.

**Pattern to follow:** `scan.test.ts` — same `beforeEach`/`afterEach` setup with `fs.mkdtemp`, same `runProof()` helper pattern, same `createTestFiles()` helper.

**Why:** Tests verify the implementation meets acceptance criteria.

## Acceptance Criteria

Copied from scope, expanded with implementation-specific criteria:

- [ ] AC1: `ana proof {slug}` reads proof_chain.json and displays a terminal card for the matching entry
- [ ] AC2: Assertions display with `says` text as headline, status icon prefix (✓ SATISFIED, ✗ UNSATISFIED, ⚠ DEVIATED)
- [ ] AC3: Contract summary shows satisfied/total count and deviation count
- [ ] AC4: Timing section shows total_minutes and per-phase breakdown when available
- [ ] AC5: Deviations section lists each deviation with contract says text and "instead" description
- [ ] AC6: `--json` flag outputs the raw proof chain entry as JSON
- [ ] AC7: Helpful error when slug not found or proof_chain.json missing
- [ ] AC8: Terminal styling matches ana scan (box-drawing chars, chalk colors, section headers with horizontal rules)
- [ ] AC9: Tests pass with `pnpm --filter anatomia-cli test -- --run`
- [ ] AC10: No build errors with `pnpm --filter anatomia-cli build`
- [ ] AC11: Lint passes with `pnpm --filter anatomia-cli lint`

<!-- MACHINE-READABLE: DO NOT MODIFY MANUALLY -->
```yaml
acceptance_criteria:
  - id: AC1
    description: "Command reads proof_chain.json and displays terminal card"
    verification: mechanical
    test_hint: "displays feature name from entry"
  - id: AC2
    description: "Assertions display with says text and status icons"
    verification: mechanical
    test_hint: "✓.*SATISFIED|✗.*UNSATISFIED|⚠.*DEVIATED"
  - id: AC3
    description: "Contract summary shows counts"
    verification: mechanical
    test_hint: "satisfied.*unsatisfied.*deviated"
  - id: AC4
    description: "Timing section shows breakdown"
    verification: mechanical
    test_hint: "Total.*min|Think.*Plan.*Build.*Verify"
  - id: AC5
    description: "Deviations section lists each deviation"
    verification: mechanical
    test_hint: "Deviations.*instead"
  - id: AC6
    description: "--json outputs raw entry"
    verification: mechanical
    test_hint: "JSON.parse succeeds, has slug field"
  - id: AC7
    description: "Helpful errors for missing slug or file"
    verification: mechanical
    test_hint: "Error:.*not found|No proof"
  - id: AC8
    description: "Terminal styling matches ana scan"
    verification: judgment
```
<!-- END MACHINE-READABLE -->

## Testing Strategy

- **Unit tests:** Test format functions in isolation if extracted. Test status icon mapping.
- **Integration tests:** Full CLI invocation via `execSync`. Create temp `.ana/proof_chain.json` with known content, run `ana proof {slug}`, verify output contains expected sections.
- **Edge cases:**
  - Slug not found in entries array
  - proof_chain.json doesn't exist
  - Empty entries array
  - Entry with zero deviations (no Deviations section)
  - Entry with optional timing fields missing (only total_minutes present)
  - Very long says text (verify truncation or wrapping)
  - Multiple entries, correct one selected

## Dependencies

- `scan.ts` exists and exports the BOX constant pattern (verified — lines 197-204)
- `work.ts` exports ProofChainEntry interface (verified — lines 652-668)
- proof_chain.json format documented in SCHEMAS.md (verified — lines 699-741)

## Constraints

- Read-only operation — creates no files, modifies nothing
- Box width 71 chars to match scan.ts and fit in 80-column terminals
- No external dependencies beyond what CLI already has (chalk, commander)

## Gotchas

1. **ProofChainEntry import path:** Import from `./work.js` (ESM requires .js extension for .ts files).

2. **Assertion status values:** The entry stores `status` as string. Values are SATISFIED, UNSATISFIED, DEVIATED, or UNCOVERED. Map to icons: ✓ (green), ✗ (red), ⚠ (yellow), ? (gray).

3. **Optional timing fields:** Only `total_minutes` is guaranteed. `think`, `plan`, `build`, `verify` may be undefined. Render them only when present.

4. **Deviations location:** Deviations are on the entry's `assertions` array (per-assertion `deviation` field), not a separate array. But the ProofChainEntry also has deviation info embedded. Check the actual structure: assertions have `deviation?: string` when status is DEVIATED.

5. **Date formatting:** `completed_at` is ISO string. Extract date and time for the header like scan.ts does with `scannedAt`.

6. **Result display:** The entry has a `result` field (PASS/FAIL). Display prominently after the header box.

## Build Brief

Curated context for the builder — the specific rules, patterns, and commands needed for THIS build.

### Rules That Apply

- ESM imports with `.js` extension: `import { foo } from './bar.js'`
- One export per command file: export `proofCommand`
- Graceful degradation: catch file read errors, return helpful messages
- Strict TypeScript: handle optional fields safely with nullish coalescing
- No `any` — use typed interfaces (ProofChainEntry from work.ts)
- Chalk usage: `chalk.green()` for success, `chalk.red()` for errors, `chalk.yellow()` for warnings, `chalk.cyan()` for box, `chalk.gray()` for secondary text
- Test isolation: temp directories with `fs.mkdtemp`, cleanup in `afterEach`

### Pattern Extracts

From `scan.ts` lines 197-204 (BOX constant):
```typescript
const BOX = {
  horizontal: '\u2500', // ─
  vertical: '\u2502', // │
  topLeft: '\u250C', // ┌
  topRight: '\u2510', // ┐
  bottomLeft: '\u2514', // └
  bottomRight: '\u2518', // ┘
};
```

From `scan.ts` lines 541-567 (formatHumanReadable header pattern):
```typescript
function formatHumanReadable(
  projectName: string,
  // ...params
): string {
  const lines: string[] = [];
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().slice(0, 5);
  const timestamp = `${dateStr} ${timeStr}`;

  const boxWidth = 71;
  const innerWidth = boxWidth - 2;

  // Header box
  const titleLine = `  ana scan`;
  const projectLine = `  ${projectName}`;
  const padding = innerWidth - projectLine.length - timestamp.length;
  const projectWithTimestamp = `${projectLine}${' '.repeat(Math.max(1, padding))}${timestamp}`;

  lines.push(chalk.cyan(BOX.topLeft + BOX.horizontal.repeat(innerWidth) + BOX.topRight));
  lines.push(chalk.cyan(BOX.vertical) + chalk.bold(titleLine.padEnd(innerWidth)) + chalk.cyan(BOX.vertical));
  lines.push(chalk.cyan(BOX.vertical) + projectWithTimestamp.padEnd(innerWidth) + chalk.cyan(BOX.vertical));
  lines.push(chalk.cyan(BOX.bottomLeft + BOX.horizontal.repeat(innerWidth) + BOX.bottomRight));

  lines.push('');
  // ... sections follow
  return lines.join('\n');
}
```

From `scan.ts` lines 571-594 (section pattern):
```typescript
  // Stack section
  lines.push(chalk.bold('  Stack'));
  lines.push(chalk.gray('  ' + BOX.horizontal.repeat(5)));

  if (Object.keys(stack).length === 0) {
    lines.push(chalk.gray('  No code detected'));
  } else {
    // ... content lines
    for (const key of stackOrder) {
      if (stack[key]) {
        const label = stackLabels[key].padEnd(12);
        lines.push(`  ${chalk.gray(label)} ${stack[key]}`);
      }
    }
  }
```

From `work.ts` lines 652-668 (ProofChainEntry interface):
```typescript
interface ProofChainEntry {
  slug: string;
  feature: string;
  result: string;
  author: { name: string; email: string };
  contract: ProofSummary['contract'];
  assertions: Array<{
    id: string;
    says: string;
    status: string;
    deviation?: string;
  }>;
  acceptance_criteria: ProofSummary['acceptance_criteria'];
  timing: ProofSummary['timing'];
  hashes: Record<string, string>;
  seal_commit: string | null;
  completed_at: string;
}
```

From `scan.test.ts` lines 38-55 (runScan helper pattern):
```typescript
function runScan(args: string[] = []): { stdout: string; stderr: string; exitCode: number } {
  const cliPath = path.join(__dirname, '../../dist/index.js');
  try {
    const stdout = execSync(`node ${cliPath} scan ${args.join(' ')}`, {
      encoding: 'utf-8',
      cwd: process.cwd(),
      env: { ...process.env, FORCE_COLOR: '0' },
    });
    return { stdout, stderr: '', exitCode: 0 };
  } catch (error) {
    const execError = error as { stdout?: string; stderr?: string; status?: number };
    return {
      stdout: execError.stdout || '',
      stderr: execError.stderr || '',
      exitCode: execError.status || 1,
    };
  }
}
```

### Checkpoint Commands

- After proof.ts created: `pnpm --filter anatomia-cli build` — Expected: builds without error
- After index.ts modified: `node packages/cli/dist/index.js proof --help` — Expected: shows help text
- After tests written: `pnpm --filter anatomia-cli test -- --run` — Expected: all tests pass
- Lint: `pnpm --filter anatomia-cli lint` — Expected: no errors

### Build Baseline

- Current tests: 403 passed (27 test files)
- Command used: `pnpm --filter anatomia-cli test -- --run`
- After build: expected 403 + ~10-15 new tests in 28 test files
- Regression focus: None — new command, no modifications to existing behavior
