import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  generateProofSummary,
  parseFindings,
  parseRejectionCycles,
  extractFileRefs,
  generateActiveIssuesMarkdown,
  parseBuildOpenIssues,
  resolveFindingPaths,
  getProofContext,
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
    expect(summary.seal_commit).toBeNull();
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

  // @ana A007
  it('seal_commit is null even when contract.commit exists in saves', () => {
    const saves = {
      scope: { saved_at: '2026-04-01T10:00:00Z', commit: 'aaa111', hash: 'sha256:scope' },
      contract: { saved_at: '2026-04-01T10:30:00Z', commit: 'bbb222', hash: 'sha256:contract' },
      'build-report': { saved_at: '2026-04-01T11:00:00Z', commit: 'ccc333', hash: 'sha256:build' },
    };
    fs.writeFileSync(path.join(slugDir, '.saves.json'), JSON.stringify(saves));
    fs.writeFileSync(path.join(slugDir, 'contract.yaml'), 'feature: "Test"\nassertions: []');

    const summary = generateProofSummary(slugDir);
    expect(summary.seal_commit).toBeNull();
  });

  it('seal_commit is null even when pre-check also has seal_commit', () => {
    const saves = {
      scope: { saved_at: '2026-04-01T10:00:00Z', commit: 'aaa111', hash: 'sha256:scope' },
      contract: { saved_at: '2026-04-01T10:30:00Z', commit: 'same123', hash: 'sha256:contract' },
      'pre-check': { seal_commit: 'same123', assertions: [], covered: 0, uncovered: 0 },
    };
    fs.writeFileSync(path.join(slugDir, '.saves.json'), JSON.stringify(saves));
    fs.writeFileSync(path.join(slugDir, 'contract.yaml'), 'feature: "Test"\nassertions: []');

    const summary = generateProofSummary(slugDir);
    expect(summary.seal_commit).toBeNull();
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
describe('parseFindings', () => {
  it('parses bulleted findings with em-dash format', () => {
    const content = `## Callouts

- **Code — Dead logic in full-stack check:** \`projectKind.ts:105\` — BROWSER_FRAMEWORKS.has(d) will never match because dep names are lowercase.

- **Test — A003 purity test is comment-fragile:** projectKind.test.ts:187 reads source and asserts not.toContain. A comment mentioning node:fs breaks it.

- **Upstream — Pre-check tag collision:** @ana A015 tag in proof.test.ts matched a different feature's contract.

## Deployer Handoff
`;
    const findings = parseFindings(content);
    expect(findings).toHaveLength(3);
    expect(findings[0]!.category).toBe('code');
    expect(findings[0]!.summary).toContain('Dead logic in full-stack check');
    expect(findings[0]!.file).toBe('projectKind.ts');
    expect(findings[1]!.category).toBe('test');
    expect(findings[1]!.summary).toContain('A003 purity test');
    expect(findings[1]!.file).toBe('projectKind.test.ts');
    expect(findings[2]!.category).toBe('upstream');
    expect(findings[2]!.summary).toContain('Pre-check tag collision');
    expect(findings[2]!.file).toBe('proof.test.ts');
  });

  it('parses numbered findings', () => {
    const content = `## Callouts

1. **Code — Unused export:** ProjectKindResult exported but never imported.

2. **Test — Missing priority test:** No test for bin-over-framework priority.
`;
    const findings = parseFindings(content);
    expect(findings).toHaveLength(2);
    expect(findings[0]!.category).toBe('code');
    expect(findings[0]!.file).toBeNull();
    expect(findings[1]!.category).toBe('test');
    expect(findings[1]!.file).toBeNull();
  });

  it('parses findings with colon-only format (no em-dash)', () => {
    const content = `## Callouts

- **Code:** slug truncation at 24 chars misaligns table columns for long slugs.

- **Test:** duplicate @ana tag IDs across list and detail test sections.
`;
    const findings = parseFindings(content);
    expect(findings).toHaveLength(2);
    expect(findings[0]!.category).toBe('code');
    expect(findings[0]!.summary).toContain('slug truncation');
    expect(findings[0]!.file).toBeNull();
    expect(findings[1]!.category).toBe('test');
    expect(findings[1]!.file).toBeNull();
  });

  it('returns empty array when no Callouts section in verify report', () => {
    const content = `## Independent Findings
Some findings here.

## AC Walkthrough
Some ACs here.
`;
    expect(parseFindings(content)).toHaveLength(0);
  });

  it('returns empty array when Callouts section in verify report has no parseable entries', () => {
    const content = `## Callouts

Just some plain text with no structured findings.
`;
    expect(parseFindings(content)).toHaveLength(0);
  });

  it('caps summary at 1000 characters', () => {
    const longDesc = 'x'.repeat(1100);
    const content = `## Callouts

- **Code — Long one:** ${longDesc}
`;
    const findings = parseFindings(content);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.summary.length).toBeLessThanOrEqual(1000);
  });

  it('extracts code anchor from backtick-quoted construct', () => {
    const content = `## Callouts

- **Code — Non-recursive check:** \`readdirSync(prismaDir)\` only checks top-level entries in the directory.
`;
    const findings = parseFindings(content);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.anchor).toBe('readdirSync(prismaDir)');
  });

  it('returns null anchor when no suitable backtick content', () => {
    const content = `## Callouts

- **Upstream — Spec deviation:** The spec suggested a different approach but implementation is better.
`;
    const findings = parseFindings(content);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.anchor).toBeNull();
  });

  it('skips file:line references as anchors', () => {
    const content = `## Callouts

- **Code — Issue at location:** \`census.ts:219\` has a problem. The real code is \`readdirSync(prismaDir)\`.
`;
    const findings = parseFindings(content);
    expect(findings).toHaveLength(1);
    // Should skip census.ts:219 (file:line ref) and use readdirSync(prismaDir)
    expect(findings[0]!.anchor).toBe('readdirSync(prismaDir)');
  });

  it('handles multi-line finding descriptions', () => {
    const content = `## Callouts

- **Code — Multi-line issue:** First line of description
  continues on second line with more detail
  and a third line too.

- **Test — Next entry:** Should be separate.
`;
    const findings = parseFindings(content);
    expect(findings).toHaveLength(2);
    expect(findings[0]!.summary).toContain('continues on second line');
    expect(findings[0]!.file).toBeNull();
    expect(findings[1]!.summary).toContain('Next entry');
    expect(findings[1]!.file).toBeNull();
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
    const findings = parseFindings(content);
    expect(findings.length).toBeGreaterThanOrEqual(4);

    const codeFindings = findings.filter(c => c.category === 'code');
    expect(codeFindings.length).toBeGreaterThanOrEqual(2);
    expect(codeFindings[0]!.summary).toContain('Component file heuristic');
    expect(codeFindings[0]!.file).toBe('confirmation.ts');

    const testFindings = findings.filter(c => c.category === 'test');
    expect(testFindings.length).toBeGreaterThanOrEqual(1);

    const upstreamFindings = findings.filter(c => c.category === 'upstream');
    expect(upstreamFindings.length).toBeGreaterThanOrEqual(1);
  });

  it('parses standalone paragraph format (fix-skill-template-gaps style)', () => {
    const content = `## Callouts

**Upstream:** Contract assertions A007 and A008 were sealed with incorrect values. The planner miscounted.

**Code:** The error-handling rule is now longer than the others. Appropriate given the nuance.

**Test:** No test coverage for template content. Visual inspection only.

## Deployer Handoff
`;
    const findings = parseFindings(content);
    expect(findings).toHaveLength(3);
    expect(findings[0]!.category).toBe('upstream');
    expect(findings[0]!.summary).toContain('A007');
    expect(findings[0]!.file).toBeNull();
    expect(findings[1]!.category).toBe('code');
    expect(findings[1]!.file).toBeNull();
    expect(findings[2]!.category).toBe('test');
    expect(findings[2]!.file).toBeNull();
  });

  // @ana A001
  it('returns file field with first file ref from summary', () => {
    const content = `## Callouts

- **Code — Dead logic in full-stack check:** \`projectKind.ts:105\` — BROWSER_FRAMEWORKS.has(d) will never match.
`;
    const findings = parseFindings(content);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.file).toBe('projectKind.ts');
  });

  // @ana A002
  it('returns null file when no file ref in summary', () => {
    const content = `## Callouts

- **Upstream — Contract assertion sealed with incorrect value:** The planner miscounted the total assertions.
`;
    const findings = parseFindings(content);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.file).toBeNull();
  });

  // @ana A003
  it('takes first file ref when multiple files present in summary', () => {
    const content = `## Callouts

- **Code — Cross-file issue:** fileA.ts:10 and fileB.ts:20 both have the same problem.
`;
    const findings = parseFindings(content);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.file).toBe('fileA.ts');
  });

  it('accepts non-standard categories like Security or Performance', () => {
    const content = `## Callouts

- **Security — SQL injection in query builder:** db/queries.ts:42 — user input concatenated into SQL string.
- **Performance — N+1 query in user list:** api/users.ts:15 — fetches roles individually per user.

## Deployer Handoff
`;
    const findings = parseFindings(content);
    expect(findings).toHaveLength(2);
    expect(findings[0]!.category).toBe('security');
    expect(findings[0]!.file).toBe('db/queries.ts');
    expect(findings[1]!.category).toBe('performance');
    expect(findings[1]!.file).toBe('api/users.ts');
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
    const result = extractFileRefs('No file references in this finding');
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
  it('generateActiveIssuesMarkdown uses finding.file not extractFileRefs', () => {
    // Source-level verification: the renderer reads finding.file directly.
    // If it still called extractFileRefs, a finding with file=null but a file ref
    // in the summary would be grouped under the file, not General.
    const entries = [
      {
        feature: 'Test',
        completed_at: '2026-04-16T10:00:00Z',
        findings: [
          { id: 'test-C1', category: 'code', summary: 'Issue mentions test.ts:42 in text', file: null, anchor: null },
        ],
      },
    ];
    const output = generateActiveIssuesMarkdown(entries);
    // If extractFileRefs were called, this would go under "test.ts", not "General"
    expect(output).toContain('## General');
    expect(output).not.toContain('## test.ts');
  });

  // @ana A004
  it('finding type includes file field', () => {
    const entries = [
      {
        feature: 'Test',
        completed_at: '2026-04-16T10:00:00Z',
        findings: [
          { id: 'test-C2', category: 'code', summary: 'Issue in test.ts', file: 'test.ts', anchor: null },
        ],
      },
    ];
    const output = generateActiveIssuesMarkdown(entries);
    // The function accepts findings with file — type-level proof
    expect(output).toContain('test.ts');
  });

  // @ana A005, A007
  it('groups findings by extracted file ref', () => {
    const entries = [
      {
        feature: 'Project kind detection',
        completed_at: '2026-04-16T10:00:00Z',
        findings: [
          { id: 'test-C3', category: 'code', summary: 'Dead logic in projectKind.ts:105', file: 'projectKind.ts', anchor: null },
        ],
      },
    ];
    const output = generateActiveIssuesMarkdown(entries);
    expect(output).toContain('## projectKind.ts');
  });

  // @ana A006, A008
  it('places findings without refs under General', () => {
    const entries = [
      {
        feature: 'Some feature',
        completed_at: '2026-04-16T10:00:00Z',
        findings: [
          { id: 'test-C4', category: 'upstream', summary: 'Pre-check tag collision across features', file: null, anchor: null },
        ],
      },
    ];
    const output = generateActiveIssuesMarkdown(entries);
    expect(output).toContain('## General');
  });

  // @ana A009, A013
  it('respects 30-finding cap', () => {
    // Create 35 findings across entries
    const entries = [];
    for (let i = 0; i < 35; i++) {
      entries.push({
        feature: `Feature ${i}`,
        completed_at: `2026-04-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
        findings: [{ id: `test-C${i}`, category: 'code', summary: `Issue ${i} in file${i}.ts`, file: `file${i}.ts`, anchor: null }],
      });
    }
    const output = generateActiveIssuesMarkdown(entries);
    // Count unique finding entries (lines starting with "- **")
    const findingLines = output.split('\n').filter(line => line.startsWith('- **'));
    const findingCount = findingLines.length;
    expect(findingCount).toBe(30);
  });

  // @ana A010
  it('returns empty-state message when no findings', () => {
    const entries = [
      {
        feature: 'Clean feature',
        completed_at: '2026-04-16T10:00:00Z',
        findings: [],
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
        findings: [
          { id: 'test-C6', category: 'code', summary: 'Some issue in test.ts', file: 'test.ts', anchor: null },
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
        findings: [{ id: 'test-C7', category: 'code', summary: 'Issue in test.ts', file: 'test.ts', anchor: null }],
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
        findings: [{ id: 'test-C8', category: 'code', summary: 'Issue in test.ts', file: 'test.ts', anchor: null }],
      },
    ];
    const output = generateActiveIssuesMarkdown(entries);
    expect(output).toContain('---');
  });

  // @ana A014
  it('deduplicates findings referencing multiple files — assigns to first file only', () => {
    const entries = [
      {
        feature: 'Cross-file issue',
        completed_at: '2026-04-16T10:00:00Z',
        findings: [
          { id: 'test-C9', category: 'code', summary: 'Issue spans fileA.ts:10 and fileB.ts:20', file: 'fileA.ts', anchor: null },
        ],
      },
    ];
    const output = generateActiveIssuesMarkdown(entries);
    // Finding appears once under the first file (fileA.ts), not duplicated under fileB.ts
    const occurrences = (output.match(/Issue spans fileA\.ts/g) || []).length;
    expect(occurrences).toBe(1);
    // The heading for fileA.ts exists
    expect(output).toContain('## fileA.ts');
    // fileB.ts is mentioned in the summary text (cross-reference) but not as a separate heading
    // unless other findings specifically reference it
  });

  // @ana A015
  it('finding entry includes category', () => {
    const entries = [
      {
        feature: 'Test',
        completed_at: '2026-04-16T10:00:00Z',
        findings: [{ id: 'test-C10', category: 'code', summary: 'Issue in test.ts', file: 'test.ts', anchor: null }],
      },
    ];
    const output = generateActiveIssuesMarkdown(entries);
    expect(output).toContain('**code:**');
  });

  // @ana A016
  it('truncates long summaries with ellipsis', () => {
    const longSummary = 'x'.repeat(300) + ' in test.ts';
    const entries = [
      {
        feature: 'Test',
        completed_at: '2026-04-16T10:00:00Z',
        findings: [{ id: 'test-C11', category: 'code', summary: longSummary, file: 'test.ts', anchor: null }],
      },
    ];
    const output = generateActiveIssuesMarkdown(entries);
    const findingLine = output.split('\n').find(line => line.startsWith('- **code:**'));
    expect(findingLine).toContain('...');
    // No spaces in the x-repeat, so falls back to hard cut at 250 + ...
    const summaryMatch = findingLine?.match(/\*\*code:\*\* (.+?) — \*/);
    expect(summaryMatch?.[1]?.endsWith('...')).toBe(true);
  });

  // @ana A014
  it('orders file headings alphabetically with General last', () => {
    const entries = [
      {
        feature: 'Test',
        completed_at: '2026-04-16T10:00:00Z',
        findings: [
          { id: 'test-C12', category: 'code', summary: 'Issue in zebra.ts', file: 'zebra.ts', anchor: null },
          { id: 'test-C13', category: 'code', summary: 'Issue in alpha.ts', file: 'alpha.ts', anchor: null },
          { id: 'test-C14', category: 'upstream', summary: 'General issue without file ref', file: null, anchor: null },
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

  it('takes most recent findings when capping at 30', () => {
    // Create entries: older entries have "old" in summary, newer have "new"
    const entries = [];
    // Add 25 old entries first (these will be at start of array = oldest)
    for (let i = 0; i < 25; i++) {
      entries.push({
        feature: `Old Feature ${i}`,
        completed_at: `2026-01-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
        findings: [{ id: 'test-C15', category: 'code', summary: `old-issue-${i} in file.ts`, file: 'file.ts', anchor: null }],
      });
    }
    // Add 10 new entries (at end of array = newest)
    for (let i = 0; i < 10; i++) {
      entries.push({
        feature: `New Feature ${i}`,
        completed_at: `2026-04-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
        findings: [{ id: 'test-C16', category: 'code', summary: `new-issue-${i} in file.ts`, file: 'file.ts', anchor: null }],
      });
    }
    const output = generateActiveIssuesMarkdown(entries);
    // Should have all 10 new issues
    for (let i = 0; i < 10; i++) {
      expect(output).toContain(`new-issue-${i}`);
    }
    // Should have 20 old issues (most recent: indices 5-24)
    // Old issues 0-4 should be dropped
    expect(output).not.toContain('old-issue-0');
    expect(output).not.toContain('old-issue-4');
    expect(output).toContain('old-issue-5');
  });

  it('heading shows count when under cap', () => {
    const entries = [{
      feature: 'Test',
      completed_at: '2026-04-17T00:00:00Z',
      findings: [
        { id: 'test-C17', category: 'code', summary: 'issue one in foo.ts', file: 'foo.ts', anchor: null },
        { id: 'test-C18', category: 'test', summary: 'issue two in bar.ts', file: 'bar.ts', anchor: null },
        { id: 'test-C19', category: 'code', summary: 'issue three in baz.ts', file: 'baz.ts', anchor: null },
      ],
    }];
    const md = generateActiveIssuesMarkdown(entries);
    expect(md).toMatch(/# Active Issues \(\d+\)/);
    expect(md).not.toContain('shown of');
  });

  it('heading shows cap info when over 30 findings', () => {
    const findings = Array.from({ length: 35 }, (_, i) => ({ id: `test-C${i}`, category: 'code', summary: `issue number ${i + 1} in unique-file-${i}.ts`, file: `unique-file-${i}.ts`, anchor: null,
    }));
    const entries = [{
      feature: 'Big Feature',
      completed_at: '2026-04-17T00:00:00Z',
      findings,
    }];
    const md = generateActiveIssuesMarkdown(entries);
    expect(md).toContain('30 shown of');
    expect(md).toContain('total)');
  });

  it('heading has no count for zero findings', () => {
    const md = generateActiveIssuesMarkdown([]);
    expect(md).toContain('# Active Issues');
    expect(md).not.toMatch(/# Active Issues \(/);
  });

  it('heading shows exact count at cap boundary', () => {
    const findings = Array.from({ length: 30 }, (_, i) => ({ id: `test-C${i}`, category: 'code', summary: `issue ${i + 1} in file-${i}.ts`, file: `file-${i}.ts`, anchor: null,
    }));
    const entries = [{
      feature: 'Feature',
      completed_at: '2026-04-17T00:00:00Z',
      findings,
    }];
    const md = generateActiveIssuesMarkdown(entries);
    expect(md).toMatch(/# Active Issues \(30\)/);
    expect(md).not.toContain('shown of');
  });

  it('truncates at word boundary with ellipsis', () => {
    const longSummary = 'This is a long finding summary that exceeds two hundred and fifty characters and should be truncated cleanly at a word boundary. The observation continues with more detail about the specific code pattern that was identified during verification. It mentions several files and concerns that the verifier noticed during the independent review somewhere around here';
    const entries = [{
      feature: 'Test',
      completed_at: '2026-04-17T00:00:00Z',
      findings: [{ id: 'test-C22', category: 'code', summary: longSummary, file: null, anchor: null }],
    }];
    const md = generateActiveIssuesMarkdown(entries);
    expect(md).toContain('...');
    // The summary in the markdown should NOT contain the full text
    expect(md).not.toContain('somewhere around here');
    // Should cut at a space — the text before ... should end with a complete word
    const findingLine = md.split('\n').find(l => l.includes('...'))!;
    const beforeEllipsis = findingLine.split('...')[0]!;
    expect(beforeEllipsis.endsWith(' ') || /\w$/.test(beforeEllipsis)).toBe(true);
  });

  it('falls back to hard cut when no spaces before 250 chars', () => {
    const noSpaceSummary = 'packages/cli/src/engine/analyzers/patterns/confirmation.ts:847-produces-incorrect-results-when-the-input-contains-special-characters-and-the-pattern-matcher-fails-to-account-for-escaped-sequences-in-the-regex-which-causes-false-positives-in-the-detection-layer';
    const entries = [{
      feature: 'Test',
      completed_at: '2026-04-17T00:00:00Z',
      findings: [{ id: 'test-C23', category: 'code', summary: noSpaceSummary, file: 'packages/cli/src/engine/analyzers/patterns/confirmation.ts', anchor: null }],
    }];
    const md = generateActiveIssuesMarkdown(entries);
    expect(md).toContain('...');
    // Should not be empty — falls back to 250 chars
    const findingLine = md.split('\n').find(l => l.includes('...'))!;
    expect(findingLine.length).toBeGreaterThan(10);
  });
});

describe('parseBuildOpenIssues', () => {
  it('extracts numbered open issues', () => {
    const content = `## Open Issues

1. **\`extractFileRefs\` cannot parse dotted test filenames:** \`projectKind.test.ts\` is extracted as \`test.ts\` because the regex doesn't handle dots.

2. **Census dialect as sentinel entry:** Using \`orm: 'drizzle-dialect'\` is a workaround.

Verified complete by second pass.
`;
    const issues = parseBuildOpenIssues(content);
    expect(issues).toHaveLength(2);
    expect(issues[0]!.summary).toContain('extractFileRefs');
    expect(issues[0]!.file).toBe('projectKind.test.ts');
    expect(issues[1]!.summary).toContain('Census dialect');
  });

  it('extracts bulleted open issues', () => {
    const content = `## Open Issues

- **agents.test.ts fixture modification:** Added \`.ana/\` directory creation to the helper.
- **\`slugDir2\` still exists in \`saveArtifact\`:** The rename is cosmetic.

Verified complete by second pass.
`;
    const issues = parseBuildOpenIssues(content);
    expect(issues).toHaveLength(2);
    expect(issues[0]!.file).toBe('agents.test.ts');
  });

  it('returns empty array when section says None', () => {
    const content = `## Open Issues

None — verified by second pass.
`;
    const issues = parseBuildOpenIssues(content);
    expect(issues).toHaveLength(0);
  });

  it('returns empty array when section is missing', () => {
    const content = `## Test Results

Tests passed.
`;
    const issues = parseBuildOpenIssues(content);
    expect(issues).toHaveLength(0);
  });

  it('extracts file references from issue text', () => {
    const content = `## Open Issues

1. **A017 coverage is partial:** The null-null modelCount sort branch at \`scanProject.test.ts:549\` is not exercised.
`;
    const issues = parseBuildOpenIssues(content);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.file).toBe('scanProject.test.ts');
  });
});

describe('resolveFindingPaths', () => {
  const modules = [
    'packages/cli/src/engine/census.ts',
    'packages/cli/src/engine/scan-engine.ts',
    'packages/cli/src/utils/proofSummary.ts',
  ];

  // @ana A001, A002, A007
  it('resolves single-match basename to full path', () => {
    const items = [{ file: 'census.ts' }];
    resolveFindingPaths(items, modules);
    expect(items[0]!.file).toBe('packages/cli/src/engine/census.ts');
  });

  // @ana A004
  it('keeps basename when no modules match', () => {
    const items = [{ file: 'unknown.ts' }];
    resolveFindingPaths(items, modules);
    expect(items[0]!.file).toBe('unknown.ts');
  });

  // @ana A003
  it('keeps basename when multiple modules match', () => {
    const dupeModules = [
      'packages/cli/src/a/index.ts',
      'packages/cli/src/b/index.ts',
    ];
    const items = [{ file: 'index.ts' }];
    resolveFindingPaths(items, dupeModules);
    expect(items[0]!.file).toBe('index.ts');
  });

  // @ana A005
  it('skips files already containing path separator', () => {
    const items = [{ file: 'src/utils/proofSummary.ts' }];
    resolveFindingPaths(items, modules);
    expect(items[0]!.file).toBe('src/utils/proofSummary.ts');
  });

  it('skips null file fields', () => {
    const items = [{ file: null }];
    resolveFindingPaths(items, modules);
    expect(items[0]!.file).toBeNull();
  });

  // @ana A006
  it('resolves build concern file paths', () => {
    const concerns = [{ file: 'scan-engine.ts', summary: 'some concern' }];
    resolveFindingPaths(concerns, modules);
    expect(concerns[0]!.file).toBe('packages/cli/src/engine/scan-engine.ts');
  });

  it('handles empty modules_touched array', () => {
    const items = [{ file: 'census.ts' }];
    resolveFindingPaths(items, []);
    expect(items[0]!.file).toBe('census.ts');
  });

  // @ana A008
  it('uses path-boundary checking to prevent false matches', () => {
    const boundaryModules = ['packages/cli/src/subroute.ts'];
    const items = [{ file: 'route.ts' }];
    resolveFindingPaths(items, boundaryModules);
    expect(items[0]!.file).toBe('route.ts');
  });

  describe('glob fallback', () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'finding-glob-test-'));
    });

    afterEach(async () => {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    });

    // @ana A014
    it('resolves basename via glob when modules_touched fails', async () => {
      await fs.promises.mkdir(path.join(tempDir, 'src', 'utils'), { recursive: true });
      await fs.promises.writeFile(path.join(tempDir, 'src', 'utils', 'helper.ts'), '');

      const items = [{ file: 'helper.ts' }];
      resolveFindingPaths(items, [], tempDir);
      expect(items[0]!.file).toBe('src/utils/helper.ts');
    });

    // @ana A015
    it('skips ambiguous basename with 2+ glob matches', async () => {
      await fs.promises.mkdir(path.join(tempDir, 'src', 'a'), { recursive: true });
      await fs.promises.mkdir(path.join(tempDir, 'src', 'b'), { recursive: true });
      await fs.promises.writeFile(path.join(tempDir, 'src', 'a', 'index.ts'), '');
      await fs.promises.writeFile(path.join(tempDir, 'src', 'b', 'index.ts'), '');

      const items = [{ file: 'index.ts' }];
      resolveFindingPaths(items, [], tempDir);
      expect(items[0]!.file).toBe('index.ts');
    });

    // @ana A016
    it('ignores node_modules matches', async () => {
      await fs.promises.mkdir(path.join(tempDir, 'node_modules', 'pkg'), { recursive: true });
      await fs.promises.writeFile(path.join(tempDir, 'node_modules', 'pkg', 'helper.ts'), '');

      const items = [{ file: 'helper.ts' }];
      resolveFindingPaths(items, [], tempDir);
      expect(items[0]!.file).toBe('helper.ts');
    });

    // @ana A017
    it('ignores .ana matches', async () => {
      await fs.promises.mkdir(path.join(tempDir, '.ana', 'plans'), { recursive: true });
      await fs.promises.writeFile(path.join(tempDir, '.ana', 'plans', 'spec.md'), '');

      const items = [{ file: 'spec.md' }];
      resolveFindingPaths(items, [], tempDir);
      expect(items[0]!.file).toBe('spec.md');
    });
  });
});

describe('getProofContext', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'proof-context-test-'));
    await fs.promises.mkdir(path.join(tempDir, '.ana'), { recursive: true });
  });

  afterEach(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  function writeChain(entries: unknown[]): void {
    fs.writeFileSync(
      path.join(tempDir, '.ana', 'proof_chain.json'),
      JSON.stringify({ entries }, null, 2),
    );
  }

  const baseEntry = {
    feature: 'Fix Drizzle schema detection',
    completed_at: '2026-04-24T10:00:00Z',
    modules_touched: ['packages/cli/src/engine/census.ts', 'packages/cli/src/engine/scan-engine.ts'],
    findings: [
      { id: 'drizzle-C1', category: 'code', summary: 'drizzle-dialect overloads SchemaFileEntry semantics', file: 'packages/cli/src/engine/census.ts', anchor: 'census.ts:267-274' },
      { id: 'drizzle-C2', category: 'code', summary: 'Config regex can match comments', file: 'packages/cli/src/engine/census.ts', anchor: 'census.ts:251' },
    ],
    build_concerns: [
      { summary: 'Census dialect as sentinel entry', file: 'packages/cli/src/engine/census.ts' },
    ],
  };

  // @ana A009, A010, A017
  it('returns findings for queried file (full path match)', () => {
    writeChain([baseEntry]);
    const results = getProofContext(['packages/cli/src/engine/census.ts'], tempDir);
    expect(results).toHaveLength(1);
    expect(results[0]!.findings.length).toBeGreaterThan(0);
    expect(results[0]!.findings[0]!.from).toBe('Fix Drizzle schema detection');
    expect(results[0]!.findings[0]!.category).toBe('code');
    expect(results[0]!.findings[0]!.summary).toContain('drizzle-dialect');
  });

  // @ana A018
  it('matches basename query to full-path finding (path suffix)', () => {
    writeChain([baseEntry]);
    const results = getProofContext(['census.ts'], tempDir);
    expect(results[0]!.findings.length).toBeGreaterThan(0);
    expect(results[0]!.findings[0]!.file).toBe('packages/cli/src/engine/census.ts');
  });

  // @ana A019
  it('matches full-path query to basename finding (legacy)', () => {
    const legacyEntry = {
      ...baseEntry,
      findings: [
        { id: 'legacy-C1', category: 'code', summary: 'Old issue', file: 'census.ts', anchor: null },
      ],
    };
    writeChain([legacyEntry]);
    const results = getProofContext(['packages/cli/src/engine/census.ts'], tempDir);
    expect(results[0]!.findings.length).toBeGreaterThan(0);
    expect(results[0]!.findings[0]!.file).toBe('census.ts');
  });

  it('matches basename query to basename finding (legacy)', () => {
    const legacyEntry = {
      ...baseEntry,
      findings: [
        { id: 'legacy-C2', category: 'test', summary: 'Legacy test issue', file: 'census.ts', anchor: null },
      ],
    };
    writeChain([legacyEntry]);
    const results = getProofContext(['census.ts'], tempDir);
    expect(results[0]!.findings.length).toBeGreaterThan(0);
  });

  // @ana A020
  it('path-boundary prevents false positive matches', () => {
    const entry = {
      ...baseEntry,
      findings: [
        { id: 'boundary-C1', category: 'code', summary: 'Issue in subroute', file: 'packages/cli/src/subroute.ts', anchor: null },
      ],
    };
    writeChain([entry]);
    const results = getProofContext(['route.ts'], tempDir);
    expect(results[0]!.findings.length).toBe(0);
  });

  // @ana A023
  it('does not match null-file findings', () => {
    const entry = {
      ...baseEntry,
      findings: [
        { id: 'null-C1', category: 'upstream', summary: 'Ambient observation', file: null, anchor: null },
      ],
    };
    writeChain([entry]);
    const results = getProofContext(['anything.ts'], tempDir);
    expect(results[0]!.findings.length).toBe(0);
  });

  it('includes build concerns in results', () => {
    writeChain([baseEntry]);
    const results = getProofContext(['packages/cli/src/engine/census.ts'], tempDir);
    expect(results[0]!.build_concerns.length).toBeGreaterThan(0);
    expect(results[0]!.build_concerns[0]!.summary).toContain('Census dialect');
    expect(results[0]!.build_concerns[0]!.from).toBe('Fix Drizzle schema detection');
  });

  it('returns empty result for file with no findings', () => {
    writeChain([baseEntry]);
    const results = getProofContext(['unknown-file.ts'], tempDir);
    expect(results[0]!.findings).toHaveLength(0);
    expect(results[0]!.build_concerns).toHaveLength(0);
    expect(results[0]!.touch_count).toBe(0);
    expect(results[0]!.last_touched).toBeNull();
  });

  it('returns empty results when proof_chain.json does not exist', () => {
    // Don't write chain file
    const results = getProofContext(['census.ts'], tempDir);
    expect(results[0]!.findings).toHaveLength(0);
    expect(results[0]!.touch_count).toBe(0);
    expect(results[0]!.last_touched).toBeNull();
  });

  // @ana A024
  it('returns results for multiple queried files', () => {
    writeChain([baseEntry]);
    const results = getProofContext(['census.ts', 'scan-engine.ts'], tempDir);
    expect(results).toHaveLength(2);
    expect(results[0]!.query).toBe('census.ts');
    expect(results[1]!.query).toBe('scan-engine.ts');
    expect(results[0]!.findings.length).toBeGreaterThan(0);
  });

  // @ana A021
  it('returns touch count per file', () => {
    const entry2 = {
      feature: 'Fix Prisma detection',
      completed_at: '2026-04-23T10:00:00Z',
      findings: [
        { id: 'prisma-C1', category: 'code', summary: 'Non-recursive check', file: 'packages/cli/src/engine/census.ts', anchor: null },
      ],
    };
    writeChain([baseEntry, entry2]);
    const results = getProofContext(['census.ts'], tempDir);
    expect(results[0]!.touch_count).toBeGreaterThan(0);
    expect(results[0]!.touch_count).toBe(2);
  });

  // @ana A022
  it('returns last touched date', () => {
    const entry2 = {
      feature: 'Fix Prisma detection',
      completed_at: '2026-04-23T10:00:00Z',
      findings: [
        { id: 'prisma-C1', category: 'code', summary: 'Non-recursive check', file: 'packages/cli/src/engine/census.ts', anchor: null },
      ],
    };
    writeChain([entry2, baseEntry]); // baseEntry is newer (2026-04-24)
    const results = getProofContext(['census.ts'], tempDir);
    expect(results[0]!.last_touched).toBeDefined();
    expect(results[0]!.last_touched).toBe('2026-04-24T10:00:00Z');
  });

  // @ana A016
  it('getProofContext has no CLI dependencies', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '../../src/utils/proofSummary.ts'),
      'utf-8',
    );
    expect(source).not.toContain("from 'chalk");
    expect(source).not.toContain("from 'commander");
  });

  it('handles entries without completed_at gracefully', () => {
    const undatedEntry = {
      feature: 'Old feature',
      findings: [
        { id: 'old-C1', category: 'code', summary: 'Old issue', file: 'census.ts', anchor: null },
      ],
    };
    writeChain([undatedEntry]);
    const results = getProofContext(['census.ts'], tempDir);
    expect(results[0]!.findings.length).toBeGreaterThan(0);
    // Undated entries don't contribute to touch_count
    expect(results[0]!.touch_count).toBe(0);
    expect(results[0]!.last_touched).toBeNull();
  });
});
