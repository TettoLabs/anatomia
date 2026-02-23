# Detected Patterns - Anatomia

## Architectural Patterns

**Monorepo with independent packages:**
- Each package: own package.json, tsconfig.json, build config, tests
- Shared: tsconfig.base.json (strict TypeScript), eslint, prettier at root
- Cross-package imports: workspace:* protocol (`"@anatomia/shared": "workspace:*"`)
- Build orchestration: Turborepo handles dependency graph, caches outputs

**CLI as executable package:**
- Entry: src/index.ts with #!/usr/bin/env node shebang
- Commands: Separate files in commands/ (init.ts, mode.ts)
- Utilities: Reusable helpers in utils/ (template-loader, file-writer)
- Build: tsup produces single bundle (dist/index.js) with templates copied to dist/templates/

## Coding Patterns

**Commander.js command pattern:**
```typescript
// packages/cli/src/commands/init.ts
export const initCommand = new Command('init')
  .description('Initialize .ana/ folder')
  .option('-f, --force', 'Overwrite existing')
  .option('-y, --yes', 'Skip prompts')
  .action(async (options) => {
    // Async implementation
  });

// packages/cli/src/index.ts
import { initCommand } from './commands/init.js';
program.addCommand(initCommand);
await program.parseAsync(process.argv); // CRITICAL: parseAsync for async handlers
```

**Template rendering pattern (Handlebars):**
```typescript
// packages/cli/src/utils/template-loader.ts
import Handlebars from 'handlebars';

// Register helpers (done once at module load)
Handlebars.registerHelper('eq', (a, b) => a === b);

// Load and compile
export function loadTemplate(name: string): HandlebarsTemplateDelegate {
  const content = fs.readFileSync(templatePath, 'utf-8');
  return Handlebars.compile(content);
}

// Render with data
export function renderTemplate(name: string, data: TemplateData): string {
  const template = loadTemplate(name);
  return template(data);
}

// Usage in init.ts
const entryContent = renderTemplate('ENTRY.md.hbs', {
  projectName: 'my-project',
  framework: 'fastapi',
});
```

**Framework conditional rendering:**
```handlebars
{{!-- In templates/*.hbs --}}
{{#if framework}}
## Framework-Specific Guidance

{{#if (eq framework "fastapi")}}
### FastAPI Patterns
- Use Depends() for dependency injection
- Async def for I/O operations
{{/if}}

{{#if (eq framework "nextjs")}}
### Next.js Patterns
- Server Components by default
- 'use client' only for interactivity
{{/if}}
{{/if}}
```

## Error Handling

**CLI error handling pattern:**
```typescript
try {
  await fileWriter.createDir('.ana');
} catch (error) {
  // User-friendly messages (not technical Node errors)
  if (error instanceof Error) {
    if (error.message.includes('EEXIST')) {
      console.error('.ana/ already exists. Use --force to overwrite.');
    } else if (error.message.includes('EACCES')) {
      console.error('Permission denied. Try sudo.');
    } else {
      console.error(`Error: ${error.message}`);
    }
  }
  process.exit(1);
}
```

**FileWriter error wrapping:**
```typescript
// utils/file-writer.ts
async writeFile(filePath: string, content: string): Promise<void> {
  try {
    await fs.writeFile(filePath, content, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to write file '${filePath}': ${error.message}`);
  }
}
```

## Validation Patterns

**Template rendering validation:**
- 20 rendering tests verify all templates compile without errors
- Edge case tests: undefined variables → empty string, nested conditionals work, boolean conditionals work

**Boundary structure validation:**
- 40 tests (8 per mode × 5 modes) verify 4-layer structure:
  - Purpose section present
  - What This Mode Produces present
  - What This Mode Delegates present
  - Hard Constraints present
  - Good Examples (≥3)
  - Bad Examples (≥3)

**Cross-platform validation:**
- 3 tests verify no hardcoded slashes (all use path.join)
- Static analysis ensures path module used everywhere

## Database Access

N/A - Anatomia CLI has no database (tool for generating context, not SaaS)

## Testing Patterns

**Vitest structure:**
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('Init command', () => {
  let testDir: string;

  beforeEach(async () => {
    // Temp directory for isolation
    testDir = await mkdtemp(join(tmpdir(), 'ana-test-'));
  });

  afterEach(async () => {
    // Cleanup
    await rm(testDir, { recursive: true, force: true });
  });

  it('creates .ana/ folder', async () => {
    // Test logic
  });
});
```

**CLI testing pattern (execSync):**
```typescript
import { execSync } from 'node:child_process';

function runCli(args: string): string {
  return execSync(`node ${CLI_PATH} ${args}`, {
    cwd: testDir,
    encoding: 'utf-8',
  });
}

// Test
const output = runCli('init --yes');
expect(output).toContain('Success');
```

## Common Abstractions

**FileWriter class:**
- Purpose: Cross-platform file operations (Windows/Mac/Linux)
- Methods: exists, createDir, writeFile, readFile, removeDir, joinPath
- Usage: `await fileWriter.writeFile(path.join('.ana', 'file.md'), content)`
- Benefits: Consistent error handling, path normalization, recursive directory creation

**Template utilities:**
- loadTemplate(name): Compiles Handlebars template from templates/
- renderTemplate(name, data): One-step load + render
- listTemplates(): Lists available templates
- Benefits: Centralizes template logic, handles dev vs prod paths

**Handlebars 'eq' helper:**
- Purpose: Equality comparison in conditionals
- Registration: `Handlebars.registerHelper('eq', (a, b) => a === b)`
- Usage: `{{#if (eq framework "fastapi")}}...{{/if}}`
- Benefits: Framework-specific sections render dynamically

## Async Patterns

**All file operations are async:**
```typescript
// Always use fs/promises, never sync versions
import * as fs from 'node:fs/promises';

await fs.mkdir(dir, { recursive: true });
await fs.writeFile(path, content, 'utf-8');
const data = await fs.readFile(path, 'utf-8');
```

**Commander async action:**
```typescript
// CRITICAL: Use parseAsync() not parse()
.action(async (options) => {
  await someAsyncOperation();
})

await program.parseAsync(process.argv);
```

## Path Handling

**Always use path module:**
```typescript
import * as path from 'node:path';

// ✅ CORRECT
const anaPath = path.join(cwd, '.ana', 'modes', 'code.md');

// ❌ WRONG (breaks on Windows)
const anaPath = `${cwd}/.ana/modes/code.md`;
```

**Cross-platform considerations:**
- path.join() handles separators automatically
- Never hardcode '/' or '\\'
- Use path.dirname() for parent directory
- Use path.basename() for filename extraction

---

## Analyzer Package Patterns (STEP_1.1 CP0)

**Zod schema + TypeScript interface pattern:**
```typescript
// Define Zod schema first, infer TypeScript type
export const ProjectTypeSchema = z.enum(['python', 'node', 'go', 'rust', 'ruby', 'php', 'mixed', 'unknown']);
export type ProjectType = z.infer<typeof ProjectTypeSchema>;

// Runtime validation
export function validateAnalysisResult(data: unknown): AnalysisResult {
  return AnalysisResultSchema.parse(data); // Throws ZodError if invalid
}
```

**Helper factory pattern:**
```typescript
// Factory for creating empty/default instances
export function createEmptyAnalysisResult(): AnalysisResult {
  return {
    projectType: 'unknown',
    framework: null,
    confidence: { projectType: 0.0, framework: 0.0 },
    indicators: { projectType: [], framework: [] },
    detectedAt: new Date().toISOString(),
    version: '0.1.0-alpha',
  };
}
```

**Graceful file operations pattern:**
```typescript
// File utilities return empty/false on error (no throw)
export async function readFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return ''; // Graceful degradation
  }
}

export async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false; // Not found = false, not error
  }
}
```

---

*These patterns ensure consistent, maintainable code across the Anatomia codebase.*
