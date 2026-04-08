# S18 Investigation Report

Generated: 2026-04-08

---

## PART A — Confirm-Before-Plan Investigations

---

### A1: "analyze" verbiage scope (D11)

**Summary:** Renaming `analyzeProject()` → `scanProject()` and `analyze.ts` → `scan-engine.ts` is an **11-15 file change**.

#### Key Findings

**`packages/cli/src/engine/analyze.ts`:**
- Line 382: Main export `analyzeProject(rootPath, options)`
- Lines 31-59: Display name maps (LANGUAGE_DISPLAY_NAMES, FRAMEWORK_DISPLAY_NAMES, PATTERN_DISPLAY_NAMES)
- Lines 61-63: Internal `displayName()` helper
- Lines 277-378: Private helpers (extractStructure, mapPatterns, mapConventions)

**`packages/cli/src/engine/index.ts`:**
- Line 114: Re-export `export { analyzeProject } from './analyze.js'`
- Lines 166-282: Separate `analyze()` function called by `analyzeProject()` at line 407

**`AnalysisResult` is NOT replaced by `EngineResult`** — they serve different purposes:
- `AnalysisResult`: Detailed tree-sitter analyzer output
- `EngineResult`: Unified scan output that wraps/composes AnalysisResult

#### `analyzeProject()` Call Sites (8 total)

| File | Line | Type |
|------|------|------|
| `src/commands/init.ts` | 466-467 | Dynamic import + call |
| `src/commands/scan.ts` | 504-507 | Dynamic import + call |
| `tests/engine/analyzeProject.test.ts` | 2, 33, 58, 73, 88, 105, 115 | Import + 6 calls |
| `tests/engine/detectors/s11-detection.test.ts` | 38-39, 50-51, 61-62, 91-92, 111-112 | 5 dynamic imports |

#### Files That Would Change

**Core (5):**
1. `src/engine/analyze.ts` — rename file + function
2. `src/engine/index.ts` — update import/export (line 114)
3. `src/commands/scan.ts` — update dynamic import (line 504)
4. `src/commands/init.ts` — update dynamic import (line 466)
5. `src/engine/types/engineResult.ts` — update docstring (line 4)

**Display name dedup (2):**
6. `src/engine/analyze.ts` — lines 31-63 (original definitions)
7. `src/commands/scan.ts` — lines 31-85 (duplicates, see A5)

**Tests (4):**
8. `tests/engine/analyzeProject.test.ts`
9. `tests/engine/detectors/s11-detection.test.ts`
10. `tests/commands/scan.test.ts`
11. Potentially other test files

**Recommendation:** 11-15 file change, manageable. Consider consolidating display name duplication (A5) at the same time.

---

### A2: scanStaleDays / checkDrift (D13)

**Summary:** Clean deletion is **SAFE**.

#### scanStaleDays — DEAD CODE

| Location | Status |
|----------|--------|
| `.ana/ana.json` (line 15) | Legacy runtime data |
| `tests/commands/init.test.ts` (line 172) | Test asserting it's NOT written |
| TypeScript types | Not defined |
| `createAnaJson()` | Not written |

The test explicitly confirms: `expect(keys).not.toContain('scanStaleDays')`.

#### checkDrift() — ISOLATED, REMOVABLE

- **Defined:** `src/commands/scan.ts` lines 418-449
- **Called:** `src/commands/scan.ts` line 552 (only when `ana scan --save`)
- **Exported:** `src/commands/scan.ts` line 567
- **Imported:** Nowhere — zero external consumers
- **What it does:** Reads ana.json, compares language/framework/packageManager/commands. Warns to stderr if mismatch.

#### lastScanAt — KEEP (actively used)

- Written: `init.ts:1243`, `scan.ts:544`
- Read: `check.ts:952` (stale setup detection)
- Tested: `check-dashboard.test.ts:363,374,384`

#### Deletion Checklist

| Action | File | Lines |
|--------|------|-------|
| Remove `checkDrift()` definition | `src/commands/scan.ts` | 413-449 |
| Remove `checkDrift()` call | `src/commands/scan.ts` | 552 |
| Remove `checkDrift` from export | `src/commands/scan.ts` | 567 |
| Keep `lastScanAt` | init.ts, scan.ts, check.ts | unchanged |

**Result:** ~40 lines deleted, zero breaking changes.

---

### A3: Setup agent write behavior — replace vs append (E5/PT9)

**Summary:** Current prompt says **REPLACE**. Re-runs will destroy manually-added rules.

#### Current Instructions

**`templates/.claude/agents/ana-setup.md` lines 481-495:**

> 1. Read the current file content
> 2. Find the `## Rules` section
> 3. **Replace** the content between `## Rules` and the next `##` heading with the confirmed rules
> 4. Preserve ALL other sections exactly as they are
> 5. Write the full file back

Line 495 says "When **appending** (user adds unsolicited rules to an existing set): add to the current `## Rules` content." — but this only covers mid-session appends, NOT re-runs.

#### The Problem

- **First run:** Empty Rules → replaced with proposed rules. Works fine.
- **Re-run:** Existing Rules (including manual additions) → replaced entirely. Manual rules LOST.

#### No Code-Level Mechanism

- `replaceDetectedSection()` exists for `## Detected` (preserves human sections) at `init.ts:1016-1031`
- **No equivalent exists for `## Rules`** — purely agent-driven via prompt

#### Minimal Fix

Replace lines 481-495 with instructions that check whether Rules already has content:

```markdown
When writing to a skill file (`.claude/skills/{skill}/SKILL.md`):

1. Read the current file content
2. Find the `## Rules` section
3. IF Rules section is empty or contains only HTML comment placeholders:
   Replace it with the confirmed rules
4. IF Rules section already contains rules from a prior setup:
   Append new confirmed rules to the end (do not duplicate existing rules)
5. Preserve ALL other sections exactly as they are
6. Write the full file back
```

---

### A4: initialPrompt visibility (PE4)

**Summary:** Both agents' initialPrompt fields duplicate file-read instructions that already exist in body text.

#### ana.md

**Current initialPrompt (line 6):**
> "Silently read .ana/context/design-principles.md and .ana/context/project-context.md if they exist. If ana.json exists and setupMode is 'not_started', show one notice: 'i Setup hasn't run yet...'"

**Body text (lines 47-57)** already instructs:
- Read `.ana/scan.json`
- Read `.ana/PROOF_CHAIN.md`
- Read `project-context.md` and `design-principles.md` in full

**Redundancy:** The two context file reads are stated in BOTH places. Body adds scan.json + PROOF_CHAIN.md which initialPrompt misses.

**Proposed new initialPrompt for ana.md:**
> "If ana.json exists and setupMode is 'not_started', show one notice: 'i Setup hasn't run yet. Ana is working from scan data only. For better results: claude --agent ana-setup (~10 min)'"

Move all file-read instructions to body text only (already there at lines 47-57).

#### ana-plan.md

**Current initialPrompt (line 6):**
> "Silently read .ana/context/design-principles.md and .ana/context/project-context.md if they exist."

**Body text (lines 32-48)** already has identical + expanded instructions.

**No D9.2 setup warning** in ana-plan.md at all.

**Proposed new initialPrompt for ana-plan.md:**
> "Begin by reading context files as described in On Startup below."

Or remove entirely and rely on body text.

---

### A5: Display name map duplication (PE2-15)

**Summary:** Complete duplication across two files. scan.ts exports are test-only dead code.

#### Duplication Map

| Item | analyze.ts | scan.ts | Status |
|------|-----------|---------|--------|
| LANGUAGE_DISPLAY_NAMES | Lines 32-42 | Lines 31-41 | 100% duplicate |
| FRAMEWORK_DISPLAY_NAMES | Lines 44-52 | Lines 43-51 | 100% duplicate |
| PATTERN_DISPLAY_NAMES | Lines 54-59 | Lines 53-58 | 100% duplicate |
| `displayName()` helper | Lines 61-63 | N/A | Internal only |
| `getLanguageDisplayName()` | N/A | Lines 65-67 | Test-only export |
| `getFrameworkDisplayName()` | N/A | Lines 74-76 | Test-only export |
| `getPatternDisplayName()` | N/A | Lines 83-85 | Test-only export |

#### Consumer Analysis

- **analyze.ts** uses internal `displayName()` at lines 437, 440, 444, 447, 450 during stack enrichment
- **scan.ts** exports three `getXxxDisplayName()` functions (line 565) but never calls them internally
- Only consumer: `tests/commands/scan.test.ts` lines 14-18, 1096-1120

#### Recommendation

Create `src/utils/displayNames.ts` as single source of truth:
- Move all three maps + three getter functions there
- `analyze.ts`: import and use
- `scan.ts`: re-export for test backward compatibility
- 3 files impacted

---

## PART B — Implementation Details

---

### B1: Re-init context preservation (D3 — S18-1)

#### Current Backup/Restore Mechanism

**Backup (init.ts lines 331-338):**
```typescript
const statePath = path.join(anaPath, 'state');
if (await dirExists(statePath)) {
  const timestamp = Date.now();
  stateBackup = path.join(os.tmpdir(), `.ana-state-backup-${timestamp}`);
  console.log(chalk.gray('Backing up state/ directory...'));
  await fs.cp(statePath, stateBackup, { recursive: true });
}
```

**Deletion (line 342):**
```typescript
await fs.rm(anaPath, { recursive: true, force: true });
```

**Restore (lines 206-213):**
```typescript
if (preflight.stateBackup) {
  const stateDir = path.join(tmpAnaPath, 'state');
  await fs.rm(stateDir, { recursive: true, force: true });
  await fs.rename(preflight.stateBackup, stateDir);
}
```

**Ana.json creation (lines 1218-1250):** `createAnaJson()` builds config with `anaVersion`, `lastScanAt`, etc.

#### What to Add

1. **Lines 331-338:** Add backup of `.ana/context/` and `.ana/ana.json` alongside state/
2. **Lines 206-213:** Add restore of context/ and ana.json after state restore
3. **After line 1247:** Merge restored ana.json fields, overwriting ONLY mechanical fields

**Mechanical fields to overwrite after restore:**
- `anaVersion` (current CLI version)
- `lastScanAt` (current scan timestamp)

---

### B2: Agent template text fixes (D10 — S18-2,3,4,6)

#### ana.md

- **Line 355** ("/design-principles" invocation): Correct as-is. No change needed.
- **Line 369** ("7 files"): `**Context files:** .ana/context/*.md (7 files, generated by setup, verified against code)` — verify actual count matches; update if different.

#### ana-plan.md

- **Line 68** ("Invoke /design-principles"): Correct as-is.
- **Line 506** ("Don't invoke testing-standards"): **REMOVE this line.** The restriction doesn't apply to AnaPlan — it's for Build/Verify only.
- **Line 530** ("/design-principles (always)"): Correct as-is.

#### ana-build.md, ana-verify.md, ana-setup.md

Confirmed: No changes needed in any of these.

---

### B3: Delete quality-gate.sh and subagent-verify.sh (D4, D5)

#### Current Hook Config (`templates/.claude/settings.json`)

```json
{
  "hooks": {
    "PostToolUse": [
      { "matcher": "Write|Edit|MultiEdit", "hooks": [
        { "type": "command", "command": "...verify-context-file.sh", "timeout": 30 }
      ]}
    ],
    "Stop": [
      { "hooks": [
        { "type": "command", "command": "...quality-gate.sh", "timeout": 120 }
      ]}
    ]
  }
}
```

#### Changes Required

| Action | File | Lines |
|--------|------|-------|
| Delete entire Stop hook section | `templates/.claude/settings.json` | 15-24 |
| Remove from hook array | `src/commands/init.ts` | 709 |
| Update success message "4 files" → "2 files" | `src/commands/init.ts` | 722 |
| Delete file | `templates/.ana/hooks/quality-gate.sh` | — |
| Delete file | `templates/.ana/hooks/subagent-verify.sh` | — |

**`.ana/.gitignore`:** Already clean (`state/` only). No changes needed.

---

### B4: Version dynamic read (D10/B4 — S18-7)

#### index.ts (line 32)

**Before:**
```typescript
.version('0.1.0', '-v, --version', 'Display version number');
```

**After:**
```typescript
.version(pkg.version, '-v, --version', 'Display version number');
```
With import: `import pkg from '../package.json' assert { type: 'json' };` (or ESM equivalent)

**Current package.json version:** `0.2.0` — mismatch with hardcoded `0.1.0`.

#### engine/index.ts (line 117)

```typescript
const VERSION = '0.1.0';  // Used at line 214 in analyze() result
```

This is internal engine metadata. Should be updated or derived from package.json. In D5 scope.

---

### B5: Tier 2 one-line bug fixes (D11 — S18-8 through S18-12)

#### 1. confirm() non-TTY (PB2-12) — `init.ts:98`

**Before:**
```typescript
if (!process.stdin.isTTY) {
  return true;
}
```

**After:**
```typescript
if (!process.stdin.isTTY) {
  return defaultYes;
}
```

#### 2. PhaseStatus skipped (PB2-5) — `check.ts:589-592`

**Before:**
```typescript
export interface PhaseStatus {
  completed: boolean;
  timestamp?: string;
}
```

**After:**
```typescript
export interface PhaseStatus {
  completed: boolean;
  skipped?: boolean;
  timestamp?: string;
}
```

#### 3. analyzeProject() default depth (PB3) — `analyze.ts:382-385`

**Already has default:** `options: { depth: 'surface' | 'deep' } = { depth: 'surface' }`

**No change needed.**

#### 4. Indentation injector (PB2-22) — `init.ts:942`

Line generates: `- Indentation: tabs, 2 spaces` (contradictory when style is tabs).

The `replaceDetectedSection()` function at lines 1016-1031 handles insertion. Verify the template placeholder preservation is correct.

#### 5. AI SDK detection gap (PB2-11) — `dependencies.ts:120-128`

**Before:**
```typescript
const AI_SDK_PACKAGES: Array<[string, string]> = [
  ['@anthropic-ai/sdk', 'Anthropic'],
  ['openai', 'OpenAI'],
  ['@ai-sdk/core', 'Vercel AI'],
  ['ai', 'Vercel AI'],
  ['@google/generative-ai', 'Google AI'],
  ['langchain', 'LangChain'],
  ['@langchain/core', 'LangChain'],
];
```

**After (add):**
```typescript
  ['mistralai', 'Mistral AI'],
  ['replicate', 'Replicate'],
  ['@huggingface/inference', 'Hugging Face'],
```

---

### B6: Template text fixes — B1, B2, B3 locked items (D12)

#### git-workflow/SKILL.md (line 16)

**Before:**
```
- Squash merge feature branches to the default branch.
```

**After:**
```
- Squash merge feature branches to preserve atomic commits and simplify blame/bisect history. Never force-push to main/master.
```

#### deployment/SKILL.md (line 14 + insert)

**Before:**
```
- Preview deploys on pull requests when the platform supports it.
```

**After:**
```
- Preview deploys on pull requests when the platform supports it. Ensure preview URLs are temporary and revoked after merge.
- Agents never perform irreversible external actions (deletions, production migrations, DNS changes) without explicit human approval and confirmation.
```

---

### B7: Fresh init Detected refresh (D8 — S18-17)

#### Current Code (`init.ts` lines 883-885)

```typescript
} else if (existingSkill) {
  // Fresh/corrupted but file exists (from prior .claude/ that wasn't deleted) — skip
  continue;
```

#### Proposed Change

```typescript
} else if (existingSkill) {
  // Fresh/corrupted but file exists — refresh Detected section only
  content = await fs.readFile(destPath, 'utf-8');
  if (engineResult) {
    const injector = SKILL_INJECTORS[skillName];
    if (injector) {
      const detectedContent = injector(engineResult);
      content = replaceDetectedSection(content, detectedContent);
    }
  }
  await fs.writeFile(destPath, content, 'utf-8');
  continue;
}
```

**`replaceDetectedSection()`** is at `init.ts:1016-1031` — replaces `## Detected` to next `##`, preserving all human sections.

---

### B8: Richer project-context Detected line (D9 — S18-18)

#### Current Location

`packages/cli/src/utils/scaffold-generators.ts`, function `generateProjectContextScaffold()` lines 26-85.

Section 1 builds Detected lines for stack, external services, and commands (lines 32-46).

#### Fields Available in EngineResult

- `result.commands.packageManager` (line 53 of engineResult.ts)
- `result.monorepo.isMonorepo` (line 66)
- `result.stack.aiSdk` (line 38)

#### Proposed Addition (after line 46)

```typescript
const infoParts: string[] = [];
if (result.commands.packageManager) infoParts.push(`${result.commands.packageManager}`);
if (result.stack.aiSdk) infoParts.push(`${result.stack.aiSdk} SDK`);
if (result.monorepo.isMonorepo) {
  const tool = result.monorepo.tool || 'monorepo';
  infoParts.push(`${tool} (${result.monorepo.packages.length} packages)`);
}
if (infoParts.length > 0) {
  s += `**Detected infrastructure:** ${infoParts.join(' · ')}\n`;
}
```

---

### B9: Mode file removal inventory (D1)

#### Files to Delete (7 + directory)

```
packages/cli/templates/modes/architect.md
packages/cli/templates/modes/code.md
packages/cli/templates/modes/debug.md
packages/cli/templates/modes/docs.md
packages/cli/templates/modes/test.md
packages/cli/templates/modes/general.md
packages/cli/src/commands/mode.ts
packages/cli/templates/modes/           (directory)
```

#### Source Code References to Remove

| File | Lines | What |
|------|-------|------|
| `src/index.ts` | 17 | `import { modeCommand } from './commands/mode.js'` |
| `src/index.ts` | 36 | `program.addCommand(modeCommand)` |
| `src/constants.ts` | 88-96 | `MODE_FILES` constant (entire block) |
| `src/commands/init.ts` | 63 | `MODE_FILES` from import |
| `src/commands/init.ts` | 640-645 | Mode file copy loop |
| `src/commands/init.ts` | 537 | `- modes/` from JSDoc |
| `src/commands/init.ts` | 551 | `mkdir modes` in createDirectoryStructure() |
| `src/commands/init.ts` | 8 | Comment referencing mode files |

#### Test Files to Update

| File | Lines | What |
|------|-------|------|
| `tests/commands/init.test.ts` | 42, 48-49, 68-74 | Remove mode dir creation + file expectations |
| `tests/e2e/init-flow.test.ts` | 6, 42, 51, 76-86 | Remove modes from dirs/files arrays |
| `tests/templates/cross-platform.test.ts` | 24 | Remove modes path assertion |

---

### B10: Dead code sweep inventory verification (D5)

#### Confirmed Safe to Delete

| Item | Location | Callers |
|------|----------|---------|
| `detectFromPackageJson()` | `engine/detectors/dependencies.ts:204` | 0 |
| `getSubdirectories()` | `engine/utils/directory.ts:81` | 0 |
| `storeSnapshot()` | `commands/init.ts:1261` | 1 internal only (can privatize) |

#### Not Dead (Keep)

| Item | Location | Why |
|------|----------|-----|
| `VERSION` in engine/index.ts | Line 117 | Used at line 214 in result payload |
| `engine/parsers/index.ts` barrel | — | Consumed by engine/index.ts + tests |
| `engine/detectors/index.ts` barrel | — | Consumed by tests |

#### Not Found

| Item | Status |
|------|--------|
| `DEFAULT_SCAN_STALE_DAYS` | Does not exist in codebase |
| `utils/index.ts` barrel | Does not exist |
| `commands/index.ts` barrel | Does not exist |

#### check_result_skill writes (verify-context-file.sh)

Lines 50, 78 write `check_result_skill_*` and `check_result_*` files to disk. No code reads these. They appear to be orphaned side-effect outputs. **Safe to remove the write logic.**

---

### B11: SSOT violations + hardcoded display count (D14 + PE2-14)

#### 1. ALL_CONTEXT_FILES (`check.ts:43-46`)

**Before:**
```typescript
const ALL_CONTEXT_FILES = [
  'project-context.md',
  'design-principles.md',
];
```

**After:**
```typescript
import { CONTEXT_FILES } from '../constants.js';
const ALL_CONTEXT_FILES = CONTEXT_FILES.map(f => `${f}.md`);
```

Note: constants.ts has `CONTEXT_FILES = ['design-principles', 'project-context']` (no `.md` suffix, different order).

#### 2. coreSkills (`init.ts:1402`)

**Before:**
```typescript
const coreSkills = ['coding-standards', 'testing-standards', 'git-workflow', 'deployment', 'troubleshooting'];
```

**After:**
```typescript
// Add CORE_SKILLS to existing import from '../constants.js'
const coreSkills = CORE_SKILLS as string[];
```

#### 3. Context count (`init.ts:1396`)

**Before:**
```typescript
console.log(chalk.green('✓ Context → .ana/context/ (2 files)'));
```

**After:**
```typescript
console.log(chalk.green(`✓ Context → .ana/context/ (${CONTEXT_FILES.length} files)`));
```

---

### B12: Orchestrator grep bugs (D15 — PB5, PB6)

#### PB5: Test files not excluded (ana-setup.md line 70)

**Before:**
```
| Always | Find one source file that contains error handling (try/catch, .catch, or throw). Use evidence from `patterns.errorHandling` in scan.json if available. | Understand error handling for coding-standards |
```

**After:**
```
| Always | Find one source file that contains error handling (try/catch, .catch, or throw). Use evidence from `patterns.errorHandling` in scan.json if available. When searching, exclude test files with --glob '!**/*.test.*' and --glob '!**/*.spec.*' | Understand error handling for coding-standards |
```

#### PB6: node_modules not excluded (ana-setup.md line 72)

**Before:**
```
| `stack.aiSdk` is non-null in scan.json | Search for a file that imports the AI SDK package, read the first match | Understand AI integration for ai-patterns |
```

**After:**
```
| `stack.aiSdk` is non-null in scan.json | Search for a file that imports the AI SDK package, read the first match. When searching, exclude node_modules with --glob '!node_modules/**' to find source code only, not dependencies | Understand AI integration for ai-patterns |
```

---

### B13: Docs quick accuracy pass (D7)

#### CONTRIBUTING.md (root) — 3 issues

1. **Lines 23-24:** Uses `npm link` but project uses pnpm
2. **Lines 80-81:** References `.hbs templates` — no .hbs files exist
3. **Line 129:** Path `docs/TEMPLATE_GUIDE.md` is relative from root, but file is at `packages/cli/docs/`

#### CONTRIBUTING.md (cli/) — 4 issues

1. **Lines 35-46:** Project structure diagram wrong — claims `.hbs` files, wrong counts
2. **Lines 37-38:** Only shows 2 commands (init.ts, mode.ts) — actual: 12 commands
3. **Lines 39-41:** Claims `template-loader.ts` exists — it doesn't
4. **Lines 47-50:** Test structure doesn't match actual

#### FILE_TYPES.md — CRITICAL (4 major issues)

1. **Line 3:** Claims "25 total" files — actual is ~9
2. **Lines 18-22:** References non-existent `templates/context/setup/` directory
3. **Lines 24-32:** References non-existent `templates/context/setup/steps/` (8 files)
4. **Lines 34-40:** References non-existent `templates/context/setup/framework-snippets/` (6 files)

#### DETECTION_FLOW.md — 2 issues (low severity)

1. **Line 370:** Date "2026-02-24" is 44 days stale
2. **Line 369:** Version "0.1.0" should be "0.2.0"

#### TROUBLESHOOTING.md — 1 issue

1. **Line 4:** Date "2026-02-24" is stale

#### MIGRATION_v0.1_to_v0.2.md — No issues

Accurate.

#### TEMPLATE_GUIDE.md — 4 issues

1. **Line 4:** Date "2026-02-20" is 49 days stale
2. **Lines 47-50, 73-79:** Claims Handlebars templating — no .hbs files exist
3. **Line 112:** References `node.json` — actual name is `ana.json`
4. **Lines 159-160:** References `src/test-templates.ts` — doesn't exist

#### CHANGELOG.md — 3 issues

1. **Lines 3 + 56:** Two `[Unreleased]` sections (S11 and S7)
2. **Line 68:** Version "0.2.0" date "2026-03-31" — may need update
3. Missing sprints S3-S6 between old work and S7

---

### B14: Lint warnings (S18-28)

**Total: 15 warnings, 0 errors. All `@typescript-eslint/no-explicit-any`. None auto-fixable.**

| File | Count | Lines |
|------|-------|-------|
| `src/engine/analyzers/conventions/index.ts` | 1 | 108:63 |
| `src/engine/analyzers/conventions/typeHints.ts` | 3 | 51:36, 52:36, 52:62 |
| `src/engine/analyzers/patterns.ts` | 6 | 630:59, 631:53, 632:49, 633:41, 634:47, 981:46 |
| `src/engine/parsers/treeSitter.ts` | 5 | 171:10, 722:15, 734:13, 833:48, 973:24 |

Heaviest: `patterns.ts` (6, with 5 clustered on lines 630-634) and `treeSitter.ts` (5). All require manual type narrowing — replace `any` with `unknown` or specific types.

---

## PART C — Follow-Up Corrections

---

### C1: Agent template /design-principles lines — CORRECTED

**Original B2 finding was WRONG.** I said "correct as-is, no change needed." These lines invoke `/design-principles` as a skill, but `design-principles` is a context file (`.ana/context/design-principles.md`), not a registered skill. The Skill() tool call will fail.

#### ana.md — ALL references

**Line 6 (initialPrompt):** `"Silently read .ana/context/design-principles.md and .ana/context/project-context.md if they exist..."`
- Status: CORRECT — references as context file, not skill invocation.

**Line 55:** `- .ana/context/design-principles.md — team philosophy and design values`
- Status: CORRECT — references as context file.

**Line 355:**
```
- Always invoke `/design-principles` before scoping. Design principles are your thinking framework, not architectural review. They inform how you assess tradeoffs, what to surface, and whether a feature is appropriately scoped — regardless of size. Other skills (coding-standards, testing-standards, etc.) are for Plan, Build, and Verify agents.
```
- Status: **BUG — invokes `/design-principles` as a skill.** Will cause failed Skill() call.
- **Before:**
  ```
  - Always invoke `/design-principles` before scoping. Design principles are your thinking framework, not architectural review. They inform how you assess tradeoffs, what to surface, and whether a feature is appropriately scoped — regardless of size. Other skills (coding-standards, testing-standards, etc.) are for Plan, Build, and Verify agents.
  ```
- **After:**
  ```
  - Always read `.ana/context/design-principles.md` before scoping. Design principles are your thinking framework, not architectural review. They inform how you assess tradeoffs, what to surface, and whether a feature is appropriately scoped — regardless of size. Other skills (coding-standards, testing-standards, etc.) are for Plan, Build, and Verify agents.
  ```

**Line 369:**
```
**Context files:** `.ana/context/*.md` (7 files, generated by setup, verified against code)
```
- Status: **STALE count.** The CLAUDE.md template at `packages/cli/templates/CLAUDE.md` says "2 context files". The "7 files" claim comes from the root project's CLAUDE.md (which references enriched setup output), but the template should not hardcode 7.
- **Before:** `**Context files:** .ana/context/*.md (7 files, generated by setup, verified against code)`
- **After:** `**Context files:** .ana/context/*.md (generated by scan, enriched by setup)`

#### ana-plan.md — ALL references

**Line 6 (initialPrompt):** `"Silently read .ana/context/design-principles.md and .ana/context/project-context.md if they exist."`
- Status: CORRECT — references as context file.

**Line 40:** `- .ana/context/design-principles.md — team philosophy and design values`
- Status: CORRECT — context file reference.

**Line 68:**
```
- Invoke `/design-principles` — always. Design principles inform spec quality at any scope size, not just architectural decisions.
```
- Status: **BUG — invokes `/design-principles` as a skill.**
- **Before:**
  ```
  - Invoke `/design-principles` — always. Design principles inform spec quality at any scope size, not just architectural decisions.
  ```
- **After:**
  ```
  - Read `.ana/context/design-principles.md` — always. Design principles inform spec quality at any scope size, not just architectural decisions.
  ```

**Line 399:** `- {rule from design-principles — e.g., separate data from presentation}`
- Status: CORRECT — example text, not invocation.

**Line 530:**
```
**Skills:** `/coding-standards` (always), `/design-principles` (always)
```
- Status: **BUG — lists `/design-principles` as a skill.**
- **Before:** `**Skills:** /coding-standards (always), /design-principles (always)`
- **After:** `**Skills:** /coding-standards (always) · **Context:** .ana/context/design-principles.md (always)`

---

### C2: analyzeProject() default depth — CORRECTED

**Original B5.3 was WRONG.** I said "no change needed" because a default exists. The vault intent is to change the default FROM `'surface'` TO `'deep'`.

**File:** `packages/cli/src/engine/analyze.ts:384`

**Before:**
```typescript
  options: { depth: 'surface' | 'deep' } = { depth: 'surface' }
```

**After:**
```typescript
  options: { depth: 'surface' | 'deep' } = { depth: 'deep' }
```

This makes `ana scan` (which calls `analyzeProject()` without explicit depth) default to deep analysis including tree-sitter patterns/conventions detection.

---

### C3: AI SDK detection — scope corrected

**Original B5.5 was WRONG about which packages to add.** The actual issue (PB2-11) is that `@ai-sdk/anthropic` and other Vercel AI provider packages are in `AI_PACKAGES` (services detection) but NOT in `AI_SDK_PACKAGES` (skill trigger detection).

#### AI_PACKAGES (lines 72-82) — services detection:
```typescript
export const AI_PACKAGES: Record<string, string> = {
  '@anthropic-ai/sdk': 'Anthropic',
  'openai': 'OpenAI',
  '@google/generative-ai': 'Google AI',
  'ai': 'Vercel AI SDK',
  '@ai-sdk/anthropic': 'Vercel AI (Anthropic)',   // <-- HERE
  '@ai-sdk/openai': 'Vercel AI (OpenAI)',          // <-- HERE
  '@ai-sdk/google': 'Vercel AI (Google)',           // <-- HERE
  'ollama': 'Ollama',
  'replicate': 'Replicate',
};
```

#### AI_SDK_PACKAGES (lines 120-128) — skill trigger detection:
```typescript
const AI_SDK_PACKAGES: Array<[string, string]> = [
  ['@anthropic-ai/sdk', 'Anthropic'],
  ['openai', 'OpenAI'],
  ['@ai-sdk/core', 'Vercel AI'],
  ['ai', 'Vercel AI'],
  ['@google/generative-ai', 'Google AI'],
  ['langchain', 'LangChain'],
  ['@langchain/core', 'LangChain'],
];
```

**Gap:** `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/google` are in AI_PACKAGES but NOT in AI_SDK_PACKAGES. A project using `@ai-sdk/anthropic` (Vercel AI SDK with Anthropic provider) gets the service detected but does NOT get the `ai-patterns` skill scaffolded.

**Fix — add to AI_SDK_PACKAGES (after line 127):**
```typescript
  ['@ai-sdk/anthropic', 'Vercel AI'],
  ['@ai-sdk/openai', 'Vercel AI'],
  ['@ai-sdk/google', 'Vercel AI'],
  ['@ai-sdk/mistral', 'Vercel AI'],
```

---

### C4: Template text fixes — corrected to match vault intent

**Original B6 was WRONG — did not match locked decisions.**

#### git-workflow/SKILL.md line 16

**Before:**
```
- Squash merge feature branches to the default branch.
```

**After (NEUTRAL — no opinion on merge strategy per B1 LOCKED):**
```
- Merge feature branches to the default branch. Confirm merge strategy with your team.
```

#### deployment/SKILL.md lines 14-15

**Before:**
```
- Environment variables via platform config or `.env` files — never hardcode secrets or config values.
- Preview deploys on pull requests when the platform supports it.
- Production deploys only from the default branch.
```

**After (REMOVE preview deploys per B2 LOCKED, ADD agent constraint per B3 LOCKED):**
```
- Environment variables via platform config or `.env` files — never hardcode secrets or config values.
- Production deploys only from the default branch.
- Agents never perform irreversible external actions (deploy to production, publish packages, send to real users, modify infrastructure) without explicit human approval.
```

---

### C5: Dead code barrel discrepancies — CORRECTED

**Original B10 was WRONG about barrel file consumers.** The subagent claimed they had consumers. Direct grep shows:

| Barrel | `from.*engine/detectors/index` | `from.*engine/detectors'` | Result |
|--------|------|------|--------|
| `engine/detectors/index.ts` | 0 hits in src/ | 0 hits in src/ | **ZERO consumers** |
| `engine/detectors/index.ts` | 0 hits in tests/ | 0 hits in tests/ | **ZERO consumers** |
| `engine/parsers/index.ts` | 0 hits in src/ | 0 hits in src/ | **ZERO consumers** |
| `engine/parsers/index.ts` | 0 hits in tests/ | 0 hits in tests/ | **ZERO consumers** |

**Both barrel files are dead. Safe to delete.**

#### storeSnapshot — confirmed internal-only

Two hits in `src/commands/init.ts`:
- Line 202: `await storeSnapshot(tmpAnaPath, engineResult);` (call)
- Line 1261: `async function storeSnapshot(` (definition)

Zero external consumers. Internal-only. Can be kept as private function or deleted if the call site is removed.

---

### C6: engine/index.ts VERSION constant — clarified

**File:** `packages/cli/src/engine/index.ts`

**Line 117:** `const VERSION = '0.1.0';`

**Line 214:** `version: VERSION` — used in the `analyze()` function's result payload (the `AnalysisResult` intermediate object).

**Who calls `analyze()`?** Only test files:
- `tests/engine/integration/structure-analysis.test.ts:7`
- `tests/engine/integration/wasm-smoke.test.ts:2`
- `tests/engine/performance/parsing-performance.test.ts:3`
- `tests/engine/integration/parsed-integration.test.ts:13`
- `tests/engine/analyzers/patterns/integration.test.ts:2`

Zero production callers — `analyze()` is consumed only by `analyzeProject()` internally (which wraps it) and these test files.

**Verdict:** VERSION is test-infrastructure code. Two options:
1. Update to read from package.json (consistent with B4 fix)
2. Remove entirely if `analyze()` is going away in D5

Since `analyze()` has 5 test consumers, it's not going away in S18. Update VERSION to read from package.json alongside the B4 fix.

---

### C7: Indentation injector — complete fix

**File:** `packages/cli/src/commands/init.ts:942`

**Current line:**
```typescript
      lines.push(`- Indentation: ${result.conventions.indentation.style}, ${result.conventions.indentation.width} spaces`);
```

**Bug:** When `style` is `'tabs'`, this produces `- Indentation: tabs, 4 spaces` which is contradictory. Width is irrelevant for tabs.

**Before:**
```typescript
      lines.push(`- Indentation: ${result.conventions.indentation.style}, ${result.conventions.indentation.width} spaces`);
```

**After:**
```typescript
      const indent = result.conventions.indentation;
      lines.push(`- Indentation: ${indent.style === 'tabs' ? 'tabs' : `${indent.style}, ${indent.width} wide`}`);
```
