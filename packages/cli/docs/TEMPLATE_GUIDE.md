# Template Guide - How Anatomia Templates Work

**Audience:** Contributors, advanced users customizing templates
**Updated:** 2026-04-08

---

## Overview

Anatomia uses static templates and TypeScript scaffold generators to create `.ana/` and `.claude/` directories. This guide explains template structure, customization, and quality standards.

---

## Template Philosophy

**Templates are behavioral contracts for AI.**

They're not just starter files - they define:
- How AI thinks about tasks (mode boundaries)
- What AI produces vs delegates (clear scope)
- What constraints AI must follow (hard limits)

**Quality bar: ≥8/10** measured by:
1. **Orientation speed:** AI understands project in ≤30 seconds (CLAUDE.md + context files)
2. **Boundary discipline:** AI respects agent constraints (agent templates clear)
3. **Naturalness:** ≥4/5 developers say "reads well" (professional tone)

---

## Template Types

### 1. CLAUDE.md (Project Entry Point)

**Purpose:** First file AI reads. Orients AI to project and points to Ana.

**Structure:**
- Project name and Anatomia integration
- How to start: `claude --agent ana`
- Context files location (.ana/context/)
- Team standards location (.claude/skills/)
- Optional setup prompt

**Length:** Concise (under 20 lines)

**Variables:**
- `{{projectName}}` - Project name from init prompt
- `{{nodeId}}` - Node identifier (default: "main")
- `{{timestamp}}` - ISO 8601 timestamp
- `{{federation}}` - Boolean, shows/hides federation section

**Testing:** Orientation speed (load in Claude Code, ask 5 questions, measure time ≤30s)

---

### 2. Mode Templates (architect, code, debug, docs, test)

**Purpose:** Task-specific AI guidance with strict boundaries.

**4-Layer Structure:**
1. **Purpose** (3 lines) - What this mode does, what it does NOT do
2. **What This Mode Produces** (10 lines) - Explicit outputs (design docs, code, bug reports, documentation, tests)
3. **What This Mode Delegates** (10 lines) - References to other modes ("delegate implementation to code mode")
4. **Hard Constraints** (20 lines) - 5 prohibitions using strong language ("NEVER", "MUST NOT", "ALWAYS")

**Additional sections:**
- **Good Examples** (20 lines) - 5 in-scope queries showing correct usage
- **Bad Examples** (20 lines) - 5 boundary violations with corrections
- **Framework-Specific Guidance** (10 lines, conditional) - FastAPI, Next.js, Express, Go patterns
- **Workflow/Techniques** (10 lines) - How to use this mode effectively

**Length:** 90-110 lines per mode (HARD LIMIT: max 150)

**Variables:**
- `{{projectName}}` - Project name
- `{{framework}}` - Framework choice (fastapi, nextjs, express, null)
- `{{language}}` - Language (python, typescript, go)

**Conditionals:**
- `{{#if (eq framework "fastapi")}}FastAPI patterns{{/if}}`
- `{{#if (eq language "python")}}Python conventions{{/if}}`

**Testing:** Boundary discipline (20 deliberate violation attempts, count how many AI executes, target ≤2)

---

### 3. Context Templates (main.md, patterns.md, conventions.md)

**Purpose:** User-fillable project documentation with guided TODOs.

**Structure:**
- Header with project name
- 4-6 sections with TODO markers
- Each TODO has inline examples (2-3 variations showing different patterns)

**Example TODO format:**
```markdown
<!-- TODO: Describe your architecture -->
<!-- Example 1: "Layered: API → Service → Repository → Database" -->
<!-- Example 2: "Microservices: Auth service, User service, Payment service via REST APIs" -->
<!-- Example 3: "Serverless: AWS Lambda functions, API Gateway routing, DynamoDB storage" -->
```

**Length:** 30-60 lines per file

**Variables:** `{{projectName}}` only (simple string replacement, not full Handlebars)

**Testing:** Manual review (are TODOs helpful? do examples inspire users?)

---

### 4. ana.json (Project Metadata)

**Purpose:** Machine-readable project identity for tooling.

**Schema:**
```json
{
  "name": "project-name",
  "nodeId": "main",
  "role": "main",
  "version": "1.0.0",
  "created": "2026-02-18T12:00:00Z",
  "description": "TODO: Add description",
  "federation": {
    "queryable": false,
    "nodes": []
  }
}
```

**Variables:**
- `{{projectName}}` - String
- `{{nodeId}}` - String (alphanumeric + hyphens)
- `{{timestamp}}` - ISO 8601 date
- `{{federation}}` - Boolean (renders as true/false in JSON)

**Testing:** JSON.parse() validation (must be valid JSON)

---

## Customizing Templates

**To modify templates:**

1. **Edit template file** in `packages/cli/templates/`
   - For agents: Edit `.claude/agents/ana.md`, etc.
   - For skills: Edit `.claude/skills/{skill}/SKILL.md`
   - For scaffolds: Edit `src/utils/scaffold-generators.ts`

2. **Maintain structure:**
   - Keep strong constraint language ("NEVER", not "try to avoid")
   - Maintain skill 4-section structure (Detected, Rules, Gotchas, Examples)

3. **Test changes:**
   ```bash
   pnpm test                      # Run automated tests
   pnpm build && ana init --yes   # Test rendering
   ```

4. **Validate quality:**
   - Manual review (reads professionally, constraints are clear)

---

## Quality Rubric

**≥8/10 Quality = ALL criteria met:**

**Criterion 1: Orientation (≤30 seconds)**
- Test: Load CLAUDE.md + context files in fresh Claude Code, ask 5 questions
- Pass: Average ≤30 seconds over 5 sessions

**Criterion 2: Agent Boundary Discipline (≤2% violations)**
- Test: Boundary-crossing queries per agent, count violations
- Pass: ≤2% violations across agents

**Criterion 3: Template Naturalness (≥4/5 rating)**
- Test: Survey 5 developers, ask "Rate readability 1-5"
- Pass: Average ≥4.0
- Why: If templates don't read well, users don't trust them

**All 3 must pass.** If any fails, refine and re-test until passing.

---

## Template Variables Reference

**Available variables:**
- `projectName` (string, required) - Project name from init prompt
- `nodeId` (string, required) - Node identifier (default: "main")
- `timestamp` (string, required) - ISO 8601 timestamp
- `federation` (boolean, required) - Enable federation features
- `framework` (string | null, optional) - Framework choice (fastapi, nextjs, express, null)
- `language` (string, optional) - Primary language (python, typescript, go, rust)

**Handlebars helpers:**
- `eq` - Equality check: `{{#if (eq framework "fastapi")}}...{{/if}}`

---

## Contributing to Templates

**Template improvement workflow:**

1. **Identify issue:**
   - Orientation too slow (>30s)
   - Boundary violations (AI crosses modes)
   - Unclear language (users confused)

2. **Propose change:**
   - Open issue describing problem
   - Suggest specific refinement
   - Show before/after example

3. **Test change:**
   - Edit template
   - Run quality rubric
   - Verify improvement

4. **Submit PR:**
   - Include test results
   - Document rubric pass
   - Update TEMPLATE_GUIDE if structure changes

See [CONTRIBUTING.md](../CONTRIBUTING.md) for full guidelines.

---

## Related Documentation

- **README.md** - CLI usage and installation
- **CONTRIBUTING.md** - Development and contribution guidelines
- **TEMPLATE_GUIDE.md** - This file (template details)
