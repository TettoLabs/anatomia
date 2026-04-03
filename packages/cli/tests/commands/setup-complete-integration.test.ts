import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  validateStructure,
  validateContent,
  validateCrossReferences,
} from '../../src/utils/validators.js';
import { createEmptyAnalysisResult } from '../scaffolds/test-types.js';

describe('ana setup complete integration', () => {
  let tmpDir: string;
  let anaPath: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-test-'));
    anaPath = path.join(tmpDir, '.ana');

    // Create complete .ana/ structure
    await fs.mkdir(path.join(anaPath, 'context'), { recursive: true });
    await fs.mkdir(path.join(anaPath, 'state'), { recursive: true });

    // Create all 7 context files (valid, no scaffold markers)
    const files = [
      'project-overview.md',
      'architecture.md',
      'patterns.md',
      'conventions.md',
      'workflow.md',
      'testing.md',
      'debugging.md',
    ];

    for (const file of files) {
      const content = `# ${file.replace('.md', '').replace('-', ' ')}\n\n## Section 1\n\nContent here\n`;
      await fs.writeFile(path.join(anaPath, 'context', file), content);
    }

    // Create snapshot.json
    const snapshot = createEmptyAnalysisResult();
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
    // Override project-overview to have required sections
    const overview = `# Project Overview — test\n\n## Tech Stack\n\nContent\n`.repeat(5);
    await fs.writeFile(path.join(anaPath, 'context/project-overview.md'), overview);

    const snapshot = createEmptyAnalysisResult();

    const structuralErrors = await validateStructure(anaPath);
    const contentErrors = await validateContent(anaPath);
    const crossRefErrors = await validateCrossReferences(anaPath, snapshot);

    expect(structuralErrors).toHaveLength(0);
    expect(contentErrors).toHaveLength(0);
    expect(crossRefErrors).toHaveLength(0);
  });

  it('fails validation when scaffold marker present', async () => {
    const content = '<!-- SCAFFOLD - Setup will fill this file -->\n\nContent';
    await fs.writeFile(path.join(anaPath, 'context/patterns.md'), content);

    const errors = await validateStructure(anaPath);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.rule === 'BF1')).toBe(true);
  });

  it('fails when required file missing', async () => {
    // Delete one required file
    await fs.unlink(path.join(anaPath, 'context/debugging.md'));

    const errors = await validateStructure(anaPath);
    expect(errors.some(e => e.rule === 'BF2')).toBe(true);
  });

  it('complete flow with all validations', async () => {
    // Create valid project-overview with all sections
    const overview = `# Project Overview — test\n\n## What This Project Is\n\nContent\n\n## Tech Stack\n\n**Framework:** None detected\n\n## Directory Structure\n\nContent\n\n## Current Status\n\nContent\n`;
    await fs.writeFile(path.join(anaPath, 'context/project-overview.md'), overview);

    // Create valid patterns.md
    const patterns = `# Patterns\n\n## Framework Patterns\n\nContent\n`;
    await fs.writeFile(path.join(anaPath, 'context/patterns.md'), patterns);

    const snapshot = createEmptyAnalysisResult();

    const structuralErrors = await validateStructure(anaPath);
    const contentErrors = await validateContent(anaPath);
    const crossRefErrors = await validateCrossReferences(anaPath, snapshot);

    expect(structuralErrors).toHaveLength(0);
    expect(contentErrors).toHaveLength(0);
    expect(crossRefErrors).toHaveLength(0);
  });
});
