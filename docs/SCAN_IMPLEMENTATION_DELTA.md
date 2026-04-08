# Scan Implementation Delta — Current vs Vault Decisions

**Date:** 2026-04-06
**Verified against:** source code on main (commit bd8f609)
**References:** ANA_DESIGN_SPECIFICATIONS_VAULT Decisions 1-3

---

## 1. scan.ts Command Implementation

### Current State
- **File:** `packages/cli/src/commands/scan.ts` (444 lines)
- **Flags:** `--json`, `--deep`, `--verbose`, `--save` (4 flags)
- **Action handler:** lines 381-441
- **`--deep` defined at:** line 378 — `.option('--deep', 'Include patterns and conventions from tree-sitter analysis')`
- **`--save` behavior:** lines 426-434 — creates `.ana/` if missing via `fs.mkdir(anaDir, { recursive: true })`
- **Depth logic:** line 402 — `const depth = options.deep ? 'deep' : 'surface'`
- **Spinner suppressed for:** `--json` and `--verbose` (line 396)
- **Terminal rendering:** `formatHumanReadable()` at line 121 (248 lines)
- **Stack order:** line 146 — `['language', 'framework', 'database', 'auth', 'testing', 'workspace']` — **missing payments, missing aiSdk**
- **Footer CTA:** line 362 — static: `'Run \`ana init\` to generate full context for your AI.'`

### Delta to Match Decision 3

| Change | Location | What to Do |
|--------|----------|-----------|
| Remove `--deep` | line 378 | Delete the option. Deep is now default. |
| Add `--quiet` | after line 380 | `.option('--quiet', 'Suppress terminal output')` |
| Add `--quick` | after --quiet | `.option('--quick', 'Surface-only analysis (skip tree-sitter)')` |
| Change depth logic | line 402 | `const depth = options.quick ? 'surface' : 'deep'` — deep is default, `--quick` forces surface |
| Change `--save` to require `.ana/` | lines 427-429 | Replace `fs.mkdir(anaDir, { recursive: true })` with existence check. Error if no `.ana/`: `"No .ana/ directory. Run \`ana init\` first."` |
| Add `lastScanAt` update on `--save` | after line 431 | Read ana.json, set `lastScanAt` to `result.overview.scannedAt`, write back |
| Add path + --save incompatibility | before line 398 | If `targetPath !== '.'` AND `options.save`: error `"Cannot combine path with --save."` |
| Suppress output for `--quiet` | line 419-423 | If `options.quiet`: skip both JSON and terminal output. Only `--json` overrides quiet. |
| Add stack.aiSdk to stackOrder | line 146 | Change to `['language', 'framework', 'aiSdk', 'database', 'auth', 'testing', 'payments', 'workspace']` |
| Add aiSdk to stackLabels | line 147-150 | Add `aiSdk: 'AI'` and `payments: 'Payments'` |
| Make footer CTA dynamic | lines 362-366 | Count blind spots + future findings. 0 → "looks clean", 3+ → "Found N issues your AI will get wrong." |
| Add 30-second timeout | line 403 | Wrap `analyzeProject()` call in `Promise.race` with 30s timeout |
| Update options type | line 381 | Change to `{ json?: boolean; quiet?: boolean; quick?: boolean; verbose?: boolean; save?: boolean }` |

**Effort:** 1-2 days. Mostly mechanical flag changes + the `--save` behavior change + timeout wrapper.

### Dependencies
- EngineResult must have `stack.aiSdk` before stack rendering can show it
- Timeout implementation needs per-phase budget support in `analyzeProject()`

---

## 2. EngineResult Type Definition

### Current State
- **File:** `packages/cli/src/engine/types/engineResult.ts` (105 lines)
- **19 top-level fields** in the interface

### Field-by-Field Delta Against Decision 2

| Field | Current | Decision 2 | Action |
|-------|---------|-----------|--------|
| `overview` | `{ project, scannedAt, depth }` | Same | None |
| `stack.language` | `string \| null` | Same | None |
| `stack.framework` | `string \| null` | Same | None |
| `stack.aiSdk` | **MISSING** | `string \| null` | **ADD** |
| `stack.database` | `string \| null` | Same | None |
| `stack.auth` | `string \| null` | Same | None |
| `stack.testing` | `string \| null` | Same | None |
| `stack.payments` | `string \| null` | Same | None |
| `stack.workspace` | `string \| null` | Same | None |
| `files` | Matches | Same | None |
| `structure` | Matches | Same | None |
| `structureOverflow` | Matches | Same | None |
| `commands` | Matches | Same | None |
| `git.defaultBranch` | **MISSING** | `string \| null` | **ADD** |
| `git.branches` | **MISSING** | `string[] \| null` | **ADD** |
| `monorepo` | Matches | Same | None |
| `externalServices` | Matches | Same | None |
| `schemas` | Matches | Same | None |
| `secrets.hardcodedKeysFound` | `null` stub | **REMOVED** | **DELETE** — replaced by `secretFindings` |
| `secrets.envVarReferences` | `null` stub | **REMOVED** | **DELETE** — replaced by `envVarMap` |
| `projectProfile.maturity` | `null` stub | **REMOVED** | **DELETE** |
| `projectProfile.teamSize` | `null` stub | **REMOVED** | **DELETE** |
| `deployment` | `{ platform, configFile } \| null` | Always-present, + `ci`, `ciConfigFile` | **CHANGE** — make always-present, add CI fields |
| `patterns` | `any \| null` | `PatternDetail` typed | **CHANGE** type |
| `conventions` | `any \| null` | `ConventionDetail` typed | **CHANGE** type |
| `recommendations` | `Array<...> \| null` | `null` | **SIMPLIFY** to just `null` |
| `health` | `Record<string, never>` | `null` | **CHANGE** to `null` |
| `readiness` | `Record<string, never>` | `null` | **CHANGE** to `null` |
| `secretFindings` | **MISSING** | `Array<...> \| null` | **ADD** (null stub) |
| `envVarMap` | **MISSING** | `Array<...> \| null` | **ADD** (null stub) |
| `duplicates` | **MISSING** | `{...} \| null` | **ADD** (null stub) |
| `circularDeps` | **MISSING** | `Array<...> \| null` | **ADD** (null stub) |
| `orphanFiles` | **MISSING** | `string[] \| null` | **ADD** (null stub) |
| `complexityHotspots` | **MISSING** | `Array<...> \| null` | **ADD** (null stub) |
| `gitIntelligence` | **MISSING** | `{...} \| null` | **ADD** (null stub) |
| `dependencyIntelligence` | **MISSING** | `{...} \| null` | **ADD** (null stub) |
| `technicalDebtMarkers` | **MISSING** | `{...} \| null` | **ADD** (null stub) |
| `inconsistencies` | **MISSING** | `Array<...> \| null` | **ADD** (null stub) |
| `conventionBreaks` | **MISSING** | `Array<...> \| null` | **ADD** (null stub) |
| `aiReadinessScore` | **MISSING** | `{...} \| null` | **ADD** (null stub) |

**Summary:** 3 fields to delete, 4 fields to change, 14 fields to add (most as null stubs), 1 field to simplify. Plus `PatternDetail` and `ConventionDetail` shared types to define.

**Effort:** Half day for the type definition. But cascading — every consumer of EngineResult (scan.ts, init.ts, scaffold generators, tests) needs updating for removed/renamed fields.

### Dependencies
- Removing `secrets.hardcodedKeysFound` and `secrets.envVarReferences` requires updating `analyze.ts:400` (`detectSecrets` return shape)
- Removing `projectProfile.maturity`/`teamSize` requires updating `analyze.ts:408-409`
- Changing `deployment` to always-present requires updating `analyze.ts:401` and `detectDeployment()` return type
- Adding `git.defaultBranch`/`git.branches` requires updating `git.ts`

---

## 3. analyzeProject Implementation

### Current State
- **File:** `packages/cli/src/engine/analyze.ts`
- **Function:** `analyzeProject()` at line 297
- **12 sequential phases** (numbered in comments), no timeout budget

### Current Phase Order

| # | Phase | Code | Can Fail Gracefully? |
|---|-------|------|---------------------|
| 1 | Monorepo detection | `detectMonorepoInfo()` line 305 | Yes (returns non-monorepo) |
| 2 | Package manager | `detectPackageManager()` line 308 | Yes (returns 'npm') |
| 3 | Dependency detection | `readDependencies()` + `detectFromDeps()` lines 311-317 | Yes (returns empty) |
| 4 | Analyzer (type/framework/structure/deep) | `analyze()` lines 320-336 | Yes (try/catch, null) |
| 5 | Stack building | Local logic lines 338-377 | No failure path needed |
| 6 | File counts | `countFiles()` line 380 | Yes |
| 7 | Structure extraction | `extractStructure()` line 383 | Yes |
| 8 | Commands | `detectCommands()` line 386 | Yes |
| 9 | Git | `detectGitInfo()` line 389 | Yes (returns nulls) |
| 10 | Services + schemas + secrets + deployment | Lines 392-401 | Yes (each independent) |
| 11 | Project profile | Local logic lines 404-416 | No failure path needed |
| 12 | Blind spots | Local logic lines 418-424 | No failure path needed |

### Delta to Match Decision 3

| Change | What to Do |
|--------|-----------|
| Default depth → deep | Change signature default: `options: { depth: 'surface' \| 'deep' } = { depth: 'deep' }` |
| 30-second timeout budget | Wrap each phase in a timeout helper. Kill phase on budget exceed → null for that phase → continue. |
| Phase priority order | Reorder to match locked priority (deps first, git basic, secret detection, structure, git intelligence, dep intelligence, tree-sitter last) |
| Add `stack.aiSdk` population | In step 3: detect AI packages from deps. In step 5: set `stack.aiSdk`. |
| Add `git.defaultBranch` | In step 9: add `symbolic-ref` → `remote show` → common-names detection to `detectGitInfo()` |
| Add `git.branches` | In step 9: add `git branch -a --format='%(refname:short)'` to `detectGitInfo()` |
| Add CI detection to deployment | In step 10: expand `detectDeployment()` to check `.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile` |
| Populate null stubs | Return null for all Phase 1+ fields in the EngineResult construction (lines 426-446) |

**Effort:** 2-3 days. The timeout system is the most complex piece. Phase reordering is mechanical. git.defaultBranch detection is ~20 lines of new git commands.

---

## 4. Init — ana.json Extraction

### Current State
- **Function:** `createAnaJson()` at line 1044
- **Current fields written:** name, framework, language, packageManager, commands (build/test/lint/dev), coAuthor, artifactBranch, setupMode, scanStaleDays

### Delta to Match Decision 1

| Change | Current Code | New Code |
|--------|-------------|----------|
| Add `anaVersion` | Missing | Read from CLI package.json version |
| Add `lastScanAt` | Missing | `result.overview.scannedAt` |
| Remove `scanStaleDays` | Line 1066: `scanStaleDays: 7` | Delete |
| Fix `artifactBranch` | Line 1064: `result.git?.branch \|\| 'main'` | Use `result.git.defaultBranch` (from Decision 2). Falls back to 4-step priority. |
| Non-interactive test command | Line 1059: `test: result.commands.test \|\| null` | Detect vitest → append `-- --run`. Detect jest with `--watch` → remove watch flag. |
| `commands` types | `string \| null` | Decision 1 says `string` (not nullable). Need default values or keep nullable. |

**Effort:** Half day. The non-interactive test detection needs a small helper function.

### Dependencies
- `git.defaultBranch` must be populated in EngineResult first (git.ts change)

---

## 5. Skill Scaffolding

### Current State
- **Function:** `seedSkillFiles()` at line 779
- **Seeds 5 skills** from EngineResult: coding-standards, testing-standards, git-workflow, deployment, logging-standards
- **Mechanism:** Builds `## Detected` section with bullet points, appends to template file after `## Detected` marker

### Delta for AI SDK

Currently AI packages flow to `externalServices` only (via `detectServiceDeps()` at line 394). To seed skills with AI SDK info:

1. Add AI SDK to `detectFromDeps()` return → `DependencyDetectionResult.aiSdk: string | null`
2. In `seedSkillFiles()`, add AI SDK line to coding-standards: `- AI SDK: ${result.stack.aiSdk}`

**Effort:** 1-2 hours.

---

## 6. Git Default Branch Detection

### Current State
- **File:** `packages/cli/src/engine/detectors/git.ts` (68 lines)
- **No `defaultBranch` field.** Current branch only: `git rev-parse --abbrev-ref HEAD`
- **No `branches` field.** Only current branch detected.

### Delta

Add to `detectGitInfo()`:

```typescript
// Default branch detection (4-step priority from Decision 1)
const symbolicRef = gitExec('git symbolic-ref refs/remotes/origin/HEAD', cwd);
let defaultBranch: string | null = symbolicRef
  ? symbolicRef.replace('refs/remotes/origin/', '')
  : null;

if (!defaultBranch) {
  const remoteShow = gitExec('git remote show origin', cwd);
  const match = remoteShow?.match(/HEAD branch:\s*(\S+)/);
  defaultBranch = match ? match[1] : null;
}

if (!defaultBranch) {
  for (const name of ['main', 'master', 'develop', 'dev']) {
    if (gitExec(`git rev-parse --verify ${name}`, cwd)) {
      defaultBranch = name;
      break;
    }
  }
}

if (!defaultBranch) {
  defaultBranch = branch; // fallback to current
}

// All branches
const branchOutput = gitExec('git branch -a --format=%(refname:short)', cwd);
const branches = branchOutput ? branchOutput.split('\n').filter(b => b.trim()) : null;
```

Also update `GitInfo` interface to include `defaultBranch: string | null` and `branches: string[] | null`.

**Effort:** 1-2 hours. Pure git commands, well-understood.

**Risk:** `git remote show origin` can be slow (~2-5 seconds) if it contacts the remote. Should be attempted only if `symbolic-ref` fails. Already handled by priority order.

---

## 7. AI Package Detection Routing

### Current State
- `AI_PACKAGES` map exists at `dependencies.ts:72` (7+ packages)
- Routed to `externalServices` via `detectServiceDeps()` with category `'ai'`
- NOT routed to `stack.aiSdk` — that field doesn't exist yet

### Delta

1. Add `aiSdk: string | null` to `DependencyDetectionResult` interface (line 116)
2. Add AI detection loop to `detectFromDeps()`:
   ```typescript
   for (const [pkg, name] of Object.entries(AI_PACKAGES)) {
     if (allDeps[pkg]) { result.aiSdk = name; break; }
   }
   ```
3. In `analyzeProject()` step 5, set `stack.aiSdk = depResult.aiSdk`
4. Keep `externalServices` routing — AI shows in BOTH stack and services

**Effort:** 30 minutes. Mechanical.

---

## 8. Test Runner Non-Interactive Detection

### Current State
- Testing framework detected by `detectFromDeps()` → `TESTING_PACKAGES` map
- Test command detected by `detectCommands()` from package.json scripts
- **No non-interactive flag logic exists.** Command is extracted as-is.

### Delta

Add helper function in init.ts or a shared utility:

```typescript
function makeTestCommandNonInteractive(
  testCommand: string | null,
  testingFramework: string | null
): string | null {
  if (!testCommand) return null;

  // Vitest defaults to watch mode — append --run
  if (testingFramework === 'Vitest' && !testCommand.includes('--run')) {
    return `${testCommand} -- --run`;
  }

  // Jest with --watch → remove it
  if (testingFramework === 'Jest' && testCommand.includes('--watch')) {
    return testCommand.replace('--watch', '').trim();
  }

  // Most runners (mocha, pytest, playwright) are non-interactive by default
  return testCommand;
}
```

Called in `createAnaJson()` when building the commands object.

**Effort:** 1-2 hours including tests.

---

## 9. Terminal Rendering — Stack + CTA

### Current State
- **stackOrder:** line 146 — `['language', 'framework', 'database', 'auth', 'testing', 'workspace']`
- **stackLabels:** lines 147-150 — missing `payments` and `aiSdk`
- **Footer:** line 362 — static string

### Delta

**Stack order change:** `['language', 'framework', 'aiSdk', 'database', 'auth', 'testing', 'payments', 'workspace']`

**Stack labels add:** `aiSdk: 'AI', payments: 'Payments'`

**Dynamic CTA:** Replace lines 362-366:
```typescript
const findingsCount = result.blindSpots.length
  + (result.secretFindings?.length || 0);
// + future findings

if (findingsCount === 0) {
  lines.push(chalk.gray('Your project looks clean. Run `ana init` to generate context for your AI.'));
} else if (findingsCount <= 2) {
  lines.push(chalk.gray(`Found issues your AI should know about. Run \`ana init\` to teach it.`));
} else {
  lines.push(chalk.yellow(`Found ${findingsCount} issues your AI will get wrong. Run \`ana init\` before your next coding session.`));
}
```

**Effort:** 1-2 hours.

---

## 10. Deployment + CI Detection

### Current State
- **File:** `packages/cli/src/engine/detectors/deployment.ts` (35 lines)
- Returns `{ platform, configFile } | null`
- Checks 10 deployment files. **No CI detection.**
- **No `.github/workflows/` check, no `.gitlab-ci.yml`, no `Jenkinsfile`.**

### Delta

Change return type to always-present object with nullable internals per Decision 2:

```typescript
interface DeploymentResult {
  platform: string | null;
  configFile: string | null;
  ci: string | null;
  ciConfigFile: string | null;
}
```

Add CI detection:
```typescript
const CI_FILES: Record<string, string> = {
  '.github/workflows': 'GitHub Actions',
  '.gitlab-ci.yml': 'GitLab CI',
  'Jenkinsfile': 'Jenkins',
  '.circleci/config.yml': 'CircleCI',
  'bitbucket-pipelines.yml': 'Bitbucket Pipelines',
  '.travis.yml': 'Travis CI',
};
```

For `.github/workflows`: check if directory exists (not a single file).

**Effort:** 1-2 hours.

### Dependencies
- EngineResult deployment type change must happen first
- `analyze.ts` line 401 and all consumers need updating

---

## 11. Atomic Init + Snapshot

### Current State
- **Atomic init:** Works. Temp directory created at line 149, all work done there, atomic rename at line 185, failure cleanup at line 196.
- **Snapshot:** `storeSnapshot()` at line 1084 writes full EngineResult to `.ana/state/snapshot.json`. Used for future drift detection.

### Delta
- No structural changes needed to atomic init
- Snapshot continues to store full EngineResult — as the schema grows, snapshot grows automatically

---

## Implementation Roadmap

### Must-Do for S13 (blocks init correctness)

| # | Change | File(s) | Effort |
|---|--------|---------|--------|
| 1 | Add `git.defaultBranch` + `git.branches` to git detector | `git.ts` | 2 hours |
| 2 | Fix `artifactBranch` in createAnaJson to use `git.defaultBranch` | `init.ts` | 30 min |
| 3 | Add `anaVersion` to ana.json | `init.ts` | 30 min |
| 4 | Add `lastScanAt` to ana.json (init writes it, --save updates it) | `init.ts`, `scan.ts` | 1 hour |
| 5 | Remove `scanStaleDays` from ana.json | `init.ts`, `constants.ts` | 30 min |
| 6 | Non-interactive test command detection | `init.ts` (new helper) | 2 hours |
| 7 | Remove `--deep`, add `--quiet` and `--quick` | `scan.ts` | 2 hours |
| 8 | Change `--save` to require `.ana/` | `scan.ts` | 1 hour |
| 9 | Update EngineResult type (remove stubs, add typed patterns/conventions, change deployment) | `engineResult.ts` | 4 hours |
| 10 | Cascade EngineResult changes to analyze.ts, scan.ts, init.ts, tests | Multiple | 4 hours |

**Total Must-Do:** ~2-3 days

### Should-Do for S13 (improves quality)

| # | Change | File(s) | Effort |
|---|--------|---------|--------|
| 11 | Add `stack.aiSdk` detection + routing | `dependencies.ts`, `analyze.ts` | 1 hour |
| 12 | Add AI + Payments to stack terminal rendering | `scan.ts` | 1 hour |
| 13 | Dynamic footer CTA | `scan.ts` | 1 hour |
| 14 | CI detection in deployment | `deployment.ts` | 2 hours |
| 15 | 30-second timeout budget with phase priorities | `analyze.ts` | 4 hours |
| 16 | Path + --save incompatibility guard | `scan.ts` | 30 min |
| 17 | Seed skills with AI SDK data | `init.ts` | 1 hour |

**Total Should-Do:** ~1.5 days

### Can-Wait (Phase 1+ features, null stubs sufficient)

| # | Change | File(s) | Effort |
|---|--------|---------|--------|
| 18 | Add Phase 1 null stub fields to EngineResult | `engineResult.ts` | 1 hour |
| 19 | Secret detection (regex) — populate `secretFindings` | New detector | 1-2 days |
| 20 | Env var map — populate `envVarMap` | New detector | 1 day |
| 21 | Git intelligence — populate churn/busFactor/coChange/bugMagnets | New detector | 2-3 days |
| 22 | Dependency intelligence — health/overlaps/versionBreaks | New detector | 2-3 days |
| 23 | Technical debt markers — TODO/FIXME/HACK scan | New detector | Half day |
| 24 | Terminal sections for new findings (secrets, debt markers) | `scan.ts` | 1 day |
| 25 | AI Readiness Score (derived from Phase 1 data) | New module | 1-2 days |

**Total Can-Wait:** ~2 weeks for full Phase 1

---

## Test Impact Assessment

| Change | Tests Affected | Action |
|--------|---------------|--------|
| Remove `--deep` flag | `scan.test.ts` tests using `--deep` | Change to `--quick` inverse or remove |
| `--save` requires `.ana/` | `scan.test.ts`, `init-flow.test.ts` edge cases | Update expectations |
| EngineResult field removals | `test-types.ts`, scaffold tests, init tests | Update TestEngineResult, createEmptyEngineResult |
| `git.defaultBranch` addition | Git detector tests | Add tests for 4-step priority |
| Non-interactive test command | Init tests | Add tests for vitest/jest flag handling |
| Stack order change | Scan rendering tests | Update expected output |

**Current test count:** 932. Expected change: slight increase from new feature tests, slight churn from flag/schema changes. Net: ~935-945 tests.
