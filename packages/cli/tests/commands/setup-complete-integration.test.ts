import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  validateStructure,
  validateContent,
  validateCrossReferences,
} from '../../src/utils/validators.js';
import { createEmptyEngineResult } from '../scaffolds/test-types.js';

describe('ana setup complete integration', () => {
  let tmpDir: string;
  let anaPath: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-test-'));
    anaPath = path.join(tmpDir, '.ana');

    // Create complete .ana/ structure
    await fs.mkdir(path.join(anaPath, 'context'), { recursive: true });
    await fs.mkdir(path.join(anaPath, 'state'), { recursive: true });

    // Create 2 context files (S15: consolidated from 7)
    const projectContext = `# Project Context\n\n## What This Project Does\nContent\n\n## Architecture\nContent\n\n## Key Decisions\nContent\n\n## Key Files\nContent\n\n## Active Constraints\nContent\n\n## Domain Vocabulary\nContent\n`;
    await fs.writeFile(path.join(anaPath, 'context/project-context.md'), projectContext);
    await fs.writeFile(path.join(anaPath, 'context/design-principles.md'), '# Design Principles\n\nContent\n');

    // Create snapshot.json
    const snapshot = createEmptyEngineResult();
    await fs.writeFile(
      path.join(anaPath, 'state/snapshot.json'),
      JSON.stringify(snapshot, null, 2)
    );

    // Create ana.json
    await fs.writeFile(
      path.join(anaPath, 'ana.json'),
      JSON.stringify({ setupMode: 'guided', name: 'test-project', createdAt: new Date().toISOString() })
    );
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('passes validation with valid context files', async () => {
    const snapshot = createEmptyEngineResult();

    const structuralErrors = await validateStructure(anaPath);
    const contentErrors = await validateContent(anaPath);
    const crossRefErrors = await validateCrossReferences(anaPath, snapshot);

    expect(structuralErrors).toHaveLength(0);
    expect(contentErrors).toHaveLength(0);
    expect(crossRefErrors).toHaveLength(0);
  });

  it('fails validation when scaffold marker present', async () => {
    const content = '<!-- SCAFFOLD - Setup will fill this file -->\n\nContent';
    await fs.writeFile(path.join(anaPath, 'context/project-context.md'), content);

    const errors = await validateStructure(anaPath);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.rule === 'BF1')).toBe(true);
  });

  it('fails when required file missing', async () => {
    await fs.unlink(path.join(anaPath, 'context/design-principles.md'));

    const errors = await validateStructure(anaPath);
    expect(errors.some(e => e.rule === 'BF2')).toBe(true);
  });

  it('complete flow with all validations', async () => {
    const snapshot = createEmptyEngineResult();

    const structuralErrors = await validateStructure(anaPath);
    const contentErrors = await validateContent(anaPath);
    const crossRefErrors = await validateCrossReferences(anaPath, snapshot);

    expect(structuralErrors).toHaveLength(0);
    expect(contentErrors).toHaveLength(0);
    expect(crossRefErrors).toHaveLength(0);
  });
});
