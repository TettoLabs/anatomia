# Structure Analysis API Documentation

This document provides comprehensive API documentation for the Anatomia structure analysis functions. These functions analyze project directory structure to detect entry points, architecture patterns, test locations, and generate directory trees.

## Table of Contents

1. [analyzeStructure()](#analyzestructure)
2. [findEntryPoints()](#findentrypoints)
3. [classifyArchitecture()](#classifyarchitecture)
4. [findTestLocations()](#findtestlocations)
5. [buildAsciiTree()](#buildasciitree)
6. [findConfigFiles()](#findconfigfiles)

---

## analyzeStructure()

Performs comprehensive analysis of a project's directory structure, combining entry point detection, test location discovery, architecture classification, and directory tree generation.

### TypeScript Signature

```typescript
async function analyzeStructure(
  rootPath: string,
  projectType: ProjectType,
  framework: string | null
): Promise<StructureAnalysis>
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `rootPath` | `string` | Absolute path to the project root directory |
| `projectType` | `ProjectType` | Detected project type: `'python'`, `'node'`, `'go'`, `'rust'`, `'ruby'`, `'php'`, `'mixed'`, or `'unknown'` |
| `framework` | `string \| null` | Detected framework name (e.g., `'django'`, `'nestjs'`, `'fastapi'`), or `null` if no framework detected |

### Return Value

Returns a `Promise<StructureAnalysis>` object containing:

```typescript
{
  directories: Record<string, string>;      // Directory paths mapped to purposes
  entryPoints: string[];                    // Entry point file paths
  testLocation: string | null;              // Test directory or pattern
  architecture: string;                     // Architecture pattern
  directoryTree: string;                    // ASCII tree representation
  configFiles: string[];                    // Config files found
  confidence: {
    entryPoints: number;                    // 0.0-1.0
    testLocation: number;                   // 0.0-1.0
    architecture: number;                   // 0.0-1.0
    overall: number;                        // Weighted average
  };
}
```

### Example

```typescript
const analysis = await analyzeStructure(
  '/Users/dev/my-fastapi-project',
  'python',
  'fastapi'
);

console.log(analysis);
// Output:
// {
//   directories: {
//     'app/': 'Application code',
//     'tests/': 'Tests',
//     'migrations/': 'Database migrations (Python)'
//   },
//   entryPoints: ['app/main.py'],
//   testLocation: 'tests/',
//   architecture: 'layered',
//   directoryTree: 'my-fastapi-project/\n  app/\n  tests/\n  migrations/',
//   configFiles: ['.env', 'pyproject.toml', 'pytest.ini'],
//   confidence: {
//     entryPoints: 1.0,
//     testLocation: 1.0,
//     architecture: 0.95,
//     overall: 0.9875
//   }
// }
```

### Accuracy Target

**95%** - High accuracy through multi-phase analysis combining authoritative sources (package.json), framework conventions, and heuristic fallbacks.

### Implementation Notes

- Orchestrates all structure analysis sub-functions
- Calculates weighted overall confidence: 50% entry points + 25% test location + 25% architecture
- Returns empty analysis on error (graceful degradation)
- Walking depth limited to 4 levels to balance completeness and performance
- Directory tree limited to 40 directories to prevent overwhelming output

---

## findEntryPoints()

Detects entry points (where code execution starts) using framework-aware priority lists and package.json parsing.

### TypeScript Signature

```typescript
async function findEntryPoints(
  rootPath: string,
  projectType: ProjectType,
  framework: string | null
): Promise<EntryPointResult>
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `rootPath` | `string` | Absolute path to the project root directory |
| `projectType` | `ProjectType` | Project type (determines which patterns to check) |
| `framework` | `string \| null` | Framework name (enables framework-specific shortcuts) |

### Return Value

Returns a `Promise<EntryPointResult>` object:

```typescript
{
  entryPoints: string[];                    // Entry point file paths (relative to rootPath)
  confidence: number;                       // 0.0-1.0
  source: 'package.json-main'
        | 'package.json-exports'
        | 'framework-convention'
        | 'convention'
        | 'not-found';
}
```

### Example

```typescript
// Django project
const djangoResult = await findEntryPoints(
  '/Users/dev/django-app',
  'python',
  'django'
);
// → { entryPoints: ['manage.py'], confidence: 1.0, source: 'framework-convention' }

// Node.js project with package.json
const nodeResult = await findEntryPoints(
  '/Users/dev/express-api',
  'node',
  'express'
);
// → { entryPoints: ['dist/index.js'], confidence: 1.0, source: 'package.json-main' }

// Go microservices
const goResult = await findEntryPoints(
  '/Users/dev/go-services',
  'go',
  null
);
// → { entryPoints: ['cmd/api/main.go', 'cmd/worker/main.go'], confidence: 1.0, source: 'convention' }

// Library project (no entry point)
const libResult = await findEntryPoints(
  '/Users/dev/utils-lib',
  'node',
  null
);
// → { entryPoints: [], confidence: 0.0, source: 'not-found' }
```

### Accuracy Target

**95%** - Very high accuracy through layered detection strategy:
1. Framework-specific shortcuts (100% for Django, NestJS, etc.)
2. Authoritative package.json parsing for Node.js projects
3. Priority-ordered convention lists based on analysis of 50+ real projects per framework

### Detection Strategy

**Priority order:**

1. **Framework conventions** (100% confidence)
   - Django: `manage.py`
   - NestJS: `src/main.ts`
   - FastAPI: `app/main.py`
   - Flask: `app.py`
   - Next.js: `app/layout.tsx` or `pages/_app.tsx`

2. **Package.json** (100% confidence for Node.js)
   - `exports` field (modern, takes precedence)
   - `main` field (legacy fallback)
   - `module` field (ESM-specific)

3. **Convention lists** (95% confidence, priority-ordered)
   - Python: `main.py`, `app.py`, `src/main.py`, etc.
   - Go: `cmd/*/main.go` (glob pattern), `main.go`
   - Rust: `src/main.rs`, `src/lib.rs`

4. **Not found** (0% confidence)
   - Library projects, unrecognized patterns

---

## classifyArchitecture()

Classifies project architecture pattern using directory structure heuristics.

### TypeScript Signature

```typescript
function classifyArchitecture(
  directories: string[],
  entryPoints: string[],
  framework: string | null,
  projectType?: string
): ArchitectureResult
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `directories` | `string[]` | List of directory paths in the project |
| `entryPoints` | `string[]` | Detected entry points (empty array for libraries) |
| `framework` | `string \| null` | Framework name (affects classification, e.g., NestJS modules) |
| `projectType` | `string` | Project type (optional, default: `'unknown'`) |

### Return Value

Returns an `ArchitectureResult` object:

```typescript
{
  architecture: 'layered'
              | 'domain-driven'
              | 'microservices'
              | 'monolith'
              | 'library';
  confidence: number;                       // 0.0-1.0
  indicators: string[];                     // Directories/patterns that led to classification
}
```

### Example

```typescript
// Layered architecture
const layered = classifyArchitecture(
  ['src/models', 'src/services', 'src/api', 'src/utils'],
  ['src/main.py'],
  null
);
// → {
//     architecture: 'layered',
//     confidence: 0.95,
//     indicators: ['models/', 'services/ or domain/', 'api/ or routes/ or controllers/']
//   }

// Domain-driven design
const ddd = classifyArchitecture(
  ['features/users', 'features/orders', 'features/billing'],
  ['src/main.ts'],
  null
);
// → {
//     architecture: 'domain-driven',
//     confidence: 0.90,
//     indicators: ['features/users', 'features/orders', 'features/billing']
//   }

// Microservices
const microservices = classifyArchitecture(
  ['apps/api', 'apps/worker', 'apps/scheduler'],
  ['apps/api/main.py', 'apps/worker/main.py'],
  null
);
// → {
//     architecture: 'microservices',
//     confidence: 0.90,
//     indicators: ['apps/api', 'apps/worker', 'apps/scheduler']
//   }

// Library
const library = classifyArchitecture(
  ['lib/utils', 'lib/helpers', 'pkg/core'],
  [],
  null
);
// → {
//     architecture: 'library',
//     confidence: 0.90,
//     indicators: ['no entry point', 'lib/ or pkg/ directory present']
//   }

// Monolith (no clear pattern)
const monolith = classifyArchitecture(
  ['src/index.ts', 'src/config.ts'],
  ['src/index.ts'],
  null
);
// → {
//     architecture: 'monolith',
//     confidence: 0.70,
//     indicators: ['no clear architectural pattern']
//   }
```

### Accuracy Target

**90%** - Good accuracy for clearly-defined patterns. Architecture classification is inherently more subjective than entry point detection.

### Classification Logic

**Priority order (highest specificity first):**

1. **Microservices** (90% confidence)
   - ≥2 services in `services/*` or `apps/*`
   - ≥2 commands in `cmd/*` (Go projects)

2. **Domain-driven** (80-90% confidence)
   - ≥3 feature directories: `features/*`, `modules/*`, `contexts/*`, `domains/*`
   - ≥2 NestJS modules in `src/modules/*` (special case)

3. **Layered** (70-95% confidence)
   - All three layers present: models + services + api (95%)
   - Two layers present (85%)
   - One layer present (70%)

4. **Library** (90% confidence)
   - No entry points + presence of `lib/` or `pkg/`

5. **Monolith** (70% confidence, default fallback)
   - No clear architectural pattern detected

---

## findTestLocations()

Detects test framework and locations where tests are stored.

### TypeScript Signature

```typescript
async function findTestLocations(
  rootPath: string,
  projectType: ProjectType,
  framework: string | null
): Promise<TestLocationResult>
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `rootPath` | `string` | Absolute path to the project root directory |
| `projectType` | `ProjectType` | Project type (determines which test frameworks to check) |
| `framework` | `string \| null` | Framework name (currently unused, reserved for future use) |

### Return Value

Returns a `Promise<TestLocationResult>` object:

```typescript
{
  testLocations: string[];                  // Directory paths or file patterns
  confidence: number;                       // 0.0-1.0
  framework: 'pytest'
           | 'jest'
           | 'vitest'
           | 'go-test'
           | 'cargo-test'
           | 'unknown';
}
```

### Example

```typescript
// Python project with tests/ directory
const pytestResult = await findTestLocations(
  '/Users/dev/python-app',
  'python',
  null
);
// → { testLocations: ['tests/'], confidence: 1.0, framework: 'pytest' }

// Node.js project with Jest __tests__/ directory
const jestResult = await findTestLocations(
  '/Users/dev/react-app',
  'node',
  null
);
// → { testLocations: ['__tests__/'], confidence: 1.0, framework: 'jest' }

// Node.js project with Vitest config (no dedicated directory)
const vitestResult = await findTestLocations(
  '/Users/dev/vite-app',
  'node',
  null
);
// → { testLocations: ['*.test.ts', '*.spec.ts'], confidence: 0.85, framework: 'vitest' }

// Go project (colocated tests)
const goResult = await findTestLocations(
  '/Users/dev/go-service',
  'go',
  null
);
// → { testLocations: ['*_test.go'], confidence: 1.0, framework: 'go-test' }

// Rust project
const rustResult = await findTestLocations(
  '/Users/dev/rust-cli',
  'rust',
  null
);
// → { testLocations: ['tests/'], confidence: 1.0, framework: 'cargo-test' }
```

### Accuracy Target

**95%** - Very high accuracy as test locations follow strong conventions.

### Detection Strategy by Language

**Python (pytest):**
1. `tests/` directory (100%)
2. `test/` directory (100%)
3. `pytest.ini` or `pyproject.toml` exists → `test_*.py`, `*_test.py` patterns (80%)

**Node.js (Jest/Vitest):**
1. `__tests__/` directory → Jest (100%)
2. `tests/` directory (100%)
3. `test/` directory (100%)
4. `vitest.config.ts` exists → `*.test.ts`, `*.spec.ts` patterns, Vitest (85%)
5. `jest.config.js` or package.json `jest` field exists → test patterns, Jest (85%)

**Go (go test):**
- Always `*_test.go` colocated with source (100%)

**Rust (cargo test):**
- `tests/` directory if exists (100%)
- Otherwise no dedicated location (tests in `src/`)

---

## buildAsciiTree()

Generates a clean ASCII representation of the project directory tree.

### TypeScript Signature

```typescript
async function buildAsciiTree(
  rootPath: string,
  maxDepth?: number,
  maxDirs?: number
): Promise<string>
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `rootPath` | `string` | - | Absolute path to the project root directory |
| `maxDepth` | `number` | `4` | Maximum directory depth to traverse |
| `maxDirs` | `number` | `40` | Maximum number of directories to show |

### Return Value

Returns a `Promise<string>` containing an ASCII tree representation with the following characteristics:
- Project root shown as `{projectName}/`
- Directories indented with 2 spaces per level
- Priority directories (`src`, `lib`, `app`, `tests`, `docs`) shown first
- Remaining directories sorted alphabetically
- Truncation message if directories exceed `maxDirs`

### Example

```typescript
const tree = await buildAsciiTree('/Users/dev/fastapi-project', 4, 40);
console.log(tree);
// Output:
// fastapi-project/
//   app/
//     api/
//       routes/
//     models/
//     services/
//   tests/
//     unit/
//     integration/
//   docs/
//   migrations/
//   alembic/
//   ... 2 more directories

// Custom depth and limit
const smallTree = await buildAsciiTree('/Users/dev/large-project', 2, 10);
// Limits to 2 levels deep and shows max 10 directories
```

### Accuracy Target

**90%** - Accurate structure representation with intelligent truncation to maintain readability.

### Implementation Notes

- Directories are walked to `maxDepth` levels (default: 4)
- Priority sorting ensures important directories (`src`, `lib`, `app`, `tests`, `docs`) appear first
- Remaining directories sorted alphabetically within each level
- Truncation occurs at `maxDirs` (default: 40) with a summary message
- Tree limited to approximately 50 lines of output
- Uses basename for directory names (no full paths in output)

---

## findConfigFiles()

Discovers configuration files commonly found in projects.

### TypeScript Signature

```typescript
async function findConfigFiles(
  rootPath: string,
  projectType: ProjectType
): Promise<string[]>
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `rootPath` | `string` | Absolute path to the project root directory |
| `projectType` | `ProjectType` | Project type (determines which config files to check) |

### Return Value

Returns a `Promise<string[]>` containing relative paths of found configuration files.

### Example

```typescript
// Node.js project
const nodeConfigs = await findConfigFiles('/Users/dev/next-app', 'node');
// → [
//     '.env',
//     '.gitignore',
//     'README.md',
//     'package.json',
//     'tsconfig.json',
//     'next.config.js',
//     '.prettierrc',
//     'eslint.config.mjs'
//   ]

// Python project
const pythonConfigs = await findConfigFiles('/Users/dev/django-app', 'python');
// → [
//     '.env',
//     '.env.local',
//     '.gitignore',
//     'README.md',
//     'pyproject.toml',
//     'requirements.txt',
//     'pytest.ini',
//     'mypy.ini'
//   ]

// Go project
const goConfigs = await findConfigFiles('/Users/dev/go-service', 'go');
// → [
//     '.env',
//     '.gitignore',
//     'README.md',
//     'go.mod',
//     'go.sum',
//     '.golangci.yml'
//   ]

// Rust project
const rustConfigs = await findConfigFiles('/Users/dev/rust-cli', 'rust');
// → [
//     '.gitignore',
//     'README.md',
//     'LICENSE',
//     'Cargo.toml',
//     'Cargo.lock'
//   ]
```

### Accuracy Target

**85%** - Good coverage of common configuration files. Projects may have additional custom configs not detected.

### Config Files by Category

**Common (all projects):**
- `.env`, `.env.local`, `.env.example`
- `.gitignore`
- `README.md`
- `LICENSE`

**Node.js:**
- `package.json`
- `tsconfig.json`, `jsconfig.json`
- `.eslintrc.js`, `eslint.config.mjs`
- `.prettierrc`
- `vite.config.ts`, `vitest.config.ts`
- `jest.config.js`
- `next.config.js`, `nest-cli.json`

**Python:**
- `pyproject.toml`
- `setup.py`, `setup.cfg`
- `requirements.txt`, `Pipfile`
- `pytest.ini`
- `.flake8`, `mypy.ini`

**Go:**
- `go.mod`, `go.sum`
- `.golangci.yml`

**Rust:**
- `Cargo.toml`, `Cargo.lock`
- `rust-toolchain.toml`

### Implementation Notes

- Only checks for existence at project root level
- Does not search subdirectories
- Returns relative paths (e.g., `'tsconfig.json'`, not absolute paths)
- Config lists are comprehensive but not exhaustive
- Order of returned files matches check order (common configs first, then language-specific)

---

## Related Types

### ProjectType

```typescript
type ProjectType =
  | 'python'
  | 'node'
  | 'go'
  | 'rust'
  | 'ruby'
  | 'php'
  | 'mixed'      // Monorepo with multiple languages
  | 'unknown';   // No indicators found
```

### StructureAnalysis

Complete structure analysis result:

```typescript
interface StructureAnalysis {
  directories: Record<string, string>;      // path → purpose
  entryPoints: string[];                    // Entry point files
  testLocation: string | null;              // Test directory or pattern
  architecture: string;                     // Architecture pattern
  directoryTree: string;                    // ASCII tree
  configFiles: string[];                    // Config files found
  confidence: {
    entryPoints: number;                    // 0.0-1.0
    testLocation: number;                   // 0.0-1.0
    architecture: number;                   // 0.0-1.0
    overall: number;                        // Weighted: 50% entry + 25% test + 25% arch
  };
}
```

### EntryPointResult

Entry point detection result:

```typescript
interface EntryPointResult {
  entryPoints: string[];                    // File paths (relative to rootPath)
  confidence: number;                       // 0.0-1.0
  source:
    | 'package.json-main'                   // Node: package.json "main" field
    | 'package.json-exports'                // Node: package.json "exports" field
    | 'framework-convention'                // Framework-specific pattern
    | 'convention'                          // Language convention
    | 'not-found';                          // No entry point detected
}
```

### ArchitectureResult

Architecture classification result:

```typescript
interface ArchitectureResult {
  architecture:
    | 'layered'                             // Technical layers: models/, services/, api/
    | 'domain-driven'                       // Business domains: features/*, modules/*
    | 'microservices'                       // Multiple services: apps/*, services/*, cmd/*
    | 'monolith'                            // Single application
    | 'library';                            // No entry point, exports functions/classes
  confidence: number;                       // 0.0-1.0
  indicators: string[];                     // Directories/patterns that led to classification
}
```

### TestLocationResult

Test location detection result:

```typescript
interface TestLocationResult {
  testLocations: string[];                  // Directories or file patterns
  confidence: number;                       // 0.0-1.0
  framework:
    | 'pytest'                              // Python
    | 'jest'                                // Node
    | 'vitest'                              // Node (modern)
    | 'go-test'                             // Go
    | 'cargo-test'                          // Rust
    | 'unknown';                            // No test framework detected
}
```

---

## Usage Examples

### Complete Workflow

```typescript
import { analyzeStructure } from './analyzers/structure.js';

// Perform complete structure analysis
const analysis = await analyzeStructure(
  '/Users/dev/my-project',
  'node',
  'nestjs'
);

// Access individual components
console.log('Entry points:', analysis.entryPoints);
// → ['src/main.ts']

console.log('Architecture:', analysis.architecture);
// → 'domain-driven'

console.log('Test location:', analysis.testLocation);
// → '__tests__/'

console.log('Directory tree:');
console.log(analysis.directoryTree);
// → my-project/
//   src/
//     modules/
//       users/
//       orders/
//   ...

console.log('Confidence scores:', analysis.confidence);
// → { entryPoints: 1.0, testLocation: 1.0, architecture: 0.85, overall: 0.9625 }
```

### Individual Function Usage

```typescript
import {
  findEntryPoints,
  classifyArchitecture,
  findTestLocations,
  buildAsciiTree,
  findConfigFiles
} from './analyzers/structure.js';

// Find entry points only
const entryPoints = await findEntryPoints('/path/to/project', 'python', 'django');

// Classify architecture (requires directory list)
import { walkDirectories } from './utils/directory.js';
const directories = await walkDirectories('/path/to/project', 4);
const architecture = classifyArchitecture(
  directories,
  entryPoints.entryPoints,
  'django',
  'python'
);

// Find tests
const tests = await findTestLocations('/path/to/project', 'python', 'django');

// Generate tree
const tree = await buildAsciiTree('/path/to/project', 3, 30);

// Find configs
const configs = await findConfigFiles('/path/to/project', 'python');
```

---

## Implementation Status

- **CP0**: Interfaces and placeholders ✓
- **CP1**: Entry point detection ✓
- **CP2**: Architecture classification ✓
- **CP3**: Test location detection and integration ✓

All functions are fully implemented and production-ready.

---

## Accuracy Summary

| Function | Target Accuracy | Rationale |
|----------|----------------|-----------|
| `analyzeStructure()` | **95%** | Orchestration of high-accuracy sub-functions |
| `findEntryPoints()` | **95%** | Authoritative sources (package.json) + framework conventions |
| `classifyArchitecture()` | **90%** | Heuristic-based, subjective nature of architecture patterns |
| `findTestLocations()` | **95%** | Strong testing conventions across languages |
| `buildAsciiTree()` | **90%** | Accurate structure with intelligent truncation |
| `findConfigFiles()` | **85%** | Comprehensive but not exhaustive coverage |

---

## Notes

- All file paths are relative to `rootPath` unless otherwise specified
- Confidence scores range from 0.0 (no confidence) to 1.0 (certain)
- Functions gracefully degrade on errors (empty results, low confidence)
- Glob patterns (e.g., `cmd/*/main.go`) are expanded during detection
- Directory walking is limited to prevent performance issues on large codebases
- Framework-specific logic takes precedence over general conventions
