# Internal Development History (Pre-1.0)

This file preserves the sprint-by-sprint development history for team reference.
For the user-facing changelog, see CHANGELOG.md.

---

## [Unreleased] — S11: The Context Sprint

### Init Enrichment
- scan.json saved during init — full 19-key EngineResult, agents read on cold start
- ana.json populated with detected commands, framework, language, package manager (not hardcoded defaults)
- Context files enriched with `**Detected:**` / `**Unexamined:**` tags, 0.7 confidence threshold, `## Open Questions` structure
- Skills seeded: coding-standards (conventions), testing-standards (framework + real commands), git-workflow (branch info), deployment (platform), logging-standards (monitoring services)
- Init completion message shows developer's detected stack, services, and deployment

### Renames
- `.meta.json` → `ana.json` (file, functions, variables, tests, templates)
- `.state/` → `state/` (directory, hooks, tests, .gitignore)
- `analysis.md` deleted (scan.json + context files replace it)
- `setupStatus` → `setupMode` (`not_started` → `complete` lifecycle)

### Scan Polish
- TypeScript projects show "TypeScript" not "Node.js" (when tsconfig.json or typescript dep present)
- Database arrow notation: "Prisma → PostgreSQL (3 models)" when ORM and engine both detectable
- Package manager inheritance: sub-packages inherit root's lockfile (capped at 5 levels)
- `ana init /path` now rejects with clear error (operates on cwd only)

### Quality
- Scaffold generators rewritten for EngineResult (deleted lossy adapter)
- Reinit guard prevents duplicate `## Detected` in skills on `--force`
- displaySuccessMessage only claims files exist when they were actually created
- setupMode state machine fixed (init always writes `not_started`, setup sets the mode)
- Unit tests for TypeScript detection, arrow notation, PM inheritance, skill seeding
- npm publish ready (prepublishOnly, description, keywords)

## S10 — The Engine Sprint

- **One package:** Absorbed analyzer into CLI. Deleted generator package.
- **EngineResult:** 19-key unified interface from `analyzeProject()`
- **Five-category detection:** Language, Framework, Database, Auth, Testing all populate
- **2026 stack coverage:** Clerk, Neon, Convex, Resend, PostHog, Anthropic SDK, Vercel AI SDK, Inngest, Playwright, 30+ more
- **External services:** Grouped by category (AI, payments, email, monitoring)
- **Deployment detection:** Vercel, Netlify, Fly.io, Railway, Docker
- **Redesigned terminal output:** Box-drawing scan display with all 19 keys
- 937 tests, 0 failures

## S9 — The Fix Sprint

- Resolved all 12 enhancements from S8 dogfood
- Contract system stabilized
- Pipeline flow hardened

## S8 — The Verification Sprint

- Mechanical verification via contract system
- Four-agent pipeline: Think → Plan → Build → Verify
- Proof chain tracking
- First dogfood: 24/24 assertions satisfied

## [Unreleased] — S7
- Detection overhaul: 6 stack categories (Language, Framework, Database, Auth, Testing, Payments)
- Dependency-file fallback for package.json-based detection
- Structure map: 35+ recognized directories
- Monorepo awareness (pnpm, lerna, nx, npm/yarn workspaces)
- Pre-check matching accuracy improvement (66% → <5% false positive rate)
- --verbose flag for scan debugging
- 5 prompt calibrations from dogfood evidence
- Dead code cleanup in fileCounts.ts
- Analyzer error boundary architecture verified
- WASM/npx investigation and recommendation

## [0.2.0] — 2026-03-31
- `ana scan` command with --json flag
- Graceful degradation in analyzer
- File counting utility
- save-all push fix
- Zero-install project scanner

## [0.1.1] — 2026-03-30
- S6: Verification architecture (build report independence)
- Pre-check bugfixes (skeleton regex, YAML parser)
- 8 prompt calibrations
- 4 artifact save validations
- Block-based assertion matching

## [0.1.0] — 2026-03-29
- S5: Mechanical verification (`ana verify pre-check`)
- `ana artifact save-all` command
- Config in ana.json
- AnaVerify rewrite
- Test skeleton support

## [0.0.x] — 2026-03-27
- S2-S4: Pipeline foundation
- Toolbelt commands (work, artifact, pr)
- Ana/AnaPlan/AnaBuild/AnaVerify agents
- Testing infrastructure
