# @anatomia/analyzer API Documentation

> Comprehensive API reference for the Anatomia code analysis engine

**Version:** 0.1.0
**Package:** `@anatomia/analyzer`

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Functions](#core-functions)
  - [analyze()](#analyze)
  - [detectProjectType()](#detectprojecttype)
  - [detectFramework()](#detectframework)
- [Dependency Parsers](#dependency-parsers)
  - [readPythonDependencies()](#readpythondependencies)
  - [readNodeDependencies()](#readnodedependencies)
  - [parseRequirementsTxt()](#parserequirementstxt)
  - [parsePackageJson()](#parsepackagejson)
  - [parsePyprojectToml()](#parsepyprojecttoml)
- [Framework Detectors](#framework-detectors)
  - [detectFastAPI()](#detectfastapi)
  - [detectNextjs()](#detectnextjs)
- [Utility Functions](#utility-functions)
  - [calculateConfidence()](#calculateconfidence)
  - [scanForImports()](#scanforimports)
  - [File Utilities](#file-utilities)
- [Types & Interfaces](#types--interfaces)
- [Error Handling](#error-handling)

---

## Installation

```bash
npm install @anatomia/analyzer
# or
pnpm add @anatomia/analyzer
# or
yarn add @anatomia/analyzer
```

---

## Quick Start

```typescript
import { analyze } from '@anatomia/analyzer';

// Analyze a project
const result = await analyze('/path/to/project');

console.log(result.projectType); // 'python' | 'node' | 'go' | 'rust' | etc.
console.log(result.framework);   // 'fastapi' | 'nextjs' | 'django' | etc.
console.log(result.confidence);  // { projectType: 0.95, framework: 0.90 }
console.log(result.indicators);  // Files and signals that led to detection
```

---

## Core Functions

### analyze()

Main entry point for project analysis. Orchestrates all detection phases including monorepo detection, project type detection, framework detection, and confidence scoring.

#### Signature

```typescript
async function analyze(
  rootPath: string,
  options?: AnalyzeOptions
): Promise<AnalysisResult>
```

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| `rootPath` | `string` | Absolute path to the project root directory |
| `options` | `AnalyzeOptions` | Optional analysis configuration |

#### AnalyzeOptions

```typescript
interface AnalyzeOptions {
  skipImportScan?: boolean;  // Skip import scanning for faster analysis (default: false)
  skipMonorepo?: boolean;    // Skip monorepo detection (default: false)
  maxFiles?: number;         // Maximum files to scan for imports (default: 7)
  strictMode?: boolean;      // Throw errors instead of returning empty result (default: false)
  verbose?: boolean;         // Enable verbose logging (default: false)
}
```

#### Return Type

```typescript
interface AnalysisResult {
  projectType: ProjectType;           // Detected project type
  framework: string | null;           // Detected framework (null if none)
  confidence: {
    projectType: number;              // 0.0-1.0 confidence score
    framework: number;                // 0.0-1.0 confidence score
  };
  indicators: {
    projectType: string[];            // Files found (e.g., ["package.json"])
    framework: string[];              // Signals found (e.g., ["next in dependencies"])
  };
  detectedAt: string;                 // ISO timestamp
  version: string;                    // Tool version
}
```

#### Description

The `analyze()` function performs comprehensive project analysis in multiple phases:

1. **Monorepo Detection**: Identifies if the project uses monorepo tools (pnpm, Turborepo, Nx, Lerna)
2. **Project Type Detection**: Determines primary language (Python, Node.js, Go, Rust, Ruby, PHP)
3. **Framework Detection**: Identifies specific frameworks with priority-based disambiguation
4. **Confidence Scoring**: Calculates confidence scores based on multiple signals

#### Usage Example

```typescript
import { analyze } from '@anatomia/analyzer';

// Basic usage
const result = await analyze('/Users/dev/my-project');
console.log(result);
// {
//   projectType: 'node',
//   framework: 'nextjs',
//   confidence: { projectType: 0.95, framework: 1.0 },
//   indicators: {
//     projectType: ['package.json', 'package-lock.json'],
//     framework: ['next in dependencies', 'next.config.js found', 'app/ directory (App Router)']
//   },
//   detectedAt: '2026-02-24T10:30:00.000Z',
//   version: '0.1.0-alpha'
// }

// With options
const fastResult = await analyze('/Users/dev/my-project', {
  skipImportScan: true,  // Skip import scanning for faster analysis
  strictMode: true       // Throw errors instead of returning empty result
});

// Strict mode example
try {
  const strictResult = await analyze('/invalid/path', { strictMode: true });
} catch (error) {
  console.error('Analysis failed:', error);
}
```

#### Possible Errors

| Error Type | Code | Condition | Resolution |
|------------|------|-----------|------------|
| `DetectionEngineError` | `FILE_NOT_FOUND` | Project directory doesn't exist | Verify path is correct |
| `DetectionEngineError` | `PERMISSION_DENIED` | No read access to directory | Check file permissions |
| `DetectionEngineError` | `NO_SOURCE_FILES` | No source files found | Ensure project has source code |
| Generic `Error` | N/A | Unexpected failure (strictMode only) | Check error message for details |

**Note:** In non-strict mode (default), errors are caught and an empty result is returned instead of throwing.

---

### detectProjectType()

Detects the primary project type (programming language) by scanning for dependency files.

#### Signature

```typescript
async function detectProjectType(
  rootPath: string
): Promise<ProjectTypeResult>
```

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| `rootPath` | `string` | Absolute path to the project root directory |

#### Return Type

```typescript
interface ProjectTypeResult {
  type: ProjectType;          // Detected project type
  confidence: number;         // 0.0-1.0 confidence score
  indicators: string[];       // Files found that led to detection
}

type ProjectType =
  | 'python'   // Python project
  | 'node'     // Node.js project
  | 'go'       // Go project
  | 'rust'     // Rust project
  | 'ruby'     // Ruby project
  | 'php'      // PHP project
  | 'mixed'    // Monorepo with multiple languages
  | 'unknown'; // No indicators found
```

#### Description

Scans the project directory for language-specific dependency files and determines the primary project type. Detection is based on the presence of:

- **Python**: `requirements.txt`, `pyproject.toml`, `Pipfile`, `setup.py`
- **Node.js**: `package.json`, `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`
- **Go**: `go.mod`, `go.sum`
- **Rust**: `Cargo.toml`, `Cargo.lock`
- **Ruby**: `Gemfile`, `Gemfile.lock`
- **PHP**: `composer.json`, `composer.lock`

#### Usage Example

```typescript
import { detectProjectType } from '@anatomia/analyzer';

const result = await detectProjectType('/Users/dev/fastapi-app');
console.log(result);
// {
//   type: 'python',
//   confidence: 0.95,
//   indicators: ['requirements.txt', 'pyproject.toml']
// }

// Check if detection was successful
if (result.type === 'unknown') {
  console.log('Could not determine project type');
} else if (result.confidence < 0.5) {
  console.log('Low confidence detection - manual verification recommended');
}
```

#### Possible Errors

| Error Type | Code | Condition | Resolution |
|------------|------|-----------|------------|
| `DetectionEngineError` | `FILE_NOT_FOUND` | Directory doesn't exist | Verify path exists |
| `DetectionEngineError` | `PERMISSION_DENIED` | Cannot read directory | Check permissions |
| Returns `'unknown'` | N/A | No dependency files found | Add dependency files to project |

---

### detectFramework()

Detects the specific framework used in a project based on the project type.

#### Signature

```typescript
async function detectFramework(
  rootPath: string,
  projectType: ProjectType
): Promise<FrameworkResult>
```

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| `rootPath` | `string` | Absolute path to the project root directory |
| `projectType` | `ProjectType` | Previously detected project type |

#### Return Type

```typescript
interface FrameworkResult {
  framework: string | null;   // Detected framework name (null if none)
  confidence: number;         // 0.0-1.0 confidence score
  indicators: string[];       // Signals that led to detection
}
```

#### Description

Identifies the specific framework used based on project type. Uses **priority-based disambiguation** to prevent false positives:

**Python Frameworks** (in priority order):
1. FastAPI (before Flask/Django)
2. Django (checks for DRF vs plain Django)
3. Flask
4. CLI frameworks (Typer before Click)

**Node.js Frameworks** (in priority order):
1. Next.js (before React - Next includes React)
2. Nest.js (before Express - Nest uses Express)
3. Express
4. React
5. Vue, Svelte, Angular, etc.

**Go Frameworks**: Gin, Echo, Chi, Fiber
**Rust Frameworks**: Axum, Actix Web, Rocket

#### Usage Example

```typescript
import { detectFramework, detectProjectType } from '@anatomia/analyzer';

// First detect project type
const projectType = await detectProjectType('/Users/dev/my-app');

// Then detect framework
const framework = await detectFramework('/Users/dev/my-app', projectType.type);
console.log(framework);
// {
//   framework: 'nextjs',
//   confidence: 1.0,
//   indicators: [
//     'next in dependencies',
//     'next.config.js found',
//     'app/ directory (App Router)'
//   ]
// }

// Example with Python/FastAPI
const pythonResult = await detectFramework('/Users/dev/api', 'python');
// {
//   framework: 'fastapi',
//   confidence: 0.95,
//   indicators: [
//     'fastapi in dependencies',
//     'imports found (12 occurrences)',
//     'companion packages: uvicorn, pydantic'
//   ]
// }
```

#### Possible Errors

| Error Type | Code | Condition | Resolution |
|------------|------|-----------|------------|
| `DetectionEngineError` | `NO_DEPENDENCIES` | No dependency files found | Install dependencies first |
| `DetectionEngineError` | `PARSE_ERROR` | Cannot parse dependency file | Validate file syntax |
| Returns `null` framework | N/A | No framework detected | May be a vanilla project |

---

## Dependency Parsers

### readPythonDependencies()

Reads Python dependencies from all available formats in a project directory.

#### Signature

```typescript
async function readPythonDependencies(
  rootPath: string,
  collector?: DetectionCollector
): Promise<string[]>
```

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| `rootPath` | `string` | Absolute path to the project root directory |
| `collector` | `DetectionCollector` | Optional error collector for warnings and info |

#### Return Type

```typescript
string[] // Array of unique, lowercase package names
```

#### Description

Reads and combines Python dependencies from all available formats in priority order:

1. `requirements.txt` (most common)
2. `pyproject.toml` (modern standard - PEP 621 and Poetry formats)
3. `Pipfile` (Pipenv)

All package names are normalized to lowercase and deduplicated. If parsing fails for one format, continues to try others and collects warnings via the optional `collector` parameter.

#### Usage Example

```typescript
import { readPythonDependencies } from '@anatomia/analyzer';

// Basic usage
const deps = await readPythonDependencies('/Users/dev/python-app');
console.log(deps);
// ['fastapi', 'uvicorn', 'pydantic', 'sqlalchemy', 'pytest']

// With error collector
import { DetectionCollector } from '@anatomia/analyzer';

const collector = new DetectionCollector();
const depsWithErrors = await readPythonDependencies(
  '/Users/dev/python-app',
  collector
);

// Check for warnings
if (collector.hasWarnings()) {
  console.log('Parsing warnings:', collector.getWarnings());
}

// Example output for corrupted requirements.txt
console.log(deps); // Still returns deps from pyproject.toml
// Warnings: [{
//   code: 'PARSE_ERROR',
//   message: 'Failed to parse requirements.txt',
//   suggestion: 'Validate syntax: pip-compile --dry-run requirements.txt'
// }]
```

#### Possible Errors

| Error Type | Code | Condition | Behavior |
|------------|------|-----------|----------|
| Warning | `PARSE_ERROR` | Cannot parse requirements.txt | Continues to pyproject.toml |
| Warning | `PARSE_ERROR` | Cannot parse pyproject.toml | Continues to Pipfile |
| Warning | `PARSE_ERROR` | Cannot parse Pipfile | Returns deps found so far |
| Info | `NO_DEPENDENCIES` | No dependency files found | Returns empty array |

**Note:** This function never throws errors. It uses graceful degradation and returns whatever dependencies it can find.

---

### readNodeDependencies()

Reads Node.js dependencies from package.json.

#### Signature

```typescript
async function readNodeDependencies(
  rootPath: string
): Promise<string[]>
```

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| `rootPath` | `string` | Absolute path to the project root directory |

#### Return Type

```typescript
string[] // Array of unique, lowercase package names (preserves @ for scoped packages)
```

#### Description

Reads and combines dependencies from all sections of `package.json`:
- `dependencies` - Production dependencies
- `devDependencies` - Development dependencies (includes build tools, testing frameworks)
- `peerDependencies` - Peer dependencies

Scoped package names (e.g., `@nestjs/core`) preserve the `@` symbol for accurate framework detection.

#### Usage Example

```typescript
import { readNodeDependencies } from '@anatomia/analyzer';

const deps = await readNodeDependencies('/Users/dev/nextjs-app');
console.log(deps);
// [
//   'next',
//   'react',
//   'react-dom',
//   '@types/react',
//   '@types/node',
//   'typescript',
//   'eslint'
// ]

// Check for specific framework
if (deps.includes('next')) {
  console.log('Next.js detected');
}

// Check for scoped packages
const hasNestJS = deps.some(dep => dep.startsWith('@nestjs/'));
console.log('NestJS detected:', hasNestJS);
```

#### Possible Errors

| Error Type | Code | Condition | Behavior |
|------------|------|-----------|----------|
| Warning (logged) | `PARSE_ERROR` | Cannot parse package.json | Returns empty array |
| None | N/A | File doesn't exist | Returns empty array |

**Note:** Parsing errors are logged to console as warnings but don't throw exceptions.

---

### parseRequirementsTxt()

Parses Python requirements.txt content and extracts package names.

#### Signature

```typescript
function parseRequirementsTxt(content: string): string[]
```

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| `content` | `string` | Raw content of a requirements.txt file |

#### Return Type

```typescript
string[] // Array of unique lowercase package names
```

#### Description

Parses requirements.txt files according to pip's specification ([PEP 508](https://peps.python.org/pep-0508/)), extracting only package names while handling various edge cases:

**Handled Edge Cases:**
1. Blank lines (skipped)
2. Comments (lines starting with `#` and inline comments)
3. Options/includes (lines starting with `-e`, `-r`, `--option`)
4. Extras in brackets (e.g., `requests[security]` → `requests`)
5. Environment markers (e.g., `; python_version >= "3.8"`)
6. VCS URLs (e.g., `git+https://...`) - automatically skipped
7. Package name normalization (Django → django)

#### Usage Example

```typescript
import { parseRequirementsTxt } from '@anatomia/analyzer';

// Basic usage with versions
const deps1 = parseRequirementsTxt('flask==2.0.1\ndjango>=3.0');
console.log(deps1);
// ['flask', 'django']

// Comments and blank lines
const deps2 = parseRequirementsTxt(`
# Web framework
flask==2.0.1  # Production web server

# ORM
django>=3.0
`);
console.log(deps2);
// ['flask', 'django']

// Extras in brackets
const deps3 = parseRequirementsTxt('requests[security,socks]>=2.0');
console.log(deps3);
// ['requests']

// Environment markers
const deps4 = parseRequirementsTxt('django>=3.0; python_version >= "3.8"');
console.log(deps4);
// ['django']

// Complex real-world example
const deps5 = parseRequirementsTxt(`
# Development tools
-e git+https://github.com/user/repo.git#egg=mypackage
-r dev-requirements.txt

# Core dependencies
Flask==2.0.1
Django>=3.0; python_version >= "3.8"
requests[security,socks]>=2.0  # HTTP client

# Testing
pytest>=7.0
`);
console.log(deps5);
// ['flask', 'django', 'requests', 'pytest']
```

#### Possible Errors

**None** - This function never throws errors. Invalid lines are silently skipped.

---

### parsePackageJson()

Parses Node.js package.json content and extracts package names.

#### Signature

```typescript
function parsePackageJson(content: string): string[]
```

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| `content` | `string` | Raw content of a package.json file (must be valid JSON) |

#### Return Type

```typescript
string[] // Array of unique lowercase package names
```

#### Description

Parses package.json files according to [npm's specification](https://docs.npmjs.com/cli/v10/configuring-npm/package-json), extracting package names from all dependency sections:

- `dependencies` - Production dependencies
- `devDependencies` - Development dependencies (critical for detecting build tools like Vite, TypeScript)
- `peerDependencies` - Peer dependencies

Package names are normalized to lowercase while preserving the `@` symbol for scoped packages (e.g., `@nestjs/core`).

#### Usage Example

```typescript
import { parsePackageJson } from '@anatomia/analyzer';

// Basic usage
const deps1 = parsePackageJson(JSON.stringify({
  dependencies: {
    "express": "^4.18.0",
    "next": "15.0.0"
  }
}));
console.log(deps1);
// ['express', 'next']

// Scoped packages (preserve @ symbol)
const deps2 = parsePackageJson(JSON.stringify({
  dependencies: {
    "@nestjs/core": "^10.0.0",
    "@types/node": "^20.0.0"
  }
}));
console.log(deps2);
// ['@nestjs/core', '@types/node']

// All dependency sections
const deps3 = parsePackageJson(JSON.stringify({
  dependencies: {
    "express": "^4.18.0"
  },
  devDependencies: {
    "vitest": "^2.0.0",
    "typescript": "^5.7.0"
  },
  peerDependencies: {
    "react": ">=18.0.0"
  }
}));
console.log(deps3);
// ['express', 'vitest', 'typescript', 'react']

// Malformed JSON (graceful degradation)
const deps4 = parsePackageJson('{ invalid json }');
console.log(deps4);
// []

// Empty or missing sections
const deps5 = parsePackageJson(JSON.stringify({
  name: "my-app"
}));
console.log(deps5);
// []
```

#### Possible Errors

**None** - This function never throws errors. It uses graceful degradation:
- Invalid JSON returns empty array
- Missing dependency sections are skipped
- Non-object values are ignored

---

### parsePyprojectToml()

Parses Python pyproject.toml content and extracts package names.

#### Signature

```typescript
function parsePyprojectToml(content: string): string[]
```

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| `content` | `string` | Raw content of a pyproject.toml file |

#### Return Type

```typescript
string[] // Array of unique lowercase package names
```

#### Description

Parses pyproject.toml files supporting both modern and legacy formats:

- **PEP 621 (Standard)**: `[project]` section with `dependencies = ["package>=version"]`
- **Poetry (Legacy)**: `[tool.poetry.dependencies]` and `[tool.poetry.group.dev.dependencies]`

**Note:** Poetry 2.0+ prefers PEP 621 format, but legacy format is still common in existing projects.

#### Usage Example

```typescript
import { parsePyprojectToml } from '@anatomia/analyzer';

// PEP 621 format (modern standard)
const deps1 = parsePyprojectToml(`
[project]
name = "my-app"
dependencies = [
    "fastapi>=0.100.0",
    "uvicorn[standard]>=0.23.0",
    "pydantic>=2.0.0"
]
`);
console.log(deps1);
// ['fastapi', 'uvicorn', 'pydantic']

// Poetry format (legacy)
const deps2 = parsePyprojectToml(`
[tool.poetry.dependencies]
python = "^3.11"
fastapi = "^0.100.0"
uvicorn = {extras = ["standard"], version = "^0.23.0"}

[tool.poetry.group.dev.dependencies]
pytest = "^7.4.0"
black = "^23.7.0"
`);
console.log(deps2);
// ['fastapi', 'uvicorn', 'pytest', 'black']
// Note: 'python' is automatically excluded

// Mixed format (both PEP 621 and Poetry)
const deps3 = parsePyprojectToml(`
[project]
dependencies = ["django>=4.2"]

[tool.poetry.dependencies]
djangorestframework = "^3.14.0"
`);
console.log(deps3);
// ['django', 'djangorestframework']
```

#### Possible Errors

**None** - This function never throws errors. Invalid TOML or missing sections return empty array.

---

## Framework Detectors

### detectFastAPI()

Detects FastAPI framework in Python projects using multi-signal confidence scoring.

#### Signature

```typescript
async function detectFastAPI(
  rootPath: string,
  dependencies: string[]
): Promise<Detection>
```

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| `rootPath` | `string` | Absolute path to the project root directory |
| `dependencies` | `string[]` | List of dependency names from requirements.txt/pyproject.toml |

#### Return Type

```typescript
interface Detection {
  framework: string | null;   // 'fastapi' or null
  confidence: number;         // 0.0-1.0 confidence score
  indicators: string[];       // Signals that led to detection
}
```

#### Description

Detects FastAPI using a multi-signal approach:

1. **Primary Signal (Required)**: Check if `fastapi` exists in dependencies (weight: 0.80)
2. **Verification Signal**: Scan source files for FastAPI imports (weight: 0.15)
3. **Bonus Signal**: Check for companion packages like `uvicorn` (ASGI server) and `pydantic` (validation) (weight: 0.05)

**Confidence Weights:**
- Dependency found: 0.80 (authoritative)
- Imports found: 0.15 (verification)
- Companion packages: 0.05 (bonus)

If `fastapi` is not in dependencies, immediately returns `null` with 0.0 confidence.

#### Usage Example

```typescript
import { detectFastAPI, readPythonDependencies } from '@anatomia/analyzer';

// Basic usage
const deps = await readPythonDependencies('/Users/dev/fastapi-app');
const result = await detectFastAPI('/Users/dev/fastapi-app', deps);
console.log(result);
// {
//   framework: 'fastapi',
//   confidence: 0.95,
//   indicators: [
//     'fastapi in dependencies',
//     'imports found (12 occurrences)',
//     'companion packages: uvicorn, pydantic'
//   ]
// }

// No FastAPI detected
const noFastAPI = await detectFastAPI('/Users/dev/flask-app', ['flask', 'jinja2']);
console.log(noFastAPI);
// {
//   framework: null,
//   confidence: 0.0,
//   indicators: []
// }

// Low confidence (dependency only, no imports)
const lowConfidence = await detectFastAPI('/Users/dev/new-project', ['fastapi']);
console.log(lowConfidence);
// {
//   framework: 'fastapi',
//   confidence: 0.80,
//   indicators: ['fastapi in dependencies']
// }
```

#### Possible Errors

**None** - This function never throws errors. It returns a Detection result with appropriate confidence scores.

---

### detectNextjs()

Detects Next.js framework in Node.js projects.

#### Signature

```typescript
async function detectNextjs(
  rootPath: string,
  dependencies: string[]
): Promise<Detection>
```

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| `rootPath` | `string` | Absolute path to the project root directory |
| `dependencies` | `string[]` | List of dependency names from package.json |

#### Return Type

```typescript
interface Detection {
  framework: string | null;   // 'nextjs' or null
  confidence: number;         // 0.0-1.0 confidence score
  indicators: string[];       // Signals that led to detection
}
```

#### Description

Detects Next.js using multiple signals. **CRITICAL:** Must be checked BEFORE React detection since Next.js includes React as a dependency.

**Detection Signals:**
1. **Primary Signal (Required)**: Check if `next` exists in dependencies (base: 0.85)
2. **Config File**: Presence of `next.config.js`, `next.config.ts`, or `next.config.mjs` (+0.10)
3. **Directory Structure**: Presence of `app/` directory (App Router) or `pages/` directory (Pages Router) (+0.05)

If `next` is not in dependencies, immediately returns `null` with 0.0 confidence.

#### Usage Example

```typescript
import { detectNextjs, readNodeDependencies } from '@anatomia/analyzer';

// Full detection (all signals)
const deps = await readNodeDependencies('/Users/dev/nextjs-app');
const result = await detectNextjs('/Users/dev/nextjs-app', deps);
console.log(result);
// {
//   framework: 'nextjs',
//   confidence: 1.0,
//   indicators: [
//     'next in dependencies',
//     'next.config.js found',
//     'app/ directory (App Router)'
//   ]
// }

// Pages Router (legacy)
const pagesResult = await detectNextjs('/Users/dev/nextjs-pages', deps);
// {
//   framework: 'nextjs',
//   confidence: 1.0,
//   indicators: [
//     'next in dependencies',
//     'next.config.js found',
//     'pages/ directory (Pages Router)'
//   ]
// }

// Minimal Next.js project (dependency only)
const minimal = await detectNextjs('/Users/dev/minimal-next', ['next', 'react']);
// {
//   framework: 'nextjs',
//   confidence: 0.85,
//   indicators: ['next in dependencies']
// }

// Not Next.js
const notNext = await detectNextjs('/Users/dev/react-app', ['react', 'react-dom']);
// {
//   framework: null,
//   confidence: 0.0,
//   indicators: []
// }
```

#### Possible Errors

**None** - This function never throws errors. Returns Detection result with appropriate confidence.

---

## Utility Functions

### calculateConfidence()

Calculates framework detection confidence based on multiple signals.

#### Signature

```typescript
function calculateConfidence(signals: ConfidenceSignals): number
```

#### Parameters

```typescript
interface ConfidenceSignals {
  dependencyFound: boolean;              // Package found in dependencies
  importsFound: boolean;                 // Imports found in source code
  configFilesFound: boolean;             // Framework config files exist
  frameworkSpecificPatterns?: boolean;   // Framework-specific patterns detected
}
```

#### Return Type

```typescript
number // Confidence score between 0.0 and 1.0
```

#### Description

Calculates a confidence score using a weighted multi-signal approach:

| Signal | Weight | Purpose |
|--------|--------|---------|
| `dependencyFound` | 0.80 | Authoritative - package declared in dependencies |
| `importsFound` | 0.15 | Verification - package actually used in code |
| `configFilesFound` | 0.05 | Bonus - framework config files present |
| `frameworkSpecificPatterns` | 0.05 | Bonus - framework-specific patterns (e.g., companion packages) |

**Confidence Level Interpretation:**
- **High (≥0.80)**: Safe for auto-template application
- **Moderate (0.50-0.79)**: Recommend verification
- **Low (0.30-0.49)**: Require manual confirmation
- **Uncertain (<0.30)**: Flag for manual review

#### Usage Example

```typescript
import { calculateConfidence } from '@anatomia/analyzer';

// Maximum confidence (all signals present)
const maxConfidence = calculateConfidence({
  dependencyFound: true,           // +0.80
  importsFound: true,              // +0.15
  configFilesFound: false,         // +0.00
  frameworkSpecificPatterns: true  // +0.05
});
console.log(maxConfidence); // 1.0

// High confidence (dependency + imports)
const highConfidence = calculateConfidence({
  dependencyFound: true,    // +0.80
  importsFound: true,       // +0.15
  configFilesFound: false,  // +0.00
});
console.log(highConfidence); // 0.95

// Moderate confidence (dependency only)
const moderateConfidence = calculateConfidence({
  dependencyFound: true,
  importsFound: false,
  configFilesFound: false,
});
console.log(moderateConfidence); // 0.80

// Low confidence (no dependency, but imports found)
const lowConfidence = calculateConfidence({
  dependencyFound: false,
  importsFound: true,       // +0.15
  configFilesFound: true,   // +0.05
});
console.log(lowConfidence); // 0.20

// Interpret confidence level
import { interpretConfidence } from '@anatomia/analyzer';

const interpretation = interpretConfidence(0.95);
console.log(interpretation);
// {
//   level: 'high',
//   message: 'High confidence - safe for auto-apply'
// }
```

#### Possible Errors

**None** - This is a pure function that never throws errors.

---

### scanForImports()

Scans source files for framework import patterns to boost detection confidence.

#### Signature

```typescript
async function scanForImports(
  rootPath: string,
  framework: string,
  options?: ScanOptions
): Promise<{ found: boolean; count: number }>
```

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| `rootPath` | `string` | Absolute path to the project root directory |
| `framework` | `string` | Framework name to scan for (e.g., 'fastapi', 'nextjs') |
| `options` | `ScanOptions` | Optional scanning configuration |

```typescript
interface ScanOptions {
  maxFiles?: number;        // Maximum files to scan (default: 7)
  excludeDirs?: string[];   // Directories to skip (default: node_modules, venv, etc.)
}
```

#### Return Type

```typescript
{
  found: boolean;   // True if any imports found
  count: number;    // Total number of import occurrences
}
```

#### Description

Scans up to 6-8 source files for framework import patterns using regex matching. Files are sampled from the root directory and `src/` or `app/` directories. Scanning is parallelized for performance (typical: 40-80ms).

**Supported Frameworks:**
- **Python**: fastapi, django, flask
- **Node.js**: next, react, express, nestjs
- **Go**: gin, echo, chi
- **Rust**: axum, actix

**Default Excluded Directories:**
`node_modules`, `venv`, `.venv`, `__pycache__`, `dist`, `build`, `target`, `.git`, `vendor`

#### Usage Example

```typescript
import { scanForImports } from '@anatomia/analyzer';

// Basic usage
const result = await scanForImports('/Users/dev/fastapi-app', 'fastapi');
console.log(result);
// { found: true, count: 12 }

// With custom options
const customResult = await scanForImports(
  '/Users/dev/large-project',
  'nextjs',
  {
    maxFiles: 10,                    // Scan more files
    excludeDirs: ['node_modules', 'dist', 'tmp']
  }
);
console.log(customResult);
// { found: true, count: 25 }

// No imports found
const noImports = await scanForImports('/Users/dev/empty-project', 'django');
console.log(noImports);
// { found: false, count: 0 }

// Use in detection logic
const importScan = await scanForImports(rootPath, 'fastapi');
if (importScan.found) {
  console.log(`Found ${importScan.count} FastAPI import occurrences`);
  confidence += 0.15; // Boost confidence
}
```

#### Possible Errors

**None** - This function never throws errors. Returns `{ found: false, count: 0 }` if:
- No source files found
- Framework not supported
- Directory not readable

---

### File Utilities

Utility functions for file system operations.

#### exists()

Check if a file or directory exists.

```typescript
async function exists(filePath: string): Promise<boolean>
```

**Example:**
```typescript
import { exists } from '@anatomia/analyzer';

const hasPackageJson = await exists('/Users/dev/project/package.json');
if (hasPackageJson) {
  console.log('Node.js project detected');
}
```

#### readFile()

Read file content as UTF-8 string. Returns empty string if file doesn't exist (graceful).

```typescript
async function readFile(filePath: string): Promise<string>
```

**Example:**
```typescript
import { readFile } from '@anatomia/analyzer';

const content = await readFile('/Users/dev/project/requirements.txt');
// Returns '' if file doesn't exist
```

#### isDirectory()

Check if a path is a directory.

```typescript
async function isDirectory(filePath: string): Promise<boolean>
```

**Example:**
```typescript
import { isDirectory } from '@anatomia/analyzer';

const isSrcDir = await isDirectory('/Users/dev/project/src');
if (isSrcDir) {
  console.log('Source directory found');
}
```

#### joinPath()

Join path segments safely (cross-platform).

```typescript
function joinPath(...segments: string[]): string
```

**Example:**
```typescript
import { joinPath } from '@anatomia/analyzer';

const configPath = joinPath(rootPath, 'config', 'settings.json');
// Cross-platform: handles / vs \ correctly
```

---

## Types & Interfaces

### Core Types

```typescript
// Project types
type ProjectType =
  | 'python'
  | 'node'
  | 'go'
  | 'rust'
  | 'ruby'
  | 'php'
  | 'mixed'
  | 'unknown';

// Analysis result
interface AnalysisResult {
  projectType: ProjectType;
  framework: string | null;
  confidence: {
    projectType: number;
    framework: number;
  };
  indicators: {
    projectType: string[];
    framework: string[];
  };
  detectedAt: string;
  version: string;
}

// Detection result
interface Detection {
  framework: string | null;
  confidence: number;
  indicators: string[];
}

// Project type result
interface ProjectTypeResult {
  type: ProjectType;
  confidence: number;
  indicators: string[];
}

// Framework result
interface FrameworkResult {
  framework: string | null;
  confidence: number;
  indicators: string[];
}

// Confidence signals
interface ConfidenceSignals {
  dependencyFound: boolean;
  importsFound: boolean;
  configFilesFound: boolean;
  frameworkSpecificPatterns?: boolean;
}
```

### Options Types

```typescript
// Analysis options
interface AnalyzeOptions {
  skipImportScan?: boolean;
  skipMonorepo?: boolean;
  maxFiles?: number;
  strictMode?: boolean;
  verbose?: boolean;
}

// Scan options
interface ScanOptions {
  maxFiles?: number;
  excludeDirs?: string[];
}
```

### Helper Functions

```typescript
// Create empty result for tests/placeholders
function createEmptyAnalysisResult(): AnalysisResult

// Validate result at runtime (throws ZodError if invalid)
function validateAnalysisResult(data: unknown): AnalysisResult

// Interpret confidence level
function interpretConfidence(confidence: number): {
  level: 'high' | 'moderate' | 'low' | 'uncertain';
  message: string;
}
```

---

## Error Handling

### DetectionEngineError

Custom error class for detection engine errors.

```typescript
class DetectionEngineError extends Error {
  code: string;
  severity: 'error' | 'warning' | 'info';
  file?: string;
  line?: number;
  suggestion?: string;
  phase?: string;

  constructor(
    code: string,
    message: string,
    severity?: 'error' | 'warning' | 'info',
    options?: {
      file?: string;
      line?: number;
      suggestion?: string;
      phase?: string;
      cause?: Error;
    }
  )
}
```

### Error Codes

```typescript
const ERROR_CODES = {
  // File operations
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  IS_DIRECTORY: 'IS_DIRECTORY',
  ENCODING_ERROR: 'ENCODING_ERROR',

  // Parsing
  INVALID_JSON: 'INVALID_JSON',
  INVALID_YAML: 'INVALID_YAML',
  INVALID_TOML: 'INVALID_TOML',
  PARSE_ERROR: 'PARSE_ERROR',

  // Detection
  NO_SOURCE_FILES: 'NO_SOURCE_FILES',
  NO_DEPENDENCIES: 'NO_DEPENDENCIES',
  FRAMEWORK_DETECTION_FAILED: 'FRAMEWORK_DETECTION_FAILED',
  MISSING_MANIFEST: 'MISSING_MANIFEST',
  CIRCULAR_DEPENDENCY: 'CIRCULAR_DEPENDENCY',
  IMPORT_SCAN_FAILED: 'IMPORT_SCAN_FAILED',

  // Monorepo
  MONOREPO_DETECTED: 'MONOREPO_DETECTED',

  // System
  TIMEOUT: 'TIMEOUT',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;
```

### Error Handling Example

```typescript
import {
  analyze,
  DetectionEngineError,
  ERROR_CODES
} from '@anatomia/analyzer';

try {
  const result = await analyze('/path/to/project', { strictMode: true });
  console.log(result);
} catch (error) {
  if (error instanceof DetectionEngineError) {
    console.error('Detection error:', {
      code: error.code,
      message: error.message,
      severity: error.severity,
      file: error.file,
      suggestion: error.suggestion,
      phase: error.phase
    });

    // Handle specific errors
    if (error.code === ERROR_CODES.FILE_NOT_FOUND) {
      console.error('Project directory not found');
    } else if (error.code === ERROR_CODES.PERMISSION_DENIED) {
      console.error('Permission denied - check file permissions');
    }
  } else {
    console.error('Unexpected error:', error);
  }
}

// Non-strict mode (default) - no throwing
const result = await analyze('/path/to/project');
if (result.projectType === 'unknown') {
  console.log('Could not detect project type');
}
```

### DetectionCollector

Error collector for gathering warnings and info messages during detection.

```typescript
import {
  DetectionCollector,
  readPythonDependencies
} from '@anatomia/analyzer';

const collector = new DetectionCollector();
const deps = await readPythonDependencies('/path/to/project', collector);

// Check for issues
if (collector.hasErrors()) {
  console.error('Errors:', collector.getErrors());
}

if (collector.hasWarnings()) {
  console.warn('Warnings:', collector.getWarnings());
}

if (collector.hasInfo()) {
  console.info('Info:', collector.getInfo());
}

// Get all collected issues
const allIssues = collector.getAll();
console.log('All issues:', allIssues);
```

---

## Complete Usage Example

```typescript
import {
  analyze,
  detectProjectType,
  detectFramework,
  readPythonDependencies,
  readNodeDependencies,
  calculateConfidence,
  interpretConfidence,
  type AnalysisResult,
  type ProjectType
} from '@anatomia/analyzer';

async function analyzeProject(projectPath: string) {
  // Full analysis (recommended)
  const result: AnalysisResult = await analyze(projectPath, {
    verbose: true,
    maxFiles: 10
  });

  console.log('Project Type:', result.projectType);
  console.log('Framework:', result.framework || 'None detected');
  console.log('Confidence:', result.confidence);
  console.log('Indicators:', result.indicators);

  // Interpret confidence
  const typeConfidence = interpretConfidence(result.confidence.projectType);
  const frameworkConfidence = interpretConfidence(result.confidence.framework);

  console.log('Project Type Confidence:', typeConfidence.message);
  console.log('Framework Confidence:', frameworkConfidence.message);

  // Manual detection (granular control)
  const projectType = await detectProjectType(projectPath);

  if (projectType.type === 'python') {
    const deps = await readPythonDependencies(projectPath);
    console.log('Python dependencies:', deps);

    const framework = await detectFramework(projectPath, 'python');
    if (framework.framework === 'fastapi') {
      console.log('FastAPI detected!');
      console.log('Indicators:', framework.indicators);
    }
  } else if (projectType.type === 'node') {
    const deps = await readNodeDependencies(projectPath);
    console.log('Node.js dependencies:', deps);

    const framework = await detectFramework(projectPath, 'node');
    if (framework.framework === 'nextjs') {
      console.log('Next.js detected!');
      console.log('Indicators:', framework.indicators);
    }
  }

  return result;
}

// Usage
analyzeProject('/Users/dev/my-project')
  .then(result => console.log('Analysis complete:', result))
  .catch(error => console.error('Analysis failed:', error));
```

---

## Additional Resources

- **GitHub Repository**: [anatomia](https://github.com/yourusername/anatomia)
- **Issue Tracker**: [Report Issues](https://github.com/yourusername/anatomia/issues)
- **Template Guide**: See `TEMPLATE_GUIDE.md` for template creation
- **Contributing**: See `CONTRIBUTING.md` for contribution guidelines

---

## License

MIT License - See LICENSE file for details

---

**Last Updated:** 2026-02-24
**Version:** 0.1.0-alpha
