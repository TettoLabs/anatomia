# File Types - Static vs Dynamic

## Static Files (copied verbatim by ana init)

**Never modified during copy. Copied with SHA-256 verification.**

### Hook Scripts (2)
- templates/.ana/hooks/verify-context-file.sh
- templates/.ana/hooks/run-check.sh

### Agent Definitions (5)
- templates/.claude/agents/ana.md
- templates/.claude/agents/ana-plan.md
- templates/.claude/agents/ana-setup.md
- templates/.claude/agents/ana-build.md
- templates/.claude/agents/ana-verify.md

### Skill Templates (5 core + conditional)
- templates/.claude/skills/coding-standards/SKILL.md
- templates/.claude/skills/testing-standards/SKILL.md
- templates/.claude/skills/git-workflow/SKILL.md
- templates/.claude/skills/deployment/SKILL.md
- templates/.claude/skills/troubleshooting/SKILL.md
- (conditional: ai-patterns, api-patterns, data-access)

### Other Static Files
- templates/.claude/settings.json
- templates/CLAUDE.md

**Copy method:** `copyAndVerifyFile()` with SHA-256 verification (used for hook scripts and agent files)

---

## Dynamic Files (generated per project by ana init)

### Generated Context (2)
- context/project-context.md — `generateProjectContextScaffold(engineResult)`
- context/design-principles.md — `generateDesignPrinciplesTemplate()`

### Generated Metadata (2)
- ana.json — `createAnaJson()` with setupPhase, anaVersion, etc.
- scan.json — `JSON.stringify(engineResult, null, 2)`

### Skill Detected Sections
- Each skill's `## Detected` section is populated by scan data via `replaceDetectedSection()`
- Human sections (`## Rules`, `## Gotchas`, `## Examples`) are never modified

**Generation method:** TypeScript template literals, JSON.stringify
