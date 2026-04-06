# Scope: Proof List View

**Created by:** Ana
**Date:** 2026-04-05

## Intent
When `ana proof` is called with no arguments, show a summary table of all proof chain entries. The developer wants a scannable overview of their proof history without needing to know a slug upfront. The existing `ana proof <slug>` detail card stays unchanged.

## Complexity Assessment
- **Size:** small
- **Files affected:** `packages/cli/src/commands/proof.ts`, `packages/cli/tests/commands/proof.test.ts`
- **Blast radius:** minimal — proof.ts is a read-only leaf command with no dependents
- **Estimated effort:** ~30 minutes build + test
- **Multi-phase:** no

## Approach
Make the `<slug>` argument optional. When omitted, read `proof_chain.json` and render a summary table. When present, existing detail card logic runs unchanged. The `--json` flag works in both modes: list outputs raw `{ entries: [...] }`, detail outputs a single entry (unchanged).

## Acceptance Criteria
- AC1: `ana proof` with no arguments displays a table with columns: slug, result, assertion ratio (satisfied/total), timestamp
- AC2: Table rows are sorted most-recent-first (reverse chronological by `completed_at`)
- AC3: Assertion ratio column shows `contract.satisfied / contract.total` (not covered/total)
- AC4: When proof_chain.json is missing or has zero entries, output is "No proofs yet." (not an error, exit 0)
- AC5: `ana proof --json` (no slug) outputs the full proof_chain.json contents as JSON
- AC6: `ana proof <slug>` detail card behavior is unchanged
- AC7: `ana proof <slug> --json` detail JSON behavior is unchanged

## Edge Cases & Risks
- **File missing:** proof_chain.json doesn't exist until first `ana work complete`. List view must handle gracefully (AC4), unlike the detail view which errors.
- **Malformed JSON:** Existing parse error handling in proof.ts covers this — same behavior for list view.
- **Single entry:** Table should still render cleanly with one row.
- **Long slugs:** slugs are kebab-case, typically 15-30 chars. No truncation needed for 80-col terminals.
- **Entries with missing completed_at:** Defensive — sort should handle undefined timestamps (push to end).

## Rejected Approaches
- **`ana proof list` subcommand:** Heavier pattern for what should be the default no-arg behavior. Commander optional arguments handle this cleanly.
- **cli-table3 dependency:** The codebase uses manual chalk + padEnd for all tabular output (work status, proof card, agents list). Adding a table library for 4 columns violates consistency and "only as complex as needed."
- **Separate `--list` flag:** mode.ts uses `--list` but that command takes a name argument with different semantics. For proof, no-arg = list is more natural and matches how `git log` vs `git log <ref>` works.

## Open Questions
None.

## Exploration Findings

### Patterns Discovered
- proof.ts (lines 172-175): Commander argument + `--json` option pattern — slug is currently required via `<slug>`, needs to become `[slug]`
- proof.ts (lines 176-214): Action handler branches on `options.json` for output format — list view adds a branch on `!slug` before that
- work.ts (lines 642-646): `--json` list pattern — `JSON.stringify(output, null, 2)` for structured output

### Constraints Discovered
- [TYPE-VERIFIED] ProofChainEntry (work.ts:652-669) — `contract.satisfied` and `contract.total` are the fields for assertion ratio. `result` is the PASS/FAIL string. `completed_at` is ISO timestamp string.
- [OBSERVED] proof_chain.json (work.ts:684-746) — created by `writeProofChain()` during `ana work complete`, not present until first completion. Structure: `{ entries: ProofChainEntry[] }`.
- [TYPE-VERIFIED] ProofChain interface (proof.ts:28-30) — duplicated in both proof.ts and work.ts. Same shape: `{ entries: ProofChainEntry[] }`.

### Test Infrastructure
- proof.test.ts: Uses temp directories, `execSync` against built CLI, `runProof()` helper, `createProofChain()` helper for writing fixture data. FORCE_COLOR=0 env var disables chalk. Existing test covers detail view, JSON output, error cases, edge cases.

## For AnaPlan

### Structural Analog
Structural analog: proof.ts itself — the list view is a new branch in the same command's action handler, using the same file read + parse + format pattern. For table formatting style, work.ts `printHumanReadable()` (manual chalk + padEnd columns).

### Relevant Code Paths
- `packages/cli/src/commands/proof.ts` — entire file (216 lines), all changes here
- `packages/cli/tests/commands/proof.test.ts` — entire file (405 lines), new test cases here
- `packages/cli/src/commands/work.ts:652-669` — ProofChainEntry type definition (imported by proof.ts)

### Patterns to Follow
- Follow output branching pattern in proof.ts action handler (json vs human-readable)
- Follow table formatting in work.ts printHumanReadable (chalk + padEnd, no table library)
- Follow test pattern in proof.test.ts (createProofChain helper, runProof with args, assert on stdout)

### Known Gotchas
- Commander `<slug>` (required) must become `[slug]` (optional) — this changes the action handler signature. First param becomes `string | undefined`.
- The detail view currently errors on missing proof_chain.json (exit 1). List view must NOT error (exit 0, "No proofs yet."). The branching on `!slug` must happen before the existing file-not-found error logic.
- proof.ts line 23 imports ProofChainEntry from work.ts. ProofChain interface is duplicated in both files (proof.ts:28, work.ts:674). No change needed, just awareness.

### Things to Investigate
None — scope is fully resolved.
