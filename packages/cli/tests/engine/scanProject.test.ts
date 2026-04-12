import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { scanProject } from '../../src/engine/scan-engine.js';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('scanProject()', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `engine-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  async function createFiles(files: Record<string, string>): Promise<void> {
    for (const [filePath, content] of Object.entries(files)) {
      const fullPath = join(tempDir, filePath);
      await mkdir(join(fullPath, '..'), { recursive: true });
      await writeFile(fullPath, content);
    }
  }

  it('surface scan returns all top-level keys', async () => {
    await createFiles({
      'package.json': JSON.stringify({ name: 'test', version: '1.0.0' }),
    });

    const result = await scanProject(tempDir, { depth: 'surface' });

    const expectedKeys = [
      'overview', 'stack', 'files', 'structure',
      'commands', 'git', 'monorepo', 'externalServices', 'schemas',
      'secrets', 'projectProfile', 'blindSpots', 'deployment',
      'patterns', 'conventions',
    ];
    for (const key of expectedKeys) {
      expect(result).toHaveProperty(key);
    }
    expect(result.overview.depth).toBe('surface');
    expect(result.patterns).toBeNull();
    expect(result.conventions).toBeNull();
  });

  it('detects stack from dependencies', async () => {
    await createFiles({
      'package.json': JSON.stringify({
        name: 'test',
        dependencies: { next: '14.0.0', '@prisma/client': '5.0.0' },
        devDependencies: { vitest: '2.0.0' },
      }),
    });

    const result = await scanProject(tempDir, { depth: 'surface' });

    expect(result.stack.framework).toBe('Next.js');
    expect(result.stack.database).toBe('Prisma');
    expect(result.stack.testing).toEqual(['Vitest']);
  });

  it('detects git info when repo exists', async () => {
    await createFiles({
      'package.json': JSON.stringify({ name: 'test' }),
    });
    execSync('git init && git add -A && git commit -m "init"', {
      cwd: tempDir, stdio: 'pipe',
    });

    const result = await scanProject(tempDir, { depth: 'surface' });

    expect(result.git.head).not.toBeNull();
    expect(result.git.branch).not.toBeNull();
    expect(result.git.commitCount).toBeGreaterThanOrEqual(1);
  });

  it('detects commands from package.json scripts', async () => {
    await createFiles({
      'package.json': JSON.stringify({
        name: 'test',
        scripts: { build: 'next build', test: 'vitest run', lint: 'eslint .' },
      }),
    });

    const result = await scanProject(tempDir, { depth: 'surface' });

    expect(result.commands.build).not.toBeNull();
    expect(result.commands.test).not.toBeNull();
    expect(result.commands.lint).not.toBeNull();
    expect(typeof result.commands.packageManager).toBe('string');
  });

  it('detects external services and schemas', async () => {
    await createFiles({
      'package.json': JSON.stringify({
        name: 'test',
        dependencies: { stripe: '15.0.0', '@prisma/client': '5.0.0' },
      }),
      'prisma/schema.prisma': 'model User { id Int @id }\nmodel Post { id Int @id }',
    });

    const result = await scanProject(tempDir, { depth: 'surface' });

    expect(result.externalServices.length).toBeGreaterThan(0);
    expect(result.externalServices.some(s => s.name === 'Stripe')).toBe(true);
    expect(result.schemas['prisma']).toBeDefined();
    expect(result.schemas['prisma']!.found).toBe(true);
    expect(result.schemas['prisma']!.modelCount).toBe(2);
    // SCAN-042 regression: backwards-compat — monolith layout still works.
    expect(result.schemas['prisma']!.path).toBe('prisma/schema.prisma');
  });

  // SCAN-042: monorepo sub-package ORM schema detection. 5 of 22 target-
  // customer projects had Prisma inside a packages/<pkg>/ sub-directory;
  // the old root-only glob missed them and fired a misleading blind spot.
  it('detects Prisma schema in a monorepo sub-package (SCAN-042)', async () => {
    await createFiles({
      'package.json': JSON.stringify({
        name: 'monorepo-root',
        dependencies: { '@prisma/client': '5.0.0' },
      }),
      'packages/db/prisma/schema.prisma':
        'model User { id Int @id }\nmodel Post { id Int @id }\nmodel Comment { id Int @id }',
    });

    const result = await scanProject(tempDir, { depth: 'surface' });

    expect(result.schemas['prisma']).toBeDefined();
    expect(result.schemas['prisma']!.found).toBe(true);
    expect(result.schemas['prisma']!.path).toBe('packages/db/prisma/schema.prisma');
    expect(result.schemas['prisma']!.modelCount).toBe(3);
    // Blind spot should NOT fire because the schema was found.
    expect(result.blindSpots.find(b => b.area === 'Database' && /Prisma/.test(b.issue))).toBeUndefined();
  });

  it('detects Drizzle schema in a monorepo sub-package (SCAN-042)', async () => {
    await createFiles({
      'package.json': JSON.stringify({
        name: 'monorepo-root',
        dependencies: { 'drizzle-orm': '0.30.0' },
      }),
      'apps/api/drizzle/schema.ts': 'export const users = pgTable("users", {});',
    });

    const result = await scanProject(tempDir, { depth: 'surface' });

    expect(result.schemas['drizzle']).toBeDefined();
    expect(result.schemas['drizzle']!.found).toBe(true);
    expect(result.schemas['drizzle']!.path).toBe('apps/api/drizzle/schema.ts');
  });

  it('handles empty directory gracefully', async () => {
    const result = await scanProject(tempDir, { depth: 'surface' });

    expect(result.overview.project).toBeDefined();
    expect(result.stack.language).toBeNull();
    expect(result.files.total).toBe(0);
  });

  // ============================================================================
  // SCAN-023: Non-Node composition-layer tests
  //
  // Every existing scanProject fixture was Node/TypeScript. The composition
  // layer (allDeps merge, file counts, packageManager assignment, blind spot
  // suppression) had zero non-Node coverage — Lane 1's SCAN-032 (nullable
  // packageManager) and SCAN-033 (missing-tests blind spot) shipped with
  // Node-only tests. These three fixtures lock non-Node behavior so any
  // regression surfaces at the composition layer, not at the detector layer.
  // ============================================================================

  it('scans a Python project with pyproject.toml (PEP 621 + optional-dependencies)', async () => {
    // Modern Python project format: PEP 621 [project] table with
    // [project.optional-dependencies] for test/dev deps. This is the format
    // SCAN-023's pyproject parser fix was specifically added to handle.
    await createFiles({
      'pyproject.toml': `[project]
name = "test-py"
version = "0.1.0"
dependencies = [
  "fastapi>=0.100.0",
  "sqlalchemy>=2.0",
]

[project.optional-dependencies]
test = [
  "pytest>=7.0",
  "pytest-asyncio",
]
dev = [
  "black",
  "mypy",
]
`,
      'src/main.py': '# entry point',
      'tests/test_main.py': '# test file',
    });

    const result = await scanProject(tempDir, { depth: 'surface' });

    expect(result.stack.language).toBe('Python');
    expect(result.stack.framework).toBe('FastAPI');
    // SCAN-032 lock: Node package manager never leaks into non-Node results.
    expect(result.commands.packageManager).toBeNull();
    expect(result.commands.build).toBeNull();
    expect(result.commands.test).toBeNull();
    // SCAN-033 + SCAN-023 interaction: pytest IS detected via optional-deps
    // (not just top-level `dependencies`), AND a test file exists — so the
    // missing-tests blind spot must not fire.
    expect(
      result.blindSpots.find(
        b => b.area === 'Testing' && /test framework|test files/.test(b.issue)
      )
    ).toBeUndefined();
  });

  it('scans a Go project with go.mod', async () => {
    await createFiles({
      'go.mod': `module example.com/test

go 1.21

require github.com/gin-gonic/gin v1.9.1
`,
      'main.go': 'package main\n\nfunc main() {}\n',
    });

    const result = await scanProject(tempDir, { depth: 'surface' });

    expect(result.stack.language).toBe('Go');
    expect(result.stack.framework).toBe('Gin');
    // SCAN-032 lock
    expect(result.commands.packageManager).toBeNull();
  });

  it('scans a Rust project with Cargo.toml', async () => {
    await createFiles({
      'Cargo.toml': `[package]
name = "test-rs"
version = "0.1.0"

[dependencies]
axum = "0.7"
tokio = { version = "1", features = ["full"] }
`,
      'src/main.rs': 'fn main() {}\n',
    });

    const result = await scanProject(tempDir, { depth: 'surface' });

    expect(result.stack.language).toBe('Rust');
    // axum isn't in FRAMEWORK_DISPLAY_NAMES — the detector returns the raw
    // framework key and the display layer passes it through.
    expect(result.stack.framework).toBe('axum');
    // SCAN-032 lock
    expect(result.commands.packageManager).toBeNull();
  });
});
