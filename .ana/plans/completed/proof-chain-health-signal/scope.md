# Scope: Proof chain health signal

**Created by:** Ana
**Date:** 2026-04-25

## Intent

The proof chain is write-only at the moment of writing. `ana work complete` says "Proof saved to chain." — a write confirmation that tells the developer what the system did, not what they have. After 14 pipeline runs and 62 callouts, the developer has no signal that institutional memory is accumulating. The completion moment, when they just contributed fresh intelligence, gives them nothing back.

For a 2-5 person team building discipline with AI tools, the growing balance is the "your methodology is compounding" signal. Replace the write confirmation with a chain balance.

## Complexity Assessment
- **Size:** small
- **Files affected:** 2 — `packages/cli/src/commands/work.ts` (production), `packages/cli/tests/commands/work.test.ts` (test)
- **Blast radius:** Minimal. Terminal output only. No schema changes. No new files. No new dependencies. The `git add` on line 1060 is unchanged. Nothing reads the completion summary programmatically.
- **Estimated effort:** <30 minutes implementation
- **Multi-phase:** no

## Approach

Replace `Proof saved to chain.` (work.ts line 1101) with a one-line chain balance: `Chain: {N} runs · {M} callouts`. The data is already in scope — `chain.entries` is in memory after `writeProofChain()` pushes the new entry. Count entries, sum callouts across all entries, handle singular/plural, print in gray. Update the one test that asserts on the old text.

No new files. No cache. No derived data stores. The chain balance reads from the authoritative source (proof_chain.json data in memory) and prints to terminal. Future commands that need chain health compute it from proof_chain.json directly.

## Acceptance Criteria

- AC1: After `ana work complete`, the third line of the summary shows `Chain: {N} run(s) · {M} callout(s)` with correct counts from the full proof chain
- AC2: The line `Proof saved to chain.` no longer appears in completion output
- AC3: On the first-ever pipeline run (chain has 1 entry), the line prints with singular "run" and correct callout count
- AC4: When an entry has zero callouts, the total callout count reflects only other entries' callouts (no inflation, no error)
- AC5: Appending to an existing chain shows cumulative totals (not just the current entry's counts)
- AC6: The existing `prints proof summary line` test passes with updated assertions

## Edge Cases & Risks

- **First-ever run.** Chain was just created with 1 entry. Must handle singular: `Chain: 1 run · 3 callouts`. Pluralization of both "run" and "callout" needs to be correct.
- **Run with zero callouts.** 2 of 14 existing entries have empty callout arrays. The cumulative total stays correct — this run just doesn't add to the callout dimension.
- **Corrupted proof_chain.json.** Already handled by writeProofChain() lines 753-761 — parse failures reset to `{ entries: [] }`. By print time, chain always has at least 1 entry (the one just pushed).
- **Appending to existing chain.** The `existingChain: true` test fixture creates a chain with a prior entry. After completion, chain has 2 entries. Counts must reflect all entries, not just the new one.
- **Test breakage.** One test (work.test.ts line 1093) explicitly asserts `Proof saved to chain`. Must update to assert the new format.

## Rejected Approaches

**proof-health.json cache file.** The eval proposed writing a derived JSON file for future consumers (ana doctor, SessionStart hook). Rejected: zero consumers exist, the schema would be a guess about future needs, and it creates a second source of truth alongside proof_chain.json. The counts are trivially derivable in <5ms. When a consumer exists, it reads proof_chain.json — the authoritative source. A cache file solves a performance problem that doesn't exist and forces every future consumer to choose between two files.

**Promoted/closed lifecycle counts.** The eval proposed printing `0 promoted · 0 closed` as a forcing function for unbuilt commands (`ana proof promote`, `ana proof close`). Rejected: the status field doesn't exist on callouts, both counts are permanently zero with no path to non-zero, and the target customer doesn't know what "promoted" means. 24 characters of nothing that trains the developer to ignore the line. Violates "every character earns its place." When the lifecycle ships, the line grows naturally — "callouts" splits into "active · promoted · closed."

**Build concerns in the one-liner.** The eval leaned toward excluding build concerns from the terminal line but including in proof-health.json. Since we're cutting the JSON file, the question simplifies: build concerns are a separate intelligence source with different semantics. Including them makes the one-liner noisy. Excluded.

**Color.** No judgment until there's something actionable to judge. "Active" isn't bad — it's unprocessed. Color comes with staleness detection (V2), when stale callouts are genuinely warning-worthy.

## Open Questions

None. All design decisions resolved during investigation.

## Exploration Findings

### Patterns Discovered

- **Completion summary pattern (work.ts:1097-1101):** Three lines — result + feature, contract stats, chain confirmation. The `·` separator is established vocabulary (line 1100). The replacement line follows the same pattern.
- **Chain data access (work.ts:821):** `chain.entries` is in scope at line 821 (after push). The summary prints at line 1097+. The data is available without re-reading the file.
- **Existing test fixture (work.test.ts:1048-1059):** `existingChain: true` creates a chain with a prior entry. Good coverage for the "append" case.

### Constraints Discovered

- [TYPE-VERIFIED] One test asserts `Proof saved to chain` (work.test.ts:1093) — must update
- [OBSERVED] `chain` variable is local to `writeProofChain()`, summary prints outside it (lines 1097-1101) — counts must be computed from data available in the outer `completeWork` scope, OR writeProofChain returns/exposes the totals
- [OBSERVED] The `proof` variable (ProofSummary) at line 1055 has the current entry's callouts, but not previous entries' — cumulative count needs the full chain

### Test Infrastructure

- `packages/cli/tests/commands/work.test.ts` — `captureOutput` helper (line 104), `createProofProject` fixture with `existingChain` option, direct console.log capture in the proof summary test (line 1079)

## For AnaPlan

### Structural Analog

The completion summary block itself (work.ts:1097-1101) is the structural analog. Same location, same output pattern, same data access context. The change replaces one line within an established 3-line summary.

### Relevant Code Paths

- `packages/cli/src/commands/work.ts` lines 743-822: `writeProofChain()` — builds `chain.entries`, pushes new entry, writes file
- `packages/cli/src/commands/work.ts` lines 1054-1101: completion flow — calls `writeProofChain()`, then prints 3-line summary
- `packages/cli/tests/commands/work.test.ts` lines 1075-1094: `prints proof summary line` test

### Patterns to Follow

- The `·` separator convention from line 1100
- Gray styling via `chalk.gray()` (used throughout work.ts)
- Singular/plural handling (see line 1100 for the deviation pluralization pattern)

### Known Gotchas

- `chain` is local to `writeProofChain()`. The summary block at lines 1097-1101 is outside that function, in `completeWork()`. The planner needs to decide: (a) have writeProofChain return the counts, (b) compute counts from `proof` + knowledge of existing chain, or (c) re-read proof_chain.json after write. Option (a) is cleanest — writeProofChain already has the data.
- The `existingChain` test fixture's prior entry has no callouts array — the sum logic must handle `entry.callouts || []` defensively (same pattern as line 845).

### Things to Investigate

- Whether `writeProofChain` should return a small summary object (entry count + callout total) or whether the completion block should compute it independently. This is a design judgment about function boundaries — writeProofChain currently returns void.
