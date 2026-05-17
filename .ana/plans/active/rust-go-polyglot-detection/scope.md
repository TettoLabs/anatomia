# Scope: Rust/Go Polyglot Detection

**Created by:** Ana
**Date:** 2026-05-17

## Intent

`detectProjectType` only checks for `pyproject.toml` as a competing manifest when `package.json` exists. It never checks for `Cargo.toml` (Rust) or `go.mod` (Go). Result: tabby (92.9% Rust, 20-crate Cargo workspace, 37k stars) is classified as TypeScript because it has a thin `package.json` for turborepo orchestration. This is the same disease class as the Python polyglot fix — a non-Node project with a secondary package.json for frontend/build tooling gets misclassified as Node.

The fix extends the existing polyglot heuristic in `detectProjectType` to also check `Cargo.toml` and `go.mod` as competing manifests, with content-aware discrimination for Rust (a `[workspace]` section distinguishes "Rust project" from "WASM binding crate").

## Complexity Assessment
- **Kind:** feature
- **Size:** medium — extends core detection logic with new content checks and cascading effects, same risk tier as the Python polyglot scope
- **Files affected:**
  - `packages/cli/src/engine/detectors/projectType.ts` — extend the polyglot heuristic block (~25 lines added)
  - `packages/cli/tests/engine/detectors/polyglot.test.ts` — new test cases for Cargo.toml and go.mod (~50 lines)
- **Blast radius:**
  - Same cascade as Python polyglot: type flip → `deps` overwritten at scan-engine.ts:665-668 → `frameworkDeps` uses language-specific deps (ternary fix already in place) → framework detection dispatches to Rust/Go registry
  - The `allDeps`/`depResult` cascade limitation (database/auth/payments from Node package.json) applies equally — documented as known limitation, same as Python
  - Zero impact on projects without Cargo.toml/go.mod alongside package.json (vast majority)
- **Estimated effort:** 3-4 hours including tests and real-repo verification
- **Multi-phase:** no

## Approach

Extend the existing tiered heuristic in `detectProjectType` to check Cargo.toml and go.mod as competing manifests alongside pyproject.toml. The existing tier structure is preserved — new checks are added in parallel to the existing Python checks within each tier.

**Rust discriminator:** Read Cargo.toml content and check for a `[workspace]` section. A Cargo workspace with multiple member crates is definitively "this is a Rust project" — it's never a secondary build artifact. A single-crate `[package]` without `[workspace]` is likely a WASM binding or build tool (stays Node).

**Go discriminator:** `go.mod` existence alongside package.json. Go has no equivalent of the WASM-binding pattern — a root `go.mod` means "this directory IS a Go module." No content check needed.

**Tier integration:** Restructure the Tier 1 fast path (`hasLockfile && !hasPyproject → Node 0.95`) to gate on no competing manifest of ANY kind. Then each tier checks Python, Rust, and Go in sequence. The workspaces guard (Tier 2) retains priority — if package.json has `workspaces`, it's Node regardless of other manifests.

**A helper function `hasRustWorkspace(content: string): boolean`** does the Cargo.toml content check. Parallel to `hasPythonProjectDeps` — lightweight regex section-presence check, not full TOML parsing.

## Acceptance Criteria

- AC1: A repo with `package.json` + `pnpm-lock.yaml` + `Cargo.toml` containing `[workspace]` with members detects as `type: 'rust'`.
- AC2: A repo with `package.json` + `pnpm-lock.yaml` + `Cargo.toml` containing only `[package]` (no `[workspace]`) detects as `type: 'node'` (WASM binding case).
- AC3: A repo with `package.json` + `package-lock.json` + `go.mod` detects as `type: 'go'`.
- AC4: A repo with `package.json` + lockfile + NO competing manifest still detects as `type: 'node'` with confidence 0.95 (unchanged fast path).
- AC5: A repo with `package.json` + `workspaces` field detects as `type: 'node'` regardless of Cargo.toml or go.mod presence (workspaces guard takes priority).
- AC6: All existing polyglot tests pass without modification.
- AC7: Malformed Cargo.toml falls through safely to Node.
- AC8: A repo with `package.json` (no lockfile) + `Cargo.toml` with `[workspace]` detects as `type: 'rust'` (no-lockfile variant).
- AC9: A repo with `package.json` (no lockfile) + `go.mod` detects as `type: 'go'` (no-lockfile variant).
- AC10: After type flip to Rust/Go, the `frameworkDeps` ternary (already patched) correctly routes to language-specific deps.

## Edge Cases & Risks

- **Turborepo without workspaces field (tabby pattern):** tabby uses turbo.json for monorepo config, NOT package.json workspaces. Our workspaces guard doesn't catch it. The Cargo `[workspace]` check correctly identifies it as Rust. This is the PRIMARY motivation case.
- **Node monorepo with Cargo workspace (pnpm workspaces + Cargo workspace):** If package.json HAS `workspaces`, the workspaces guard returns Node at line 116 BEFORE the Cargo check runs. This is correct — a Node monorepo root is definitively Node even if it also has Rust components.
- **Single-crate Cargo.toml for WASM (napi-rs, wasm-pack):** Only has `[package]`, no `[workspace]`. The `[workspace]` check correctly does NOT flip to Rust. These stay Node.
- **swc (Rust compiler + Node bindings):** Has BOTH `[workspace]` in Cargo.toml AND real Node deps/workspaces. If package.json has `workspaces` → stays Node (workspaces guard). If not → flips to Rust. swc IS fundamentally Rust — either outcome is defensible, and the workspaces guard provides a deterministic tiebreak.
- **Go project with go.mod for tooling (rare):** A Node project would not have go.mod at root unless Go IS the project or a major component. Unlike Python (where pyproject.toml can be tooling-only for ruff/black), go.mod always means "this is a Go module." No content check needed.
- **Performance:** One additional `exists()` check for Cargo.toml and go.mod (only when package.json exists AND the pyproject.toml check didn't trigger). One conditional `readFile` for Cargo.toml content (only when Cargo.toml exists). Same cost profile as the Python check.
- **`depResult` cascade (known limitation):** After type flip, database/auth/payments still come from Node package.json via `detectFromDeps(allDeps)`. Same limitation as Python polyglot, same documentation. Fix path: `detectNonNodeDatabase(deps)` enrichment in a future scope.

## Rejected Approaches

- **"Thin package.json" heuristic (≤N deps = secondary):** Rejected because it doesn't generalize. litellm's package.json has real frontend deps (Prisma, React) but IS a Python project. The "thin" check would fail for polyglot repos with substantial frontends. Content checks on the competing manifest are more reliable than counting package.json deps.
- **go.mod content check (module declaration, require count):** Rejected as unnecessary. Every go.mod has a `module` line — it's not discriminating. Go has no "WASM binding" pattern that would create false positives. Existence is sufficient. If false positives emerge, content checks can be added later.
- **Checking ALL competing manifests before the workspaces guard:** Rejected because workspaces should always win. A Node monorepo root with workspaces field is definitively Node even if it has Cargo.toml for bindings. The guard order (workspaces → then competing manifests) is correct.

## Open Questions

- None. The Rust discriminator (`[workspace]` section), Go discriminator (existence), tier placement (parallel to Python checks within each tier), and guard order (workspaces first) are all settled.

## Exploration Findings

### Patterns Discovered
- `projectType.ts:122-161`: The existing polyglot heuristic with tiers 1-5. Checks `hasPyproject` only. The pattern to extend: add `hasCargo` and `hasGoMod` booleans alongside `hasPyproject`, gate the Tier 1 fast path on all three being absent, add Rust/Go checks parallel to Python in tiers 3-4.
- `scan-engine.ts:665-668`: The `deps` overwrite for Rust already exists (`deps = await readRustDependencies(rootPath)`). Once type flips to `'rust'`, this fires automatically.
- `scan-engine.ts:675`: The `frameworkDeps` ternary fix (`&& projectTypeResult.type === 'node'`) already handles non-Node types. No scan-engine changes needed.

### Constraints Discovered
- [TYPE-VERIFIED] tabby's Cargo.toml has `[workspace]` with `members = [...]` containing 20+ entries
- [TYPE-VERIFIED] tabby's package.json has zero production dependencies, only `turbo` in devDeps
- [TYPE-VERIFIED] tabby has NO `workspaces` field in package.json (turbo uses turbo.json instead)
- [TYPE-VERIFIED] tabby has `pnpm-lock.yaml` (lockfile exists)
- [OBSERVED] The `frameworkDeps` ternary fix and Rust dep reader in scan-engine.ts are already in place — no engine changes needed
- [OBSERVED] `detectRustFramework` at `detectors/rust.ts` already handles Axum, Actix, Rocket, Clap — will fire correctly after type flip

### Test Infrastructure
- `tests/engine/detectors/polyglot.test.ts`: Existing test pattern writes temp files (package.json + lockfile + competing manifest) then calls `detectProjectType(dir)`. Same pattern for Cargo.toml/go.mod tests — write the competing manifest content, assert type/confidence.

## For AnaPlan

### Structural Analog
`hasPythonProjectDeps(content: string): boolean` at projectType.ts:34-72 and its call sites at lines 134 and 149. The Rust equivalent (`hasRustWorkspace`) follows the same shape: takes file content, checks for section presence via regex, returns boolean.

### Relevant Code Paths
- `packages/cli/src/engine/detectors/projectType.ts:99-161` — the polyglot block to extend
- `packages/cli/src/engine/detectors/projectType.ts:34-72` — `hasPythonProjectDeps` (structural analog for `hasRustWorkspace`)
- `packages/cli/src/engine/scan-engine.ts:660-668` — deps overwrite for Rust/Go (already exists)
- `packages/cli/src/engine/scan-engine.ts:675` — frameworkDeps ternary (already patched for non-Node)
- `packages/cli/src/engine/detectors/rust.ts` — Rust framework detection (will fire after type flip)
- `packages/cli/src/engine/detectors/go.ts` — Go framework detection (will fire after type flip)

### Patterns to Follow
- `hasPythonProjectDeps`: section-presence regex on TOML content. `hasRustWorkspace` should follow the same approach — find `[workspace]` section header, check for `members` key.
- The tier structure: Python checks happen at tiers 3 (lockfile + pyproject) and 4 (no lockfile + pyproject). Rust/Go checks should follow immediately after Python in each tier, maintaining the same structure.
- Error handling: wrap content reads in try/catch, fall through to Node on any failure (conservative default). Same pattern as Python.

### Known Gotchas
- The `[workspace]` regex must match `^\[workspace\]\s*$` with multiline flag — same as `^\[project\]\s*$` in `hasPythonProjectDeps`. Without the line anchors, it could match `[workspace.members]` which is a different TOML section.
- Cargo.toml `[workspace]` without a `members` key is technically valid (Cargo auto-discovers members). But checking for `members` is safer — it confirms the workspace has actual crates. Consider: should `[workspace]` alone be sufficient, or require `members`? The tabby case has both. A workspace without explicit members would still be a real Rust project. Recommend: `[workspace]` alone is sufficient.
- The existing `hasCargo` exists-check goes alongside `hasPyproject` (line 123). The `hasCompetingManifest` boolean should be `hasPyproject || hasCargo || hasGoMod`. This gates the Tier 1 fast path.

### Things to Investigate
- Whether Cargo.toml `[workspace]` section can appear WITHOUT `members` (Cargo auto-discovery). If yes, decide whether `[workspace]` alone is sufficient or if `members` is required.
