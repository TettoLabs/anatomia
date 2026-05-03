# Scope: V1 Documentation Overhaul

**Created by:** Ana
**Date:** 2026-05-03

## Intent

Rewrite every document a stranger reads so the project presents as a publication-grade product, not an internal R&D project. README, CHANGELOG, CONTRIBUTING, ARCHITECTURE — all four are stale, sprint-numbered, or undersized. This is the first of two scopes preparing for the 1.0.0 npm publish. This scope is docs only — no production code changes, no test changes. The second scope (v1-code-changes) handles CLI output polish, parser fixes, and build config.

## Complexity Assessment

- **Size:** medium
- **Files affected:** README.md (root, new), packages/cli/README.md (delete from git), CHANGELOG.md (root, rewrite), packages/cli/CHANGELOG.md (delete), CHANGELOG-internal.md (new archive), packages/cli/CONTRIBUTING.md (update), packages/cli/ARCHITECTURE.md (rewrite data flow section), packages/cli/package.json (prepublishOnly script), packages/cli/.gitignore (add README.md and CHANGELOG.md)
- **Blast radius:** Zero production code changes. Zero test changes. Only markdown and one package.json script line. The `prepublishOnly` change adds README + CHANGELOG copy before the existing build+test.
- **Estimated effort:** 3-4 hours
- **Multi-phase:** no

## Approach

Four documents rewritten to a consistent standard. The standard: Ruff's structure at np's density with Anatomia's voice. Every character earns its place. No sprint jargon. No deleted features. No stale line numbers.

**AnaPlan: before writing the spec, read these three requirements files.** They contain section-by-section specifications, reviewer consensus from 3-5 independent reviewers per document, voice rules, and acceptance criteria. The scope captures intent. The requirements capture the spec.

1. `../../anatomia_reference/v1_Release/README_REQUIREMENTS.md` — 9-section structure, badge spec, command grouping, voice rules, build-step mechanics
2. `../../anatomia_reference/v1_Release/CHANGELOG_REQUIREMENTS.md` — Keep a Changelog format, 1.0.0 entry grouped by product surface, archive strategy
3. `../../anatomia_reference/v1_Release/CONTRIBUTING_ARCHITECTURE_REQUIREMENTS.md` — broken path fixes, line number policy, sprint jargon removal, census-based pipeline rewrite, extension guide deduplication

## Acceptance Criteria

- AC1: Root README.md exists, 150-200 lines, 9 sections in specified order, 3 badges (CI, npm, license), install section present, commands grouped by product surface with all proof subcommands visible, scan ASCII block updated to match current `formatHumanReadable()` output, Claude Code boundary stated ("scan and init work standalone, pipeline requires Claude Code")
- AC2: Root CHANGELOG.md exists with 1.0.0 entry following Keep a Changelog 1.1.0 format, opens with "First stable release.", grouped by product surface (Scan, Context, Pipeline, Proof, Learn, Setup, Infrastructure), `[Unreleased]` section above, footer compare links, zero references to deleted features (modes, analysis.md, handlebars, anatomia-analyzer, ENTRY.md, .meta.json, snapshot.json)
- AC3: Old changelogs archived — root renamed to CHANGELOG-internal.md, packages/cli/CHANGELOG.md deleted from git
- AC4: CONTRIBUTING.md has zero line-number citations, zero sprint references, zero broken file paths, all test commands use `pnpm vitest run`, project structure tree matches actual filesystem including ENRICHMENT.md files in skill directories, `detectRemix` in the framework detector example
- AC5: ARCHITECTURE.md data flow section describes the current census-based `scanProject()` pipeline — `analyze()` not mentioned, `detectors/monorepo.ts` not mentioned, file/module counts match reality (init/: 7, conventions/: 5, node/: 6+1), missing modules added (applicationShape.ts, documentation.ts, readme.ts, sampling/), extension guides deduplicated (brief Extension Points list with cross-ref to CONTRIBUTING, not duplicated step-by-step), opens with cross-reference to CONTRIBUTING.md, known debt section contains only currently-valid items
- AC6: `prepublishOnly` in packages/cli/package.json copies both README.md and CHANGELOG.md from root before build
- AC7: packages/cli/README.md and packages/cli/CHANGELOG.md are in packages/cli/.gitignore and deleted from git tracking
- AC8: Zero emoji in any of the four documents
- AC9: Zero sprint references across all four documents (grep for `S1[0-9]`, `S2[0-9]`, `Item [0-9]`)
- AC10: Zero hedge words in README (grep for "simply," "just," "easily," "helps you," "allows you to," "enables," "powerful," "robust," "comprehensive")
- AC11: CONTRIBUTING.md opens with cross-reference to ARCHITECTURE.md, and vice versa

## Edge Cases & Risks

- The scan ASCII block in the README needs to be generated fresh by running `ana scan` on a representative project and capturing the output. The current block is stale.
- The CHANGELOG 1.0.0 entry references quantified numbers (40+ detectors, 16 gotchas, 5+3 skills). These must be verified against the codebase at build time, not hardcoded from our audit — they could change before this ships.
- ARCHITECTURE.md module counts (init/ files, conventions/ files, node/ detectors) must also be verified at build time for the same reason.
- The `prepublishOnly` script change must copy BOTH README and CHANGELOG. The README requirements doc specifies the README copy but the CHANGELOG copy is also needed for npm.
- CONTRIBUTING.md references ARCHITECTURE.md sections — the cross-references must be verified after both docs are updated.

## Rejected Approaches

- **Inline the full requirements in this scope.** The three requirements docs total ~600 lines of section-by-section specs, reviewer consensus tables, and voice rules. Inlining them would make this scope 800+ lines and obscure the intent. The requirements docs are the spec. This scope is the compass.
- **Split into 4 separate scopes (one per document).** The docs reference each other (CONTRIBUTING ↔ ARCHITECTURE, README links to both). Splitting creates handoff overhead and cross-doc consistency risk. One scope, one editorial pass.
- **Keep the old changelogs and add a 1.0.0 entry on top.** All reviewers agreed unanimously: fresh start. The old entries reference a different product.

## Open Questions

None. All design decisions resolved in the requirements docs with reviewer consensus.

## Exploration Findings

### Patterns Discovered
- Industry research across 10 CLI tools (Stripe, Ruff, Biome, Bun, Cal.com, Papermark, np, concurrently, tsup, Vercel) — findings in V1_RELEASE_APPENDIX.md Section A
- matklad's ARCHITECTURE.md blog post: "Encourage the reader to use symbol search to find entities by name" — authoritative source for the no-line-numbers policy

### Constraints Discovered
- [TYPE-VERIFIED] npm shows whatever README/CHANGELOG is in the package directory, not the repo root — build-step copy needed
- [TYPE-VERIFIED] packages/cli/README.md is currently 82 lines, root README is 22 lines — both undersized
- [TYPE-VERIFIED] Both changelogs use sprint numbers (S7-S26) and reference deleted features (modes, analysis.md, handlebars, anatomia-analyzer)
- [OBSERVED] ARCHITECTURE.md pipeline description is fundamentally stale — describes pre-census `analyze()` flow that was deleted
- [OBSERVED] 14 stale line numbers across both contributor docs — every single one was wrong
- [OBSERVED] Extension guides duplicated between CONTRIBUTING and ARCHITECTURE — violates "the elegant solution removes"

### Test Infrastructure
No test changes in this scope. All changes are documentation.

## For AnaPlan

### Structural Analog
`learn-template-session-fixes` — that scope was "7 template edits shipped as one scope because they were all symptoms of the same disease." This scope is 15 documentation items shipped as one scope because they're all symptoms of the same disease: docs written for the team, not for strangers.

### Relevant Code Paths
- `packages/cli/package.json` scripts.prepublishOnly — the only code change (adding file copies)
- `packages/cli/.gitignore` — adding build artifact entries

### Patterns to Follow
- The README section spec in README_REQUIREMENTS.md — follow it exactly for section order, content, and voice
- The CHANGELOG 1.0.0 entry in CHANGELOG_REQUIREMENTS.md — the structure is written out, numbers need verification
- The `scanProject()` flow in CONTRIBUTING_ARCHITECTURE_REQUIREMENTS.md — the 12-step census-based flow verified against actual source

### Known Gotchas
- Do NOT use line numbers in CONTRIBUTING or ARCHITECTURE. Use `functionName()` in `file.ts`. Every reviewer and the matklad blog post agree.
- Do NOT keep "Item 14c" or "S19" references. Replace with descriptive text or delete.
- Do NOT add pnpm/yarn install alternatives to the README. One package manager.
- Do NOT include a tagline in the README. "Ship with proof" belongs on the website.
- The `prepublishOnly` must copy files BEFORE `pnpm build`, not after — the build might fail, and we want the copies to happen regardless for `npm pack --dry-run` testing.

### Things to Investigate
None — all design decisions resolved. The requirements docs contain the full spec.
