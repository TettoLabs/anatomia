# Decision 8 Investigation — Post-Scan Scaffolding

**Date:** 2026-04-06
**Verified against:** source code on main

---

## Part 1: Scaffold Generators — What Feeds What

### Current State

7 generators in `scaffold-generators.ts` (560 lines). Each reads specific EngineResult fields:

| Generator | EngineResult Fields Used | Lines Output |
|-----------|------------------------|-------------|
| **ProjectOverview** | stack.* (all 6), commands.* (3), deployment, externalServices, files.* (3), git.* (3), structure | ~30 lines |
| **Architecture** | stack.framework/database/auth/payments, deployment, externalServices, monorepo.*, schemas | ~25 lines |
| **Patterns** | patterns.*, stack.framework | ~20 lines (thin without deep scan) |
| **Conventions** | conventions.naming/imports/indentation | ~15 lines (thin without deep scan) |
| **Workflow** | commands.* (4), deployment, git.* (4), secrets.* (3), structure | ~30 lines |
| **Testing** | commands.test, files.source/test, patterns (testing), stack.testing | ~20 lines |
| **Debugging** | blindSpots, externalServices (monitoring) | ~10 lines (thinnest) |

### The TOP 5 scan data points worth carrying into project-context

Based on what makes agents meaningfully better (from S12 observation):

1. **Stack detection** (language + framework + database + auth + testing) — This is what makes Think say "looking at your Clerk auth" instead of "looking at your auth." Highest signal per token.

2. **Structure map** (directory → purpose) — Agents use this for navigation. "packages/cli → CLI application" saves exploration time.

3. **Monorepo topology** (packages with names and paths) — For our audience, knowing the package boundaries prevents agents from mixing code across packages.

4. **External services** (by category) — "You use Anthropic SDK and PostHog" tells Think what integrations to consider when scoping.

5. **Commands** (build/test/lint + package manager) — Build and Verify execute these. Having them in project-context means Think can reference them during scoping.

What's NOT worth carrying: file counts (low signal), git contributor count (noise), blind spots (too generic currently), conventions (belongs in coding-standards skill), patterns (belongs in coding-standards skill).

### D8 Implication

Replace 7 generators with 1: `generateProjectContextScaffold()`. It produces the D6.6 format:

```markdown
<!-- SCAFFOLD - Setup will fill this file -->

# Project Context

## What This Project Does
**Detected:** TypeScript pnpm monorepo · Vitest · No framework detected
<!-- Setup will capture your product description -->

## Architecture
**Detected:** 2 workspace packages (anatomia-cli, demo-site)
**Detected:** 3 top-level directories (.github/, docs/, packages/)
<!-- Setup will capture your architecture rationale -->

## Key Decisions
<!-- Setup will capture your architectural decisions -->

## Key Files
<!-- Key navigation points for agents -->

## Active Constraints
<!-- Current priorities and things not to touch -->
```

Also need: `generateDesignPrinciplesTemplate()` — minimal template with section headers for human writing.

**Effort:** 1 day. The new generator is simpler than any single existing generator (less data to format, clearer structure).

---

## Part 2: CLAUDE.md

### Current State

Init creates CLAUDE.md via `copyClaudeMd()` at init.ts:890. **Merge-not-overwrite**: if CLAUDE.md already exists, it's NOT touched. Only created on first init.

Template content (11 lines):
```markdown
# Anatomia Project

This project uses Anatomia for AI-assisted development.

**Ready to work?** `claude --agent ana`

Ana knows this codebase. She'll help you scope, plan, build, and verify changes.

Context files: `.ana/context/` (7 verified files)
Team standards: `.claude/skills/` (editable)

Want richer context? `claude --agent ana-setup` (optional)
```

Separately, `ana setup complete` appends an Anatomia section with markers (`<!-- Anatomia Context Framework -->...<!-- End Anatomia section -->`). This section includes mode references.

### D8 Implication

Template needs updating for D6:
- "7 verified files" → "2 context files" (or dynamic count)
- "6 skills" or similar reference to skills
- The setup-appended section references `.ana/ENTRY.md` in the mode-file orchestrator (already deleted in S12 Part 1), but the `generateClaudeMd` in setup.ts was also cleaned. Verify no stale references remain.

**Minor update.** 30 minutes.

---

## Part 3: Settings.json

### Current State

Template configures 3 hooks:
- **PostToolUse** (Write|Edit|MultiEdit) → `verify-context-file.sh` (30s timeout)
- **SubagentStop** (ana-writer) → `subagent-verify.sh` (60s timeout)
- **Stop** → `quality-gate.sh` (120s timeout)

No tool permissions, no model settings, no other configuration.

### D8 Implication

**No changes needed for D6.** The hooks fire on Write/Edit operations and verify context files. The file paths inside the hooks need updating (see Part 4), but settings.json itself doesn't change.

---

## Part 4: Hook Scripts

### Current State

4 hook scripts in `templates/.ana/hooks/`:

1. **verify-context-file.sh** — PostToolUse hook. Fires on every Write. Checks if the written file is in `.ana/context/`. If yes, runs validation. **Path check:** `if [[ ! "$FILE_PATH" == *".ana/context/"* ]]` — this WILL still work with D6's 2 context files since they're still in `.ana/context/`.

2. **subagent-verify.sh** — SubagentStop hook for ana-writer. **HARDCODED FILE LIST at line 22:**
   ```bash
   for candidate in project-overview.md conventions.md patterns.md architecture.md testing.md workflow.md debugging.md; do
   ```
   This needs updating for D6: `design-principles.md project-context.md`.

3. **quality-gate.sh** — Stop hook. Checks context files pass verification before session ends. References `.ana/context/` directory (still correct).

4. **run-check.sh** — Wrapper for `ana setup check`. No direct file path references.

### D8 Implication

**subagent-verify.sh needs its file list updated.** The hardcoded list of 7 context file names must change to 2. This is a one-line fix but it's a BREAKING change if missed — the hook would try to verify files that don't exist.

verify-context-file.sh and quality-gate.sh use directory-level checks (`.ana/context/`) and should work without changes.

**Also:** The `check.ts` command (ana setup check) has `FILE_CONFIGS` with per-file validation rules for all 7 files. This needs updating to 2 files with new configs for project-context and design-principles. Currently at check.ts:28:

```typescript
const FILE_CONFIGS: Record<string, FileConfig> = {
  'project-overview': { minLines: 200, maxLines: 700, expectedHeaders: 4 },
  'conventions': { minLines: 300, maxLines: 950, expectedHeaders: 4 },
  'patterns': { minLines: 550, maxLines: 1400, expectedHeaders: 6 },
  'architecture': { minLines: 200, maxLines: 700, expectedHeaders: 4 },
  'testing': { minLines: 250, maxLines: 850, expectedHeaders: 6 },
  'workflow': { minLines: 400, maxLines: 1000, expectedHeaders: 6 },
  'debugging': { minLines: 200, maxLines: 700, expectedHeaders: 5 },
};
```

Must change to match D6.6 project-context and design-principles formats.

**Effort:** 2 hours total for hook + check.ts updates.

---

## Part 5: Atomic Assembly

### Current State

Init builds everything in a temp directory (`os.tmpdir()/ana-init-*/`), then does an atomic rename to `.ana/`. If rename fails (cross-filesystem EXDEV error), falls back to recursive copy + delete.

`.claude/` is created SEPARATELY after the atomic rename — NOT in the temp directory. This is because `.claude/` uses merge-not-overwrite logic (preserve existing agent customizations, existing settings).

Failure cleanup: if anything throws before the atomic rename, the temp directory is deleted. Project is unchanged. All-or-nothing.

### D8 Implication

**No structural changes needed.** The atomic assembly mechanism works regardless of which files are in .ana/. Fewer context files (7→2) means less work in the temp directory but the mechanism is the same.

The `.claude/` creation path needs the conditional skill gating added (see D7 investigation Part 3), but the merge-not-overwrite mechanism itself is unchanged.

---

## Part 6: Completion UX

### Current State

`displaySuccessMessage()` at init.ts:1193 shows:

```
✓ Scanned anatomia (2.1s)

  Stack:    TypeScript · Vitest
  Services: (none)
  Deploy:   (none)

✓ Context generated → .ana/context/ (7 files)
✓ Skills seeded → .claude/skills/ (6 files)
✓ Scan saved → .ana/scan.json
✓ Config written → .ana/ana.json

  Next steps:
    claude --agent ana          Start working (Ana knows your stack)
    claude --agent ana-setup    Enrich context with Q&A (optional)
```

### D8 Implication

Update counts and messaging:

```
✓ Scanned {name} ({time}s)

  Stack:    TypeScript · Vitest
  AI:       (none detected)
  Database: (none detected)

✓ Context → .ana/context/ (2 files)
✓ Skills → .claude/skills/ ({N} skills — {core} core + {conditional} detected)
✓ Scan → .ana/scan.json
✓ Config → .ana/ana.json

  Next steps:
    claude --agent ana          Start working (Ana knows your stack)
    claude --agent ana-setup    Enrich context with Q&A (optional)
```

The skill count is dynamic: 5 core + 0-3 conditional. Show the breakdown so the user understands why different projects get different skill counts.

**Effort:** 1 hour.

---

## Part 7: My Opinions on D8

### 1. project-context generator

The TOP 5 data points to carry forward are: stack detection, structure map, monorepo topology, external services, and commands. The remaining scan data either belongs in skills (conventions → coding-standards, patterns → coding-standards, testing → testing-standards) or is noise (file counts, contributor count).

The new generator should be ~80 lines — simpler than any existing generator because the D6.6 format is cleaner (5 sections with clear structure vs the current sprawling Key Facts / Open Questions format).

### 2. CLAUDE.md recommendation

Keep it minimal. The current template is good — it's a bridge for bare Claude Code usage. One change: update file counts. Don't add complexity.

The setup-appended Anatomia section (modes reference) is vestigial — modes are a system we're deprecating in favor of skills and agents. Consider removing the section injection from `setup.ts:generateClaudeMd()` entirely. Or keep it minimal: just the "Last setup: date" marker for freshness tracking.

### 3. Completion message

Keep the scan summary (stack, services, deploy). It's the user's first validation that scan worked. "TypeScript · Prisma · Clerk · Vercel" in one line says "we understand your project." The next steps should be two paths (work vs setup) — already correct from S12.

Add: the conditional skill count. "7 skills scaffolded (5 core + ai-patterns + api-patterns)" tells the user the system adapted to their stack. That's the "it knows me" moment.

### 4. Riskiest part of D8

**The hook and check.ts file list updates.** These are hardcoded file names that MUST match the new manifest. If subagent-verify.sh still lists 7 file names and only 2 exist, setup breaks silently. If FILE_CONFIGS in check.ts has the old 7 entries, validation runs against nonexistent files.

This is the same category of bug we hit repeatedly in S12 — stale file lists after restructuring. The mitigation: derive file lists from constants rather than hardcoding. `REQUIRED_CONTEXT_FILES` in constants.ts should be the single source of truth, and hooks + check.ts should read from it (or from a shared list).

Second risk: the skill seeding logic in `seedSkillFiles()` needs to handle new skills (troubleshooting, ai-patterns, api-patterns, data-access) and the new D6.4 format (Detected/Rules/Gotchas/Examples). The current seeder inserts `## Detected` after the frontmatter. The new format has `## Detected` already as a section header in the template — the seeder needs to REPLACE the section content, not insert a new section.

---

## Summary: D8 Implementation Effort

| Component | Effort | Risk |
|-----------|--------|------|
| project-context generator | 1 day | Medium — must extract right data from scan |
| design-principles template | 30 min | Low — minimal template |
| Remove 5 old generators | 1 hour | Low — deletion |
| CLAUDE.md template update | 30 min | Low |
| Hook file list update (subagent-verify.sh) | 30 min | **HIGH** — silent breakage if missed |
| check.ts FILE_CONFIGS update | 1-2 hours | **HIGH** — validation fails on wrong files |
| constants.ts REQUIRED_CONTEXT_FILES update | 30 min | Medium — cascading references |
| Completion UX update | 1 hour | Low |
| Skill seeder update for new format | 2-3 hours | Medium — format change in existing function |
| **Total** | **2-3 days** | |

**Critical path:** Hook + check.ts file list updates should be done FIRST and tested explicitly. These are the silent breakage points.
