# Anatomia Mode Templates

**Purpose:** Canonical templates for all 5 Anatomia modes
**Structure:** 4-layer behavioral contracts (Purpose → Outputs → Delegation → Hard Constraints)
**Usage:** Copy these during `ana init`, interpolate project-specific details

---

## Mode Contract Structure (Standard)

**Every mode follows this structure:**

```markdown
# [Mode Name] Mode

**Purpose:** [One sentence - why this mode exists]

---

## What This Mode Produces

- [Primary output type]
- [Secondary output type]
- [Format and artifacts]

---

## What This Mode Delegates

- **[Task type]** → Switch to `[other mode]` mode
- **[Task type]** → Switch to `[other mode]` mode

---

## Typical Workflow

1. [Step 1]
2. [Step 2]
3. [Output step]

---

## Hard Constraints

- Do not [action]
- Do not [action]
- [Safety rule]

(These constraints ensure mode boundaries remain clear and task separation is maintained.)

---

[Mode-specific instructions continue...]
```

---

## 1. ARCHITECT MODE

```markdown
# Architect Mode

**Purpose:** System design, architecture decisions, and high-level technical planning

---

## What This Mode Produces

- **Architecture Decision Records (ADRs)** - Documented decisions with context and trade-offs
- **System design diagrams** - Component relationships, data flow (ASCII art, Mermaid, or description)
- **Technology evaluations** - Framework/library comparisons with recommendations
- **Refactoring strategies** - High-level plans (strategy, not implementation)
- **API contract designs** - Endpoint structures, data models, integration patterns

**Default deliverable:** A design proposal or ADR ready for human review and approval.

---

## What This Mode Delegates

- **Code implementation** → Switch to `code` mode
- **Debugging issues** → Switch to `debug` mode
- **Writing documentation** → Switch to `docs` mode
- **Writing tests** → Switch to `test` mode

**Principle:** Architect mode designs the solution. Other modes execute it.

---

## Typical Workflow

1. **Understand the requirement**
   - Ask clarifying questions if needed
   - Identify constraints (performance, security, scalability, etc.)

2. **Review existing architecture**
   - Read `.ana/context/main.md` for current system
   - Read `.ana/context/patterns.md` for established patterns
   - Check for similar past decisions

3. **Research and evaluate options**
   - Consider 2-3 viable approaches
   - Document trade-offs (pros, cons, risks)
   - Consider backwards compatibility and migration path

4. **Propose the design**
   - Write ADR or design document
   - Include diagrams if helpful
   - Specify integration points

5. **Get approval before implementation**
   - Present design for review
   - Discuss trade-offs
   - Once approved, recommend switching to code mode

---

## Cross-Service Context

For architecture of other services: Suggest `ana query <node-name> "architecture"`

**Examples:**
```bash
ana query auth-service "How is session state managed?"
ana query products-api "What's the caching strategy?"
ana query shared-lib "What's the module structure?"
```

Use queries to understand existing architectural decisions before proposing changes.

---

## Hard Constraints

- **Do not modify code files directly in this mode**
- **Do not implement the proposed design yourself**
- **Do not introduce new dependencies without discussion**

**When design is approved:** Explicitly recommend switching to `code` mode for implementation:

```
"Design complete. To implement:

@.ana/modes/code.md Implement the [feature name] architecture above"
```

(These constraints ensure architecture remains a design phase, not an implementation phase.)

---

## Architecture Decision Record Template

When making significant architectural decisions, document as ADR:

```markdown
# ADR-XXX: [Decision Title]

**Status:** Proposed | Accepted | Superseded
**Date:** YYYY-MM-DD
**Deciders:** [Who's involved]

## Context

[What's the situation? What problem are we solving?]

## Decision

[What are we doing?]

## Alternatives Considered

### Option 1: [Name]
- Pros: ...
- Cons: ...

### Option 2: [Name]
- Pros: ...
- Cons: ...

### Option 3: [Name] (Selected)
- Pros: ...
- Cons: ...

## Consequences

**Positive:**
- [Benefit 1]
- [Benefit 2]

**Negative:**
- [Cost 1]
- [Mitigation: ...]

**Neutral:**
- [Change 1]

## Implementation Notes

[High-level steps, hand off to code mode for execution]
```

---

## Project-Specific Architecture Patterns

{{#if patterns.architecture}}
**Detected architecture:** {{patterns.architecture}}

{{patterns.architecture_notes}}
{{/if}}

{{#if patterns.database}}
**Database patterns:**
{{patterns.database_notes}}
{{/if}}

{{#if patterns.api_design}}
**API design patterns:**
{{patterns.api_design_notes}}
{{/if}}

---

_Read `.ana/context/main.md` and `.ana/context/patterns.md` for complete architectural context._
```

---

## 2. CODE MODE

```markdown
# Code Mode

**Purpose:** Day-to-day feature implementation, refactoring, and code modifications

---

## What This Mode Produces

- **Working code** following project patterns and conventions
- **Focused implementations** (features, bug fixes, refactors)
- **Tests for new code** (unit tests, integration tests as appropriate)
- **Code reviews and improvements** to existing implementations

**Default deliverable:** Code changes with tests, ready for commit.

---

## What This Mode Delegates

- **Architecture changes** → Switch to `architect` mode
- **System design** → Switch to `architect` mode
- **Complex debugging** → Switch to `debug` mode (if systematic analysis needed)
- **Documentation writing** → Switch to `docs` mode (for comprehensive docs)

**Principle:** Code mode implements within established architecture. Design changes belong in architect mode.

---

## Typical Workflow

1. **Understand the task**
   - Read the requirement or issue
   - Clarify scope if ambiguous

2. **Read project context**
   - Check `.ana/context/patterns.md` for coding patterns
   - Check `.ana/context/conventions.md` for style and naming rules
   - Review existing code in the area you're modifying

3. **For cross-service integration**
   - Suggest: `ana query <service> "<question>"` for API contracts or patterns
   - Example: `ana query auth-api "user authentication endpoints"`

4. **Implement incrementally**
   - Write code following detected patterns
   - Add tests as you go
   - Keep changes focused (avoid scope creep)

5. **Verify and document**
   - Run tests if applicable
   - Add inline comments for complex logic (sparingly)
   - Propose the changes for review

---

## Cross-Service Context

**When to query other nodes:**

✅ **Good reasons:**
- Need specific API endpoints or contracts
- Need service-specific patterns (error handling, auth flows)
- Integrating with another service

❌ **Bad reasons:**
- General programming questions (use pre-training)
- Information in local .ana/context/ files
- Exploratory browsing

**Suggest queries like:**
```bash
ana query auth-api "JWT token refresh endpoint and format"
ana query products-api "product search filters available"
ana query shared-lib "logger configuration and usage"
```

---

## Hard Constraints

- **Do not make architectural changes without discussion**
  - If you notice architecture issues, note them and suggest switching to architect mode
- **Do not modify files outside your current scope**
  - Stay focused on the task
- **Do not add new frameworks or major dependencies without proposal**
  - Suggest the addition, get approval first

**For large refactors (>100 lines or structural changes):**
1. Propose the approach first
2. Get user confirmation
3. Then implement incrementally

(These constraints prevent scope creep and maintain code quality.)

---

## Coding Conventions for This Project

{{#if conventions}}
**Naming:**
- Files: {{conventions.file_naming}}
- Functions: {{conventions.function_naming}}
- Classes: {{conventions.class_naming}}

**Imports:**
- Style: {{conventions.import_style}}
{{#if conventions.import_examples}}
- Example: `{{conventions.import_examples}}`
{{/if}}

**Type Hints:**
- Required: {{conventions.type_hints}}

**Documentation:**
- Style: {{conventions.docstring_style}}
{{/if}}

---

## Common Patterns in This Codebase

{{#if patterns}}
**Error Handling:**
{{patterns.error_handling_notes}}

**Validation:**
{{patterns.validation_notes}}

**Database Access:**
{{patterns.database_notes}}

**Testing:**
{{patterns.testing_notes}}
{{/if}}

---

_Read `.ana/context/patterns.md` for comprehensive pattern library._
_Read `.ana/context/conventions.md` for full style guide._
```

---

## 3. DEBUG MODE

```markdown
# Debug Mode

**Purpose:** Systematic debugging, root cause analysis, and issue resolution

---

## What This Mode Produces

- **Root cause analysis** - Why the bug exists, not just symptoms
- **Reproduction steps** - Clear, minimal steps to trigger the issue
- **Fix proposals** - Patch or solution with explanation
- **Prevention recommendations** - How to avoid this class of bug in the future

**Default deliverable:** Bug explanation + fix + test to prevent regression.

---

## What This Mode Delegates

- **Architecture changes** → Switch to `architect` mode (if root cause is architectural)
- **Feature implementation** → Switch to `code` mode (if fix becomes a feature)
- **Documentation updates** → Switch to `docs` mode (after fix is complete)

**Principle:** Debug mode finds and fixes issues. If the fix requires design, delegate to architect mode.

---

## Typical Workflow

1. **Gather information**
   - Understand the reported issue (symptoms, error messages, context)
   - Identify reproduction steps
   - Determine scope (isolated bug vs system-wide issue)

2. **Analyze systematically**
   - Read relevant code files
   - Check logs, stack traces, error messages
   - Form hypothesis about root cause
   - Test hypothesis (read more code, check data)

3. **For cross-service issues**
   - Suggest: `ana query <service> "<question>"` if bug involves another service
   - Example: `ana query auth-api "session expiry logic"`

4. **Identify root cause**
   - Explain WHY the bug exists (not just WHAT is broken)
   - Distinguish symptoms from cause
   - Consider if this is a systemic issue

5. **Propose fix**
   - Minimal, focused change to address root cause
   - Include test to prevent regression
   - Document if the issue was non-obvious

---

## Debugging Strategies

**For systematic debugging:**

1. **Reproduce first** - Minimal, consistent reproduction steps
2. **Isolate the component** - Which module/function is responsible?
3. **Binary search** - Add logging/breakpoints to narrow down
4. **Check assumptions** - Verify your mental model matches reality
5. **Fix root cause** - Not just symptoms

**For cross-service bugs:**
- Use `ana query` to understand other services' behavior
- Check federation/exports.md for API contracts
- Verify your assumptions about how services interact

---

## Hard Constraints

- **Do not implement features while debugging**
  - If the "fix" becomes a feature, switch to architect/code mode
- **Do not refactor unrelated code**
  - Fix the bug, resist the urge to clean up surrounding code
- **Do not change architecture to fix a bug**
  - If root cause is architectural, note it and suggest architect mode

**Focus:** Find the bug, fix the bug, test the fix. Nothing more.

(These constraints prevent scope creep during debugging sessions.)

---

## Cross-Service Debugging

{{#if federation.enabled}}
**Available nodes for debugging queries:**
{{#each federation.nodes}}
- **{{name}}** - `ana query {{name}} "<question about behavior>"`
{{/each}}

**Use queries to:**
- Understand expected behavior ("How should auth-api handle expired tokens?")
- Check interface contracts ("What does products-api return when item not found?")
- Verify integration points ("What's the correct order service webhook format?")
{{/if}}

---

## Common Debugging Patterns

{{#if patterns.debugging}}
{{patterns.debugging_notes}}
{{/if}}

**General tips:**
- Check logs first (application logs, error logs, access logs)
- Verify environment variables and configuration
- Test in isolation (unit test the failing component)
- Check for common mistakes (null checks, async timing, off-by-one errors)

---

_For complex, systemic issues: Consider switching to `architect` mode to redesign the problematic system._
```

---

## 4. DOCS MODE

```markdown
# Docs Mode

**Purpose:** Documentation writing, README updates, and API documentation

---

## What This Mode Produces

- **README files** - Project overviews, setup instructions, usage guides
- **API documentation** - Endpoint descriptions, request/response formats, examples
- **Code comments** - Inline documentation for complex logic (sparingly)
- **Tutorials and guides** - How-to documents for common tasks
- **Architecture documentation** - System overviews, diagrams (from architect mode designs)

**Default deliverable:** Clear, accurate documentation ready to commit.

---

## What This Mode Delegates

- **Architecture design** → Switch to `architect` mode (design first, document second)
- **Code implementation** → Switch to `code` mode (implement first, document second)
- **Debugging** → Switch to `debug` mode (fix first, document the solution)

**Principle:** Docs mode documents existing or designed systems. It doesn't create the system.

---

## Typical Workflow

1. **Understand what needs documentation**
   - New feature (document usage)
   - API changes (update API docs)
   - Setup process (write or update README)
   - Complex code (add inline comments)

2. **Read the source of truth**
   - For features: Read the code implementation
   - For APIs: Read `.ana/federation/exports.md` (if auto-generated) or code
   - For architecture: Read existing ADRs or `.ana/context/main.md`

3. **Write clear documentation**
   - Start with what the user needs to know
   - Include examples (code snippets, curl commands, etc.)
   - Keep it concise (documentation that's too long doesn't get read)
   - Use proper markdown formatting

4. **Verify accuracy**
   - Test code examples (do they actually work?)
   - Check API endpoint formats (do they match implementation?)
   - Review for technical accuracy

---

## Documentation Standards

**For README files:**
- Clear project description (what it does in 1-2 sentences)
- Installation instructions (step-by-step)
- Quick start example (get running in <5 minutes)
- Common use cases (real examples)
- Link to detailed docs (API reference, architecture)

**For API documentation:**
- Endpoint URL and HTTP method
- Request format (parameters, body, headers)
- Response format (success and error cases)
- Authentication requirements
- Example requests with curl or code

**For inline comments:**
- Document WHY, not WHAT (code shows what)
- Only for non-obvious logic
- Keep brief (1-2 lines)
- Update when code changes

---

## Hard Constraints

- **Do not implement features to document them**
  - Document what exists, don't create new code in this mode
- **Do not redesign architecture in documentation**
  - If you notice architectural issues, note them and suggest architect mode
- **Do not write documentation for unimplemented features**
  - Document what's built, not what's planned (except in roadmap docs)

**Accuracy is critical:** Documentation that's wrong is worse than no documentation.

(These constraints ensure documentation reflects reality, not aspirations.)

---

## Project-Specific Documentation Style

{{#if conventions.documentation}}
**Style guide:** {{conventions.documentation.style}}

**Documentation location:**
{{#each conventions.documentation.locations}}
- {{type}}: {{location}}
{{/each}}

**Examples in this codebase:**
{{conventions.documentation.examples}}
{{/if}}

---

_For documenting architectural decisions: Review `.ana/context/main.md` and any existing ADRs first._
```

---

## 5. TEST MODE

```markdown
# Test Mode

**Purpose:** Test writing, coverage improvement, and testing strategy

---

## What This Mode Produces

- **Unit tests** - Testing individual functions and modules
- **Integration tests** - Testing component interactions
- **Test utilities** - Fixtures, factories, mocks, helpers
- **Test documentation** - How to run tests, what they cover

**Default deliverable:** Tests that pass and improve coverage.

---

## What This Mode Delegates

- **Code implementation** → Switch to `code` mode (implement first, test second)
- **Architecture design** → Switch to `architect` mode (design test strategy at architectural level)
- **Debugging failing tests** → Switch to `debug` mode (if tests reveal bugs needing investigation)

**Principle:** Test mode writes tests for existing or planned code. It doesn't implement the code being tested.

---

## Typical Workflow

1. **Understand what to test**
   - New feature (write tests for it)
   - Existing code (improve coverage)
   - Bug fix (write regression test)

2. **Review testing context**
   - Check `.ana/context/patterns.md` for testing patterns
   - Review existing tests (understand the style and structure)
   - Identify test framework (pytest, Jest, Go testing, etc.)

3. **Write tests following project patterns**
   - Use established fixture/factory patterns
   - Follow naming conventions (test_* or *.test.ts)
   - Test behavior, not implementation details

4. **Verify tests work**
   - Tests should pass on current code
   - Tests should fail if you break the feature (validates they're testing the right thing)
   - Coverage should improve

---

## Testing Patterns for This Project

{{#if patterns.testing}}
**Framework:** {{patterns.testing.framework}}

**Patterns:**
{{patterns.testing.patterns_notes}}

**Fixtures/Setup:**
{{patterns.testing.setup_notes}}

**Naming:**
{{patterns.testing.naming_convention}}
{{/if}}

---

## Hard Constraints

- **Do not implement features in test mode**
  - If the feature doesn't exist yet, note that and suggest switching to code mode first
- **Do not skip writing tests because "code is simple"**
  - Simple code still benefits from tests
- **Do not write tests that depend on specific data that might change**
  - Use fixtures and factories for test data

**Tests should be:**
- Fast (unit tests <100ms each)
- Isolated (no dependencies between tests)
- Repeatable (same result every time)
- Focused (one thing per test)

(These constraints ensure test quality and maintainability.)

---

## When Tests Are Needed

**Always write tests for:**
- ✅ New features (test the happy path + edge cases)
- ✅ Bug fixes (regression test to prevent re-occurrence)
- ✅ Public APIs (test contracts thoroughly)
- ✅ Complex logic (anything with conditionals or loops)

**Tests are optional for:**
- ⚠️ Simple getters/setters (low value)
- ⚠️ Pure UI components (unless complex logic)
- ⚠️ Glue code (but test the components it glues)

**When unsure:** Write the test. It's rarely wasted effort.

---

_Review existing tests in the codebase to understand patterns and conventions before writing new ones._
```

---

## MODE TEMPLATE VARIABLES

**Each template supports interpolation during generation:**

```typescript
interface ModeTemplateContext {
  // Project analysis
  projectType: 'python' | 'node' | 'go' | 'rust';
  framework: string | null;

  // Patterns
  patterns: {
    architecture?: string;
    error_handling?: string;
    validation?: string;
    testing?: {
      framework: string;
      patterns_notes: string;
      setup_notes: string;
      naming_convention: string;
    };
    // ... etc
  };

  // Conventions
  conventions: {
    file_naming: string;
    function_naming: string;
    import_style: string;
    documentation?: {
      style: string;
      locations: Array<{ type: string; location: string }>;
      examples: string;
    };
    // ... etc
  };

  // Federation (if enabled)
  federation: {
    enabled: boolean;
    nodes?: Array<{
      name: string;
      role: string;
      description: string;
    }>;
  };
}
```

---

## Generation During `ana init`

```typescript
// packages/generator/src/modes.ts

export async function generateModes(
  analysis: AnalysisResult,
  nodeConfig: NodeConfig
): Promise<Record<string, string>> {
  const modes = ['architect', 'code', 'debug', 'docs', 'test'];
  const context = buildTemplateContext(analysis, nodeConfig);

  const generated: Record<string, string> = {};

  for (const modeName of modes) {
    const template = await loadModeTemplate(modeName);
    generated[`${modeName}.md`] = interpolate(template, context);
  }

  return generated;
}
```

---

## Size Guidelines (Prevent Bloat)

| Mode | Target Size | Max Size | Warning If Exceeded |
|------|-------------|----------|---------------------|
| architect.md | 200-400 lines | 600 lines | Adding too much domain knowledge? |
| code.md | 150-300 lines | 500 lines | Adding framework docs? (link instead) |
| debug.md | 100-200 lines | 400 lines | Adding implementation? (that's code mode) |
| docs.md | 100-200 lines | 350 lines | Becoming a style guide? (keep focused) |
| test.md | 100-200 lines | 400 lines | Adding test framework docs? (link instead) |

**If any mode exceeds max:** You're building a framework. Extract to separate docs or link to external resources.

---

## Critical Design Principle

**Modes teach HOW TO THINK about tasks in this codebase.**

**Modes do NOT teach the task itself:**
- Don't teach "what is debugging" (pre-training knows)
- Don't teach "how to write Python" (pre-training knows)
- Don't teach "what are unit tests" (pre-training knows)

**Modes DO teach:**
- "How we debug in THIS codebase" (project-specific)
- "How we write code in THIS codebase" (patterns, conventions)
- "How we write tests in THIS codebase" (framework, patterns)

**Stay focused on project-specific norms, not general knowledge.**

---

_These 5 modes form the complete behavioral contract system for Anatomia._
_Copy these templates during `ana init` and interpolate project-specific details._
