---
name: troubleshooting
description: "Invoke when debugging failures, diagnosing unexpected behavior, or investigating test failures. Contains project-specific failure modes, diagnostic workflows, and known issues."
---

# Troubleshooting

## Detected

## Rules

**Pre-commit hook rejects commit.** The hook runs `tsc --noEmit` (source + tests) and `eslint`. It does NOT run tests. The most common cause is a type error. Run `cd packages/cli && pnpm typecheck` to see the specific error. Don't use `--no-verify` to skip the hook — the build (tsup/SWC) strips types without checking, so the hook is the only enforcement.

**Tests fail in files you didn't touch.** If you added a field to `EngineResult` in `engineResult.ts`, you also need to add the default value to `createEmptyEngineResult()` at the bottom of the same file. Tests using the factory function will fail with "Property X is missing in type." Check the CROSS-CUTTING comment at the top of engineResult.ts for the full list of locations that need updating.

**Gotcha triggers don't fire on the expected stack.** Gotcha triggers match against `stack.*` fields which store DISPLAY NAMES, not package names. `{ aiSdk: 'Anthropic' }` fires. `{ aiSdk: '@anthropic-ai/sdk' }` does not. Check `packages/cli/src/data/gotchas.ts` for existing trigger values.

**Schema detection shows wrong file or wrong model count.** In monorepos, census first checks `{root}/prisma/schema.prisma` and `{root}/schema.prisma` for each workspace package. If multiple schema files exist, the scan picks the one with the most models. For multi-file schemas (Prisma `prismaSchemaFolder`), models are counted across all `.prisma` files in the directory. If the wrong schema is selected, check which workspace packages have a `prisma/` directory.

**Re-init doesn't show new template content.** CLAUDE.md, AGENTS.md, and agent definitions use merge-not-overwrite — existing files are preserved. To see fresh template output after changing templates, delete the existing files first: `rm CLAUDE.md AGENTS.md && rm -rf .claude/agents/` then re-run `ana init --force`.

**`pnpm test` at workspace root behaves differently than in packages/cli.** The root `test` script runs through turbo, which handles argument passthrough differently. Use `cd packages/cli && pnpm test -- --run` for reliable test execution with the `--run` flag. Running `pnpm test --run` from the workspace root may fail or pass arguments incorrectly.

## Gotchas
*Add new entries as they're discovered during development. Each entry should describe the symptom, the cause, and the fix.*

## Examples
*Not yet captured. Add diagnostic workflows showing how to investigate common failures.*
