# Template Guide - How Anatomia Templates Work

**Audience:** Contributors, advanced users customizing templates
**Updated:** 2026-02-20

---

## Overview

Anatomia uses Handlebars-based templates to generate `.ana/` context folders. This guide explains template structure, customization, and quality standards.

---

## Template Philosophy

**Templates are behavioral contracts for AI.**

They're not just starter files - they define:
- How AI thinks about tasks (mode boundaries)
- What AI produces vs delegates (clear scope)
- What constraints AI must follow (hard limits)

**Quality bar: ≥8/10** measured by:
1. **Orientation speed:** AI understands project in ≤30 seconds (ENTRY.md clarity)
2. **Boundary discipline:** AI respects mode constraints ≤2% violations (mode files clear)
3. **Naturalness:** ≥4/5 developers say "reads well" (professional tone)

---

## Template Types

### 1. ENTRY.md (Orientation Contract)

**Purpose:** First file AI reads. Orients AI to project in ≤30 seconds.

**Structure:**
- What is .ana/? (explains directory structure)
- 5 Modes (lists architect, code, debug, docs, test)
- 7 Non-Negotiable Principles (mode boundaries, context quality, testing, documentation)
- How to Use Modes (ana mode <name> command)
- Federation (conditional, only if multi-service)
- Safety Guidelines (when to ask human)

**Length:** 60-80 lines (HARD LIMIT: max 80)

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

### 4. node.json (Project Metadata)

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
   - For ENTRY.md: Edit ENTRY.md.hbs
   - For modes: Edit architect.md.hbs, code.md.hbs, etc.
   - For context: Edit main.md, patterns.md, conventions.md

2. **Maintain structure:**
   - Keep 4-layer pattern for modes (Purpose, Produces, Delegates, Constraints)
   - Keep length limits (ENTRY 60-80, modes 90-110)
   - Keep strong constraint language ("NEVER", not "try to avoid")

3. **Test changes:**
   ```bash
   pnpm test                      # Run automated tests
   pnpm tsx src/test-templates.ts # Run validation script
   ana init --yes                 # Test rendering
   ```

4. **Validate quality:**
   - Orientation test (≤30s with changed ENTRY.md)
   - Boundary test (≤10% violations with changed mode)
   - Manual review (reads professionally)

5. **Build and test:**
   ```bash
   pnpm build
   cd /tmp && ana init && cat .ana/ENTRY.md
   ```

---

## Quality Rubric

**≥8/10 Quality = ALL criteria met:**

**Criterion 1: ENTRY.md Orientation (≤30 seconds)**
- Test: Load ENTRY.md in fresh Claude Code, ask 5 questions, measure time
- Pass: Average ≤30 seconds over 5 sessions
- Why: If orientation >30s, users skip reading (defeats purpose)

**Criterion 2: Mode Boundary Discipline (≤2% violations)**
- Test: 20 boundary-crossing queries per mode (100 total), count violations
- Pass: ≤10 total violations (≤2 per mode)
- Why: If boundaries don't work (AI implements in architect mode), core value proposition fails

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
- **START_HERE.md** - Research and design rationale (in ATLAS3/efforts/STEP_0_2_TEMPLATES/)
