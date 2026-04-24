import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  generateProofSummary,
  parseCallouts,
  parseRejectionCycles,
  extractFileRefs,
  generateActiveIssuesMarkdown,
} from '../../src/utils/proofSummary.js';

describe('generateProofSummary', () => {
  let tempDir: string;
  let slugDir: string;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'proof-summary-test-'));
    slugDir = path.join(tempDir, 'test-feature');
    await fs.promises.mkdir(slugDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  it('reads all four sources and returns complete summary', async () => {
    // Create .saves.json with pre-check data
    const saves = {
      scope: {
        saved_at: '2026-04-01T10:00:00Z',
        commit: 'abc123',
        hash: 'sha256:scope123',
      },
      contract: {
        saved_at: '2026-04-01T10:30:00Z',
        commit: 'def456',
        hash: 'sha256:contract456',
      },
      'build-report': {
        saved_at: '2026-04-01T11:00:00Z',
        commit: 'ghi789',
        hash: 'sha256:build789',
      },
      'verify-report': {
        saved_at: '2026-04-01T11:30:00Z',
        commit: 'jkl012',
        hash: 'sha256:verify012',
      },
      'pre-check': {
        seal: 'INTACT',
        seal_commit: 'def456',
        assertions: [
          { id: 'A001', says: 'Payment returns success', status: 'COVERED' },
          { id: 'A002', says: 'Client secret included', status: 'COVERED' },
          { id: 'A003', says: 'Webhook updates order', status: 'UNCOVERED' },
        ],
        covered: 2,
        uncovered: 1,
      },
    };
    await fs.promises.writeFile(path.join(slugDir, '.saves.json'), JSON.stringify(saves));

    // Create contract.yaml
    const contract = `
version: "1.0"
sealed_by: "AnaPlan"
feature: "Stripe Payment Integration"
assertions:
  - id: A001
    says: "Payment returns success"
  - id: A002
    says: "Client secret included"
  - id: A003
    says: "Webhook updates order"
file_changes:
  - path: "src/payments.ts"
    action: create
`;
    await fs.promises.writeFile(path.join(slugDir, 'contract.yaml'), contract);

    // Create verify_report.md with Contract Compliance table
    const verifyReport = `# Verify Report

**Result:** PASS

## Contract Compliance
| ID | Says | Status | Evidence |
|----|------|--------|----------|
| A001 | Payment returns success | ✅ SATISFIED | test line 42 |
| A002 | Client secret included | ✅ SATISFIED | test line 43 |
| A003 | Webhook updates order | ⚠️ DEVIATED | builder used event mock |

## AC Walkthrough
- ✅ PASS: AC1 Payment works
- ✅ PASS: AC2 Webhook fires
`;
    await fs.promises.writeFile(path.join(slugDir, 'verify_report.md'), verifyReport);

    // Create build_report.md with deviations
    const buildReport = `# Build Report

## Deviations from Contract

### A003: Webhook updates order
**Instead:** Event mock verification
**Reason:** Stripe requires live webhooks
**Outcome:** Functionally equivalent
`;
    await fs.promises.writeFile(path.join(slugDir, 'build_report.md'), buildReport);

    const summary = generateProofSummary(slugDir);

    expect(summary.feature).toBe('Stripe Payment Integration');
    expect(summary.result).toBe('PASS');
    expect(summary.assertions).toHaveLength(3);
    expect(summary.contract.total).toBe(3);
    expect(summary.contract.covered).toBe(2);
    expect(summary.contract.uncovered).toBe(1);
    expect(summary.contract.satisfied).toBe(2);
    expect(summary.contract.deviated).toBe(1);
    expect(summary.deviations).toHaveLength(1);
    expect(summary.deviations[0]!.contract_id).toBe('A003');
    expect(summary.deviations[0]!.instead).toBe('Event mock verification');
    expect(summary.seal_commit).toBe('def456');
    expect(summary.hashes['scope']).toBe('sha256:scope123');
    expect(summary.acceptance_criteria.total).toBe(2);
    expect(summary.acceptance_criteria.met).toBe(2);
  });

  it('handles missing verify report gracefully', async () => {
    // Only .saves.json and contract.yaml
    const saves = {
      'pre-check': {
        assertions: [
          { id: 'A001', says: 'Test assertion', status: 'COVERED' },
        ],
        covered: 1,
        uncovered: 0,
      },
    };
    await fs.promises.writeFile(path.join(slugDir, '.saves.json'), JSON.stringify(saves));

    const contract = `
version: "1.0"
feature: "Test Feature"
assertions:
  - id: A001
    says: "Test assertion"
file_changes:
  - path: "test.ts"
    action: create
`;
    await fs.promises.writeFile(path.join(slugDir, 'contract.yaml'), contract);

    const summary = generateProofSummary(slugDir);

    expect(summary.feature).toBe('Test Feature');
    expect(summary.result).toBe('UNKNOWN');
    expect(summary.assertions).toHaveLength(1);
    expect(summary.assertions[0]!.preCheckStatus).toBe('COVERED');
    expect(summary.assertions[0]!.verifyStatus).toBeNull();
  });

  it('handles missing .saves.json gracefully', async () => {
    // Only contract.yaml
    const contract = `
version: "1.0"
feature: "Test Feature"
assertions:
  - id: A001
    says: "Test assertion"
file_changes:
  - path: "test.ts"
    action: create
`;
    await fs.promises.writeFile(path.join(slugDir, 'contract.yaml'), contract);

    const summary = generateProofSummary(slugDir);

    expect(summary.feature).toBe('Test Feature');
    expect(summary.hashes).toEqual({});
    expect(summary.timing.total_minutes).toBe(0);
    expect(summary.assertions).toHaveLength(1);
    expect(summary.assertions[0]!.preCheckStatus).toBe('UNCOVERED');
  });

  it('parses deviations from build report', async () => {
    const buildReport = `# Build Report

## Deviations from Contract

### A001: First assertion
**Instead:** Did something else
**Reason:** Technical constraint
**Outcome:** Same result

### A002: Second assertion
**Instead:** Alternative approach
**Reason:** Better for testing
**Outcome:** Preserved intent
`;
    await fs.promises.writeFile(path.join(slugDir, 'build_report.md'), buildReport);

    const contract = `
version: "1.0"
feature: "Test"
assertions:
  - id: A001
    says: "First assertion"
  - id: A002
    says: "Second assertion"
file_changes:
  - path: "test.ts"
    action: create
`;
    await fs.promises.writeFile(path.join(slugDir, 'contract.yaml'), contract);

    const summary = generateProofSummary(slugDir);

    expect(summary.deviations).toHaveLength(2);
    expect(summary.deviations[0]!.contract_id).toBe('A001');
    expect(summary.deviations[0]!.instead).toBe('Did something else');
    expect(summary.deviations[0]!.reason).toBe('Technical constraint');
    expect(summary.deviations[0]!.outcome).toBe('Same result');
    expect(summary.deviations[1]!.contract_id).toBe('A002');
  });

  it('merges pre-check and verify statuses', async () => {
    // Pre-check: A001 COVERED, A002 UNCOVERED
    const saves = {
      'pre-check': {
        assertions: [
          { id: 'A001', says: 'First', status: 'COVERED' },
          { id: 'A002', says: 'Second', status: 'UNCOVERED' },
        ],
        covered: 1,
        uncovered: 1,
      },
    };
    await fs.promises.writeFile(path.join(slugDir, '.saves.json'), JSON.stringify(saves));

    // Verify: A001 SATISFIED
    const verifyReport = `# Verify Report

**Result:** PASS

## Contract Compliance
| ID | Says | Status | Evidence |
|----|------|--------|----------|
| A001 | First | ✅ SATISFIED | test line 10 |
| A002 | Second | ❌ UNCOVERED | |
`;
    await fs.promises.writeFile(path.join(slugDir, 'verify_report.md'), verifyReport);

    const summary = generateProofSummary(slugDir);

    expect(summary.assertions).toHaveLength(2);

    const a001 = summary.assertions.find(a => a.id === 'A001');
    expect(a001?.preCheckStatus).toBe('COVERED');
    expect(a001?.verifyStatus).toBe('SATISFIED');
    expect(a001?.evidence).toBe('test line 10');

    const a002 = summary.assertions.find(a => a.id === 'A002');
    expect(a002?.preCheckStatus).toBe('UNCOVERED');
    expect(a002?.verifyStatus).toBe('UNCOVERED');
  });

  it('computes timing from save timestamps', async () => {
    const saves = {
      scope: { saved_at: '2026-04-01T10:00:00Z' },
      contract: { saved_at: '2026-04-01T10:30:00Z' },
      'build-report': { saved_at: '2026-04-01T11:30:00Z' },
      'verify-report': { saved_at: '2026-04-01T12:00:00Z' },
    };
    await fs.promises.writeFile(path.join(slugDir, '.saves.json'), JSON.stringify(saves));

    const summary = generateProofSummary(slugDir);

    expect(summary.timing.total_minutes).toBe(120); // 2 hours
    expect(summary.timing.think).toBe(30); // scope to contract
    expect(summary.timing.plan).toBe(30); // same as think
    expect(summary.timing.build).toBe(60); // contract to build
    expect(summary.timing.verify).toBe(30); // build to verify
  });

  it('reads seal_commit from contract.commit when pre-check is absent', () => {
    const saves = {
      scope: { saved_at: '2026-04-01T10:00:00Z', commit: 'aaa111', hash: 'sha256:scope' },
      contract: { saved_at: '2026-04-01T10:30:00Z', commit: 'bbb222', hash: 'sha256:contract' },
      'build-report': { saved_at: '2026-04-01T11:00:00Z', commit: 'ccc333', hash: 'sha256:build' },
    };
    fs.writeFileSync(path.join(slugDir, '.saves.json'), JSON.stringify(saves));
    fs.writeFileSync(path.join(slugDir, 'contract.yaml'), 'feature: "Test"\nassertions: []');

    const summary = generateProofSummary(slugDir);
    expect(summary.seal_commit).toBe('bbb222');
  });

  it('reads seal_commit from contract.commit even when pre-check also exists', () => {
    const saves = {
      scope: { saved_at: '2026-04-01T10:00:00Z', commit: 'aaa111', hash: 'sha256:scope' },
      contract: { saved_at: '2026-04-01T10:30:00Z', commit: 'same123', hash: 'sha256:contract' },
      'pre-check': { seal_commit: 'same123', assertions: [], covered: 0, uncovered: 0 },
    };
    fs.writeFileSync(path.join(slugDir, '.saves.json'), JSON.stringify(saves));
    fs.writeFileSync(path.join(slugDir, 'contract.yaml'), 'feature: "Test"\nassertions: []');

    const summary = generateProofSummary(slugDir);
    expect(summary.seal_commit).toBe('same123');
  });

  it('returns slug as feature name when contract missing', async () => {
    // Empty directory
    const summary = generateProofSummary(slugDir);

    expect(summary.feature).toBe('test-feature');
    expect(summary.assertions).toHaveLength(0);
    expect(summary.result).toBe('UNKNOWN');
  });
});

// @ana A010, A012
describe('parseCallouts', () => {
  it('parses bulleted callouts with em-dash format', () => {
    const content = `## Callouts

- **Code — Dead logic in full-stack check:** \`projectKind.ts:105\` — BROWSER_FRAMEWORKS.has(d) will never match because dep names are lowercase.

- **Test — A003 purity test is comment-fragile:** projectKind.test.ts:187 reads source and asserts not.toContain. A comment mentioning node:fs breaks it.

- **Upstream — Pre-check tag collision:** @ana A015 tag in proof.test.ts matched a different feature's contract.

## Deployer Handoff
`;
    const callouts = parseCallouts(content);
    expect(callouts).toHaveLength(3);
    expect(callouts[0]!.category).toBe('code');
    expect(callouts[0]!.summary).toContain('Dead logic in full-stack check');
    expect(callouts[0]!.file).toBe('projectKind.ts');
    expect(callouts[1]!.category).toBe('test');
    expect(callouts[1]!.summary).toContain('A003 purity test');
    expect(callouts[1]!.file).toBe('projectKind.test.ts');
    expect(callouts[2]!.category).toBe('upstream');
    expect(callouts[2]!.summary).toContain('Pre-check tag collision');
    expect(callouts[2]!.file).toBe('proof.test.ts');
  });

  it('parses numbered callouts', () => {
    const content = `## Callouts

1. **Code — Unused export:** ProjectKindResult exported but never imported.

2. **Test — Missing priority test:** No test for bin-over-framework priority.
`;
    const callouts = parseCallouts(content);
    expect(callouts).toHaveLength(2);
    expect(callouts[0]!.category).toBe('code');
    expect(callouts[0]!.file).toBeNull();
    expect(callouts[1]!.category).toBe('test');
    expect(callouts[1]!.file).toBeNull();
  });

  it('parses callouts with colon-only format (no em-dash)', () => {
    const content = `## Callouts

- **Code:** slug truncation at 24 chars misaligns table columns for long slugs.

- **Test:** duplicate @ana tag IDs across list and detail test sections.
`;
    const callouts = parseCallouts(content);
    expect(callouts).toHaveLength(2);
    expect(callouts[0]!.category).toBe('code');
    expect(callouts[0]!.summary).toContain('slug truncation');
    expect(callouts[0]!.file).toBeNull();
    expect(callouts[1]!.category).toBe('test');
    expect(callouts[1]!.file).toBeNull();
  });

  it('returns empty array when no Callouts section', () => {
    const content = `## Independent Findings
Some findings here.

## AC Walkthrough
Some ACs here.
`;
    expect(parseCallouts(content)).toHaveLength(0);
  });

  it('returns empty array when Callouts section has no parseable entries', () => {
    const content = `## Callouts

Just some plain text with no structured callouts.
`;
    expect(parseCallouts(content)).toHaveLength(0);
  });

  it('caps summary at 200 characters', () => {
    const longDesc = 'x'.repeat(250);
    const content = `## Callouts

- **Code — Long one:** ${longDesc}
`;
    const callouts = parseCallouts(content);
    expect(callouts).toHaveLength(1);
    expect(callouts[0]!.summary.length).toBeLessThanOrEqual(200);
  });

  it('handles multi-line callout descriptions', () => {
    const content = `## Callouts

- **Code — Multi-line issue:** First line of description
  continues on second line with more detail
  and a third line too.

- **Test — Next entry:** Should be separate.
`;
    const callouts = parseCallouts(content);
    expect(callouts).toHaveLength(2);
    expect(callouts[0]!.summary).toContain('continues on second line');
    expect(callouts[0]!.file).toBeNull();
    expect(callouts[1]!.summary).toContain('Next entry');
    expect(callouts[1]!.file).toBeNull();
  });

  it('parses category-header format with sub-bullets (add-hook-detection style)', () => {
    const content = `## Callouts

**Code:**
- **Component file heuristic may over-count:** confirmation.ts:797 includes any .tsx file.

- **Nuxt detection deviates from spec:** Uses import matching instead of regex.

**Test:**
- **No @ana tags for 8 assertions:** A001-A003 have no tags.

**Upstream:**
- **Spec suggested regex but import matching is better:** Positive deviation.

## Deployer Handoff
`;
    const callouts = parseCallouts(content);
    expect(callouts.length).toBeGreaterThanOrEqual(4);

    const codeCallouts = callouts.filter(c => c.category === 'code');
    expect(codeCallouts.length).toBeGreaterThanOrEqual(2);
    expect(codeCallouts[0]!.summary).toContain('Component file heuristic');
    expect(codeCallouts[0]!.file).toBe('confirmation.ts');

    const testCallouts = callouts.filter(c => c.category === 'test');
    expect(testCallouts.length).toBeGreaterThanOrEqual(1);

    const upstreamCallouts = callouts.filter(c => c.category === 'upstream');
    expect(upstreamCallouts.length).toBeGreaterThanOrEqual(1);
  });

  it('parses standalone paragraph format (fix-skill-template-gaps style)', () => {
    const content = `## Callouts

**Upstream:** Contract assertions A007 and A008 were sealed with incorrect values. The planner miscounted.

**Code:** The error-handling rule is now longer than the others. Appropriate given the nuance.

**Test:** No test coverage for template content. Visual inspection only.

## Deployer Handoff
`;
    const callouts = parseCallouts(content);
    expect(callouts).toHaveLength(3);
    expect(callouts[0]!.category).toBe('upstream');
    expect(callouts[0]!.summary).toContain('A007');
    expect(callouts[0]!.file).toBeNull();
    expect(callouts[1]!.category).toBe('code');
    expect(callouts[1]!.file).toBeNull();
    expect(callouts[2]!.category).toBe('test');
    expect(callouts[2]!.file).toBeNull();
  });

  // @ana A001
  it('returns file field with first file ref from summary', () => {
    const content = `## Callouts

- **Code — Dead logic in full-stack check:** \`projectKind.ts:105\` — BROWSER_FRAMEWORKS.has(d) will never match.
`;
    const callouts = parseCallouts(content);
    expect(callouts).toHaveLength(1);
    expect(callouts[0]!.file).toBe('projectKind.ts');
  });

  // @ana A002
  it('returns null file when no file ref in summary', () => {
    const content = `## Callouts

- **Upstream — Contract assertion sealed with incorrect value:** The planner miscounted the total assertions.
`;
    const callouts = parseCallouts(content);
    expect(callouts).toHaveLength(1);
    expect(callouts[0]!.file).toBeNull();
  });

  // @ana A003
  it('takes first file ref when multiple files present in summary', () => {
    const content = `## Callouts

- **Code — Cross-file issue:** fileA.ts:10 and fileB.ts:20 both have the same problem.
`;
    const callouts = parseCallouts(content);
    expect(callouts).toHaveLength(1);
    expect(callouts[0]!.file).toBe('fileA.ts');
  });

  it('accepts non-standard categories like Security or Performance', () => {
    const content = `## Callouts

- **Security — SQL injection in query builder:** db/queries.ts:42 — user input concatenated into SQL string.
- **Performance — N+1 query in user list:** api/users.ts:15 — fetches roles individually per user.

## Deployer Handoff
`;
    const callouts = parseCallouts(content);
    expect(callouts).toHaveLength(2);
    expect(callouts[0]!.category).toBe('security');
    expect(callouts[0]!.file).toBe('db/queries.ts');
    expect(callouts[1]!.category).toBe('performance');
    expect(callouts[1]!.file).toBe('api/users.ts');
  });
});

describe('parseRejectionCycles', () => {
  it('parses Previous Findings Resolution table', () => {
    const content = `## Independent Findings
Some findings.

## Previous Findings Resolution

Previous verification: 2026-04-15, Result: FAIL

### Previously UNSATISFIED Assertions
| ID | Previous Issue | Current Status | Resolution |
|----|----------------|----------------|------------|
| A015 | Test was a sentinel, not real test | ✅ SATISFIED | Builder added real scaffold test |
| A016 | Used toBeDefined instead of type check | ✅ SATISFIED | Builder replaced with type-safe assertions |

### Previous Callouts
| Callout | Status | Notes |
|---------|--------|-------|
| Dead logic in full-stack check | Still present | Not a FAIL item |

## AC Walkthrough
`;
    const result = parseRejectionCycles(content);
    expect(result.cycles).toBe(1);
    expect(result.failures).toHaveLength(2);
    expect(result.failures[0]!.id).toBe('A015');
    expect(result.failures[0]!.summary).toContain('sentinel');
    expect(result.failures[1]!.id).toBe('A016');
  });

  it('returns zero cycles when no Previous Findings Resolution section', () => {
    const content = `## Independent Findings
Some findings.

## AC Walkthrough
Some ACs.
`;
    const result = parseRejectionCycles(content);
    expect(result.cycles).toBe(0);
    expect(result.failures).toHaveLength(0);
  });

  it('returns zero cycles when section exists but no assertion table', () => {
    const content = `## Previous Findings Resolution

Previous verification: 2026-04-15, Result: FAIL

### Previous Callouts
| Callout | Status | Notes |
|---------|--------|-------|
| Some callout | Fixed | Done |
`;
    const result = parseRejectionCycles(content);
    expect(result.cycles).toBe(0);
    expect(result.failures).toHaveLength(0);
  });

  it('skips header row in assertion table', () => {
    const content = `## Previous Findings Resolution

### Previously UNSATISFIED Assertions
| ID | Previous Issue | Current Status | Resolution |
|----|----------------|----------------|------------|
| A001 | Missing validation | ✅ SATISFIED | Added input checks |
`;
    const result = parseRejectionCycles(content);
    expect(result.cycles).toBe(1);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]!.id).toBe('A001');
  });
});

// @ana A008
describe('extractFileRefs', () => {
  // @ana A001
  it('extracts filename:line format', () => {
    const result = extractFileRefs('Dead logic in projectKind.ts:105 causes issues');
    expect(result).toContain('projectKind.ts');
  });

  // @ana A002
  it('extracts filename:line-line range format', () => {
    const result = extractFileRefs('Check scan-engine.ts:200-250 for the issue');
    expect(result).toContain('scan-engine.ts');
  });

  // @ana A003
  it('extracts filename without line number', () => {
    const result = extractFileRefs('See displayNames.ts for the mapping');
    expect(result).toContain('displayNames.ts');
  });

  // @ana A004
  it('returns multiple refs from one summary', () => {
    const result = extractFileRefs('projectKind.ts:105 and scan-engine.ts:200 both affected');
    expect(result.length).toBeGreaterThan(1);
    expect(result).toContain('projectKind.ts');
    expect(result).toContain('scan-engine.ts');
  });

  // @ana A005
  it('returns empty array when no refs found', () => {
    const result = extractFileRefs('No file references in this callout');
    expect(result.length).toBe(0);
  });

  // @ana A006
  it('handles various file extensions', () => {
    const result = extractFileRefs('Check config.json and schema.yaml and readme.md');
    expect(result).toContain('config.json');
    expect(result).toContain('schema.yaml');
    expect(result).toContain('readme.md');
  });

  it('deduplicates multiple mentions of same file', () => {
    const result = extractFileRefs('projectKind.ts:105 and projectKind.ts:200');
    expect(result).toHaveLength(1);
    expect(result).toContain('projectKind.ts');
  });

  it('handles tsx and jsx extensions', () => {
    const result = extractFileRefs('See Button.tsx:50 and helpers.jsx');
    expect(result).toContain('Button.tsx');
    expect(result).toContain('helpers.jsx');
  });

  it('preserves directory path when present', () => {
    const result = extractFileRefs('src/utils/proofSummary.ts:361 uses substring');
    expect(result).toContain('src/utils/proofSummary.ts');
    expect(result).not.toContain('proofSummary.ts');
  });

  it('distinguishes same filename in different directories', () => {
    const result = extractFileRefs('src/a/index.ts and src/b/index.ts both export');
    expect(result).toHaveLength(2);
    expect(result).toContain('src/a/index.ts');
    expect(result).toContain('src/b/index.ts');
  });

  it('skips URL-like paths', () => {
    const result = extractFileRefs('See https://docs.example.com/api/handler.ts for docs');
    expect(result).toHaveLength(0);
  });

  it('handles deep paths', () => {
    const result = extractFileRefs('packages/cli/src/engine/analyzers/patterns/confirmation.ts:847');
    expect(result).toContain('packages/cli/src/engine/analyzers/patterns/confirmation.ts');
  });

  it('handles dotted filenames like .test.ts', () => {
    const result = extractFileRefs('projectKind.test.ts has dead logic');
    expect(result).toContain('projectKind.test.ts');
    expect(result).not.toContain('test.ts');
  });

  it('handles dotted filenames with line numbers', () => {
    const result = extractFileRefs('findProjectRoot.test.ts:90-95 is a tautology');
    expect(result).toContain('findProjectRoot.test.ts');
  });

  it('handles multi-dotted filenames like .config.js', () => {
    const result = extractFileRefs('next.config.js needs updating');
    expect(result).toContain('next.config.js');
  });

  it('does not match English sentences with periods', () => {
    const result = extractFileRefs('This is wrong. The fix is elsewhere.');
    expect(result).toHaveLength(0);
  });

  it('does not match version numbers', () => {
    const result = extractFileRefs('v2.0.0 release notes');
    expect(result).toHaveLength(0);
  });
});

// @ana A011
describe('generateActiveIssuesMarkdown', () => {
  // @ana A007
  it('generateActiveIssuesMarkdown uses callout.file not extractFileRefs', () => {
    // Source-level verification: the renderer reads callout.file directly.
    // If it still called extractFileRefs, a callout with file=null but a file ref
    // in the summary would be grouped under the file, not General.
    const entries = [
      {
        feature: 'Test',
        completed_at: '2026-04-16T10:00:00Z',
        callouts: [
          { category: 'code', summary: 'Issue mentions test.ts:42 in text', file: null },
        ],
      },
    ];
    const output = generateActiveIssuesMarkdown(entries);
    // If extractFileRefs were called, this would go under "test.ts", not "General"
    expect(output).toContain('## General');
    expect(output).not.toContain('## test.ts');
  });

  // @ana A004
  it('callout type includes file field', () => {
    const entries = [
      {
        feature: 'Test',
        completed_at: '2026-04-16T10:00:00Z',
        callouts: [
          { category: 'code', summary: 'Issue in test.ts', file: 'test.ts' },
        ],
      },
    ];
    const output = generateActiveIssuesMarkdown(entries);
    // The function accepts callouts with file — type-level proof
    expect(output).toContain('test.ts');
  });

  // @ana A005, A007
  it('groups callouts by extracted file ref', () => {
    const entries = [
      {
        feature: 'Project kind detection',
        completed_at: '2026-04-16T10:00:00Z',
        callouts: [
          { category: 'code', summary: 'Dead logic in projectKind.ts:105', file: 'projectKind.ts' },
        ],
      },
    ];
    const output = generateActiveIssuesMarkdown(entries);
    expect(output).toContain('## projectKind.ts');
  });

  // @ana A006, A008
  it('places callouts without refs under General', () => {
    const entries = [
      {
        feature: 'Some feature',
        completed_at: '2026-04-16T10:00:00Z',
        callouts: [
          { category: 'upstream', summary: 'Pre-check tag collision across features', file: null },
        ],
      },
    ];
    const output = generateActiveIssuesMarkdown(entries);
    expect(output).toContain('## General');
  });

  // @ana A009, A013
  it('respects 20-callout cap', () => {
    // Create 25 callouts across entries
    const entries = [];
    for (let i = 0; i < 25; i++) {
      entries.push({
        feature: `Feature ${i}`,
        completed_at: `2026-04-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
        callouts: [{ category: 'code', summary: `Issue ${i} in file${i}.ts`, file: `file${i}.ts` }],
      });
    }
    const output = generateActiveIssuesMarkdown(entries);
    // Count unique callout entries (lines starting with "- **")
    const calloutLines = output.split('\n').filter(line => line.startsWith('- **'));
    const calloutCount = calloutLines.length;
    expect(calloutCount).toBe(20);
  });

  // @ana A010
  it('returns empty-state message when no callouts', () => {
    const entries = [
      {
        feature: 'Clean feature',
        completed_at: '2026-04-16T10:00:00Z',
        callouts: [],
      },
    ];
    const output = generateActiveIssuesMarkdown(entries);
    expect(output).toContain('No active issues');
  });

  // @ana A011
  it('includes feature name in each entry', () => {
    const entries = [
      {
        feature: 'Project kind detection',
        completed_at: '2026-04-16T10:00:00Z',
        callouts: [
          { category: 'code', summary: 'Some issue in test.ts', file: 'test.ts' },
        ],
      },
    ];
    const output = generateActiveIssuesMarkdown(entries);
    expect(output).toContain('Project kind detection');
  });

  // @ana A012
  it('output starts with Active Issues heading', () => {
    const entries = [
      {
        feature: 'Test',
        completed_at: '2026-04-16T10:00:00Z',
        callouts: [{ category: 'code', summary: 'Issue in test.ts', file: 'test.ts' }],
      },
    ];
    const output = generateActiveIssuesMarkdown(entries);
    expect(output).toContain('# Active Issues');
    expect(output.indexOf('# Active Issues')).toBe(0);
  });

  // @ana A013
  it('includes horizontal rule separator', () => {
    const entries = [
      {
        feature: 'Test',
        completed_at: '2026-04-16T10:00:00Z',
        callouts: [{ category: 'code', summary: 'Issue in test.ts', file: 'test.ts' }],
      },
    ];
    const output = generateActiveIssuesMarkdown(entries);
    expect(output).toContain('---');
  });

  // @ana A014
  it('deduplicates callouts referencing multiple files — assigns to first file only', () => {
    const entries = [
      {
        feature: 'Cross-file issue',
        completed_at: '2026-04-16T10:00:00Z',
        callouts: [
          { category: 'code', summary: 'Issue spans fileA.ts:10 and fileB.ts:20', file: 'fileA.ts' },
        ],
      },
    ];
    const output = generateActiveIssuesMarkdown(entries);
    // Callout appears once under the first file (fileA.ts), not duplicated under fileB.ts
    const occurrences = (output.match(/Issue spans fileA\.ts/g) || []).length;
    expect(occurrences).toBe(1);
    // The heading for fileA.ts exists
    expect(output).toContain('## fileA.ts');
    // fileB.ts is mentioned in the summary text (cross-reference) but not as a separate heading
    // unless other callouts specifically reference it
  });

  // @ana A015
  it('callout entry includes category', () => {
    const entries = [
      {
        feature: 'Test',
        completed_at: '2026-04-16T10:00:00Z',
        callouts: [{ category: 'code', summary: 'Issue in test.ts', file: 'test.ts' }],
      },
    ];
    const output = generateActiveIssuesMarkdown(entries);
    expect(output).toContain('**code:**');
  });

  // @ana A016
  it('truncates long summaries with ellipsis', () => {
    const longSummary = 'x'.repeat(150) + ' in test.ts';
    const entries = [
      {
        feature: 'Test',
        completed_at: '2026-04-16T10:00:00Z',
        callouts: [{ category: 'code', summary: longSummary, file: 'test.ts' }],
      },
    ];
    const output = generateActiveIssuesMarkdown(entries);
    const calloutLine = output.split('\n').find(line => line.startsWith('- **code:**'));
    expect(calloutLine).toContain('...');
    // No spaces in the x-repeat, so falls back to hard cut at 100 + ...
    const summaryMatch = calloutLine?.match(/\*\*code:\*\* (.+?) — \*/);
    expect(summaryMatch?.[1]?.endsWith('...')).toBe(true);
  });

  // @ana A014
  it('orders file headings alphabetically with General last', () => {
    const entries = [
      {
        feature: 'Test',
        completed_at: '2026-04-16T10:00:00Z',
        callouts: [
          { category: 'code', summary: 'Issue in zebra.ts', file: 'zebra.ts' },
          { category: 'code', summary: 'Issue in alpha.ts', file: 'alpha.ts' },
          { category: 'upstream', summary: 'General issue without file ref', file: null },
        ],
      },
    ];
    const output = generateActiveIssuesMarkdown(entries);
    const alphaPos = output.indexOf('## alpha.ts');
    const zebraPos = output.indexOf('## zebra.ts');
    const generalPos = output.indexOf('## General');
    expect(alphaPos).toBeLessThan(zebraPos);
    expect(zebraPos).toBeLessThan(generalPos);
  });

  it('takes most recent callouts when capping at 20', () => {
    // Create entries: older entries have "old" in summary, newer have "new"
    const entries = [];
    // Add 15 old entries first (these will be at start of array = oldest)
    for (let i = 0; i < 15; i++) {
      entries.push({
        feature: `Old Feature ${i}`,
        completed_at: `2026-01-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
        callouts: [{ category: 'code', summary: `old-issue-${i} in file.ts`, file: 'file.ts' }],
      });
    }
    // Add 10 new entries (at end of array = newest)
    for (let i = 0; i < 10; i++) {
      entries.push({
        feature: `New Feature ${i}`,
        completed_at: `2026-04-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
        callouts: [{ category: 'code', summary: `new-issue-${i} in file.ts`, file: 'file.ts' }],
      });
    }
    const output = generateActiveIssuesMarkdown(entries);
    // Should have all 10 new issues (indices 0-9)
    for (let i = 0; i < 10; i++) {
      expect(output).toContain(`new-issue-${i}`);
    }
    // Should have 10 old issues (most recent ones: indices 5-14)
    // Old issues 0-4 should be dropped
    expect(output).not.toContain('old-issue-0');
    expect(output).not.toContain('old-issue-4');
    expect(output).toContain('old-issue-5');
  });

  it('heading shows count when under cap', () => {
    const entries = [{
      feature: 'Test',
      completed_at: '2026-04-17T00:00:00Z',
      callouts: [
        { category: 'code', summary: 'issue one in foo.ts', file: 'foo.ts' },
        { category: 'test', summary: 'issue two in bar.ts', file: 'bar.ts' },
        { category: 'code', summary: 'issue three in baz.ts', file: 'baz.ts' },
      ],
    }];
    const md = generateActiveIssuesMarkdown(entries);
    expect(md).toMatch(/# Active Issues \(\d+\)/);
    expect(md).not.toContain('shown of');
  });

  it('heading shows cap info when over 20 callouts', () => {
    const callouts = Array.from({ length: 25 }, (_, i) => ({
      category: 'code',
      summary: `issue number ${i + 1} in unique-file-${i}.ts`,
      file: `unique-file-${i}.ts`,
    }));
    const entries = [{
      feature: 'Big Feature',
      completed_at: '2026-04-17T00:00:00Z',
      callouts,
    }];
    const md = generateActiveIssuesMarkdown(entries);
    expect(md).toContain('20 shown of');
    expect(md).toContain('total)');
  });

  it('heading has no count for zero callouts', () => {
    const md = generateActiveIssuesMarkdown([]);
    expect(md).toContain('# Active Issues');
    expect(md).not.toMatch(/# Active Issues \(/);
  });

  it('heading shows exact count at cap boundary', () => {
    const callouts = Array.from({ length: 20 }, (_, i) => ({
      category: 'code',
      summary: `issue ${i + 1} in file-${i}.ts`,
      file: `file-${i}.ts`,
    }));
    const entries = [{
      feature: 'Feature',
      completed_at: '2026-04-17T00:00:00Z',
      callouts,
    }];
    const md = generateActiveIssuesMarkdown(entries);
    expect(md).toMatch(/# Active Issues \(20\)/);
    expect(md).not.toContain('shown of');
  });

  it('truncates at word boundary with ellipsis', () => {
    const longSummary = 'This is a long callout summary that exceeds one hundred characters and should be truncated cleanly at a word boundary somewhere around here';
    const entries = [{
      feature: 'Test',
      completed_at: '2026-04-17T00:00:00Z',
      callouts: [{ category: 'code', summary: longSummary, file: null }],
    }];
    const md = generateActiveIssuesMarkdown(entries);
    expect(md).toContain('...');
    // The summary in the markdown should NOT contain the full text
    expect(md).not.toContain('somewhere around here');
    // Should cut at a space — the text before ... should end with a complete word
    const calloutLine = md.split('\n').find(l => l.includes('...'))!;
    const beforeEllipsis = calloutLine.split('...')[0]!;
    expect(beforeEllipsis.endsWith(' ') || /\w$/.test(beforeEllipsis)).toBe(true);
  });

  it('falls back to hard cut when no spaces before 100 chars', () => {
    const noSpaceSummary = 'packages/cli/src/engine/analyzers/patterns/confirmation.ts:847-produces-incorrect-results-when-the-input-contains-special-characters';
    const entries = [{
      feature: 'Test',
      completed_at: '2026-04-17T00:00:00Z',
      callouts: [{ category: 'code', summary: noSpaceSummary, file: 'packages/cli/src/engine/analyzers/patterns/confirmation.ts' }],
    }];
    const md = generateActiveIssuesMarkdown(entries);
    expect(md).toContain('...');
    // Should not be empty — falls back to 100 chars
    const calloutLine = md.split('\n').find(l => l.includes('...'))!;
    expect(calloutLine.length).toBeGreaterThan(10);
  });
});
