# Anatomia Implementation Guide
**Week-by-Week Code Plan**

**Last Updated:** January 12, 2026
**Status:** Implementation-ready engineering roadmap
**Audience:** Engineers building Anatomia from scratch

---

## Document Purpose

This guide provides:
- **Detailed code structures** for each development week
- **Exact file paths** and function signatures
- **Testing strategies** per phase
- **Code examples** and pseudo-code
- **Step-by-step progression** from MVP0 through MVP2

Follow this guide to build Anatomia systematically, with each week building on the previous.

---

## Table of Contents

1. [Week 1-2: MVP0 - Foundation](#week-1-2-mvp0---foundation)
2. [Week 3-6: MVP1 - Smart Analysis](#week-3-6-mvp1---smart-analysis)
3. [Week 7-8: MVP1.5 - Node Detection](#week-7-8-mvp15---node-detection)
4. [Week 9-12: MVP2 - Federation Protocol](#week-9-12-mvp2---federation-protocol)
5. [Testing Strategies](#testing-strategies)
6. [Common Patterns](#common-patterns)

---

## Week 1-2: MVP0 - Foundation

**Goal:** Basic CLI that creates `.ana/` folders with template files.
**Complexity:** Low
**Lines of Code:** ~1,500 LOC
**Success Metric:** Can run `ana init` and create valid `.ana/` structure

### Week 1: Project Setup + CLI Scaffold

#### Day 1: Repository Initialization

**Tasks:**
1. Initialize monorepo with pnpm workspaces
2. Set up TypeScript configuration
3. Configure build tooling (tsup)
4. Add core dependencies

**File Structure to Create:**
```
anatomia/
├── packages/
│   ├── cli/
│   │   ├── src/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── analyzer/
│   │   ├── src/
│   │   │   └── index.ts
│   │   └── package.json
│   └── generator/
│       ├── src/
│       │   └── index.ts
│       └── package.json
├── templates/
│   ├── modes/
│   └── contexts/
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

**Root package.json:**
```json
{
  "name": "anatomia-monorepo",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "test": "turbo run test",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "^1.11.0",
    "typescript": "^5.3.0"
  }
}
```

**pnpm-workspace.yaml:**
```yaml
packages:
  - 'packages/*'
```

**packages/cli/package.json:**
```json
{
  "name": "anatomia",
  "version": "0.1.0",
  "description": "Federated AI intelligence for your codebase",
  "bin": {
    "ana": "./dist/index.js"
  },
  "type": "module",
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts",
    "dev": "tsup src/index.ts --format esm --watch",
    "test": "vitest"
  },
  "dependencies": {
    "commander": "^11.1.0",
    "chalk": "^5.3.0",
    "inquirer": "^9.2.11",
    "ora": "^7.0.1",
    "glob": "^10.3.10",
    "simple-git": "^3.21.0",
    "yaml": "^2.3.4"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "tsup": "^8.0.1",
    "vitest": "^1.0.4"
  }
}
```

**packages/cli/tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

#### Day 2-3: CLI Command Structure

**packages/cli/src/index.ts:**
```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init.js';
import { modeCommand } from './commands/mode.js';

const program = new Command();

program
  .name('ana')
  .description('Federated AI intelligence for your codebase')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize .ana/ folder with context and modes')
  .option('--force', 'Overwrite existing .ana/ folder')
  .action(initCommand);

program
  .command('mode <name>')
  .description('Display mode instructions')
  .action(modeCommand);

program
  .command('mode')
  .description('List available modes')
  .action(() => modeCommand(null));

program.parse();
```

**packages/cli/src/commands/init.ts:**
```typescript
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { existsSync } from 'fs';
import { join } from 'path';
import { writeAnaFolder } from '../utils/files.js';
import { getDefaultTemplates } from '../templates/loader.js';

export async function initCommand(options: { force?: boolean }) {
  console.log(chalk.bold.cyan('\n🔬 Anatomia - Initializing...\n'));

  const anaPath = join(process.cwd(), '.ana');

  // Check if .ana/ already exists
  if (existsSync(anaPath) && !options.force) {
    const { overwrite } = await inquirer.prompt<{ overwrite: boolean }>([
      {
        type: 'confirm',
        name: 'overwrite',
        message: '.ana/ folder already exists. Overwrite?',
        default: false,
      },
    ]);

    if (!overwrite) {
      console.log(chalk.yellow('Aborted.'));
      return;
    }
  }

  // Ask strategic questions
  const answers = await askStrategicQuestions();

  // Generate default templates
  const spinner = ora('Creating .ana/ structure...').start();
  const templates = getDefaultTemplates(answers);

  // Write files
  await writeAnaFolder(anaPath, templates);
  spinner.succeed('Created .ana/ folder');

  // Success message
  console.log(chalk.green.bold('\n✓ Your .ana/ folder is ready!\n'));
  displayNextSteps();
}

async function askStrategicQuestions() {
  return inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name:',
      default: process.cwd().split('/').pop(),
    },
    {
      type: 'list',
      name: 'gitStrategy',
      message: 'Git branching strategy:',
      choices: [
        { name: 'GitHub Flow (feature branches → main)', value: 'github-flow' },
        { name: 'GitFlow (develop/release/main)', value: 'gitflow' },
        { name: 'Trunk-based (direct to main)', value: 'trunk' },
      ],
      default: 'github-flow',
    },
    {
      type: 'list',
      name: 'audience',
      message: 'Primary audience:',
      choices: [
        { name: 'Internal team tool', value: 'internal' },
        { name: 'Open source project', value: 'open-source' },
        { name: 'Enterprise/customer-facing', value: 'enterprise' },
      ],
      default: 'internal',
    },
    {
      type: 'input',
      name: 'goldenRule',
      message: 'Golden rule (what should AI always remember?):',
      default: '',
    },
  ]);
}

function displayNextSteps() {
  console.log(chalk.gray('Next steps:'));
  console.log(chalk.gray('  1. Review .ana/context/main.md and customize'));
  console.log(chalk.gray('  2. Use modes: ana mode code'));
  console.log(chalk.gray('  3. Point your AI tool at .ana/ files\n'));
}
```

**packages/cli/src/commands/mode.ts:**
```typescript
import chalk from 'chalk';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { findNearestAna } from '../utils/files.js';

export async function modeCommand(modeName: string | null) {
  const anaPath = await findNearestAna(process.cwd());

  if (!anaPath) {
    console.log(chalk.red('Error: No .ana/ folder found in current or parent directories.'));
    console.log(chalk.gray('Run `ana init` to create one.'));
    return;
  }

  const modesPath = join(anaPath, 'modes');

  // List all modes
  if (!modeName) {
    const modes = readdirSync(modesPath)
      .filter((f) => f.endsWith('.md'))
      .map((f) => f.replace('.md', ''));

    console.log(chalk.bold('\nAvailable modes:\n'));
    modes.forEach((mode) => {
      console.log(chalk.cyan(`  • ${mode}`));
    });
    console.log(chalk.gray('\nUsage: ana mode <name>'));
    console.log(chalk.gray('Example: ana mode code\n'));
    return;
  }

  // Display specific mode
  const modePath = join(modesPath, `${modeName}.md`);

  try {
    const content = readFileSync(modePath, 'utf-8');
    console.log('\n' + content + '\n');
  } catch (error) {
    console.log(chalk.red(`Error: Mode '${modeName}' not found.`));
    console.log(chalk.gray('Run `ana mode` to see available modes.'));
  }
}
```

#### Day 4-5: File Writing Utilities

**packages/cli/src/utils/files.ts:**
```typescript
import { mkdir, writeFile, access } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';

export interface AnaTemplates {
  context: {
    'main.md': string;
    'patterns.md': string;
    'conventions.md': string;
  };
  modes: {
    'architect.md': string;
    'code.md': string;
    'debug.md': string;
    'docs.md': string;
    'test.md': string;
  };
  learning: {
    'explicit.md': string;
  };
}

export async function writeAnaFolder(
  anaPath: string,
  templates: AnaTemplates
): Promise<void> {
  // Create directory structure
  await mkdir(join(anaPath, 'context'), { recursive: true });
  await mkdir(join(anaPath, 'modes'), { recursive: true });
  await mkdir(join(anaPath, 'learning'), { recursive: true });
  await mkdir(join(anaPath, '.state'), { recursive: true });

  // Write context files
  for (const [filename, content] of Object.entries(templates.context)) {
    await writeFile(join(anaPath, 'context', filename), content, 'utf-8');
  }

  // Write mode files
  for (const [filename, content] of Object.entries(templates.modes)) {
    await writeFile(join(anaPath, 'modes', filename), content, 'utf-8');
  }

  // Write learning files
  for (const [filename, content] of Object.entries(templates.learning)) {
    await writeFile(join(anaPath, 'learning', filename), content, 'utf-8');
  }

  // Write .gitignore for .state/
  await writeFile(
    join(anaPath, '.gitignore'),
    '.state/\n*.log\ncache/\n*.tmp\n',
    'utf-8'
  );

  // Write initial state
  await writeFile(
    join(anaPath, '.state', 'session.json'),
    JSON.stringify(
      {
        initialized: new Date().toISOString(),
        version: '0.1.0',
      },
      null,
      2
    ),
    'utf-8'
  );
}

export async function findNearestAna(startPath: string): Promise<string | null> {
  let currentPath = startPath;

  while (true) {
    const anaPath = join(currentPath, '.ana');

    if (existsSync(anaPath)) {
      return anaPath;
    }

    const parentPath = dirname(currentPath);

    // Reached filesystem root
    if (parentPath === currentPath) {
      return null;
    }

    currentPath = parentPath;
  }
}
```

### Week 2: Templates + Polish

#### Day 6-7: Mode Templates

Create basic mode templates that will be the foundation for all projects.

**templates/modes/code.md:**
```markdown
# Code Mode

You are in **Code Mode** for this project.

## Your Role
Write production-quality code that matches existing patterns and conventions.

## Context Available
- Project structure and architecture
- Coding conventions and style
- Common patterns used in this codebase
- Dependencies and frameworks

## Guidelines

### 1. Match Existing Style
- Follow the naming conventions already in use
- Match indentation and formatting
- Use the same import style (absolute vs relative)
- Follow established patterns for similar features

### 2. Write Clean Code
- Add appropriate type hints/annotations
- Include docstrings/comments for public APIs
- Handle errors gracefully
- Consider edge cases

### 3. Be Consistent
- If the codebase uses classes, use classes
- If it uses functional style, use functional style
- Match the level of abstraction used elsewhere
- Follow the established file organization

### 4. Test-Driven Mindset
- Think about how this code will be tested
- Make code testable (dependency injection, pure functions)
- Consider edge cases and error conditions

## Your Process
1. **Understand** - Read the requirement carefully
2. **Plan** - Think about where this code fits
3. **Implement** - Write the code following conventions
4. **Review** - Check against the guidelines above
5. **Explain** - Describe what you built and why

## Important
- Never introduce new patterns without discussion
- When uncertain, ask for clarification
- Prioritize readability and maintainability
- Follow the golden rule if one is specified
```

**templates/modes/architect.md:**
```markdown
# Architect Mode

You are in **Architect Mode** for this project.

## Your Role
Design systems, plan implementations, and make architectural decisions.

## Focus Areas
- System design and component boundaries
- Data flow and dependencies
- Scalability and performance considerations
- Technology choices and tradeoffs

## Your Process

### 1. Understand Requirements
- What problem are we solving?
- What are the constraints?
- What are the success criteria?

### 2. Analyze Current State
- Review existing architecture
- Identify affected components
- Consider dependencies and impacts

### 3. Design Solution
- Propose high-level architecture
- Define component responsibilities
- Document data flow
- Identify risks and tradeoffs

### 4. Plan Implementation
- Break down into phases
- Identify prerequisites
- Estimate complexity
- Suggest testing strategy

## Deliverables
- Architecture diagrams (ASCII or description)
- Component specifications
- Data schemas/interfaces
- Implementation plan with phases
- Risk assessment

## Principles
- Keep it simple (YAGNI - You Aren't Gonna Need It)
- Align with existing patterns
- Plan for testing and observability
- Document decisions and rationale
```

**templates/modes/debug.md:**
```markdown
# Debug Mode

You are in **Debug Mode** for this project.

## Your Role
Diagnose issues, find root causes, and propose fixes.

## Your Process

### 1. Gather Information
- What is the expected behavior?
- What is the actual behavior?
- When did it start happening?
- Can you reproduce it consistently?
- What error messages or logs exist?

### 2. Form Hypotheses
Based on the information, what are the most likely causes?
Rank them by probability.

### 3. Investigate
- Review relevant code
- Check for recent changes (git blame, git log)
- Look for similar patterns elsewhere
- Test hypotheses systematically

### 4. Diagnose Root Cause
- Identify the exact line or component causing the issue
- Understand why it's failing
- Determine if it's a symptom of a deeper problem

### 5. Propose Fix
- Suggest the minimal fix for immediate resolution
- Recommend long-term improvements if applicable
- Consider if similar bugs exist elsewhere

## Debugging Checklist
- [ ] Error message understood
- [ ] Stack trace analyzed
- [ ] Recent changes reviewed
- [ ] Inputs/outputs inspected
- [ ] Assumptions validated
- [ ] Root cause identified
- [ ] Fix tested
- [ ] Similar issues prevented

## Important
- Don't jump to conclusions - gather evidence first
- Think about why tests didn't catch this
- Consider adding tests for this case
- Document the root cause for learning
```

**templates/modes/test.md:**
```markdown
# Test Mode

You are in **Test Mode** for this project.

## Your Role
Write comprehensive tests that validate functionality and prevent regressions.

## Test Strategy

### 1. Unit Tests
- Test individual functions/methods in isolation
- Mock external dependencies
- Cover edge cases and error conditions
- Aim for high coverage of business logic

### 2. Integration Tests
- Test how components work together
- Use real dependencies where practical
- Test critical user workflows
- Validate data flow between systems

### 3. Test Quality
- Tests should be **fast** (sub-second for unit tests)
- Tests should be **reliable** (no flakes)
- Tests should be **readable** (clear intent)
- Tests should be **maintainable** (easy to update)

## Your Process

### For New Features
1. Write tests first (TDD) if applicable
2. Cover happy path
3. Cover edge cases
4. Cover error conditions
5. Ensure tests fail without the implementation

### For Bug Fixes
1. Write a test that reproduces the bug
2. Confirm test fails
3. Fix the bug
4. Confirm test passes
5. Add related edge case tests

### For Refactoring
1. Ensure existing tests pass
2. Refactor code
3. Ensure tests still pass (same behavior)
4. Add tests for any new edge cases

## Test Structure
```
describe('Component or function name', () => {
  describe('method or scenario', () => {
    it('should do expected behavior', () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

## Important
- Test behavior, not implementation
- Keep tests simple and focused
- One assertion per test when possible
- Use descriptive test names
```

**templates/modes/docs.md:**
```markdown
# Docs Mode

You are in **Docs Mode** for this project.

## Your Role
Create clear, helpful documentation for users and developers.

## Documentation Types

### 1. API Documentation
- Function/method signatures
- Parameters and return types
- Usage examples
- Edge cases and caveats

### 2. User Guides
- How to accomplish common tasks
- Step-by-step instructions
- Screenshots or code examples
- Troubleshooting section

### 3. Architecture Documentation
- System overview
- Component diagrams
- Data flow
- Key decisions and tradeoffs

### 4. README Files
- What the project does
- How to install/setup
- Quick start guide
- Links to detailed docs

## Writing Guidelines

### Clarity
- Use simple language
- Define technical terms
- Break complex topics into steps
- Use examples liberally

### Completeness
- Cover the why, not just the what
- Include common gotchas
- Link to related documentation
- Provide troubleshooting tips

### Maintainability
- Keep docs close to code
- Update docs with code changes
- Use relative links
- Version documentation

## Structure
```markdown
# Title (What is this?)

## Overview
Brief description (2-3 sentences)

## Quick Start
Minimal example to get started

## Usage
Detailed usage with examples

## API Reference (if applicable)
Complete reference documentation

## Troubleshooting
Common issues and solutions

## Related
Links to related documentation
```

## Important
- Documentation is code - keep it under version control
- Outdated docs are worse than no docs
- Test examples to ensure they work
- Write docs for your future self
```

#### Day 8-9: Context Templates

**templates/contexts/main.md.template:**
```markdown
# {{projectName}} - Main Context

## Project Overview
{{projectDescription}}

**Project Type:** {{projectType}}
**Primary Language:** {{primaryLanguage}}
{{#if framework}}**Framework:** {{framework}}{{/if}}

## Architecture
{{architectureDescription}}

## Directory Structure
```
{{directoryTree}}
```

### Key Directories
{{#each keyDirectories}}
- **{{this.path}}** - {{this.description}}
{{/each}}

## Tech Stack
{{#each techStack}}
- {{this.category}}: {{this.technologies}}
{{/each}}

## Development Workflow

### Git Strategy
We use **{{gitStrategy}}**.

{{#if gitStrategy === 'github-flow'}}
- Create feature branches from `main`
- Open pull requests for review
- Merge to `main` when approved
- Deploy from `main`
{{/if}}

{{#if gitStrategy === 'gitflow'}}
- Develop on `develop` branch
- Create feature branches from `develop`
- Merge features back to `develop`
- Create release branches for deployment
- Tag releases on `main`
{{/if}}

## Important Context
{{#if goldenRule}}
### Golden Rule
> {{goldenRule}}
{{/if}}

## Quick Reference
- **Entry point:** {{entryPoint}}
- **Test command:** {{testCommand}}
- **Build command:** {{buildCommand}}

---

*Auto-generated by Anatomia. Edit this file to add project-specific context.*
```

**templates/contexts/conventions.md.template:**
```markdown
# Coding Conventions

## Naming Conventions

### Files
- Style: {{fileNamingStyle}}
- Example: `{{fileNamingExample}}`

### Variables/Functions
- Style: {{variableNamingStyle}}
- Example: `{{variableNamingExample}}`

### Classes/Types
- Style: {{classNamingStyle}}
- Example: `{{classNamingExample}}`

### Constants
- Style: {{constantNamingStyle}}
- Example: `{{constantNamingExample}}`

## Code Style

### Indentation
- Use {{indentationStyle}}
- Width: {{indentationWidth}} spaces

### Imports
- Style: {{importStyle}}
{{#if importStyle === 'absolute'}}
- Always use absolute imports from project root
- Example: `from src.models.user import User`
{{/if}}
{{#if importStyle === 'relative'}}
- Use relative imports within modules
- Use absolute imports across modules
{{/if}}

### Type Hints/Annotations
- Usage: {{typeHintUsage}}
{{#if typeHintUsage === 'always'}}
- Always include type hints on function signatures
- Example: `def process_user(user_id: int) -> User:`
{{/if}}

## Comments & Documentation

### Docstrings
{{#if docstringStyle}}
- Style: {{docstringStyle}}
- Required for: All public APIs
{{else}}
- Use inline comments sparingly
- Prefer self-documenting code
{{/if}}

### Inline Comments
- Explain why, not what
- Keep comments up to date with code
- Remove commented-out code

## Best Practices

### Error Handling
- {{errorHandlingPattern}}

### Testing
- Test file location: {{testLocation}}
- Test naming: {{testNamingPattern}}
- Aim for: {{testCoverageGoal}}

### Commits
- Write clear commit messages
- Use conventional commits if applicable
- Keep commits focused and atomic

---

*Customize this file to match your project's conventions.*
```

**templates/contexts/patterns.md.template:**
```markdown
# Common Patterns

This file documents recurring patterns used in this codebase.

## General Patterns

### Error Handling
{{errorHandlingDescription}}

Example:
```{{primaryLanguage}}
{{errorHandlingExample}}
```

### Validation
{{#if validationLibrary}}
We use **{{validationLibrary}}** for validation.

Example:
```{{primaryLanguage}}
{{validationExample}}
```
{{else}}
Document your validation patterns here.
{{/if}}

### Logging
{{#if loggingLibrary}}
We use **{{loggingLibrary}}** for logging.

Standard format:
```{{primaryLanguage}}
{{loggingExample}}
```
{{else}}
Document your logging patterns here.
{{/if}}

## Project-Specific Patterns

### Pattern 1: [Add your pattern name]
Description of when and how this pattern is used.

```{{primaryLanguage}}
// Example code
```

### Pattern 2: [Add another pattern]
Description of when and how this pattern is used.

```{{primaryLanguage}}
// Example code
```

---

*Add patterns you discover or establish as the project evolves.*
```

#### Day 10-11: Template Loader

**packages/cli/src/templates/loader.ts:**
```typescript
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { AnaTemplates } from '../utils/files.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEMPLATES_DIR = join(__dirname, '../../../templates');

export function getDefaultTemplates(answers: {
  projectName: string;
  gitStrategy: string;
  audience: string;
  goldenRule: string;
}): AnaTemplates {
  // Load mode templates (these are static)
  const modes = {
    'architect.md': readFileSync(join(TEMPLATES_DIR, 'modes/architect.md'), 'utf-8'),
    'code.md': readFileSync(join(TEMPLATES_DIR, 'modes/code.md'), 'utf-8'),
    'debug.md': readFileSync(join(TEMPLATES_DIR, 'modes/debug.md'), 'utf-8'),
    'docs.md': readFileSync(join(TEMPLATES_DIR, 'modes/docs.md'), 'utf-8'),
    'test.md': readFileSync(join(TEMPLATES_DIR, 'modes/test.md'), 'utf-8'),
  };

  // Generate context files with user answers
  const context = {
    'main.md': generateMainContext(answers),
    'patterns.md': generatePatternsContext(answers),
    'conventions.md': generateConventionsContext(answers),
  };

  // Initialize empty learning
  const learning = {
    'explicit.md': generateExplicitLearning(answers),
  };

  return { context, modes, learning };
}

function generateMainContext(answers: {
  projectName: string;
  gitStrategy: string;
  audience: string;
  goldenRule: string;
}): string {
  return `# ${answers.projectName} - Main Context

## Project Overview
*Add a brief description of what this project does.*

**Project Type:** [To be detected in MVP1]
**Primary Language:** [To be detected in MVP1]

## Architecture
*Describe your system architecture here.*

## Development Workflow

### Git Strategy
We use **${getGitStrategyName(answers.gitStrategy)}**.

${getGitStrategyDescription(answers.gitStrategy)}

${answers.goldenRule ? `## Golden Rule\n> ${answers.goldenRule}\n` : ''}

## Quick Reference
- **Entry point:** [Add main entry file]
- **Test command:** [Add test command]
- **Build command:** [Add build command]

---

*This file will be auto-updated when you run \`ana evolve\` in MVP1+.*
*For now, manually fill in project-specific details.*
`;
}

function generatePatternsContext(answers: { projectName: string }): string {
  return `# Common Patterns

This file documents recurring patterns used in ${answers.projectName}.

## General Patterns

### Error Handling
*Document your error handling approach here.*

Example:
\`\`\`
// Add error handling example
\`\`\`

### Validation
*Document your validation approach here.*

### Logging
*Document your logging approach here.*

## Project-Specific Patterns

### Pattern 1: [Add your pattern name]
*Describe when and how this pattern is used.*

---

*Add patterns as you discover or establish them.*
*In MVP1+, Anatomia will help detect patterns automatically.*
`;
}

function generateConventionsContext(answers: { projectName: string }): string {
  return `# Coding Conventions

## Naming Conventions

### Files
*Document your file naming style here.*

### Variables/Functions
*Document your variable naming style here.*

### Classes/Types
*Document your class naming style here.*

## Code Style

### Indentation
*Document indentation preferences here.*

### Imports
*Document import style here.*

### Type Hints/Annotations
*Document type annotation usage here.*

## Comments & Documentation

### Docstrings
*Document docstring style here.*

### Inline Comments
- Explain why, not what
- Keep comments up to date with code

## Best Practices

### Error Handling
*Document error handling patterns here.*

### Testing
*Document testing conventions here.*

### Commits
- Write clear commit messages
- Keep commits focused and atomic

---

*Customize this file to match your project's conventions.*
*In MVP1+, Anatomia will help detect conventions automatically.*
`;
}

function generateExplicitLearning(answers: {
  projectName: string;
  goldenRule: string;
}): string {
  return `# Explicit Knowledge

This file captures manually-added knowledge about ${answers.projectName}.

${answers.goldenRule ? `## Golden Rule\n${answers.goldenRule}\n\n` : ''}
## Project-Specific Knowledge

*Add important context that AI should always remember:*
- Key decisions and rationale
- Gotchas and edge cases
- Domain-specific terminology
- Team preferences

## Examples

### Good Pattern
\`\`\`
// Example of code we like
\`\`\`

### Anti-Pattern
\`\`\`
// Example of what to avoid
\`\`\`

---

*Use \`ana teach "<knowledge>"\` to add entries here from CLI.*
`;
}

function getGitStrategyName(strategy: string): string {
  const names: Record<string, string> = {
    'github-flow': 'GitHub Flow',
    'gitflow': 'GitFlow',
    'trunk': 'Trunk-Based Development',
  };
  return names[strategy] || strategy;
}

function getGitStrategyDescription(strategy: string): string {
  const descriptions: Record<string, string> = {
    'github-flow': `- Create feature branches from \`main\`
- Open pull requests for review
- Merge to \`main\` when approved
- Deploy from \`main\``,
    'gitflow': `- Develop on \`develop\` branch
- Create feature branches from \`develop\`
- Merge features back to \`develop\`
- Create release branches for deployment
- Tag releases on \`main\``,
    'trunk': `- Commit directly to \`main\` or short-lived branches
- Use feature flags for incomplete features
- Deploy frequently from \`main\``,
  };
  return descriptions[strategy] || 'Document your git workflow here.';
}
```

#### Day 12-14: Testing & Documentation

**packages/cli/tests/commands/init.test.ts:**
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { writeAnaFolder } from '../../src/utils/files.js';
import { getDefaultTemplates } from '../../src/templates/loader.js';

describe('init command', () => {
  const testDir = join(process.cwd(), 'test-output');
  const anaPath = join(testDir, '.ana');

  beforeEach(() => {
    // Create test directory
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('creates .ana folder structure', async () => {
    const templates = getDefaultTemplates({
      projectName: 'test-project',
      gitStrategy: 'github-flow',
      audience: 'internal',
      goldenRule: 'Keep it simple',
    });

    await writeAnaFolder(anaPath, templates);

    // Verify structure
    expect(existsSync(anaPath)).toBe(true);
    expect(existsSync(join(anaPath, 'context'))).toBe(true);
    expect(existsSync(join(anaPath, 'modes'))).toBe(true);
    expect(existsSync(join(anaPath, 'learning'))).toBe(true);
    expect(existsSync(join(anaPath, '.state'))).toBe(true);
  });

  it('creates all mode files', async () => {
    const templates = getDefaultTemplates({
      projectName: 'test-project',
      gitStrategy: 'github-flow',
      audience: 'internal',
      goldenRule: '',
    });

    await writeAnaFolder(anaPath, templates);

    const modes = readdirSync(join(anaPath, 'modes'));
    expect(modes).toContain('architect.md');
    expect(modes).toContain('code.md');
    expect(modes).toContain('debug.md');
    expect(modes).toContain('docs.md');
    expect(modes).toContain('test.md');
  });

  it('creates all context files', async () => {
    const templates = getDefaultTemplates({
      projectName: 'test-project',
      gitStrategy: 'github-flow',
      audience: 'internal',
      goldenRule: '',
    });

    await writeAnaFolder(anaPath, templates);

    const context = readdirSync(join(anaPath, 'context'));
    expect(context).toContain('main.md');
    expect(context).toContain('patterns.md');
    expect(context).toContain('conventions.md');
  });

  it('includes user answers in generated content', async () => {
    const templates = getDefaultTemplates({
      projectName: 'my-awesome-project',
      gitStrategy: 'github-flow',
      audience: 'internal',
      goldenRule: 'Always test first',
    });

    await writeAnaFolder(anaPath, templates);

    const mainContent = templates.context['main.md'];
    expect(mainContent).toContain('my-awesome-project');
    expect(mainContent).toContain('GitHub Flow');
    expect(mainContent).toContain('Always test first');
  });
});
```

**README.md (root):**
```markdown
# Anatomia

Federated AI intelligence for your codebase.

## What is Anatomia?

Anatomia creates a `.ana/` folder in your project that provides rich context to AI coding assistants like Claude, Cursor, and Windsurf. Think of it as "AI documentation" that helps your assistant understand your codebase deeply.

## Quick Start

```bash
# Install globally
npm install -g anatomia

# Initialize in your project
cd your-project
ana init

# View a mode
ana mode code
```

## Features

- **Smart Context** - Auto-generated project context
- **Specialized Modes** - 5 modes for different tasks (code, debug, test, docs, architect)
- **Tool Agnostic** - Works with any AI assistant that reads markdown
- **Git Integrated** - Tracks learning through git hooks

## Status

**Current Version:** MVP0 (Foundation)
**Lines of Code:** ~1,500 LOC
**Commands:** init, mode

### Coming Soon
- **MVP1 (Week 6):** Smart analysis and auto-generation
- **MVP1.5 (Week 8):** Node detection and federation basics
- **MVP2 (Week 12):** Full federation protocol with cross-node queries

## License

MIT
```

---

### MVP0 Deliverable Checklist

- [ ] CLI scaffold with commander
- [ ] `ana init` creates .ana/ folder
- [ ] `ana mode <name>` displays mode
- [ ] 5 mode templates (architect, code, debug, docs, test)
- [ ] 3 context templates (main, patterns, conventions)
- [ ] Template loader with user answers
- [ ] File writing utilities
- [ ] Tests for init command
- [ ] README documentation
- [ ] Can be published to npm

**Validation:** Run `ana init` on 3 different projects (Python, Node, Go). Verify .ana/ structure is created correctly and mode files are readable.

---

## Week 3-6: MVP1 - Smart Analysis

**Goal:** Auto-analyze codebases and generate useful context automatically.
**Complexity:** High
**Lines of Code:** ~4,000 LOC
**Success Metric:** 80%+ accurate context generation for Python, Node, and Go projects

### Week 3: Analysis Engine Foundation

#### Day 15-16: Project Type & Framework Detection

**packages/analyzer/src/index.ts:**
```typescript
import { detectProjectType } from './detectors/projectType.js';
import { detectFramework } from './detectors/framework.js';
import { analyzeStructure } from './analyzers/structure.js';
import { inferPatterns } from './analyzers/patterns.js';
import { detectConventions } from './analyzers/conventions.js';
import { assessQuality } from './analyzers/quality.js';
import { gatherStats } from './analyzers/stats.js';

export interface AnalysisResult {
  projectType: 'python' | 'node' | 'go' | 'rust' | 'ruby' | 'php' | 'mixed' | 'unknown';
  framework: string | null;
  architecture: 'monolith' | 'layered' | 'microservices' | 'library' | 'unknown';

  structure: {
    directories: Record<string, string>;
    entryPoints: string[];
    testLocation: string | null;
  };

  patterns: {
    errorHandling: string;
    validation: string | null;
    database: string | null;
    auth: string | null;
    testing: string | null;
    logging: string | null;
  };

  conventions: {
    naming: 'snake_case' | 'camelCase' | 'PascalCase' | 'kebab-case' | 'mixed';
    imports: 'absolute' | 'relative' | 'mixed';
    typeHints: 'always' | 'sometimes' | 'never';
    docstrings: string | null;
  };

  quality: {
    hasTests: boolean;
    hasCI: boolean;
    hasDocker: boolean;
    hasDocs: boolean;
    estimatedCoverage: 'high' | 'medium' | 'low' | 'unknown';
  };

  stats: {
    fileCount: number;
    lineCount: number;
    directories: number;
  };
}

export async function analyze(rootPath: string): Promise<AnalysisResult> {
  console.log('Analyzing project at:', rootPath);

  // Detection phase
  const projectType = await detectProjectType(rootPath);
  const framework = await detectFramework(rootPath, projectType);

  // Analysis phase
  const structure = await analyzeStructure(rootPath, projectType);
  const patterns = await inferPatterns(rootPath, projectType, framework);
  const conventions = await detectConventions(rootPath, projectType);
  const quality = await assessQuality(rootPath);
  const stats = await gatherStats(rootPath);

  // Inference phase
  const architecture = inferArchitecture(structure, stats);

  return {
    projectType,
    framework,
    architecture,
    structure,
    patterns,
    conventions,
    quality,
    stats,
  };
}

function inferArchitecture(
  structure: AnalysisResult['structure'],
  stats: AnalysisResult['stats']
): AnalysisResult['architecture'] {
  const dirs = Object.keys(structure.directories);

  // Simple library (minimal structure)
  if (stats.fileCount < 20 && !dirs.includes('src') && !dirs.includes('app')) {
    return 'library';
  }

  // Layered architecture (src/, models/, services/, api/)
  if (
    dirs.some((d) => d.includes('models')) &&
    dirs.some((d) => d.includes('services') || d.includes('controllers'))
  ) {
    return 'layered';
  }

  // Microservices (multiple services or apps)
  if (
    dirs.some((d) => d.includes('services/')) ||
    dirs.some((d) => d.includes('apps/'))
  ) {
    return 'microservices';
  }

  // Default to monolith
  if (structure.entryPoints.length > 0) {
    return 'monolith';
  }

  return 'unknown';
}
```

**packages/analyzer/src/detectors/projectType.ts:**
```typescript
import { existsSync } from 'fs';
import { join } from 'path';

const PROJECT_INDICATORS: Record<
  string,
  { files: string[]; priority: number }
> = {
  python: {
    files: ['requirements.txt', 'pyproject.toml', 'setup.py', 'Pipfile'],
    priority: 1,
  },
  node: {
    files: ['package.json'],
    priority: 1,
  },
  go: {
    files: ['go.mod', 'go.sum'],
    priority: 1,
  },
  rust: {
    files: ['Cargo.toml'],
    priority: 1,
  },
  ruby: {
    files: ['Gemfile', 'Rakefile'],
    priority: 1,
  },
  php: {
    files: ['composer.json'],
    priority: 1,
  },
};

export async function detectProjectType(
  rootPath: string
): Promise<string> {
  const detected: string[] = [];

  for (const [type, { files }] of Object.entries(PROJECT_INDICATORS)) {
    for (const file of files) {
      if (existsSync(join(rootPath, file))) {
        detected.push(type);
        break;
      }
    }
  }

  if (detected.length === 0) return 'unknown';
  if (detected.length === 1) return detected[0];
  return 'mixed'; // Monorepo with multiple languages
}
```

**packages/analyzer/src/detectors/framework.ts:**
```typescript
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export async function detectFramework(
  rootPath: string,
  projectType: string
): Promise<string | null> {
  switch (projectType) {
    case 'python':
      return detectPythonFramework(rootPath);
    case 'node':
      return detectNodeFramework(rootPath);
    case 'go':
      return detectGoFramework(rootPath);
    default:
      return null;
  }
}

async function detectPythonFramework(rootPath: string): Promise<string | null> {
  const deps = await readPythonDependencies(rootPath);

  // Check in priority order
  if (deps.includes('fastapi')) return 'fastapi';
  if (deps.includes('django')) return 'django';
  if (deps.includes('flask')) return 'flask';
  if (deps.includes('typer') || deps.includes('click')) return 'cli';
  if (deps.includes('pytest')) return 'testing';

  return null;
}

async function detectNodeFramework(rootPath: string): Promise<string | null> {
  const packageJsonPath = join(rootPath, 'package.json');

  if (!existsSync(packageJsonPath)) {
    return null;
  }

  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  const allDeps = {
    ...(packageJson.dependencies || {}),
    ...(packageJson.devDependencies || {}),
  };

  // Check in priority order
  if ('next' in allDeps) return 'nextjs';
  if ('@nestjs/core' in allDeps) return 'nestjs';
  if ('express' in allDeps) return 'express';
  if ('react' in allDeps && !('next' in allDeps)) return 'react';
  if ('vue' in allDeps) return 'vue';
  if ('svelte' in allDeps) return 'svelte';

  return null;
}

async function detectGoFramework(rootPath: string): Promise<string | null> {
  const goModPath = join(rootPath, 'go.mod');

  if (!existsSync(goModPath)) {
    return null;
  }

  const goModContent = readFileSync(goModPath, 'utf-8');

  if (goModContent.includes('github.com/gin-gonic/gin')) return 'gin';
  if (goModContent.includes('github.com/labstack/echo')) return 'echo';
  if (goModContent.includes('github.com/gofiber/fiber')) return 'fiber';

  return null;
}

async function readPythonDependencies(rootPath: string): Promise<string[]> {
  const deps: string[] = [];

  // Try requirements.txt
  const requirementsPath = join(rootPath, 'requirements.txt');
  if (existsSync(requirementsPath)) {
    const content = readFileSync(requirementsPath, 'utf-8');
    const lines = content.split('\n');
    for (const line of lines) {
      const match = line.match(/^([a-zA-Z0-9_-]+)/);
      if (match) {
        deps.push(match[1].toLowerCase());
      }
    }
  }

  // Try pyproject.toml
  const pyprojectPath = join(rootPath, 'pyproject.toml');
  if (existsSync(pyprojectPath)) {
    const content = readFileSync(pyprojectPath, 'utf-8');
    // Simple regex to find dependencies (not a full TOML parser)
    const matches = content.matchAll(/"([a-zA-Z0-9_-]+)"/g);
    for (const match of matches) {
      deps.push(match[1].toLowerCase());
    }
  }

  return [...new Set(deps)]; // Deduplicate
}
```

This is a substantial start to the implementation guide. Due to the token limit, I'll stop here and create the second document. Would you like me to continue with the rest of the IMPLEMENTATION_GUIDE.md in the next message, or should I move on to creating the NODES_DEEP_DIVE.md document now?