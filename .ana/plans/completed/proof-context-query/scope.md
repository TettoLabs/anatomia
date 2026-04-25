# Scope: Proof context file query

**Created by:** Ana
**Date:** 2026-04-24

## Intent

The proof chain stores rich intelligence — 49 callouts with file references, categories, code anchors, and full-text observations from every pipeline cycle. But there is no way to ask "what does the system know about THIS file?" Agents read PROOF_CHAIN.md — a flat list of 20 items about all files — and hope they notice what's relevant. The data is organized temporally (which feature produced it) when every consumer needs it organized spatially (which file is it about).

The developer wants a CLI command that queries proof_chain.json by file and returns targeted intelligence: callouts, build concerns, and pipeline history for specific files. This enables agents to query exactly the files they're working on instead of reading everything.

There is a prerequisite: callout `file` fields currently store basenames (`census.ts`), not full paths. For customer repos with hundreds of files sharing the same basename (425 `route.ts` in Dub, 374 `index.ts` in Cal.com, 155 `route.ts` in Inbox Zero), basename-only references make any query return wrong results. The data must be fixed before the query is built on top of it.

## Complexity Assessment
- **Size:** medium (two specs — data fix + query command)
- **Files affected:**
  - `packages/cli/src/commands/work.ts` (resolve callout file paths at write time)
  - `packages/cli/src/utils/proofSummary.ts` (add `getProofContext` query function)
  - `packages/cli/src/commands/proof.ts` (add `context` subcommand)
  - Test files for each
- **Blast radius:** PROOF_CHAIN.md headings change from basenames to full paths after the data fix (e.g., `## census.ts` becomes `## packages/cli/src/engine/census.ts`). This is a positive consequence for customer repos where basename headings are meaningless. `generateActiveIssuesMarkdown` uses `callout.file` as the grouping key — no code change needed, but the output changes.
- **Estimated effort:** spec-1 (data fix) ~30 min, spec-2 (query command) ~60 min
- **Multi-phase:** yes

## Approach

Two sequential specs. Spec-1 fixes the upstream data quality so the proof chain stores full relative paths in callout and build_concern file fields. Spec-2 builds the query command on reliable data.

**Spec-1 — Resolve callout file paths at write time.** In `writeProofChain()`, cross-reference each callout's basename `file` field against `modules_touched` (which stores full relative paths from `git diff`). When a basename matches exactly one module, upgrade it to the full path. Apply the same resolution to `build_concerns`. Backfill existing entries that have `modules_touched` data (4 of 12 entries) by applying the resolution to all entries before writing the chain — the resolution is idempotent (files already containing `/` are skipped).

**Spec-2 — `ana proof context <files...>` command.** A reusable query function in `proofSummary.ts` that reads proof_chain.json and filters by file. A thin CLI wrapper in `proof.ts` registered as a subcommand of `proof`. Human-readable default output, `--json` for programmatic/agent use. The matching strategy handles both full-path callouts (new entries after spec-1) and basename callouts (old entries) with path-boundary awareness to prevent false positives.

## Acceptance Criteria
- AC1: When a callout's `file` is a basename matching exactly one `modules_touched` entry, the stored `file` is upgraded to the full relative path
- AC2: When a basename matches zero or 2+ `modules_touched` entries, the `file` stays as-is
- AC3: Build concern file fields are resolved using the same logic as callouts
- AC4: Existing proof chain entries with `modules_touched` have their callout files resolved on the next `writeProofChain` call (backfill)
- AC5: `ana proof context census.ts` returns all callouts and build concerns for that file
- AC6: `ana proof context census.ts --json` returns structured JSON output
- AC7: Querying a file with no proof chain data produces a clean message, not an error
- AC8: Querying when no proof_chain.json exists produces a clean message, not an error
- AC9: The query function is importable from `proofSummary.ts` without CLI dependencies
- AC10: Matching handles full paths, partial paths, and basenames with path-boundary checks (no false positives from partial directory names)

## Edge Cases & Risks
- **Callout file already contains path segments** (e.g., `src/utils/proofSummary.ts` from a verifier who wrote a qualified path). The resolution check `!file.includes('/')` skips these correctly — they don't need resolution.
- **Ambiguous basename in modules_touched** (e.g., two modules named `index.ts` both changed in the same cycle). Resolution keeps the basename. The query still works via basename matching, just without path precision for that callout.
- **Old entries without modules_touched** (8 of 12 entries). No resolution possible. The query matches their basenames. This is imprecise for customer repos but acceptable for historical data.
- **PROOF_CHAIN.md heading changes.** After resolution, `generateActiveIssuesMarkdown` groups by full paths instead of basenames. Headings like `## packages/cli/src/engine/census.ts` replace `## census.ts`. This is correct behavior — not a regression.
- **Cross-file callouts.** A callout about "duplicated in `scan.ts` and `scaffold-generators.ts`" has `file: "scan.ts"`. Querying `scaffold-generators.ts` won't find it. The summary text reveals the relationship. Accepted for V1.
- **Commander subcommand conflict.** `context` as a subcommand of `proof` does not conflict with `{slug}` as a positional argument. Commander resolves subcommands before positional args. Mechanically verified.
- **Callouts with `file: null`.** Not matched by any file query. These are general/ambient observations — available in PROOF_CHAIN.md Active Issues, not in targeted proof context.

## Rejected Approaches

**Building the query without fixing the data first.** Both initial proposals (CC1 and WC1) designed basename matching strategies without checking customer repos. Customer repos have hundreds of files with the same basename. Building the query on basenames means wrong results for most real-world projects. Fixing the data at write time (6 lines) eliminates the problem for all downstream consumers — not just proof context.

**Two separate scopes instead of one scope with two specs.** Considered because they have different acceptance criteria. Rejected because: Plan needs to design the data resolution and query matching together (they share assumptions about data shape), they share `proofSummary.ts`, and multi-spec handles sequential dependency correctly.

**Separate `proofContext.ts` file for the query function.** The function is ~25 lines. Its siblings (`extractFileRefs`, `parseCallouts`, `generateActiveIssuesMarkdown`) all live in `proofSummary.ts`. A new file for 25 lines is premature separation. Extract later if the query interface grows (filters, staleness, lifecycle).

**Touch history as a prominent section.** Redundant with `git log`. The unique value of proof context is callouts and build concerns — observations that exist nowhere else. Touch history is a one-line footer with cycle count and most recent date, not a section.

**Summary-text fallback search for cross-file callouts.** Searching callout summary text for file references would catch cross-file observations but risks false positives (a callout mentioning "like the pattern in census.ts" is not about census.ts). Deferred — the provenance `from` field on matched callouts provides enough cross-reference context.

## Open Questions

None. The insertion point (`work.ts:800-804`), data shapes, matching logic, Commander registration pattern, output format, and test patterns are all understood from code reading.

## Exploration Findings

### Patterns Discovered
- `work.ts:800-804`: `modulesTouched` is available right next to callout construction in `writeProofChain`. The cross-reference point is exactly here.
- `work.ts:810-811`: `chain.entries.push(entry)` then `writeFile`. The entire chain is rewritten on every call — backfill of existing entries requires no separate mechanism.
- `proofSummary.ts:296-312`: `extractFileRefs` regex supports full paths (`src/utils/proofSummary.ts`) not just basenames. The limitation is what verifiers write, not what the extractor captures.
- `proofSummary.ts:388-396`: `generateActiveIssuesMarkdown` groups by `callout.file` directly. Full paths in `file` fields automatically change the headings — no code change needed.
- `proof.ts:221-296`: Existing proof command registers with Commander. Subcommand pattern is clear — `proofCommand.addCommand(contextCommand)`.

### Constraints Discovered
- [TYPE-VERIFIED] ProofChainEntry callout type (proof.ts:42) — `{ id: string; category: string; summary: string; file: string | null; anchor: string | null }`. The `file` field accepts full paths with no type change needed.
- [OBSERVED] modules_touched coverage — 4 of 12 entries have modules_touched. Only recent entries (post-s25-proof-prework) include this data. All future entries will have it.
- [OBSERVED] Basename collision data from customer repos — Dub: 425 `route.ts`, Cal.com: 374 `index.ts`, Inbox Zero: 155 `route.ts`, Papermark: 77 `index.ts`, Trigger.dev: 131 `route.tsx`.
- [OBSERVED] Cross-reference coverage — in entries WITH modules_touched, almost all callout files are in modules_touched basenames. Exception: cross-file observations (e.g., `findProjectRoot.test.ts` callout in `add-callout-file-field` entry).
- [OBSERVED] Null-file callouts — 10 of 49 callouts have `file: null`. 12 of 17 build concerns have `file: null`.

### Test Infrastructure
- `tests/utils/proofSummary.test.ts`: Uses `fs.promises.mkdtemp` for temp dirs, writes mock artifacts (saves.json, contract.yaml, verify reports, build reports), tests utility functions in isolation. This is the test home for `getProofContext`.
- `tests/commands/proof.test.ts`: Uses `createTestProject` helper and `execSync` to run CLI commands. Tests proof command output. This is the test home for the `context` subcommand integration tests.

## For AnaPlan

### Structural Analog
`generateActiveIssuesMarkdown` in `proofSummary.ts:342-428`. Same shape: reads proof chain entries, filters/groups by file, produces formatted output. The proof context function is the same pattern with different grouping (per queried file instead of all files) and different output (per-file sections instead of one markdown document).

### Relevant Code Paths
- `packages/cli/src/commands/work.ts:743-876` — `writeProofChain()`: where the data fix goes. Lines 764-775 read `modules_touched`, lines 800-808 construct the entry with callouts and build_concerns.
- `packages/cli/src/utils/proofSummary.ts:296-312` — `extractFileRefs()`: basename extraction logic. The proof context function uses similar matching but in reverse (query → stored, not text → extracted).
- `packages/cli/src/utils/proofSummary.ts:342-428` — `generateActiveIssuesMarkdown()`: structural analog for the query function.
- `packages/cli/src/commands/proof.ts:220-296` — `registerProofCommand()`: where the `context` subcommand registers.
- `packages/cli/src/types/proof.ts:23-46` — `ProofChainEntry` type: the data shape being queried.

### Patterns to Follow
- `proofSummary.ts` for utility function patterns (exports, JSDoc, parameter style)
- `proof.ts` for Commander subcommand registration, chalk formatting, `--json` flag pattern
- `proofSummary.test.ts` for temp-dir-based unit tests with mock proof chain data
- `proof.test.ts` for CLI integration tests with `execSync`

### Known Gotchas
- `callout.file` can be `null` — always check before matching. Don't let null values match empty strings or undefined.
- `build_concerns` is optional on ProofChainEntry (older entries may not have it). Use `entry.build_concerns || []`.
- `modules_touched` is an empty array for older entries, not undefined. But still guard with `|| []` for safety.
- The resolution must use path-boundary checking: `m.endsWith('/' + basename)`, not `m.endsWith(basename)`. Without the `/` prefix, `permissions/route.ts` would match a query for `missions/route.ts`.
- The `--json` flag on the parent `proof` command already exists. The `context` subcommand needs its own `--json` option — Commander subcommands have independent option scopes.

### Things to Investigate
- Whether the resolution function should be extracted as a named helper (e.g., `resolveCalloutPaths`) or inlined in `writeProofChain`. The function applies to both callouts and build_concerns and would be called for both new and existing entries — extraction is cleaner.
- The exact human-readable output format: how to display callout ID, category, summary, provenance, and date in a scannable terminal format. The structural analog (`generateActiveIssuesMarkdown`) truncates at 250 chars — proof context should show full text since it's targeted, not ambient.
