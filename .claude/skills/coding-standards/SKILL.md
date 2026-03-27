---
name: coding-standards
description: "Anatomia coding standards. Invoke when implementing features, writing code, reviewing code quality, or planning implementation details."
---

# Coding Standards — Anatomia

## TypeScript
- Strict mode everywhere. No `any` types. No `@ts-ignore` without a comment explaining why.
- ESM modules with `.js` extensions on imports (TypeScript requires this for ESM interop): `import { foo } from './bar.js'`
- Zod for all runtime validation of external input (CLI args, file contents, JSON parsing). Type inference from Zod schemas, not manual interfaces.

## Naming
- Functions: camelCase (`detectFramework`, `parseGitHistory`)
- Classes: PascalCase (`DetectionCollector`, `FileSampler`)
- Constants: UPPER_SNAKE_CASE (`MAX_FILE_SIZE`, `DEFAULT_TIMEOUT`)
- Files: camelCase matching primary export (`fileSampler.ts`, `projectType.ts`)

## Error Handling
- Graceful degradation pattern: try-catch → collect partial results → continue. Never crash the entire operation because one detector fails.
- Use `DetectionCollector` for operations that can partially succeed.
- Confidence scores (0.0-1.0) on all detections. Low confidence is reported, not hidden.

## Code Structure
- Monorepo packages: `packages/cli`, `packages/analyzer`, `packages/generator`
- Keep packages independent. CLI depends on analyzer. Analyzer has no dependencies on CLI.
- Shared types in `packages/analyzer/src/types/index.ts`
- One export per file when possible. Index files for public API of each package.

## Formatting
- Prettier with project config (`.prettierrc.json`). Run before committing.
- ESLint with project config (`eslint.config.mjs`). Zero warnings policy.

## Dependencies
- WASM-based parsing only — no native C++ dependencies
- Pin versions in package.json
- New dependencies require justification: why can't we do this with what we have?

## Co-authoring
All commits from AnaBuild include:
```
Co-authored-by: Ana <build@anatomia.dev>
```

## Gotchas
- Analyzer must be lazy-loaded — WASM bindings crash if imported at module level. Use dynamic `import()`.
- Citation patterns live in `packages/cli/src/commands/check.ts` lines 68-74 (4 regex patterns). Reuse these for anything that parses citations.
- `isValidFilePath` helper in `check.ts` lines 218-230 filters out directories, commands, and bare filenames. Reuse for anything that validates file references.
- Context files are in `.ana/context/`, not `.ana/modes/`. Common mistake.
- tsup `clean: true` wipes the templates directory. The build script handles this with a post-build copy step — don't change the build order.

## Quality Bar
Would a senior engineer at a YC company look at this output and trust it enough to merge without reviewing? That's the bar for every commit.
