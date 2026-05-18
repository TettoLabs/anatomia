# Scope: Learn Session Memory

**Created by:** Ana
**Date:** 2026-05-17

## Intent

Learn starts every session from zero. With 55+ active findings, there's no way to distinguish "already triaged" from "appeared since last time." The session wastes time re-reading known findings and risks missing new ones in the noise. The developer wants Learn to know what's new — and filter to just those findings.

## Complexity Assessment
- **Kind:** feature
- **Size:** medium — touches init (directory creation + preservation), proof audit (filtering + matrix enhancement), a new `ana learn end` command, and the Learn agent template
- **Files affected:**
  - `packages/cli/src/commands/init/assets.ts` — add `learn/` directory creation in `createDirectoryStructure`
  - `packages/cli/src/commands/init/state.ts` — add `learn/` preservation in `preserveUserState`
  - `packages/cli/src/commands/proof.ts` — add `--new` and `--since` flags to audit, add "new since" count to matrix output, register `learn end` subcommand
  - `packages/cli/src/index.ts` — register `learn` command (if new top-level command needed)
  - `packages/cli/templates/.claude/agents/ana-learn.md` — update startup and wrap-up sections
  - Tests for all new behavior
- **Blast radius:** Low. Init gains one directory. Audit gains two flags that compose with existing filters. Matrix gains one optional output line. `learn end` is a new command with no overlap. Template change is additive. No existing behavior changes.
- **Estimated effort:** ~4-6 hours pipeline time (plan + build + verify)
- **Multi-phase:** no

## Approach

Add a `.ana/learn/state.json` file that tracks when Learn last finished a session. Give `ana proof audit` two new flags (`--new`, `--since`) that filter findings to only those from pipeline runs completed after the last session. Enrich the existing `--matrix` output with a "new since last session" count so Learn's startup orientation includes session-aware context. Add `ana learn end` as a CLI command that writes the timestamp and commits — the Learn template invokes this automatically during its wrap-up flow, making session tracking mechanical rather than agent-dependent.

## Acceptance Criteria

- AC1: `ana init` creates `.ana/learn/` directory containing `state.json` seeded with `{ "last_session_at": null }`
- AC2: `ana init` on an existing project preserves `.ana/learn/state.json` (re-init does not reset the timestamp)
- AC3: `ana proof audit --new` shows only active findings from entries with `completed_at` after `last_session_at` in state.json
- AC4: When `last_session_at` is null or state.json doesn't exist, `--new` shows all active findings (same as omitting the flag)
- AC5: `ana proof audit --since 2026-05-15` filters to active findings from entries completed after the given ISO date
- AC6: `--new` composes with `--severity`, `--entry`, and `--full` (filters are additive)
- AC7: `--matrix` silently ignores `--new` and `--since` (matrix is always full orientation, same precedence pattern as --severity and --entry)
- AC8: When `last_session_at` is non-null, `--matrix` output includes `new_since_last` count and `last_session_at` timestamp (both JSON and human-readable)
- AC9: When `last_session_at` is null, `--matrix` omits the "new since" line entirely
- AC10: `ana learn end` writes `last_session_at` to `.ana/learn/state.json` with the current ISO timestamp, commits the file, and pushes
- AC11: `ana learn end` enforces artifact branch (same pattern as proof close/promote)
- AC12: `ana learn end` outputs confirmation with the timestamp and a count of findings that will be "old" in the next session
- AC13: Learn template startup references `--new` count from `--matrix` output for session orientation ("N new findings since last session")
- AC14: Learn template communicates session boundaries at two points. **At startup** (brief, one sentence after presenting the matrix and menu, before triage begins): "When we're done, I'll run `ana learn end` to mark the session boundary — next time I'll know what's new since then." This sets the expectation — sessions end, there's a purpose, Learn handles it. **At wrap-up** (explicit confirmation when the developer says stop or triage is complete): Learn says "Ready to wrap up? I'll present the session delta and run `ana learn end` to mark the timestamp." The user confirms. Learn presents the delta, runs the command, shows the confirmation. The user doesn't invoke the command manually but is aware it exists, sees it run, and understands the purpose. This mirrors how `ana work complete` works — the user knows the command, agrees to run it, the system records the boundary. Safe failure mode: if the terminal crashes or the user closes the window, `ana learn end` never runs and next session sees everything since the last completed session.
- AC15: `--new` and `--since` work in both `--json` and human-readable output modes

## Edge Cases & Risks

- **Old projects without `.ana/learn/`:** `--new` degrades to "show all" — no error. `--matrix` omits the "new since" line. `ana learn end` must create the directory and file if missing (projects initialized before this feature).
- **Agent forgets `ana learn end`:** Terminal crash, developer says "stop" mid-session, context window exhaustion. Safe failure: next session sees everything since the last *completed* session — which is the current behavior. No data loss, no false coverage.
- **Empty proof chain:** `--new` returns zero findings. `--matrix` shows 0 new. Same as current empty-chain behavior.
- **`--since` with invalid date:** Exit with a clear error message. Don't silently show all.
- **`--since` with future date:** Returns zero findings. Not an error — the filter is correct, the result is just empty.
- **Concurrent `ana learn end` on different machines:** Developer A ends session at T1, commits, pushes. Developer B pulls, runs Learn, sees findings since T1. This is correct — "when was this project's garden last tended" is a project-level question. The template could note "last session may have been by another team member" but this doesn't need engineering.
- **`ana learn end` with no proof changes in session:** Valid — read-only triage sessions still set the boundary. Own commit (`[learn] End session`), own semantic meaning.

## Rejected Approaches

- **Auto-update `last_session_at` on every `proof close`/`promote`/`strengthen`:** Creates false session boundaries. If Learn closes 1 of 20 findings and the timestamp moves, the next session misses the other 19 as "new." Explicit `ana learn end` is the correct semantic: "the gardener left the garden."
- **`session_count` field in state.json:** Nothing reads it. Observability theater. If someone wants it later, it's a 5-minute addition. Don't ship dead fields.
- **`--new --matrix` as invalid combination:** Inconsistent with existing pattern. `--matrix` already silently ignores `--severity` and `--entry`. It should silently ignore `--new` and `--since` too. One rule: matrix takes precedence over all narrowing flags.
- **Building `.ana/learn/state.json` as standalone foundation first:** Three redundant agents correctly critiqued this — don't build infrastructure without the feature that uses it. The directory and the commands ship together.
- **`--learn-session` flag on existing proof commands:** Couples session tracking to individual proof actions. The session boundary is its own concept — `ana learn end` keeps it clean.

## Open Questions

- Should `ana learn end` live as a subcommand under `ana learn` (new top-level command) or under `ana proof` (existing proof namespace)? `ana learn end` is semantically about Learn sessions, not proof operations. A new `ana learn` command with `end` as its first subcommand creates the natural home for future Learn CLI features (e.g., `ana learn history`, `ana learn status`). AnaPlan should decide based on command registration patterns and whether a new top-level command is warranted for one subcommand.

## Exploration Findings

### Patterns Discovered
- `createDirectoryStructure` in `assets.ts:59-80`: creates `context/`, `plans/active/`, `plans/completed/`, `state/` with `fs.mkdir` recursive. Adding `learn/` follows the same pattern — one `mkdir` + one `writeFile` for the seed.
- `preserveUserState` in `state.ts:516-622`: six preservation steps using `fs.cp`/`fs.access`/`fs.stat`. Adding `learn/` is step 7 — same cp-with-fallback pattern as proof chain files (step 4, lines 584-594).
- `commitAndPushProofChanges` in `proof.ts:156-195`: shared commit+push helper used by close, promote, strengthen. `ana learn end` can reuse this directly — stage `.ana/learn/state.json`, commit `[learn] End session`, push.
- Audit `--matrix` at `proof.ts:1638-1783`: early return path, collects counts from all active findings, computes staleness, formats JSON and human output. The "new since" count is an additional counter in the same loop — filter `entry.completed_at > last_session_at` and count.
- Audit filter application at `proof.ts:1844-1860`: `--severity` and `--entry` are post-collection filters on `activeFindings` array. `--new` follows the same pattern — one more `.filter()` call.

### Constraints Discovered
- [TYPE-VERIFIED] ProofChainEntry.completed_at (types/proof.ts:62) — string, always present on entries. This is the field `--new` filters on.
- [OBSERVED] `--matrix` ignores `--severity` and `--entry` — it early-returns at line 1783 before the filter section. `--new` should be ignored the same way.
- [OBSERVED] state/ directory is gitignored (assets.ts:73-76) but learn/ should NOT be gitignored — `state.json` is committed and shared across machines (project-level, not local).
- [OBSERVED] `commitAndPushProofChanges` requires `proofRoot`, `files`, `message`, `coAuthor`. All available to `ana learn end`.

### Test Infrastructure
- Tests in `tests/` directory, Vitest framework, `--run` flag required to avoid watch mode hang.
- Existing proof command tests likely cover close/promote patterns that `learn end` can mirror.

## For AnaPlan

### Structural Analog
`proof close` command (proof.ts:744-987) — same shape: validate branch, read state, mutate JSON, write file, commit+push, format output. `learn end` is simpler (no finding lookup, no dry-run) but follows the identical flow.

### Relevant Code Paths
- `packages/cli/src/commands/init/assets.ts` lines 59-80 — `createDirectoryStructure` (add `learn/` + seed)
- `packages/cli/src/commands/init/state.ts` lines 516-622 — `preserveUserState` (add step 7 for `learn/`)
- `packages/cli/src/commands/proof.ts` lines 1578-2044 — audit command (add `--new`, `--since` flags + matrix enhancement)
- `packages/cli/src/commands/proof.ts` lines 156-195 — `commitAndPushProofChanges` (reuse for `learn end`)
- `packages/cli/src/index.ts` — command registration
- `packages/cli/templates/.claude/agents/ana-learn.md` lines 64-100 — startup + orientation (reference `--new`)

### Patterns to Follow
- Init directory creation: `assets.ts:59-80` (mkdir + writeFile pattern)
- Re-init preservation: `state.ts:584-594` (access + cp with catch fallback)
- Audit filter composition: `proof.ts:1844-1860` (post-collection `.filter()`)
- Branch enforcement: `proof.ts:796-805` (readArtifactBranch + getCurrentBranch check)
- Commit flow: `proof.ts:926-936` (commitAndPushProofChanges call pattern)

### Known Gotchas
- `.ana/.gitignore` ignores `state/` and `worktrees/`. The new `learn/` directory must NOT be in `.gitignore` — it's committed. Verify the gitignore doesn't catch it with a wildcard.
- `--matrix` early-returns before the filter section. The "new since" count must be computed inside the matrix block, not after it.
- `ana learn end` must create `.ana/learn/` and `state.json` if they don't exist (for projects initialized before this feature). Don't fail on missing directory.

### Things to Investigate
- Should `ana learn` be a new top-level command or nest under `ana proof`? Evaluate command registration patterns in `index.ts` and whether the precedent supports a single-subcommand top-level. Consider future extensibility (`ana learn status`, `ana learn history`).
- The `pullBeforeRead` pattern used by close/promote — should `ana learn end` also pull before writing state.json? It writes to a different file than proof_chain.json, but the commit/push could still conflict if another developer pushed a learn end recently.
