---
name: coding-standards
description: "Anatomia coding standards. Invoke when implementing features, writing code, reviewing code quality, or planning implementation details."
---

# Coding Standards — Anatomia

## TypeScript
- Strict mode with extra checks: noUncheckedIndexedAccess, noImplicitReturns, noImplicitOverride, noPropertyAccessFromIndexSignature, noFallthroughCasesInSwitch, exactOptionalPropertyTypes.
- ESM only. All imports require `.js` extensions: `import { foo } from './bar.js'`
- Target ES2022. Module ESNext. ModuleResolution Bundler.
- Avoid `any` — ESLint warns but doesn't block. Prefer explicit types.
- Analyzer types use Zod schemas with type inference (schema-first). CLI uses Commander for input validation.

## Naming
- Functions: camelCase (`detectFramework`, `parseGitHistory`)
- Classes: PascalCase (`DetectionCollector`, `DetectionError`)
- Constants: UPPER_SNAKE_CASE (`MAX_FILE_SIZE`, `DEFAULT_TIMEOUT`)
- Files: camelCase matching primary export (`fileSampler.ts`, `projectType.ts`)
- Directories: lowercase (`analyzers`, `detectors`, `parsers`, `utils`)

## Error Handling
- Graceful degradation: try-catch → collect partial results → continue. Never throw up the stack from a detector or parser.
- Use `DetectionCollector` for operations that can partially succeed.
- Return null or empty result on failure, not exceptions.

## Code Structure
- Monorepo: `packages/cli`, `packages/analyzer`, `packages/generator`
- CLI depends on analyzer (`workspace:*`). Analyzer has zero dependencies on CLI. Never create circular dependencies.
- Shared types in `packages/analyzer/src/types/` with Zod schemas. Barrel file at `index.ts` re-exports the public API.
- One export per command file. Barrel files and type files are the exception.

## Formatting
- Prettier: 2 spaces, single quotes, trailing commas (es5), printWidth 100, semicolons.
- ESLint: flat config (`eslint.config.mjs`), typescript-eslint recommended. Unused vars error (ignores `_` prefixed).
- Run `pnpm lint` and `pnpm build` before committing. Not enforced by hooks — manual discipline.

## Dependencies
- Keep dependencies minimal. CLI has 5, analyzer has 5. New dependencies need justification: why can't we do this with what we have?
- WASM-based parsing only — no native C++ dependencies. `web-tree-sitter` for AST parsing. Native grammars are optional.
- Caret ranges for general dependencies. Exact pins for WASM grammars (version-sensitive). `pnpm-lock.yaml` is the source of truth for actual versions.

## Co-authoring
All commits from AnaBuild include:
```
Co-authored-by: Ana <build@anatomia.dev>
```

## Gotchas
- Analyzer must be lazy-loaded — WASM bindings crash if imported at module level. Use dynamic `import()`.
- Citation patterns live in `packages/cli/src/commands/check.ts` lines 68-74 (4 regex patterns). Reuse for anything that parses citations.
- `isValidFilePath` helper in `check.ts` lines 218-230 filters out directories, commands, and bare filenames. Reuse for anything that validates file references.
- Context files are in `.ana/context/`, not `.ana/modes/`. Common mistake.
- tsup `clean: true` wipes the dist directory including templates. The build command is `tsup && cp -r templates dist/`. Don't change the build order.
- No pre-commit hooks. Linting and build checks are manual. Run `pnpm build && pnpm test && pnpm lint` before pushing.

## Quality Bar
Would a senior engineer at a YC company look at this output and trust it enough to merge without reviewing? That's the bar for every commit.

## Future Improvements
- **Tighten `any` rule:** Consider upgrading `no-explicit-any` from 'warn' to 'error' once existing usages are cleaned up.
- **Pre-commit hooks:** Add husky + lint-staged to enforce formatting and linting automatically. Currently manual discipline only.
- **Extract citation utilities:** Citation patterns and `isValidFilePath` are duplicated when used by multiple commands. Extract to `packages/cli/src/utils/citations.ts` when a third consumer appears.
- **CLI validation with Zod:** Consider adopting Zod in CLI for config/file validation to match analyzer's schema-first approach.
- **Logging standards:** No logging framework today (`console.log` + `chalk`). If structured logging, log levels, or log aggregation become needed, define a logging standard as a separate skill or section here.
