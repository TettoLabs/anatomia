/**
 * Tests for S16 check.ts dashboard — setup status, skill counting, consistency, symbols
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  readSetupProgress,
  countEntriesInSection,
  checkSkillSections,
  checkSkill,
  checkConsistency,
} from '../../src/commands/check.js';
import { AnaJsonSchema } from '../../src/commands/init/anaJsonSchema.js';

/**
 * Helper to build a fully-validated AnaJson from a partial test object.
 * Uses the real schema so defaults + catches are applied, matching how
 * `check.ts:readAnaJson` parses ana.json at runtime.
 */
function mockAnaJson(partial: Record<string, unknown> = {}) {
  return AnaJsonSchema.parse(partial);
}

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-check-dashboard-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

// ── Setup Status ──

describe('setup status', () => {
  it('returns null when no setup-progress.json', async () => {
    const result = await readSetupProgress(tmpDir);
    expect(result).toBeNull();
  });

  it('reads Phase 1 completed with timestamp', async () => {
    const stateDir = path.join(tmpDir, '.ana', 'state');
    await fs.mkdir(stateDir, { recursive: true });
    await fs.writeFile(
      path.join(stateDir, 'setup-progress.json'),
      JSON.stringify({
        phases: {
          confirm: { completed: true, timestamp: '2026-04-07T12:00:00.000Z' },
          enrich: { completed: false },
          principles: { completed: false },
        },
      })
    );

    const result = await readSetupProgress(tmpDir);
    expect(result).not.toBeNull();
    expect(result!.phases.confirm?.completed).toBe(true);
    expect(result!.phases.confirm?.timestamp).toBe('2026-04-07T12:00:00.000Z');
    expect(result!.phases.enrich?.completed).toBe(false);
    expect(result!.phases.principles?.completed).toBe(false);
  });

  it('handles partial phases correctly', async () => {
    const stateDir = path.join(tmpDir, '.ana', 'state');
    await fs.mkdir(stateDir, { recursive: true });
    await fs.writeFile(
      path.join(stateDir, 'setup-progress.json'),
      JSON.stringify({
        phases: {
          confirm: { completed: true, timestamp: '2026-04-07T12:00:00.000Z' },
          enrich: { completed: true, timestamp: '2026-04-07T12:30:00.000Z' },
          principles: { completed: false },
        },
      })
    );

    const result = await readSetupProgress(tmpDir);
    expect(result!.phases.confirm?.completed).toBe(true);
    expect(result!.phases.enrich?.completed).toBe(true);
    expect(result!.phases.principles?.completed).toBe(false);
  });
});

// ── Skill Entry Counting ──

describe('skill entry counting', () => {
  it('counts Detected and Rules entries correctly', () => {
    const content = `# Coding Standards

## Detected
- TypeScript detected
- camelCase functions (75%)
- relative imports (100%)
- exception-based error handling
- Vitest for testing

## Rules
- Use camelCase for functions
- Prefer named exports
- Handle errors explicitly

## Gotchas

## Examples
`;
    expect(countEntriesInSection(content, 'Detected')).toBe(5);
    expect(countEntriesInSection(content, 'Rules')).toBe(3);
  });

  it('returns 0 for empty sections', () => {
    const content = `# Skill

## Detected
<!-- empty -->

## Rules

## Gotchas

## Examples
`;
    expect(countEntriesInSection(content, 'Detected')).toBe(0);
    expect(countEntriesInSection(content, 'Rules')).toBe(0);
  });

  it('handles troubleshooting stub', () => {
    const content = `# Troubleshooting

## Detected
<!-- Populated by scan during init. Do not edit manually. -->

## Rules
<!-- Starts empty. Add failure modes as you discover them. -->

## Gotchas
<!-- Starts empty. Add failure modes as you discover them. -->

## Examples
<!-- Optional. Add short snippets showing the RIGHT way. -->
`;
    expect(countEntriesInSection(content, 'Detected')).toBe(0);
    expect(countEntriesInSection(content, 'Rules')).toBe(0);
  });

  it('counts indented list items as entries too', () => {
    const content = `## Rules
- Top-level rule
  - Sub-item (also counted after trimStart)
- Another rule

## Gotchas
`;
    // trimStart() means indented "  - " is also matched
    expect(countEntriesInSection(content, 'Rules')).toBe(3);
  });
});

// ── Skill Section Validation ──

describe('skill section validation', () => {
  it('passes with all 4 sections in order', () => {
    const content = `# Coding Standards

## Detected
content

## Rules
content

## Gotchas
content

## Examples
content
`;
    const result = checkSkillSections(content);
    expect(result.valid).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it('fails when section is missing', () => {
    const content = `# Coding Standards

## Detected
content

## Rules
content

## Examples
content
`;
    const result = checkSkillSections(content);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('Gotchas');
  });

  it('fails when sections are out of order', () => {
    const content = `# Coding Standards

## Rules
content

## Detected
content

## Gotchas
content

## Examples
content
`;
    const result = checkSkillSections(content);
    expect(result.valid).toBe(false);
  });

  it('reports multiple missing sections', () => {
    const content = `# Skill

## Detected
content

## Rules
content
`;
    const result = checkSkillSections(content);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('Gotchas');
    expect(result.missing).toContain('Examples');
  });
});

// ── Skill Check (integration) ──

describe('skill check', () => {
  it('returns ✓ for skill with Detected entries', async () => {
    const skillDir = path.join(tmpDir, '.claude', 'skills', 'coding-standards');
    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(
      path.join(skillDir, 'SKILL.md'),
      `# Coding Standards

## Detected
- TypeScript
- camelCase functions

## Rules
- Use camelCase

## Gotchas

## Examples
`
    );

    const result = await checkSkill(tmpDir, 'coding-standards');
    expect(result.symbol).toContain('✓');
    expect(result.detectedCount).toBe(2);
    expect(result.rulesCount).toBe(1);
  });

  it('returns ○ for skill with 0 Rules (valid)', async () => {
    const skillDir = path.join(tmpDir, '.claude', 'skills', 'testing-standards');
    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(
      path.join(skillDir, 'SKILL.md'),
      `# Testing Standards

## Detected

## Rules

## Gotchas

## Examples
`
    );

    const result = await checkSkill(tmpDir, 'testing-standards');
    expect(result.symbol).toContain('○');
    expect(result.detectedCount).toBe(0);
    expect(result.rulesCount).toBe(0);
  });

  it('returns ○ for troubleshooting stub', async () => {
    const skillDir = path.join(tmpDir, '.claude', 'skills', 'troubleshooting');
    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(
      path.join(skillDir, 'SKILL.md'),
      `# Troubleshooting

## Detected

## Rules

## Gotchas

## Examples
`
    );

    const result = await checkSkill(tmpDir, 'troubleshooting');
    expect(result.symbol).toContain('○');
    expect(result.description).toBe('stub (grows over time)');
  });

  it('returns ✗ for skill missing a section', async () => {
    const skillDir = path.join(tmpDir, '.claude', 'skills', 'broken-skill');
    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(
      path.join(skillDir, 'SKILL.md'),
      `# Broken

## Detected

## Rules
`
    );

    const result = await checkSkill(tmpDir, 'broken-skill');
    expect(result.symbol).toContain('✗');
    expect(result.description).toContain('missing sections');
  });

  it('returns ✗ for missing skill file', async () => {
    const result = await checkSkill(tmpDir, 'nonexistent');
    expect(result.symbol).toContain('✗');
    expect(result.description).toBe('file not found');
  });
});

// ── Consistency Checks ──

describe('consistency checks', () => {
  it('reports "awaiting setup enrichment" when Detected is empty (S19/SETUP-025)', async () => {
    // Create skill files with empty Detected (template state). The pre-S19
    // behavior silently reported "aligned" here, which was phantom
    // verification: the check was skipped because there was nothing to
    // compare against, but the ✓ symbol implied verification had passed.
    const codingDir = path.join(tmpDir, '.claude', 'skills', 'coding-standards');
    await fs.mkdir(codingDir, { recursive: true });
    await fs.writeFile(
      path.join(codingDir, 'SKILL.md'),
      `# Coding Standards\n\n## Detected\n<!-- empty -->\n\n## Rules\n\n## Gotchas\n\n## Examples\n`
    );

    const anaJson = mockAnaJson({ language: 'TypeScript', artifactBranch: 'main', commands: { test: 'vitest' } });
    const results = await checkConsistency(tmpDir, anaJson, null);

    // Empty Detected → ○ awaiting enrichment (NOT ✓ aligned)
    const skillResult = results.find(r => r.label === 'ana.json ↔ skills');
    expect(skillResult?.symbol).toContain('○');
    expect(skillResult?.detail).toContain('awaiting setup enrichment');
    expect(skillResult?.detail).toContain('coding-standards');
  });

  it('reports mismatch when Detected content contradicts ana.json', async () => {
    const codingDir = path.join(tmpDir, '.claude', 'skills', 'coding-standards');
    await fs.mkdir(codingDir, { recursive: true });
    await fs.writeFile(
      path.join(codingDir, 'SKILL.md'),
      `# Coding Standards\n\n## Detected\n- Python detected\n- snake_case functions\n\n## Rules\n\n## Gotchas\n\n## Examples\n`
    );

    const anaJson = mockAnaJson({ language: 'TypeScript', artifactBranch: 'main', commands: {} });
    const results = await checkConsistency(tmpDir, anaJson, null);

    const skillResult = results.find(r => r.label === 'ana.json ↔ skills');
    expect(skillResult?.symbol).toContain('✗');
    expect(skillResult?.detail).toContain('mismatch');
  });

  it('reports stale when scan.json is newer', async () => {
    const anaJson = mockAnaJson({ lastScanAt: '2026-04-06T00:00:00.000Z' });
    const scanJson = { overview: { scannedAt: '2026-04-07T00:00:00.000Z' } };
    const results = await checkConsistency(tmpDir, anaJson, scanJson);

    const freshness = results.find(r => r.label === 'Detected ↔ scan.json');
    expect(freshness?.symbol).toContain('✗');
    expect(freshness?.detail).toContain('stale');
  });

  it('reports current when timestamps match', async () => {
    const ts = '2026-04-07T12:00:00.000Z';
    const anaJson = mockAnaJson({ lastScanAt: ts });
    const scanJson = { overview: { scannedAt: ts } };
    const results = await checkConsistency(tmpDir, anaJson, scanJson);

    const freshness = results.find(r => r.label === 'Detected ↔ scan.json');
    expect(freshness?.symbol).toContain('✓');
    expect(freshness?.detail).toBe('current');
  });

  it('skips staleness check when no scan.json', async () => {
    const anaJson = mockAnaJson({ lastScanAt: '2026-04-06T00:00:00.000Z' });
    const results = await checkConsistency(tmpDir, anaJson, null);

    const freshness = results.find(r => r.label === 'Detected ↔ scan.json');
    expect(freshness).toBeUndefined();
  });
});

// ── Context File Dashboard ──

describe('context file dashboard checks', () => {
  it('project-context with all 6 sections shows ✓', async () => {
    const contextDir = path.join(tmpDir, '.ana', 'context');
    await fs.mkdir(contextDir, { recursive: true });
    await fs.writeFile(
      path.join(contextDir, 'project-context.md'),
      `# Project Context

## What This Project Does
A CLI tool for AI-assisted development.

## Architecture
Monorepo with packages.

## Key Decisions
TypeScript everywhere.

## Key Files
packages/cli/src/index.ts

## Active Constraints
Must support Node 18+.

## Domain Vocabulary
Context file, skill, scan.
`
    );

    // Import the function dynamically to test
    const { checkContextForDashboard } = await import('../../src/commands/check.js');
    const result = await checkContextForDashboard(tmpDir, 'project-context.md');
    expect(result.symbol).toContain('✓');
  });

  it('project-context missing a section shows ✗', async () => {
    const contextDir = path.join(tmpDir, '.ana', 'context');
    await fs.mkdir(contextDir, { recursive: true });
    await fs.writeFile(
      path.join(contextDir, 'project-context.md'),
      `# Project Context

## What This Project Does
content

## Architecture
content

## Key Decisions
content
`
    );

    const { checkContextForDashboard } = await import('../../src/commands/check.js');
    const result = await checkContextForDashboard(tmpDir, 'project-context.md');
    expect(result.symbol).toContain('✗');
    expect(result.description).toContain('missing sections');
  });

  it('design-principles empty shows ○', async () => {
    const contextDir = path.join(tmpDir, '.ana', 'context');
    await fs.mkdir(contextDir, { recursive: true });
    await fs.writeFile(
      path.join(contextDir, 'design-principles.md'),
      `# Design Principles

<!-- Add your design principles here -->
`
    );

    const { checkContextForDashboard } = await import('../../src/commands/check.js');
    const result = await checkContextForDashboard(tmpDir, 'design-principles.md');
    expect(result.symbol).toContain('○');
  });

  it('design-principles with multiline HTML comment shows ○ (not false ✓)', async () => {
    const contextDir = path.join(tmpDir, '.ana', 'context');
    await fs.mkdir(contextDir, { recursive: true });
    await fs.writeFile(
      path.join(contextDir, 'design-principles.md'),
      `# Design Principles

<!-- What does your team believe about building software?
     What tradeoffs do you consistently make?
     What quality bar do you hold?

     This file is yours. Write your philosophy here.
     Ana reads this to understand HOW your team thinks,
     not just WHAT your project does.

     Examples:
     - "Move fast and verify — ship quickly but prove it works"
     - "User experience over developer convenience"
     - "Every character earns its place" -->
`
    );

    const { checkContextForDashboard } = await import('../../src/commands/check.js');
    const result = await checkContextForDashboard(tmpDir, 'design-principles.md');
    expect(result.symbol).toContain('○');
  });

  it('design-principles with content shows ✓', async () => {
    const contextDir = path.join(tmpDir, '.ana', 'context');
    await fs.mkdir(contextDir, { recursive: true });
    await fs.writeFile(
      path.join(contextDir, 'design-principles.md'),
      `# Design Principles

Simplicity over complexity. Ship incrementally.
`
    );

    const { checkContextForDashboard } = await import('../../src/commands/check.js');
    const result = await checkContextForDashboard(tmpDir, 'design-principles.md');
    expect(result.symbol).toContain('✓');
  });

  // S19/SETUP-024 + SETUP-027: dashboard and validator must agree on
  // per-section content. Before the unification, the dashboard showed
  // "6 sections populated" based on the raw heading count even when
  // only 1 section had real content, because it used a different
  // (looser) content-detection function than the completion validator.

  it('project-context with 1 section populated shows ○ with accurate count', async () => {
    const contextDir = path.join(tmpDir, '.ana', 'context');
    await fs.mkdir(contextDir, { recursive: true });
    await fs.writeFile(
      path.join(contextDir, 'project-context.md'),
      `# Project Context

## What This Project Does
Real content only here.

## Architecture
<!-- populated via setup -->

## Key Decisions
<!-- populated via setup -->

## Key Files
<!-- populated via setup -->

## Active Constraints
<!-- populated via setup -->

## Domain Vocabulary
<!-- populated via setup -->
`
    );

    const { checkContextForDashboard } = await import('../../src/commands/check.js');
    const result = await checkContextForDashboard(tmpDir, 'project-context.md');
    // Not ✓ — only 1 of 6 has real content
    expect(result.symbol).toContain('○');
    expect(result.description).toBe('1/6 sections populated');
  });

  it('project-context with multiline comment in critical section reports empty (SETUP-027)', async () => {
    // The pre-S19 dashboard used hasNonTemplateContent which didn't track
    // multiline HTML comment state, so a multiline comment was treated as
    // real content. The completion validator used hasRealContent which
    // DID track it correctly. Same file, opposite verdicts. Unified here.
    const contextDir = path.join(tmpDir, '.ana', 'context');
    await fs.mkdir(contextDir, { recursive: true });
    await fs.writeFile(
      path.join(contextDir, 'project-context.md'),
      `# Project Context

## What This Project Does
<!--
This is a multiline comment
spanning several lines. It is NOT real content.
-->

## Architecture
## Key Decisions
## Key Files
## Active Constraints
## Domain Vocabulary
`
    );

    const { checkContextForDashboard } = await import('../../src/commands/check.js');
    const result = await checkContextForDashboard(tmpDir, 'project-context.md');
    // All sections empty — ○ scaffold, not ✓
    expect(result.symbol).toContain('○');
    expect(result.description).toBe('scaffold (setup will enrich)');
  });
});
