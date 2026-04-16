import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { generateProofSummary, parseCallouts, parseRejectionCycles } from '../../src/utils/proofSummary.js';

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

  it('returns slug as feature name when contract missing', async () => {
    // Empty directory
    const summary = generateProofSummary(slugDir);

    expect(summary.feature).toBe('test-feature');
    expect(summary.assertions).toHaveLength(0);
    expect(summary.result).toBe('UNKNOWN');
  });
});

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
    expect(callouts[1]!.category).toBe('test');
    expect(callouts[1]!.summary).toContain('A003 purity test');
    expect(callouts[2]!.category).toBe('upstream');
    expect(callouts[2]!.summary).toContain('Pre-check tag collision');
  });

  it('parses numbered callouts', () => {
    const content = `## Callouts

1. **Code — Unused export:** ProjectKindResult exported but never imported.

2. **Test — Missing priority test:** No test for bin-over-framework priority.
`;
    const callouts = parseCallouts(content);
    expect(callouts).toHaveLength(2);
    expect(callouts[0]!.category).toBe('code');
    expect(callouts[1]!.category).toBe('test');
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
    expect(callouts[1]!.category).toBe('test');
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
    expect(callouts[1]!.summary).toContain('Next entry');
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
