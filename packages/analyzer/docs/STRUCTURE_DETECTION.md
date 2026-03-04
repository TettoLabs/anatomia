# Structure Detection User Guide

This guide explains how Anatomia's structure detection works and how to interpret its results.

## What is Structure Detection?

Structure detection is Anatomia's ability to automatically analyze your codebase and understand its organization. It answers critical questions developers ask when joining a project:

- "Where does the application start?" (entry points)
- "Where are the tests?" (test locations)
- "How is the code organized?" (architecture pattern)

### Why It Matters

When you run `ana mode architect`, Anatomia needs to understand your project structure to:

1. **Generate accurate context** - Including the right files in AI conversations
2. **Navigate intelligently** - Finding related code across your architecture
3. **Provide relevant suggestions** - Understanding whether you're building a monolith, microservices, or library
4. **Save time** - No manual configuration required for most projects

Structure detection runs automatically and adapts to your project's language, framework, and organization patterns.

## Entry Point Detection

Entry points are where your code execution starts. Different frameworks and languages have different conventions.

### How It Works

Entry point detection follows this priority order:

1. **Framework-specific shortcuts** (highest confidence)
2. **Package manager manifests** (authoritative for Node.js)
3. **Language conventions** (fallback patterns)

### Framework-Aware Detection

Anatomia recognizes framework-specific entry points with 100% confidence:

#### Python Frameworks

**Django**
```python
# Always: manage.py at project root
python manage.py runserver
```
- Detection: Checks for `manage.py` in root directory
- Confidence: 1.0 (framework convention)
- Indicator: `'manage.py found'`

**FastAPI**
```python
# Convention: app/main.py (85% of projects)
from fastapi import FastAPI
app = FastAPI()
```
- Detection: Looks for `app/main.py`, falls back to `main.py`
- Confidence: 1.0 if found in expected location
- Indicator: `'app/main.py found'`

**Flask**
```python
# Common patterns: app.py (70%) or server.py
from flask import Flask
app = Flask(__name__)
```
- Detection: Checks `app.py`, then priority list
- Confidence: 1.0 for `app.py`, 0.95 for alternatives
- Indicator: `'app.py found'`

#### Node.js Frameworks

**Next.js**
```typescript
// App Router (Next.js 13+): app/layout.tsx
export default function RootLayout({ children }) {
  return <html>...</html>
}

// Pages Router (older): pages/_app.tsx
export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />
}
```
- Detection: Checks `app/layout.tsx` first, then `pages/_app.tsx`
- Confidence: 1.0 (framework convention)
- Indicator: Shows which router type detected

**NestJS**
```typescript
// Always: src/main.ts
import { NestFactory } from '@nestjs/core';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
```
- Detection: Checks for `src/main.ts`
- Confidence: 1.0 (100% NestJS convention)
- Indicator: `'src/main.ts found'`

**Express**
```javascript
// Common patterns: app.js, server.js, or index.js
const express = require('express');
const app = express();
```
- Detection: Checks multiple patterns, can find multiple candidates
- Confidence: 0.95 for single match, 0.75 if ambiguous (both `app.js` and `server.js`)
- Indicator: Shows which file(s) found

### Package.json Detection (Node.js)

For Node.js projects, `package.json` is the authoritative source:

```json
{
  "main": "./dist/index.js",
  "exports": {
    ".": {
      "import": "./esm/index.mjs",
      "require": "./cjs/index.js",
      "default": "./dist/index.js"
    }
  }
}
```

**Priority order:**
1. `exports` field (modern, takes precedence)
2. `main` field (legacy, widely supported)
3. `module` field (ESM-specific)

**Result:**
- Source: `'package.json-exports'` or `'package.json-main'`
- Confidence: 1.0 (definitive)

### Language Conventions

When framework detection doesn't apply, Anatomia uses language-specific patterns:

**Python**
```
Priority:
1. manage.py (Django)
2. app/main.py (FastAPI)
3. main.py (simple projects)
4. app.py (Flask)
5. src/main.py (module-based)
6. __main__.py (package entry)
```

**Go**
```
Priority:
1. cmd/*/main.go (standard layout - 95%)
2. main.go (simple projects - 5%)
```

For Go microservices, all matching `cmd/*/main.go` files are returned:
```
cmd/api-server/main.go
cmd/worker/main.go
cmd/migrator/main.go
```
- Confidence: 1.0 (multiple services detected)

**Rust**
```
Priority:
1. src/main.rs (binary/application)
2. src/lib.rs (library)
```

### Examples

**Django Project**
```
Result: {
  entryPoints: ['manage.py'],
  confidence: 1.0,
  source: 'framework-convention'
}
```

**Express with package.json**
```json
// package.json
{
  "main": "dist/server.js"
}
```
```
Result: {
  entryPoints: ['dist/server.js'],
  confidence: 1.0,
  source: 'package.json-main'
}
```

**Go Microservices**
```
Result: {
  entryPoints: [
    'cmd/api/main.go',
    'cmd/worker/main.go'
  ],
  confidence: 1.0,
  source: 'convention'
}
```

**Ambiguous Express Project** (both app.js and server.js exist)
```
Result: {
  entryPoints: ['app.js', 'server.js'],
  confidence: 0.75,
  source: 'convention'
}
```

## Architecture Classification

Anatomia identifies your project's architectural pattern to understand code organization.

### Patterns Explained

Architecture detection checks patterns in priority order (most specific first):

#### 1. Microservices
**Pattern:** Multiple independent services in the same repository

**Indicators:**
- `services/auth/`, `services/payment/`, `services/notification/` (2+ services)
- `apps/web/`, `apps/mobile/`, `apps/admin/` (2+ apps)
- `cmd/api/`, `cmd/worker/`, `cmd/cli/` (2+ Go commands)

**Example:**
```
project/
  services/
    auth/
      main.py
    payment/
      main.py
    notifications/
      main.py
```

**Detection:**
```typescript
{
  architecture: 'microservices',
  confidence: 0.90,
  indicators: [
    'services/auth',
    'services/payment',
    'services/notifications'
  ]
}
```

**Confidence:** 0.85-0.90 (requires 2+ services)

#### 2. Domain-Driven Design (DDD)
**Pattern:** Code organized by business domains/features

**Indicators:**
- `features/users/`, `features/orders/`, `features/billing/` (3+ features)
- `modules/catalog/`, `modules/cart/`, `modules/checkout/` (3+ modules)
- `contexts/sales/`, `contexts/inventory/` (bounded contexts)
- `src/modules/*/` in NestJS projects (special case)

**Example:**
```
project/
  features/
    authentication/
      models.py
      services.py
      api.py
    orders/
      models.py
      services.py
      api.py
    billing/
      models.py
      services.py
```

**Detection:**
```typescript
{
  architecture: 'domain-driven',
  confidence: 0.90,
  indicators: [
    'features/authentication',
    'features/orders',
    'features/billing'
  ]
}
```

**Confidence:** 0.80-0.90 (requires 2-3+ feature modules)

**NestJS Special Case:**
```
project/
  src/
    modules/
      users/
      products/
      orders/
```
```typescript
{
  architecture: 'domain-driven',
  confidence: 0.85,
  indicators: [
    'NestJS modules/',
    'src/modules/users',
    'src/modules/products'
  ]
}
```

#### 3. Layered Architecture
**Pattern:** Code organized by technical layers

**Indicators:**
- `models/` (data layer)
- `services/` or `domain/` or `business/` (logic layer)
- `api/` or `routes/` or `controllers/` or `handlers/` (presentation layer)

**Example:**
```
project/
  models/
    user.py
    product.py
  services/
    user_service.py
    order_service.py
  api/
    users.py
    products.py
```

**Detection:**
```typescript
{
  architecture: 'layered',
  confidence: 0.95,  // All 3 layers present
  indicators: [
    'models/',
    'services/ or domain/',
    'api/ or routes/ or controllers/'
  ]
}
```

**Confidence:**
- 0.95: All 3 layers present
- 0.85: 2 of 3 layers present
- 0.70: 1 of 3 layers present

#### 4. Library
**Pattern:** No executable entry point, exports functionality

**Indicators:**
- No entry points detected
- `lib/` or `pkg/` directory present

**Example:**
```
project/
  lib/
    utils.py
    helpers.py
  setup.py
```

**Detection:**
```typescript
{
  architecture: 'library',
  confidence: 0.90,
  indicators: [
    'no entry point',
    'lib/ or pkg/ directory present'
  ]
}
```

#### 5. Monolith
**Pattern:** Single application, no clear separation (default fallback)

**Example:**
```
project/
  src/
    utils.py
    config.py
  main.py
```

**Detection:**
```typescript
{
  architecture: 'monolith',
  confidence: 0.70,
  indicators: ['no clear architectural pattern']
}
```

This is the default when no other pattern matches.

### Classification Priority

The detector checks patterns in this order:

1. Microservices (highest specificity)
2. Domain-driven design
3. Layered architecture
4. Library (no entry point)
5. Monolith (default)

**First match wins** - prevents false positives (e.g., a microservice with layered services won't be classified as layered).

## Test Location Detection

Anatomia detects where tests are located and which test framework you're using.

### pytest (Python)

**Detection strategy:**
1. Check for `tests/` directory (most common)
2. Check for `test/` directory (alternative)
3. Check for `pytest.ini` or `pyproject.toml` (config-based)

**Examples:**

**Directory-based:**
```
project/
  tests/
    test_users.py
    test_orders.py
```
```typescript
{
  testLocations: ['tests/'],
  confidence: 1.0,
  framework: 'pytest'
}
```

**Pattern-based:**
```
project/
  src/
    users.py
    test_users.py  // Colocated
  pytest.ini
```
```typescript
{
  testLocations: ['test_*.py', '*_test.py'],
  confidence: 0.80,
  framework: 'pytest'
}
```

### Jest / Vitest (Node.js)

**Detection strategy:**
1. Check for `__tests__/` directory (Jest convention)
2. Check for `tests/` or `test/` directory
3. Check for `vitest.config.ts` or `jest.config.js`
4. Check for `jest` field in `package.json`

**Examples:**

**Jest with __tests__:**
```
project/
  __tests__/
    users.test.ts
    orders.test.ts
```
```typescript
{
  testLocations: ['__tests__/'],
  confidence: 1.0,
  framework: 'jest'
}
```

**Vitest with config:**
```
project/
  src/
    users.test.ts
    orders.test.ts
  vitest.config.ts
```
```typescript
{
  testLocations: ['*.test.ts', '*.spec.ts'],
  confidence: 0.85,
  framework: 'vitest'
}
```

### go test (Go)

Go uses colocated tests with the `_test.go` suffix:

```
project/
  pkg/
    users.go
    users_test.go
    orders.go
    orders_test.go
```

**Result:**
```typescript
{
  testLocations: ['*_test.go'],
  confidence: 1.0,
  framework: 'go-test'
}
```

This is a convention, not a configuration - always returns same result for Go projects.

### cargo test (Rust)

**Detection strategy:**
1. Check for `tests/` directory (integration tests)
2. Unit tests in `src/` files (not detected - inline with source)

**Example:**
```
project/
  tests/
    integration_test.rs
  src/
    lib.rs  // Unit tests inline with #[cfg(test)]
```

**Result:**
```typescript
{
  testLocations: ['tests/'],
  confidence: 1.0,
  framework: 'cargo-test'
}
```

### Summary Table

| Language | Framework | Primary Pattern | Secondary Pattern | Config File |
|----------|-----------|----------------|-------------------|-------------|
| Python | pytest | `tests/` | `test/` | `pytest.ini`, `pyproject.toml` |
| Node.js | Jest | `__tests__/` | `tests/`, `test/` | `jest.config.js`, `package.json` |
| Node.js | Vitest | `tests/` | `*.test.ts` | `vitest.config.ts` |
| Go | go test | `*_test.go` | - | - |
| Rust | cargo test | `tests/` | - | - |

## When Detection Fails

Sometimes structure detection can't determine the correct answer. Here's what happens:

### Edge Cases

#### 1. No Entry Point Detected

**Scenario:** Library project or unconventional structure

```typescript
{
  entryPoints: [],
  confidence: 0.0,
  source: 'not-found'
}
```

**What it means:**
- Your project might be a library (exports functions, no executable)
- Entry point uses a non-standard location
- Missing dependency files (no `package.json`, `go.mod`, etc.)

**Solutions:**
- If it's a library: This is expected, no action needed
- If it's an application: Check that your entry point file exists
- For Node.js: Ensure `package.json` has `main` or `exports` field

#### 2. Ambiguous Entry Points

**Scenario:** Multiple potential entry points found

```typescript
{
  entryPoints: ['app.js', 'server.js', 'index.js'],
  confidence: 0.75,
  source: 'convention'
}
```

**What it means:**
- Your project has multiple files that could be entry points
- Common in Express projects with both `app.js` (application logic) and `server.js` (server startup)

**Solutions:**
- Lower confidence is intentional - Anatomia knows it's uncertain
- The actual entry point is likely in `package.json` scripts
- Consider adding `"main"` field to `package.json` for clarity

#### 3. No Tests Found

**Scenario:** Tests not in standard location

```typescript
{
  testLocations: [],
  confidence: 0.0,
  framework: 'unknown'
}
```

**What it means:**
- No tests directory found
- Tests use non-standard naming
- Project doesn't have tests yet

**Solutions:**
- Move tests to standard location (`tests/`, `__tests__/`, etc.)
- Add test framework config file (`pytest.ini`, `jest.config.js`)
- If no tests exist: This is expected

#### 4. Monolith Classification (Low Confidence)

**Scenario:** No clear architectural pattern

```typescript
{
  architecture: 'monolith',
  confidence: 0.70,
  indicators: ['no clear architectural pattern']
}
```

**What it means:**
- Project structure doesn't match known patterns
- Might be early-stage project
- Could have custom organization

**Solutions:**
- This is a safe default - not an error
- Lower confidence indicates uncertainty
- As project grows, pattern may become clearer

### Troubleshooting

**Q: Why isn't my Django project detecting manage.py?**

A: Check that:
- `manage.py` is in the project root (not subdirectory)
- File is named exactly `manage.py` (case-sensitive on Linux/Mac)
- Django is listed in dependencies (though file check has priority)

**Q: Why are my colocated tests not detected?**

A: Colocated tests (tests next to source files) are only supported for:
- Go: `*_test.go` (always detected)
- Python: When `pytest.ini` exists (pattern-based detection)
- Node.js: When `jest.config.js` exists (pattern-based detection)

For other cases, use a dedicated `tests/` directory.

**Q: My NestJS modules aren't detected as DDD.**

A: Check that:
- Modules are in `src/modules/*/` structure
- At least 2 modules exist (single module = not DDD)
- Framework was detected as "nestjs" or "nest"

**Q: Why does confidence matter?**

A: Confidence scores help you understand reliability:
- **1.0:** Definitive (framework convention, package.json)
- **0.85-0.95:** Very likely correct (strong convention)
- **0.70-0.85:** Probable (pattern match)
- **Below 0.70:** Uncertain (use with caution)

## Confidence Scores Meaning

Anatomia uses confidence scores (0.0 to 1.0) to indicate detection reliability.

### Score Ranges

| Range | Meaning | Interpretation |
|-------|---------|----------------|
| **1.0** | Definitive | Framework convention or authoritative source (package.json) |
| **0.90-0.99** | Very High | Strong convention with verification (config file + directory) |
| **0.85-0.89** | High | Multiple indicators present |
| **0.70-0.84** | Moderate | Pattern match or single indicator |
| **0.60-0.69** | Low | Weak pattern or fallback |
| **0.0** | Not Found | No detection possible |

### Component Confidence

Each detection component has its own confidence:

**Entry Points:**
- 1.0: Framework convention or package.json
- 0.95: Single pattern match
- 0.75: Multiple ambiguous matches
- 0.0: Not found

**Test Locations:**
- 1.0: Standard directory found
- 0.85-0.80: Config file indicates framework
- 0.0: Not found

**Architecture:**
- 0.90-0.95: Strong pattern (microservices, DDD)
- 0.70-0.90: Partial pattern (layered)
- 0.70: Default (monolith)

### Overall Confidence

The overall structure confidence is a **weighted average**:

```
overall = (entryPoints × 50%) + (testLocation × 25%) + (architecture × 25%)
```

**Rationale:**
- Entry points (50%): Most critical for understanding execution
- Test locations (25%): Important for development
- Architecture (25%): Helpful for organization

**Example:**
```typescript
{
  confidence: {
    entryPoints: 1.0,      // manage.py found
    testLocation: 1.0,     // tests/ directory
    architecture: 0.95,    // layered (all 3 layers)
    overall: 0.9875        // (1.0×0.5 + 1.0×0.25 + 0.95×0.25)
  }
}
```

### Using Confidence Scores

**In architect mode:**
- High confidence (>0.85): Anatomia is confident, rely on results
- Medium confidence (0.70-0.85): Probably correct, verify if critical
- Low confidence (<0.70): Uncertain, manual verification recommended

**In your code:**
```typescript
const analysis = await analyze('/path/to/project');

if (analysis.structure.confidence.overall >= 0.85) {
  // Trust the detection
  console.log(`Entry point: ${analysis.structure.entryPoints[0]}`);
} else {
  // Verify manually or use fallback
  console.log('Structure detection uncertain, please verify');
}
```

### Confidence vs Correctness

**Important:** High confidence means Anatomia is certain based on conventions, but it's not a guarantee of correctness if:
- Your project uses non-standard conventions
- Files exist but aren't actually used
- Package.json points to non-existent files

Always use confidence as a signal, not absolute truth.

## Full Example

Here's a complete structure detection result for a FastAPI project:

**Project Structure:**
```
my-api/
  app/
    main.py
    models/
      user.py
    services/
      user_service.py
    api/
      users.py
  tests/
    test_users.py
  .env
  pyproject.toml
  pytest.ini
```

**Detection Result:**
```typescript
{
  directories: {
    'app/': 'Application code',
    'app/models/': 'Data models',
    'app/services/': 'Business logic',
    'app/api/': 'API routes/endpoints',
    'tests/': 'Tests'
  },

  entryPoints: ['app/main.py'],

  testLocation: 'tests/',

  architecture: 'layered',

  directoryTree: `my-api/
    app/
      models/
      services/
      api/
    tests/`,

  configFiles: [
    '.env',
    'pyproject.toml',
    'pytest.ini',
    'README.md'
  ],

  confidence: {
    entryPoints: 1.0,      // FastAPI convention (app/main.py)
    testLocation: 1.0,     // pytest directory found
    architecture: 0.95,    // All 3 layers present
    overall: 0.9875        // Weighted average
  }
}
```

**Interpretation:**
- Entry point: Start reading from `app/main.py`
- Tests: Run `pytest tests/`
- Architecture: Layered (models → services → api)
- Confidence: Very high (98.75%) - reliable detection

## References

- **Source Code:** `/packages/analyzer/src/analyzers/structure.ts`
- **Type Definitions:** `/packages/analyzer/src/types/structure.ts`
- **Detection Flow:** `/packages/analyzer/docs/STRUCTURE_FLOW.md`
- **API Documentation:** `/packages/analyzer/docs/STRUCTURE_API.md`

## Next Steps

- Learn about framework detection: See `/packages/analyzer/src/detectors/framework.ts`
- Understand project type detection: See `/packages/analyzer/src/detectors/projectType.ts`
- Explore directory walking: See `/packages/analyzer/src/utils/directory.ts`
