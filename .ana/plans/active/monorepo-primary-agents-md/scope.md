# Scope: Monorepo Primary Package AGENTS.md

**Created by:** Ana
**Date:** 2026-04-16

## Intent
When a monorepo's primary package is opened directly in Cursor/Copilot/Windsurf (e.g., `packages/cli` instead of the repo root), there's no AGENTS.md present. Users get zero Anatomia context. Generate a minimal AGENTS.md in the primary package directory that provides essential context and points to the root for the full picture.

## Complexity Assessment
- **Size:** small
- **Files affected:** `packages/cli/src/commands/init/assets.ts` (add function + call site)
- **Blast radius:** Low — additive change, no existing behavior modified
- **Estimated effort:** ~30 minutes
- **Multi-phase:** no

## Approach
Extend the init asset scaffolding to generate a secondary AGENTS.md in the primary package directory when the project is a monorepo. The file should be minimal — package identity, package-scoped commands, and a pointer to root. Conventions, services, and constraints belong at root only; the pointer gets users there.

Use the same merge-not-overwrite pattern as the root AGENTS.md (don't clobber user customizations on re-init).

## Acceptance Criteria
- AC1: Running `ana init` on a monorepo with a detected primary package creates `{primaryPackage.path}/AGENTS.md`
- AC2: The generated file contains: package name, "Primary package in {project-name}", package-scoped commands (build/test/lint where available), and a pointer to root AGENTS.md
- AC3: If `{primaryPackage.path}/AGENTS.md` already exists, it is not overwritten
- AC4: Non-monorepo projects and monorepos without a detected primary package are unaffected

## Edge Cases & Risks
- **Primary package has no package-specific commands** — fall back to noting the root commands, or skip the commands section if nothing is package-scoped
- **Relative path computation** — the pointer to root AGENTS.md needs correct `../` depth based on `primaryPackage.path`
- **Re-init with existing file** — must respect merge-not-overwrite (same as root)
- **Primary package path contains special characters** — unlikely in practice, but path handling should be robust

## Rejected Approaches
- **Symlink to root AGENTS.md** — zero duplication but fragile on Windows, requires git config for proper tracking, and doesn't allow package-specific commands
- **Full duplicate of root AGENTS.md** — solves the problem but creates drift risk and maintenance burden
- **All-workspace package coverage** — pulls in edge cases (website? test fixtures?). Primary package is the clean case; broader coverage is a follow-up if needed

## Open Questions
None — requirements are clear.

## Exploration Findings

### Patterns Discovered
- `generateAgentsMd()` (assets.ts:318-438) — the root AGENTS.md generator, uses `fileExists()` check before writing
- `createClaudeConfiguration()` (assets.ts:161-243) — orchestrator that calls `generateAgentsMd()`, the call site for the new function
- `monorepo.primaryPackage` — already detected and available on EngineResult, used for test command scoping

### Constraints Discovered
- [TYPE-VERIFIED] primaryPackage shape (engineResult.ts:111) — `{ name: string; path: string } | null`
- [OBSERVED] merge-not-overwrite pattern — `fileExists()` check gates all AGENTS.md/CLAUDE.md writes
- [OBSERVED] commands.all — raw package.json scripts available for package-scoped command extraction

### Test Infrastructure
- `tests/scaffolds/all-scaffolds.test.ts` — covers AGENTS.md generation, will need a monorepo case added

## For AnaPlan

### Structural Analog
`generateAgentsMd()` in assets.ts:318-438 — same shape (check exists, build lines array, write file), different output path and content.

### Relevant Code Paths
- `packages/cli/src/commands/init/assets.ts` — `generateAgentsMd()` and `createClaudeConfiguration()`
- `packages/cli/src/engine/types/engineResult.ts` — `monorepo.primaryPackage` type definition

### Patterns to Follow
- `generateAgentsMd()` for the file generation pattern
- `fileExists()` guard before writing (preflight.ts)
- `path.relative()` or manual `../` computation for the pointer path

### Known Gotchas
- `primaryPackage.path` is relative to project root (e.g., `packages/cli`), so the output path is `path.join(cwd, primaryPackage.path, 'AGENTS.md')`
- The pointer to root needs to invert this path — if package is at `packages/cli`, pointer is `../../AGENTS.md`

### Things to Investigate
- Whether package-specific commands should come from `commands.all` (raw scripts) or be derived differently — the root commands are already scoped to primary package in ana.json, so the package AGENTS.md might just echo those
