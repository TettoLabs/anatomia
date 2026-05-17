# Spec: Rust/Go Polyglot Detection

**Created by:** AnaPlan
**Date:** 2026-05-17
**Scope:** .ana/plans/active/rust-go-polyglot-detection/scope.md

## Approach

Extend the existing tiered polyglot heuristic in `detectProjectType` to check `Cargo.toml` and `go.mod` as competing manifests alongside `pyproject.toml`. The structural analog is `hasPythonProjectDeps` — a content-checking helper that uses regex section-presence checks without full TOML parsing.

Add a `hasRustWorkspace(content: string): boolean` helper that checks for a `[workspace]` section header in Cargo.toml content. `[workspace]` alone is sufficient — Cargo auto-discovers members when no explicit `members` key exists, so requiring `members` would miss valid workspaces.

Go needs no content check. `go.mod` existence alongside package.json is sufficient — there is no Go equivalent of the WASM-binding false positive pattern.

The tier structure stays the same. The Tier 1 fast path currently gates on `!hasPyproject` — extend to gate on no competing manifest of ANY kind (`!hasPyproject && !hasCargo && !hasGoMod`). The workspaces guard (Tier 2) retains priority over all competing manifests. Then each tier checks Python first (established), Rust second, Go third.

No changes to scan-engine.ts. The deps overwrite cascade (`deps = await readRustDependencies(rootPath)` for Rust, `deps = await readGoDependencies(rootPath)` for Go) and the `frameworkDeps` ternary fix (`&& projectTypeResult.type === 'node'`) are already in place.

## Output Mockups

After this change, `ana scan` on a tabby-like repo (92.9% Rust, Cargo workspace, thin package.json for turborepo):

```
Project Type    rust (90% confidence)
                Indicators: package.json, pnpm-lock.yaml, Cargo.toml
```

On a Go project with package.json for frontend tooling:

```
Project Type    go (90% confidence)
                Indicators: package.json, package-lock.json, go.mod
```

On a WASM binding project (single-crate Cargo.toml, no workspace):

```
Project Type    node (95% confidence)
                Indicators: package.json, pnpm-lock.yaml
```

## File Changes

### `packages/cli/src/engine/detectors/projectType.ts` (modify)
**What changes:** Add `hasRustWorkspace` helper function. Extend polyglot heuristic block to check `Cargo.toml` and `go.mod` as competing manifests across all tiers. Gate Tier 1 fast path on absence of all competing manifests.
**Pattern to follow:** `hasPythonProjectDeps` at lines 34–84 for the helper. The tier structure at lines 122–161 for the check placement.
**Why:** Without this, any project with a thin package.json (turborepo, frontend tooling) and a real Cargo workspace or go.mod is misclassified as Node.

### `packages/cli/tests/engine/detectors/polyglot.test.ts` (modify)
**What changes:** Add test cases for all Rust/Go acceptance criteria — workspace detection, single-crate fallback, go.mod detection, workspaces guard priority, malformed Cargo.toml, no-lockfile variants.
**Pattern to follow:** Existing test pattern in the same file — `createTempDir()`, write manifest files, call `detectProjectType(dir)`, assert type/confidence/indicators.
**Why:** Each acceptance criterion needs a corresponding test. The existing Python polyglot tests demonstrate the exact pattern.

## Acceptance Criteria

- [ ] AC1: package.json + lockfile + Cargo.toml with `[workspace]` → type `rust`, confidence 0.90
- [ ] AC2: package.json + lockfile + Cargo.toml with only `[package]` (no `[workspace]`) → type `node` (WASM binding case)
- [ ] AC3: package.json + lockfile + go.mod → type `go`, confidence 0.90
- [ ] AC4: package.json + lockfile + NO competing manifest → type `node`, confidence 0.95 (unchanged fast path)
- [ ] AC5: package.json + `workspaces` field → type `node` regardless of Cargo.toml or go.mod presence
- [ ] AC6: All existing polyglot tests pass without modification
- [ ] AC7: Malformed Cargo.toml falls through safely to Node
- [ ] AC8: package.json (no lockfile) + Cargo.toml with `[workspace]` → type `rust`, confidence 0.85
- [ ] AC9: package.json (no lockfile) + go.mod → type `go`, confidence 0.85
- [ ] AC10: After type flip to Rust/Go, `frameworkDeps` ternary correctly routes to language-specific deps
- [ ] Tests pass with `pnpm vitest run`
- [ ] No build errors

## Testing Strategy

- **Unit tests:** All new tests go in `polyglot.test.ts`, extending the existing describe block. Each test creates a temp dir, writes the relevant manifest files, calls `detectProjectType`, and asserts type/confidence/indicators.
- **Edge cases:**
  - Malformed Cargo.toml (garbage content) — falls through to Node
  - Cargo.toml with `[workspace]` but no `members` — still detects Rust
  - Workspaces guard with Cargo.toml present — stays Node
  - Workspaces guard with go.mod present — stays Node
  - AC10 frameworkDeps cascade — same approach as the existing A012 test (call `detectFramework` with language-specific deps after type flip)
- **Regression:** All 16 existing tests in polyglot.test.ts must pass unmodified. The Tier 1 fast path change (adding `!hasCargo && !hasGoMod`) could break existing tests IF any existing test writes a Cargo.toml or go.mod — they don't, so this is safe.

## Dependencies

None. The Rust dep reader, Go dep reader, Rust framework detector, Go framework detector, and the `frameworkDeps` ternary fix are all already in place.

## Constraints

- Engine files have zero CLI dependencies — no chalk, no ora.
- `hasRustWorkspace` must handle malformed content gracefully (try/catch, return false on failure), same as `hasPythonProjectDeps`.
- The `[workspace]` regex must use multiline flag and line anchors (`^\[workspace\]\s*$` with `/m`) to avoid matching `[workspace.members]` or `[workspace.package]` subsections.

## Gotchas

- **`[workspace.members]` vs `[workspace]`:** TOML has dotted section headers. `[workspace.members]` is a subsection, NOT the workspace declaration. The regex MUST anchor to line boundaries to avoid false matches on subsections. Use `^\[workspace\]\s*$/m` — same approach as `^\[project\]\s*$/m` in `hasPythonProjectDeps`.
- **Tier ordering matters for the fall-through:** After checking Python in Tier 3 (lockfile + competing manifest), Rust and Go checks must come BEFORE the fall-through `return { type: 'node', confidence: 0.95 }`. If placed after the fall-through, they never execute.
- **`hasCargo` exists-check must happen BEFORE the tier branches:** The boolean must be computed alongside `hasPyproject` (line 123 area), not inside each tier. Same pattern as `hasPyproject`.
- **Go `go.mod` indicator:** When type flips to Go, push `'go.mod'` to the indicators array so it appears in scan output.
- **Cargo.toml indicator:** When type flips to Rust, push `'Cargo.toml'` to the indicators array.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions and `node:` prefix for built-ins.
- Engine files have zero CLI dependencies — no chalk, no ora.
- Explicit return types on all exported functions. Internal helpers can use inference.
- Exported functions require `@param` and `@returns` JSDoc tags.
- Use early returns over nested conditionals.
- Error handling in engine: catch internally, return defaults. A detector failure degrades gracefully.
- Use `import type` for type-only imports, separate from value imports.

### Pattern Extracts

**`hasPythonProjectDeps` — structural analog for `hasRustWorkspace`** (projectType.ts:34–84):

```typescript
function hasPythonProjectDeps(content: string): boolean {
  try {
    // PEP 621: [project] section with dependencies = ["pkg", ...]
    const projectMatch = content.match(/^\[project\]\s*$/m);
    if (projectMatch) {
      // Find dependencies array after [project] but before next section
      const projectStart = projectMatch.index! + projectMatch[0].length;
      const nextSection = content.indexOf('\n[', projectStart);
      const projectBlock = nextSection === -1
        ? content.slice(projectStart)
        : content.slice(projectStart, nextSection);
      // ... content checks ...
    }
    return false;
  } catch {
    return false;
  }
}
```

**Tier structure — where to add Rust/Go checks** (projectType.ts:122–161):

```typescript
    // Check for pyproject.toml
    const hasPyproject = await exists(path.join(rootPath, 'pyproject.toml'));

    if (hasLockfile && !hasPyproject) {
      // Tier 1: package.json + lockfile + no pyproject.toml → Node 0.95 (fast path)
      return { type: 'node', confidence: 0.95, indicators };
    }

    if (hasLockfile && hasPyproject) {
      // Tier 3: package.json + lockfile + pyproject.toml with real deps → Python 0.90
      try {
        const pyContent = await fs.readFile(path.join(rootPath, 'pyproject.toml'), 'utf-8');
        if (hasPythonProjectDeps(pyContent)) {
          indicators.push('pyproject.toml');
          return { type: 'python', confidence: 0.90, indicators };
        }
      } catch {
        // Unreadable pyproject.toml — fall through to Node
      }
      // Tooling-only pyproject.toml — still Node
      return { type: 'node', confidence: 0.95, indicators };
    }

    if (!hasLockfile && hasPyproject) {
      // Tier 4: package.json + no lockfile + pyproject.toml → Python 0.85
      // ...
    }

    // Tier 5: package.json + no lockfile + no competing manifest → Node 0.70
    return { type: 'node', confidence: 0.70, indicators };
```

**Test pattern — existing polyglot test** (polyglot.test.ts:36–50):

```typescript
  // @ana A001
  it('detects Python when pyproject.toml has PEP 621 dependencies', async () => {
    const dir = await createTempDir();
    await fs.writeFile(path.join(dir, 'package.json'), '{}');
    await fs.writeFile(path.join(dir, 'package-lock.json'), '{}');
    await fs.writeFile(path.join(dir, 'pyproject.toml'), `[project]
name = "litellm"
dependencies = ["openai", "httpx", "fastapi"]
`);

    const result = await detectProjectType(dir);

    expect(result.type).toBe('python');
    expect(result.confidence).toBe(0.90);
    expect(result.indicators).toContain('pyproject.toml');
  });
```

### Proof Context

- (polyglot-language-detection-C1) Tier 4 confidence 0.70 same as Tier 5 — pre-existing, not introduced by this change. Rust/Go no-lockfile tiers use 0.85, so no overlap.
- (polyglot-language-detection-C3) indexOf `\n[` edge case in `hasPythonProjectDeps` — carries forward to `hasRustWorkspace` which uses the same pattern. Not in scope to fix.
- (polyglot-language-detection-C2) A012 cascade test is structural, not behavioral — same approach for AC10. Known limitation.

### Checkpoint Commands

- After adding `hasRustWorkspace` and extending tier checks: `(cd packages/cli && pnpm vitest run tests/engine/detectors/polyglot.test.ts)` — Expected: all existing tests pass, new tests pass
- After all changes: `(cd packages/cli && pnpm vitest run)` — Expected: 2429+ tests pass (2429 current + new)
- Lint: `pnpm run lint`

### Build Baseline
- Current tests: 2429 passed, 2 skipped (2431 total)
- Current test files: 107
- Command used: `(cd packages/cli && pnpm vitest run)`
- After build: expected ~2440 tests in 107 files (new tests added to existing polyglot.test.ts)
- Regression focus: `tests/engine/detectors/polyglot.test.ts` (existing Python polyglot tests must not break)
