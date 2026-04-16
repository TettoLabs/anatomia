# Spec: Proof chain active issues index

**Created by:** AnaPlan
**Date:** 2026-04-16
**Scope:** .ana/plans/active/proof-chain-active-issues/scope.md

## Approach

Modify `writeProofChain()` to regenerate PROOF_CHAIN.md entirely from `proof_chain.json` on each `ana work complete`. The regenerated file has two sections:

1. **Active Issues** — callouts from all entries, grouped by file, capped at 20 total (FIFO)
2. **Chronological history** — existing `## Feature (date)` entries, newest first

File references are extracted from callout summary text via regex. Callouts mentioning `projectKind.ts:105` appear under a `projectKind.ts` heading. Callouts without parseable file refs appear under "General".

Two new utility functions in `proofSummary.ts`:
- `extractFileRefs(summary)` — returns array of filenames found in text
- `generateActiveIssuesMarkdown(entries)` — takes all proof chain entries, extracts callouts, groups by file, returns markdown string

The `writeProofChain()` function changes from append-only to full regeneration. It reads the existing `proof_chain.json`, appends the new entry, writes the updated JSON, then regenerates PROOF_CHAIN.md from scratch using the utility function.

## Output Mockups

**PROOF_CHAIN.md after regeneration:**

```markdown
# Active Issues

## projectKind.ts

- **code:** Dead logic in full-stack browser-dep check — *Project kind detection*
- **code:** Framework display-name coupling creates latent misclassification — *Project kind detection*

## scan-engine.ts

- **code:** hasMain covers main AND module — *Project kind detection*

## General

- **upstream:** Pre-check cross-feature tag collision — *Project kind detection*

---

## Project kind detection (2026-04-16)
Result: PASS | 16/16 satisfied | 10/10 ACs | 0 deviations
Pipeline: 90m (Think 12m, Plan 12m, Build 57m, Verify 21m)
Modules: projectKind.ts, census.ts, scan-engine.ts (+3 more)
Callouts:
- code: Dead logic in full-stack browser-dep check
- code: Framework display-name coupling creates latent misclassification
- code: Unused export ProjectKindResult
- code: hasMain covers main AND module
- test: A003 purity test is comment-fragile

## Proof List View (2026-04-06)
Result: PASS | 19/19 satisfied | 0/0 ACs | 0 deviations
Pipeline: 36m (Think 8m, Plan 8m, Build 15m, Verify 13m)
```

**Empty state (no callouts in chain):**

```markdown
# Active Issues

*No active issues.*

---

## Some Feature (2026-04-16)
Result: PASS | 5/5 satisfied | 3/3 ACs | 0 deviations
Pipeline: 20m
```

**Callout entry format:**

```
- **{category}:** {summary truncated to ~100 chars} — *{feature name}*
```

## File Changes

Note: The machine-readable `file_changes` list is in contract.yaml. This section provides prose context for the builder.

### packages/cli/src/utils/proofSummary.ts (modify)

**What changes:** Add two exported functions: `extractFileRefs()` and `generateActiveIssuesMarkdown()`.

**Pattern to follow:** Existing `parseCallouts()` function in the same file — similar text-parsing utility pattern.

**Why:** Keeps file-ref extraction testable in isolation. Keeps index generation separate from the write orchestration in work.ts.

### packages/cli/src/commands/work.ts (modify)

**What changes:** Modify `writeProofChain()` to regenerate PROOF_CHAIN.md entirely instead of appending. Import and call `generateActiveIssuesMarkdown()`.

**Pattern to follow:** The existing `writeProofChain()` already reads/modifies `proof_chain.json` with read-modify-write. Apply the same pattern to the markdown file.

**Why:** Full regeneration from JSON ensures consistency. No surgical markdown parsing needed.

### packages/cli/tests/utils/proofSummary.test.ts (modify)

**What changes:** Add tests for `extractFileRefs()` and `generateActiveIssuesMarkdown()`.

**Pattern to follow:** Existing `parseCallouts` tests in the same file — input string, expected output assertions.

**Why:** The new functions are pure and testable. Contract assertions require tagged tests.

## Acceptance Criteria

Copied from scope, expanded with implementation-specific criteria:

- [ ] AC1: PROOF_CHAIN.md has an "Active Issues" section before the chronological entries
- [ ] AC2: Active Issues groups callouts by file, with file path as the heading
- [ ] AC3: Each callout entry shows: category, summary snippet, and source feature name
- [ ] AC4: Maximum 20 callouts appear in Active Issues (oldest drop off when cap exceeded)
- [ ] AC5: Callouts without file references appear under a "General" heading
- [ ] AC6: Running `ana work complete` regenerates the Active Issues section from proof_chain.json
- [ ] AC7: Existing chronological history is preserved below the index
- [ ] AC8: Empty Active Issues section (no callouts in chain) renders cleanly without errors
- [ ] Tests pass with `pnpm vitest run` in packages/cli
- [ ] No TypeScript errors (`pnpm run build`)
- [ ] Lint passes (`pnpm run lint`)

## Testing Strategy

- **Unit tests for `extractFileRefs()`:**
  - Extracts `filename.ts:123` format
  - Extracts `filename.ts:123-456` range format
  - Extracts `filename.ts` without line number
  - Returns multiple refs from one summary
  - Returns empty array when no refs found
  - Handles various extensions: `.ts`, `.tsx`, `.js`, `.jsx`, `.json`, `.yaml`, `.yml`, `.md`

- **Unit tests for `generateActiveIssuesMarkdown()`:**
  - Groups callouts by extracted file ref
  - Places callouts without refs under "General"
  - Respects 20-callout cap (oldest dropped)
  - Returns empty-state message when no callouts
  - Includes feature name in each entry
  - Handles callouts referencing multiple files (appears in each group)

- **Integration consideration:** The actual `writeProofChain()` call happens during `ana work complete`. Testing the full flow requires filesystem setup. The unit tests on the utility functions provide contract coverage; manual verification confirms end-to-end.

## Dependencies

- `proof_chain.json` must exist with valid structure (already guaranteed by existing code path)
- `ProofChainEntry` type already includes `callouts` array (no type changes needed)

## Constraints

- FIFO ordering: when >20 callouts exist, drop the oldest (earliest `completed_at` entries first)
- Truncate individual callout summaries to ~100 chars in the index display (they're already capped at 200 during capture)
- Maintain `##` heading level for chronological entries — the `# Active Issues` section uses H1 to sit above them
- Horizontal rule (`---`) separates Active Issues from chronological history

## Gotchas

- **ProofChain type is duplicated:** Defined locally in both `work.ts:661` and `proof.ts:29`. Import from `proof.ts` or use the local definition — don't create a third copy.
- **Entry ordering for FIFO:** `proof_chain.json` entries are in chronological order (oldest first, newest appended). For the 20-callout cap, take from the END of the entries array (most recent). For markdown rendering, reverse to show newest entries first.
- **Callout with multiple file refs:** If a callout mentions `projectKind.ts:105` AND `scan-engine.ts:200`, it appears under BOTH file headings. The entry itself is not duplicated in the capped count — it's one callout appearing in multiple groups.
- **Import path:** Use `.js` extension: `import { generateActiveIssuesMarkdown } from '../utils/proofSummary.js'`

## Build Brief

### Rules That Apply

- All imports use `.js` extensions: `import { foo } from './bar.js'`
- Use `import type` for type-only imports, separate from value imports
- Prefer early returns over nested conditionals
- Explicit return types on exported functions
- Command files (`src/commands/`) handle user-facing output; utility files (`src/utils/`) are pure functions

### Pattern Extracts

**parseCallouts pattern (proofSummary.ts:249-260):**
```typescript
export function parseCallouts(content: string): Array<{ category: string; summary: string }> {
  const results: Array<{ category: string; summary: string }> = [];

  // Find ## Callouts section — everything until the next ## heading or end of file
  const calloutsMatch = content.match(/## Callouts\n([\s\S]*?)(?=\n## |$)/);
  if (!calloutsMatch || !calloutsMatch[1]) return results;

  const section = calloutsMatch[1];
  // ... parsing logic
  return results;
}
```

**writeProofChain current structure (work.ts:699-753):**
```typescript
async function writeProofChain(slug: string, proof: ProofSummary): Promise<void> {
  const anaDir = path.join(process.cwd(), '.ana');
  await fsPromises.mkdir(anaDir, { recursive: true });

  // 1. Write/append to proof_chain.json
  const chainPath = path.join(anaDir, 'proof_chain.json');
  let chain: ProofChain = { entries: [] };
  if (fs.existsSync(chainPath)) {
    try {
      chain = JSON.parse(fs.readFileSync(chainPath, 'utf-8'));
      // ... validation
    } catch {
      chain = { entries: [] };
    }
  }
  // ... build entry, push to chain.entries
  await fsPromises.writeFile(chainPath, JSON.stringify(chain, null, 2));

  // 2. Append to PROOF_CHAIN.md  <-- THIS BECOMES FULL REGENERATION
  const chainMdPath = path.join(anaDir, 'PROOF_CHAIN.md');
  // ... build mdEntry
  await fsPromises.appendFile(chainMdPath, mdEntry);
}
```

### Checkpoint Commands

- After adding `extractFileRefs`: `(cd packages/cli && pnpm vitest run proofSummary)` — Expected: new tests pass
- After adding `generateActiveIssuesMarkdown`: `(cd packages/cli && pnpm vitest run proofSummary)` — Expected: all proofSummary tests pass
- After modifying `writeProofChain`: `(cd packages/cli && pnpm vitest run)` — Expected: 1137+ tests pass
- Lint: `pnpm run lint`
- Build: `pnpm run build`

### Build Baseline

- Current tests: 1137 passed in 86 test files
- Command used: `(cd packages/cli && pnpm vitest run)`
- After build: expected 1137 + ~15 new tests (extractFileRefs: ~8, generateActiveIssuesMarkdown: ~7)
- Regression focus: `proofSummary.test.ts`, `work.test.ts` (if it has proof chain tests)
