# Decision 7 Investigation — Init Flow

**Date:** 2026-04-06
**Verified against:** source code on main (commit bd8f609)

---

## Part 1: Directory Structure (7.1)

### Current State

**.ana/ creates 9 directories:**
```
.ana/
  modes/                   (10 mode files — architect, code, debug, docs, test, general, setup, setup-quick, setup-guided)
  context/                 (7 scaffold context files)
  context/setup/           (SETUP_GUIDE.md, templates.md, rules.md)
  context/setup/steps/     (8 step files 00-07)
  context/setup/framework-snippets/  (6 framework snippets)
  docs/                    (SCHEMAS.md)
  plans/active/            (.gitkeep)
  plans/completed/         (.gitkeep)
  state/                   (snapshot.json, symbol-index.json, cli-path, cache/)
```

Root-level files in `.ana/`: `ana.json`, `scan.json`, `.gitignore`, `PROOF_CHAIN.md`

**.claude/ creates 3 directories:**
```
.claude/
  agents/    (9 agent files)
  skills/    (6 skill directories, each with SKILL.md)
  settings.json
```

### Delta to Match D6

| Change | Current | D6 Required |
|--------|---------|-------------|
| Context files | 7 files (project-overview, architecture, patterns, conventions, testing, workflow, debugging) | **2 files** (design-principles, project-context) |
| design-principles | In `.claude/skills/design-principles/SKILL.md` | **MOVE** to `.ana/context/design-principles.md` |
| project-context | Doesn't exist | **NEW** — consolidates project-overview + architecture |
| 5 old context files | patterns, conventions, testing, workflow, debugging | **REMOVE** as standalone files — content migrates to skills |
| Setup directory | Kept (step files, framework snippets, guides) | **Keep** — setup still uses these |
| Modes directory | 9 mode files | **TBD** — modes may be reduced. Keep for now. |
| troubleshooting skill | Doesn't exist | **NEW** — stub in `.claude/skills/troubleshooting/SKILL.md` |
| ai-patterns skill | Doesn't exist | **NEW** — conditional, scaffolded if `stack.aiSdk` detected |
| api-patterns skill | Doesn't exist | **NEW** — conditional, scaffolded if web framework detected |
| data-access skill | Doesn't exist | **NEW** — conditional, scaffolded if `stack.database` detected |
| logging-standards skill | Exists (34 lines) | **REMOVE** — folded into coding-standards per D6 |

### Implementation Recommendation

The directory structure change is mostly subtractive (remove 5 context files, remove logging-standards) + additive (add 3 conditional skills, add troubleshooting stub, add project-context, move design-principles). The `createDirectoryStructure()` function at init.ts:380 only creates directories — file creation is handled by later phases. No structural changes needed to the directory creator itself.

**Effort:** 1-2 hours. Mechanical — update the file lists, add conditional skill directories.

---

## Part 2: scan.json + ana.json Creation (7.2)

### Current State — scan.json

`saveScanJson()` at init.ts:1022 writes the FULL EngineResult to `.ana/scan.json` as-is. No validation. No schema check. Just `JSON.stringify(result)`.

If the engine fails mid-scan, the try/catch in `runAnalyzer()` at init.ts:320 catches it and returns null. When engineResult is null, `saveScanJson()` returns early — no scan.json written. Context files get empty scaffolds. This is the graceful degradation path.

### Current State — ana.json

`createAnaJson()` at init.ts:1044 extracts these fields:

```typescript
const anaConfig = {
  name: result.overview.project,           // from scan
  framework: result.stack.framework,       // from scan
  language: result.stack.language,         // from scan
  packageManager: result.commands.packageManager,  // from scan
  commands: {
    build: result.commands.build || null,   // from scan
    test: result.commands.test || null,     // from scan — NO non-interactive flag logic
    lint: result.commands.lint || null,     // from scan
    dev: result.commands.dev || null,       // from scan
  },
  coAuthor: 'Ana <build@anatomia.dev>',    // hardcoded default
  artifactBranch: result.git?.branch || 'main',  // WRONG — uses current branch, not default branch
  setupMode: 'not_started',               // hardcoded
  scanStaleDays: 7,                        // REMOVED in D1
};
```

### Delta to Match D1

| Field | Current | D1 Required | Action |
|-------|---------|-------------|--------|
| `anaVersion` | Missing | CLI package version | **ADD** — read from package.json |
| `lastScanAt` | Missing | `overview.scannedAt` | **ADD** |
| `scanStaleDays` | `7` | Removed (policy in constants) | **REMOVE** |
| `artifactBranch` | `git.branch \|\| 'main'` | 4-step priority: symbolic-ref → remote show → common names → current | **FIX** — requires git.defaultBranch from D2 |
| `commands.test` | Raw from scan | Must be non-interactive (e.g., append `-- --run` for Vitest) | **ADD** — helper function |
| `setupCompletedAt` | Missing | `null` (set by setup complete) | **ADD** |

### Implementation Recommendation

**anaVersion:** Read from CLI package.json (same logic as existing `getCliVersion()` at init.ts:460). One line.

**lastScanAt:** `result.overview.scannedAt`. One line.

**artifactBranch:** Requires `git.defaultBranch` to exist in EngineResult first (D2 change). Then: `result.git.defaultBranch || 'main'`. The 4-step detection priority lives in `git.ts`, not init.ts.

**Non-interactive test command:** New helper function:
```typescript
function ensureNonInteractive(testCmd: string | null, testFramework: string | null): string | null {
  if (!testCmd) return null;
  if (testFramework === 'Vitest' && !testCmd.includes('--run')) {
    return `${testCmd} -- --run`;
  }
  // Jest: no change (watch requires explicit --watch)
  // Mocha, pytest, Playwright: no change (non-interactive by default)
  return testCmd;
}
```

**Effort:** Half day. Mostly mechanical extraction changes + the non-interactive helper.

**Dependencies:** `git.defaultBranch` must be added to EngineResult and `git.ts` first.

---

## Part 3: Skill Scaffolding (7.3) — THE BIG ONE

### Current Scaffolding Mechanism

**Two-phase system:**
1. **Template copying** (`copySkillFiles()`) — copies 6 template SKILL.md files from `packages/cli/templates/.claude/skills/` to `.claude/skills/`. These are static markdown templates with HTML comment placeholders (`<!-- Your language, version, module system -->`) and empty sections.
2. **Seed injection** (`seedSkillFiles()` at init.ts:779) — programmatically builds `## Detected` content from EngineResult and injects it into the copied template files. Per-skill custom logic constructs bullet-point lines.

**Key details:**
- Templates are COPIED as-is. No variable substitution. No template engine.
- `## Detected` is injected AFTER the frontmatter (finds second `---`, inserts after).
- Merge-not-overwrite: if the skill file already exists (reinit), it's NOT overwritten.
- If `## Detected` already exists in the file, seeding is SKIPPED (prevents duplicate on reinit).
- testing-standards has a special case: replaces a commented `## Commands` section with real commands from scan.

**Current `## Detected` format:** Bullet-point structured. Already matches D6.5 closely:
```markdown
## Detected
- Language: TypeScript with Next.js
- Functions: camelCase (83% confidence)
- Files: PascalCase
- Imports: relative
- Indentation: 2 spaces
```

### Current Skill Templates (in templates/)

All 6 templates use the same structure:
- YAML frontmatter (name, description)
- `# Skill Name` heading
- HTML-commented section placeholders (`<!-- Your language, version -->`)
- Some sections have starter content (testing-standards has "Don't invent test infrastructure in specs")

**Descriptions are NOT trigger-formatted.** Current: "Team coding standards." D6.4 requires: "Invoke when implementing features, writing code..."

The live skills in `.claude/skills/` have slightly different descriptions because they were manually refined over 12 sprints. The templates still have the original generic descriptions.

### What Exists vs What D6 Requires

| Feature | Current | D6 Requires |
|---------|---------|-------------|
| Template format | HTML comment placeholders | **Detected / Rules / Gotchas / Examples** sections |
| Descriptions | Generic ("Team coding standards") | **Trigger-formatted** ("Invoke when...") |
| Conditional skills | None — all 6 always scaffolded | **3 conditional** skills gated on scan detection |
| troubleshooting | Doesn't exist | **Core stub** — section headers only |
| ai-patterns | Doesn't exist | **Conditional** — if stack.aiSdk detected |
| api-patterns | Doesn't exist | **Conditional** — if web framework detected |
| data-access | Doesn't exist | **Conditional** — if stack.database detected |
| logging-standards | Exists (34 lines) | **Remove** — fold into coding-standards |
| design-principles | Exists as skill | **Move** to .ana/context/ |
| Stack-aware Rules | No — one template for all | **Yes** — D6.3: template rules vary by detected stack |
| Gotchas section | No | **Empty section** — grows over time |
| Examples section | No | **Optional** — starts empty |

### No Conditional Scaffolding Logic Exists

Currently `copySkillFiles()` copies ALL template skills unconditionally. There is NO scan-based gating. To implement conditional skills:

**Where the gate goes:** Between `copySkillFiles()` and `seedSkillFiles()` in `createClaudeConfiguration()` at init.ts:649. Or better: modify `copySkillFiles()` to accept a list of skill names to copy, with the list computed from scan results.

```typescript
// Compute which skills to scaffold
const skillsToScaffold = ['coding-standards', 'testing-standards', 'git-workflow', 'deployment', 'troubleshooting'];
if (engineResult?.stack.aiSdk) skillsToScaffold.push('ai-patterns');
if (engineResult?.stack.framework) skillsToScaffold.push('api-patterns');
if (engineResult?.stack.database) skillsToScaffold.push('data-access');

await copySkillFiles(skillsPath, templatesDir, skillsToScaffold);
```

### Stack-Aware Template Variants

**No stack awareness exists today.** One template per skill, used for all stacks.

**Implementation options for D6.3:**

**Option A: Template files per stack.** `templates/.claude/skills/testing-standards/SKILL.vitest.md`, `SKILL.jest.md`, `SKILL.pytest.md`. Init selects the right file based on `stack.testing`. Clear, easy to review, but file proliferation (5 skills × 3-4 stacks = 15-20 template files).

**Option B: Conditional blocks in a single template.** `SKILL.md` has markers like `{{#if vitest}}...{{/if}}`. Requires a template engine. Current system has NO template engine — it copies files as-is.

**Option C: Programmatic generation.** Instead of template files, a function generates skill content based on scan data. `generateCodingStandards(result: EngineResult): string`. Most flexible, but skill content is buried in TypeScript code, not editable markdown.

**My recommendation: Option A with a hybrid.** For v1, ship one "TypeScript" variant per skill (our primary audience). Store them as plain markdown files in templates. This is exactly how the current system works — just with better content. For v2, add per-stack variants when real demand exists. The template selection logic is trivial:

```typescript
function selectTemplate(skillName: string, stack: EngineResult['stack']): string {
  // Check for stack-specific template
  const stackKey = stack.testing?.toLowerCase() || stack.language?.toLowerCase() || 'generic';
  const specificPath = `${skillName}/SKILL.${stackKey}.md`;
  if (existsSync(specificPath)) return specificPath;
  // Fall back to generic
  return `${skillName}/SKILL.md`;
}
```

### What D6 Requires That Doesn't Exist — Implementation Effort

| New Thing | Effort | Notes |
|-----------|--------|-------|
| troubleshooting template | 30 min | Stub with section headers only. Simplest template. |
| ai-patterns template | 2-3 hours | New content. Prompt management, LLM error handling, streaming, testing non-deterministic output. Needs careful authoring. |
| api-patterns template | 2 hours | Error response format, validation, middleware, endpoints. Based on detected framework. |
| data-access template | 1-2 hours | ORM conventions, migrations, query patterns. Based on detected ORM. |
| Conditional scaffolding logic | 1-2 hours | Gate based on scan results. Straightforward branching. |
| Remove logging-standards | 30 min | Delete template. Fold content into coding-standards. |
| Move design-principles | 1 hour | Copy to context template, remove from skills template, update init logic. |
| Update ALL descriptions to triggers | 1-2 hours | Change "Team coding standards" to "Invoke when implementing features..." across all templates. |
| Add Gotchas + Examples sections | 30 min | Empty sections in all templates. |
| Update Detected format to D6.5 | 1 hour | Already close. Ensure strict key-value format. |

**Total skill scaffolding effort: 2-3 days.**

---

## Part 4: Context File Creation (7.4)

### Current State

Seven programmatic scaffold generators in `packages/cli/src/utils/scaffold-generators.ts`. Each is a function (`generateProjectOverviewScaffold`, `generateArchitectureScaffold`, etc.) that takes EngineResult and returns a markdown string.

Content starts with `<!-- SCAFFOLD -->` marker, includes `## Key Facts` with `**Detected:**` lines populated from scan data, topic-specific sections, and `## Open Questions` with `**Unexamined:**` lines for gaps. Confidence threshold: data below 0.7 is omitted.

### Delta to Match D6

**Massive reduction:** 7 generators → 2.

1. **`generateProjectContextScaffold()`** — NEW. Consolidates project-overview + architecture generators. Outputs the D6.6 format: What This Project Does, Architecture, Key Decisions, Key Files, Active Constraints, (optionally Domain Vocabulary).

2. **`generateDesignPrinciplesScaffold()`** — NEW. Outputs a template/placeholder for design-principles. Content is 100% human-written, so the scaffold is minimal: section headers + "Fill in your team's design philosophy."

Remove: `generatePatternsScaffold`, `generateConventionsScaffold`, `generateWorkflowScaffold`, `generateTestingScaffold`, `generateDebuggingScaffold`. Their content migrates to skill `## Rules` sections.

**Effort:** 1 day. The project-context generator is the most work — it needs to extract meaningful architecture and product understanding from scan data.

---

## Part 5: Agent Definition Templates (7.5)

### Current State

9 agent templates in `packages/cli/templates/.claude/agents/`. Plain markdown with YAML frontmatter. Copied as-is during init (merge-not-overwrite).

**No agent currently has:**
- `skills:` frontmatter (for preloading)
- `initialPrompt:` frontmatter (for auto-reading files)

### Delta to Match D6.10 Routing Table

| Agent | Current Frontmatter | D6 Requires |
|-------|-------------------|-------------|
| ana.md (Think) | `name, model, memory, description` | **ADD** `initialPrompt:` to auto-read design-principles + project-context + scan.json |
| ana-plan.md (Plan) | `name, model, description` | **ADD** `skills: [coding-standards, testing-standards]` + `initialPrompt:` to auto-read project-context + scan.json |
| ana-build.md (Build) | `name, model, description` | **ADD** `skills: [git-workflow]` |
| ana-verify.md (Verify) | `name, model, description` | No changes (invokes skills on-demand via prompt instructions) |
| ana-setup.md | `name, model, description` | No changes (already correct) |

**Effort:** 1-2 hours. Add frontmatter fields to 3 agent templates. Template sync to local copies.

**Risk:** `initialPrompt` is untested. First priority in S13 should be verifying that `initialPrompt: "Read .ana/context/design-principles.md and .ana/context/project-context.md silently."` actually works.

---

## Part 6: My Opinions

### 1. Skill scaffolding approach

**Recommendation: Keep template files, enhance the seed injection.**

The current two-phase system (copy template + inject Detected) is the right architecture. Template files are reviewable markdown — anyone can read them and understand what gets scaffolded. The programmatic injection of `## Detected` from scan data is already working.

What needs to change: the template CONTENT. Current templates have HTML comment placeholders that mean nothing to agents. Replace with D6.4 format: `## Detected` (empty — filled by seeder), `## Rules` (prescribed per stack), `## Gotchas` (empty), `## Examples` (empty or optional).

Don't add a template engine. The complexity isn't worth it. Plain markdown files with programmatic Detected injection is maintainable and clear.

### 2. Template variant strategy for v1

**Ship one "TypeScript" variant set.** Our primary audience is YC founders building AI products with TypeScript + Next.js. Get this right. Python, Go, etc. can come when there's demand. The template selection function is trivial to add later — the architecture supports it without redesign.

### 3. Conditional skill gating

**In a dedicated function called from `createClaudeConfiguration()`.** Something like:

```typescript
function computeSkillManifest(result: EngineResult): string[] {
  const skills = ['coding-standards', 'testing-standards', 'git-workflow', 'deployment', 'troubleshooting'];
  if (result.stack.aiSdk) skills.push('ai-patterns');
  if (result.stack.framework) skills.push('api-patterns');
  if (result.stack.database) skills.push('data-access');
  return skills;
}
```

Called once, passed to both `copySkillFiles()` and `seedSkillFiles()`. Clean separation — the manifest decision is in one place.

### 4. design-principles migration

**Content stays exactly the same.** The file moves from `.claude/skills/design-principles/SKILL.md` to `.ana/context/design-principles.md`. The SKILL.md frontmatter (name, description) gets stripped since context files don't have frontmatter. The markdown body is unchanged.

During init, the template lives at `packages/cli/templates/context/design-principles.md` (not in the skills template directory). Init copies it to `.ana/context/` like any other context file.

For new users: the template has placeholder content ("Fill in your team's design philosophy"). For existing users: `--force` reinit should NOT overwrite if the file has been customized (detect non-template content before overwriting).

### 5. project-context initial state

**After init but before setup, project-context should look like this:**

```markdown
<!-- SCAFFOLD - Setup will fill this file -->

# Project Context

## What This Project Does
<!-- Setup will capture this from your description -->
**Detected:** TypeScript pnpm monorepo with Vitest testing

## Architecture
**Detected:** 3 top-level directories (packages/, .github/, docs/)
**Detected:** 2 workspace packages (anatomia-cli, demo-site)

## Key Decisions
<!-- Setup will capture your architectural decisions -->

## Key Files
<!-- Key navigation points for agents -->

## Active Constraints
<!-- Current priorities and things not to touch -->
```

Readable immediately. Shows what scan detected. Clearly marks what setup will fill. An agent reading this pre-setup gets SOMETHING useful (the detected data) rather than nothing.

### 6. Hardest part of implementing D6's manifest

**Authoring the conditional skill templates.** Specifically `ai-patterns` — this is novel content that doesn't exist anywhere in the codebase. It needs to contain meaningful, correct, "deviations only" content about prompt management, LLM error handling, streaming patterns, cost tracking, and testing non-deterministic output. Getting this right for our target audience (Anthropic SDK, Vercel AI SDK, OpenAI) requires deep domain knowledge and careful curation.

The second hardest: **project-context scaffold generator.** Synthesizing scan data into the D6.6 format (product purpose, architecture rationale, key decisions) requires knowing what's meaningful vs noise. The current 7 scaffold generators each produce 20-50 lines of scan-seeded content. The new generator needs to consolidate the best of all 7 into a coherent ~30-50 line scaffold.

---

## Implementation Roadmap for D7

### 7.1 Directory Structure
**Effort:** 1-2 hours
- Remove 5 context file templates (patterns, conventions, testing, workflow, debugging)
- Add project-context template to `.ana/context/`
- Move design-principles from skills to context
- Add troubleshooting, ai-patterns, api-patterns, data-access skill template directories
- Remove logging-standards template directory
- Update `createDirectoryStructure()` if needed (directories haven't changed, just files)

### 7.2 scan.json + ana.json
**Effort:** Half day
- Add `anaVersion` (from package.json)
- Add `lastScanAt` (from `overview.scannedAt`)
- Remove `scanStaleDays`
- Add `setupCompletedAt: null`
- Fix `artifactBranch` to use `git.defaultBranch` (DEPENDS on git.ts change)
- Add non-interactive test command helper

### 7.3 Skill Scaffolding
**Effort:** 2-3 days (the biggest piece)
- Author 3 new conditional skill templates (ai-patterns, api-patterns, data-access)
- Author troubleshooting stub template
- Rewrite 4 core skill templates to D6.4 format (Detected/Rules/Gotchas/Examples)
- Update all descriptions to trigger format
- Implement conditional skill gating (`computeSkillManifest()`)
- Update `seedSkillFiles()` for new skills and D6.5 format
- Fold logging-standards content into coding-standards
- Remove logging-standards template

### 7.4 Context File Creation
**Effort:** 1 day
- Write `generateProjectContextScaffold()` (consolidates 7 → 1 generator)
- Write design-principles template (placeholder for human content)
- Remove 5 old scaffold generators
- Update `generateScaffolds()` caller to use new generators

### 7.5 Agent Definition Templates
**Effort:** 1-2 hours
- Add `initialPrompt:` to ana.md template
- Add `skills:` + `initialPrompt:` to ana-plan.md template
- Add `skills:` to ana-build.md template
- Test `initialPrompt` works (FIRST PRIORITY)

### 7.6 Static Files + Settings
**Effort:** 1 hour
- Update `settings.json` template if hook changes needed
- Update file lists in `copyStaticFilesWithVerification()`
- Update test expectations for new file counts

### 7.7 CLAUDE.md
**Effort:** 30 min
- Keep current template (already updated in S12)
- No changes expected

### 7.8 Init UX + Atomic Assembly
**Effort:** 1 hour
- Update spinner messages for new file counts
- Update success message (from "7 context files" to "2 context files + N skills")
- Atomic assembly mechanism unchanged — still works

### Total Estimated Effort: 5-7 days

### Critical Path:
1. git.ts → `defaultBranch` detection (blocks 7.2 artifactBranch fix)
2. ai-patterns template authoring (blocks 7.3 — novel content, needs domain expertise)
3. `initialPrompt` testing (blocks 7.5 — if it doesn't work, fallback is prompt instructions)
