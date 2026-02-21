# Coding Conventions - Anatomia

## Naming Conventions

**Files:** kebab-case (template-loader.ts, file-writer.ts, NOT templateLoader.ts or template_loader.ts)

**Functions/Methods:** camelCase (loadTemplate, createDir, writeFile)

**Classes:** PascalCase (FileWriter, Command, NOT fileWriter)

**Constants:** UPPER_SNAKE_CASE (PROJECT_TYPES, MAX_RETRIES) or const for typed constants

**Interfaces/Types:** PascalCase with descriptive names (TemplateData, InitAnswers, WriteFileOptions)

## Code Style

**Formatter:** Prettier 3.4.0
- 2 spaces indentation (not tabs)
- Single quotes for strings (not double)
- Trailing commas in multiline (objects, arrays, function params)
- 100 character line length (soft limit)
- Semicolons required (TypeScript style)

**Linter:** ESLint 9.0 with TypeScript rules
- No any (use unknown if type truly unknown)
- No explicit any (let TypeScript infer)
- Prefer interfaces over type aliases for objects
- Unused imports/variables are errors

**Run formatting:**
```bash
pnpm format   # Formats all files
```

## Import Organization

**Order (enforced by prettier/eslint):**
1. Node.js built-ins with `node:` prefix (`import * as path from 'node:path';`)
2. Third-party packages (`import Handlebars from 'handlebars';`)
3. Workspace packages (`import { User } from '@anatomia/shared';`)
4. Local files with .js extension (`import { initCommand } from './commands/init.js';`)

**Style:**
- ESM syntax only (`import`/`export`, NEVER `require`)
- `.js` extension in imports (TypeScript compiles .ts → .js, imports must use .js)
- Namespace imports for Node built-ins (`* as path`, NOT `{ join, dirname }`)
- Default imports for libraries with main export (`Handlebars from 'handlebars'`)

**Example:**
```typescript
// Correct order
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import Handlebars from 'handlebars';
import { type User } from '@anatomia/shared';
import { fileWriter } from '../utils/file-writer.js';
```

## TypeScript

**Strict mode (tsconfig.base.json):**
```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "noImplicitReturns": true,
  "exactOptionalPropertyTypes": true,
  "noImplicitOverride": true,
  "noPropertyAccessFromIndexSignature": true,
  "noFallthroughCasesInSwitch": true
}
```

**Type hints:**
- REQUIRED for function parameters: `function load(name: string)`
- REQUIRED for return types: `function load(name: string): Promise<string>`
- Inferred for variables when obvious: `const content = await fs.readFile(...)` (string inferred)
- Avoid `any` - use `unknown` if type truly unknown, narrow with type guards

**Examples:**
```typescript
// ✅ Good
export async function loadTemplate(name: string): Promise<string> {
  const content = await fs.readFile(name, 'utf-8'); // Type inferred
  return content;
}

// ❌ Bad (missing return type)
export async function loadTemplate(name: string) {
  return await fs.readFile(name, 'utf-8');
}

// ❌ Bad (using any)
export function parseData(data: any): void {
  console.log(data);
}

// ✅ Good (using unknown with type guard)
export function parseData(data: unknown): void {
  if (typeof data === 'object' && data !== null) {
    console.log(data);
  }
}
```

## Documentation / Comments

**JSDoc for public APIs:**
```typescript
/**
 * Creates .ana/ folder with templates
 *
 * @param options - Command options
 * @param options.force - Overwrite existing folder
 * @param options.yes - Skip prompts, use defaults
 * @throws {Error} If folder creation fails (permission, disk full)
 * @example
 * ```bash
 * ana init --yes --force
 * ```
 */
export async function initializeAnaFolder(options: InitOptions): Promise<void> {
  // Implementation
}
```

**Inline comments:**
- Explain WHY, not WHAT (code should be self-documenting)
- Use sparingly (only for non-obvious logic)
- Keep short (one line preferred)

**Examples:**
```typescript
// ✅ Good (explains why)
// Workaround for tsup issue #1366 - DTS deletes publicDir
onSuccess: async () => { ... }

// ❌ Bad (explains what - code already shows this)
// Create directory
await fs.mkdir(dirPath);

// ✅ Good (non-obvious logic)
// CRITICAL: Use parseAsync() not parse() for async handlers
await program.parseAsync(process.argv);
```

## Testing Conventions

**Framework:** vitest 2.0 with v8 coverage provider

**Test file location:** tests/ directory (NOT colocated)
- tests/commands/init.test.ts (tests init command)
- tests/utils/template-loader.test.ts (tests utilities)
- tests/templates/boundaries.test.ts (tests template structure)

**Test structure:**
```typescript
describe('Feature name', () => {
  let testDir: string;

  beforeEach(async () => {
    // Setup
    testDir = await mkdtemp(join(tmpdir(), 'ana-test-'));
  });

  afterEach(async () => {
    // Cleanup
    await rm(testDir, { recursive: true, force: true });
  });

  it('does specific thing', async () => {
    // Arrange
    // Act
    // Assert
  });
});
```

**Test naming:** `it('does specific thing when condition')` (descriptive, not just 'works')

**Assertions:** Vitest matchers (expect(x).toBe(y), expect(x).toContain(y), expect(x).toThrow())

**Coverage target:** ≥80% lines/functions/statements, ≥75% branches (configured in vitest.config.ts)

## Git Conventions

**Commit format:** `[scope] imperative message`
- Scope: cli, templates, tests, docs, config
- Message: Present tense ("add" not "added"), lowercase, no period
- Subject line: Under 72 characters
- Body: Optional, wrap at 72 characters

**Examples:**
```bash
git commit -m "[cli] add mode command"
git commit -m "[templates] refine architect mode constraints"
git commit -m "[tests] add boundary validation tests"
```

**Branch naming:** type/STEP_X_Y_SHORTNAME
- effort/STEP_0_4_VALIDATION (current)
- feature/new-command
- fix/template-bug

**Commits:**
- Commit after logical changes (not at end of day)
- One concern per commit (not "update everything")
- Test before committing (`pnpm test`)

---

*Following these conventions ensures consistent, maintainable code across all contributors.*
