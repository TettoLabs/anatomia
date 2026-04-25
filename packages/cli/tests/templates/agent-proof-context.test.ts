import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';

const templatesDir = path.join(__dirname, '../../templates/.claude/agents');

function readTemplate(filename: string): string {
  return readFileSync(path.join(templatesDir, filename), 'utf-8');
}

describe('Agent Proof Context Queries', () => {
  // @ana A001
  it('ana.md references the targeted proof context command during exploration', () => {
    const content = readTemplate('ana.md');
    expect(content).toContain('ana proof context');
  });

  // @ana A002
  it('ana.md checkpoint does not reference PROOF_CHAIN.md', () => {
    const content = readTemplate('ana.md');
    // Find the checkpoint paragraph (starts with "ALWAYS present the structured preview")
    const checkpointStart = content.indexOf('ALWAYS present the structured preview');
    expect(checkpointStart).toBeGreaterThan(-1);
    // Extract from checkpoint to the next section heading
    const checkpointEnd = content.indexOf('\n#', checkpointStart);
    const checkpoint = content.slice(checkpointStart, checkpointEnd > -1 ? checkpointEnd : undefined);
    expect(checkpoint).not.toContain('PROOF_CHAIN.md');
  });

  // @ana A003
  it('ana.md Step 1 (Before Scoping) does not reference PROOF_CHAIN.md', () => {
    const content = readTemplate('ana.md');
    // Step 1 is "Before Scoping or Recommending" — find its section
    const step1Start = content.indexOf('### 1. Before Scoping or Recommending');
    expect(step1Start).toBeGreaterThan(-1);
    const step1End = content.indexOf('\n### 2.', step1Start);
    const step1 = content.slice(step1Start, step1End > -1 ? step1End : undefined);
    expect(step1).not.toContain('PROOF_CHAIN.md');
  });

  // @ana A004
  it('ana-verify.md references the targeted proof context command', () => {
    const content = readTemplate('ana-verify.md');
    expect(content).toContain('ana proof context');
  });

  // @ana A005
  it('ana-verify.md includes a fallback for when the command is unavailable', () => {
    const content = readTemplate('ana-verify.md');
    expect(content).toContain('If the command is not available');
  });

  // @ana A006
  it('ana-plan.md has no PROOF_CHAIN.md references', () => {
    const content = readTemplate('ana-plan.md');
    expect(content).not.toContain('PROOF_CHAIN.md');
  });

  // @ana A007
  it('ana-build.md has no PROOF_CHAIN.md references', () => {
    const content = readTemplate('ana-build.md');
    expect(content).not.toContain('PROOF_CHAIN.md');
  });

  // @ana A008
  it('dogfood agent definitions match the shipped templates exactly', () => {
    const dogfoodDir = path.join(__dirname, '../../../../.claude/agents');
    const files = ['ana.md', 'ana-plan.md', 'ana-build.md', 'ana-verify.md'];

    for (const file of files) {
      const template = readTemplate(file);
      const dogfood = readFileSync(path.join(dogfoodDir, file), 'utf-8');
      expect(dogfood, `${file} dogfood should match template`).toBe(template);
    }
  });
});
