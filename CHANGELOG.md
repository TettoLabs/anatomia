# Changelog

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
- Config in .meta.json
- AnaVerify rewrite
- Test skeleton support

## [0.0.x] — 2026-03-27
- S2-S4: Pipeline foundation
- Toolbelt commands (work, artifact, pr)
- Ana/AnaPlan/AnaBuild/AnaVerify agents
- Testing infrastructure
