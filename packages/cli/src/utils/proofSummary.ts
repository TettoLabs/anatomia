/**
 * Generate proof summary from pipeline artifacts
 *
 * Reads artifacts from a slug directory (active or completed) and returns
 * a structured summary for proof chain and PR generation.
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { globSync } from 'glob';
import * as yaml from 'yaml';

/**
 * Per-assertion proof data
 */
export interface ProofAssertion {
  id: string;
  says: string;
  preCheckStatus: 'COVERED' | 'UNCOVERED';
  verifyStatus?: 'SATISFIED' | 'UNSATISFIED' | 'DEVIATED' | null;
  evidence?: string;
}

/**
 * Deviation from contract
 */
export interface ProofDeviation {
  contract_id: string;
  says: string;
  instead: string | null;
  reason: string | null;
  outcome: string | null;
}

/**
 * Complete proof summary
 */
export interface ProofSummary {
  feature: string;
  result: string;
  author: {
    name: string;
    email: string;
  };
  assertions: ProofAssertion[];
  contract: {
    total: number;
    covered: number;
    uncovered: number;
    satisfied: number;
    unsatisfied: number;
    deviated: number;
  };
  acceptance_criteria: {
    total: number;
    met: number;
  };
  timing: {
    total_minutes: number;
    think?: number;
    plan?: number;
    build?: number;
    verify?: number;
  };
  deviations: ProofDeviation[];
  hashes: Record<string, string>;
  seal_commit: string | null;
  completed_at: string;
  // S23 pipeline hardening — intelligence capture
  callouts: Array<{ category: string; summary: string; file: string | null; anchor: string | null }>;
  rejection_cycles: number;
  previous_failures: Array<{ id: string; summary: string }>;
  build_concerns: Array<{ summary: string; file: string | null }>;
}

/**
 * Save metadata entry structure
 */
interface SaveEntry {
  saved_at?: string;
  commit?: string;
  hash?: string;
}

/**
 * Pre-check assertion from .saves.json
 */
interface PreCheckAssertion {
  id: string;
  says: string;
  status: 'COVERED' | 'UNCOVERED';
}

/**
 * Pre-check metadata structure
 */
interface PreCheckData {
  seal?: string;
  seal_commit?: string;
  assertions?: PreCheckAssertion[];
  covered?: number;
  uncovered?: number;
}

/**
 * Saves.json structure
 */
interface SavesData {
  scope?: SaveEntry;
  contract?: SaveEntry;
  'build-report'?: SaveEntry;
  'verify-report'?: SaveEntry;
  'pre-check'?: PreCheckData;
  [key: string]: SaveEntry | PreCheckData | undefined;
}

/**
 * Contract YAML structure
 */
interface ContractYaml {
  feature?: string;
  assertions?: Array<{ id: string; says: string }>;
}

/**
 * Parse Contract Compliance table from verify report
 *
 * @param content - Verify report content
 * @returns Array of compliance rows with id, says, status, evidence
 */
function parseComplianceTable(content: string): Array<{
  id: string;
  says: string;
  status: string;
  evidence: string;
}> {
  const results: Array<{ id: string; says: string; status: string; evidence: string }> = [];

  // Find the Contract Compliance table
  const tableMatch = content.match(/## Contract Compliance[\s\S]*?\|[\s\S]*?\n([\s\S]*?)(?=\n##|\n---|\n\n\n|$)/);
  if (!tableMatch) return results;

  const tableSection = tableMatch[0];
  const lines = tableSection.split('\n');

  for (const line of lines) {
    // Skip header and separator lines
    if (!line.startsWith('|') || line.includes('----') || line.includes('Says') || line.includes('Status')) {
      continue;
    }

    // Parse table row: | ID | Says | Status | Evidence |
    const cells = line.split('|').map(c => c.trim()).filter(c => c);
    if (cells.length >= 3) {
      const id = cells[0] ?? '';
      const says = cells[1] ?? '';
      // Extract status from emoji + text (e.g., "✅ SATISFIED")
      const statusCell = cells[2] ?? '';
      const statusMatch = statusCell.match(/(SATISFIED|UNSATISFIED|DEVIATED|UNCOVERED)/i);
      const status = statusMatch && statusMatch[1] ? statusMatch[1].toUpperCase() : 'UNKNOWN';
      const evidence = cells[3] || '';

      results.push({ id, says, status, evidence });
    }
  }

  return results;
}

/**
 * Parse Result line from verify report
 *
 * @param content - Verify report content
 * @returns PASS, FAIL, or UNKNOWN
 */
function parseResult(content: string): string {
  const match = content.match(/\*\*Result:\*\*\s*(PASS|FAIL)/i);
  return match && match[1] ? match[1].toUpperCase() : 'UNKNOWN';
}

/**
 * Parse AC walkthrough and count results
 *
 * @param content - Verify report content
 * @returns Object with total and met AC counts
 */
function parseACResults(content: string): { total: number; met: number } {
  // Count all AC markers
  const passCount = (content.match(/✅\s*PASS/g) || []).length;
  const failCount = (content.match(/❌\s*FAIL/g) || []).length;
  const partialCount = (content.match(/⚠️?\s*PARTIAL/g) || []).length;
  const unverifiableCount = (content.match(/🔍\s*UNVERIFIABLE/g) || []).length;

  const total = passCount + failCount + partialCount + unverifiableCount;
  const met = passCount;

  return { total: total || 0, met };
}

/**
 * Parse deviations from build report
 *
 * @param content - Build report content
 * @returns Array of parsed deviations
 */
function parseDeviations(content: string): ProofDeviation[] {
  const deviations: ProofDeviation[] = [];

  // Match deviation blocks: ### A{ID}: {says}
  const deviationPattern = /### (A\d+): ([^\n]+)\n([\s\S]*?)(?=\n### |## |$)/g;
  let match;

  while ((match = deviationPattern.exec(content)) !== null) {
    const contractId = match[1];
    const saysRaw = match[2];
    const body = match[3];
    if (!contractId || saysRaw === undefined || body === undefined) continue;
    const says = saysRaw.trim();

    // Extract Instead, Reason, Outcome
    const insteadMatch = body.match(/\*\*Instead:\*\*\s*([^\n]+)/);
    const reasonMatch = body.match(/\*\*Reason:\*\*\s*([^\n]+)/);
    const outcomeMatch = body.match(/\*\*Outcome:\*\*\s*([^\n]+)/);

    deviations.push({
      contract_id: contractId,
      says,
      instead: insteadMatch && insteadMatch[1] ? insteadMatch[1].trim() : null,
      reason: reasonMatch && reasonMatch[1] ? reasonMatch[1].trim() : null,
      outcome: outcomeMatch && outcomeMatch[1] ? outcomeMatch[1].trim() : null,
    });
  }

  return deviations;
}

/**
 * Parse build report's ## Open Issues section.
 *
 * Extracts Build's self-reported concerns. Format: bold title + colon + description,
 * numbered or bulleted. Returns empty array when section says "None" or is missing.
 *
 * @param content - Build report content
 * @returns Array of { summary, file } for each open issue
 */
export function parseBuildOpenIssues(content: string): Array<{ summary: string; file: string | null }> {
  const results: Array<{ summary: string; file: string | null }> = [];

  const sectionMatch = content.match(/## Open Issues\n([\s\S]*?)(?=\n## |$)/);
  if (!sectionMatch || !sectionMatch[1]) return results;

  const section = sectionMatch[1].trim();
  if (section.startsWith('None')) return results;

  // Match bold-prefixed list items and join continuation lines
  const lines = section.split('\n');
  let current: string | null = null;

  const flush = () => {
    if (current) {
      const summary = current.replace(/\*\*/g, '').substring(0, 1000).trim();
      if (summary) {
        const fileRefs = extractFileRefs(summary);
        results.push({ summary, file: fileRefs[0] ?? null });
      }
    }
    current = null;
  };

  for (const line of lines) {
    if (line.match(/^[-*\d.]+\s+\*\*/)) {
      flush();
      current = line.replace(/^[-*\d.]+\s+/, '');
    } else if (current && line.trim() && !line.startsWith('#')) {
      current += ' ' + line.trim();
    }
  }
  flush();

  return results;
}

/**
 * Extract file references from callout summary text.
 *
 * Matches patterns like:
 *   - filename.ts:123 (with line number)
 *   - filename.ts:123-456 (with line range)
 *   - filename.ts (without line number)
 *
 * Supports extensions: .ts, .tsx, .js, .jsx, .json, .yaml, .yml, .md
 *
 * @param summary - Callout summary text
 * @returns Array of unique filenames (without line numbers)
 */
export function extractFileRefs(summary: string): string[] {
  // Match file path with optional line number or range.
  // Captures full path as written: src/utils/proofSummary.ts:361 → src/utils/proofSummary.ts
  // Also handles bare filenames: proofSummary.ts:361 → proofSummary.ts
  // Note: longer extensions must come before shorter prefixes (tsx before ts, json before js, yaml before yml)
  const pattern = /((?:[\w./-]+\/)?[a-zA-Z0-9_.-]+\.(?:tsx|ts|jsx|json|js|yaml|yml|md))(?::\d+(?:-\d+)?)?/g;
  const matches = summary.matchAll(pattern);
  const refs = new Set<string>();
  for (const match of matches) {
    if (match[1]) {
      // Skip URL-like paths (from links in callout text)
      if (match[1].startsWith('//') || match[1].includes('://')) continue;
      refs.add(match[1]);
    }
  }
  return Array.from(refs);
}

/**
 * Resolve callout/build-concern file fields from basenames to full paths.
 *
 * For each item where `file` is non-null and contains no `/`, finds matching
 * modules using path-boundary check (`module.endsWith('/' + file)`). If exactly
 * one match, replaces `file` with the full path. Mutates in place.
 *
 * Idempotent — files already containing `/` are skipped.
 *
 * @param items - Array of objects with a `file` field (callouts or build_concerns)
 * @param modules - Array of full relative paths from modules_touched
 * @param projectRoot - Optional project root for glob fallback when modules_touched matching fails
 * @returns void (mutates items in place)
 */
export function resolveCalloutPaths(
  items: Array<{ file: string | null }>,
  modules: string[],
  projectRoot?: string,
): void {
  for (const item of items) {
    if (!item.file) continue;
    if (item.file.includes('/')) continue;

    const basename = item.file;
    const matches = modules.filter(m => m.endsWith('/' + basename));

    if (matches.length === 1) {
      item.file = matches[0]!;
    } else if (projectRoot) {
      // Glob fallback: search the project filesystem for an unambiguous match
      const globMatches = globSync('**/' + basename, {
        cwd: projectRoot,
        ignore: ['**/node_modules/**', '**/.ana/**'],
      });
      if (globMatches.length === 1) {
        item.file = globMatches[0]!;
      }
    }
  }
}

/**
 * Callout with feature context for Active Issues index
 */
interface CalloutWithFeature {
  category: string;
  summary: string;
  file: string | null;
  feature: string;
}

/**
 * Proof chain entry structure (minimal for generateActiveIssuesMarkdown)
 */
interface ProofChainEntryForIndex {
  feature: string;
  completed_at: string;
  callouts?: Array<{ id: string; category: string; summary: string; file: string | null; anchor: string | null }>;
}

/**
 * Generate Active Issues markdown section from proof chain entries.
 *
 * Groups callouts by file reference, caps at 20 total callouts (FIFO — oldest dropped),
 * and returns markdown with file headings. Callouts without file refs go under "General".
 *
 * @param entries - Proof chain entries (oldest first, as stored in JSON)
 * @returns Markdown string starting with "# Active Issues"
 */
export function generateActiveIssuesMarkdown(entries: ProofChainEntryForIndex[]): string {
  // Collect all callouts with feature context, newest entries first
  const allCallouts: Array<CalloutWithFeature & { entryDate: string }> = [];

  // Reverse to get newest first
  const reversedEntries = [...entries].reverse();

  for (const entry of reversedEntries) {
    // Handle entries without callouts (older entries may not have this field)
    const callouts = entry.callouts || [];
    for (const callout of callouts) {
      allCallouts.push({
        category: callout.category,
        summary: callout.summary,
        file: callout.file,
        feature: entry.feature,
        entryDate: entry.completed_at,
      });
    }
  }

  // Cap at MAX_ACTIVE_ISSUES (take from start = most recent)
  const MAX_ACTIVE_ISSUES = 20;
  const totalCount = allCallouts.length;
  const cappedCallouts = allCallouts.slice(0, MAX_ACTIVE_ISSUES);

  // Heading with count
  let heading: string;
  if (totalCount === 0) {
    heading = '# Active Issues';
  } else if (totalCount <= MAX_ACTIVE_ISSUES) {
    heading = `# Active Issues (${totalCount})`;
  } else {
    heading = `# Active Issues (${MAX_ACTIVE_ISSUES} shown of ${totalCount} total)`;
  }

  // Empty state
  if (cappedCallouts.length === 0) {
    return `${heading}

*No active issues.*

---
`;
  }

  // Group by file reference
  const fileGroups = new Map<string, CalloutWithFeature[]>();

  for (const callout of cappedCallouts) {
    const key = callout.file ?? 'General';
    const existing = fileGroups.get(key) || [];
    existing.push(callout);
    fileGroups.set(key, existing);
  }

  // Build markdown
  let md = heading + '\n\n';

  // Sort file headings: named files first (alphabetically), then General
  const fileNames = Array.from(fileGroups.keys()).sort((a, b) => {
    if (a === 'General') return 1;
    if (b === 'General') return -1;
    return a.localeCompare(b);
  });

  for (const fileName of fileNames) {
    const callouts = fileGroups.get(fileName) || [];
    md += `## ${fileName}\n\n`;

    for (const callout of callouts) {
      // Truncate summary for index display (JSON keeps full text up to 1000 chars)
      let truncatedSummary = callout.summary;
      if (truncatedSummary.length > 250) {
        const lastSpace = truncatedSummary.lastIndexOf(' ', 250);
        const cutPoint = lastSpace > 0 ? lastSpace : 250;
        truncatedSummary = truncatedSummary.substring(0, cutPoint) + '...';
      }
      md += `- **${callout.category}:** ${truncatedSummary} — *${callout.feature}*\n`;
    }
    md += '\n';
  }

  md += '---\n';

  return md;
}

/**
 * Parse callouts from verify report's ## Callouts section.
 *
 * Format-agnostic: finds bold category keywords (Code, Test, Upstream, Security,
 * Performance, etc.) and captures summaries. Handles all observed formats:
 *   - `- **Code — Title:** description` (bulleted with em-dash)
 *   - `- **Code:** description` (bulleted with colon)
 *   - `**Code:** description` (standalone paragraph)
 *   - `**Code:**\n- **Title:** desc` (category header + sub-bullets)
 *   - `1. **Title:** desc` (numbered, no category — defaults to "code")
 *
 * @param content - Verify report content
 * @returns Array of { category, summary, file, anchor } (id assigned later by writeProofChain)
 */
export function parseCallouts(content: string): Array<{ category: string; summary: string; file: string | null; anchor: string | null }> {
  const results: Array<{ category: string; summary: string; file: string | null; anchor: string | null }> = [];

  // Find ## Callouts section
  const calloutsMatch = content.match(/## Callouts\n([\s\S]*?)(?=\n## |$)/);
  if (!calloutsMatch || !calloutsMatch[1]) return results;

  const section = calloutsMatch[1];
  const lines = section.split('\n');

  let currentCategory: string | null = null;
  let currentSummary: string[] = [];

  const flushCallout = () => {
    if (currentCategory && currentSummary.length > 0) {
      const summary = currentSummary.join(' ').trim().substring(0, 1000).trim();
      if (summary) {
        const fileRefs = extractFileRefs(summary);
        // Extract code anchor: first backtick-quoted construct >5 chars with a letter, not a file:line ref
        const backticks = [...summary.matchAll(/`([^`]+)`/g)].map(m => m[1]).filter((b): b is string => b !== undefined);
        const anchor = backticks.find(b =>
          b.length > 5 && /[a-zA-Z]/.test(b) && !b.match(/^\S+\.\w+:\d+/)
        ) ?? null;
        results.push({ category: currentCategory, summary, file: fileRefs[0] ?? null, anchor });
      }
    }
    currentSummary = [];
  };

  for (const line of lines) {
    // Look for a bold category keyword: **Word — or **Word:** or **Word**:
    const categoryMatch = line.match(/\*\*(\w+)\s*(?:[—–:-]|:\*\*|\*\*\s*[—–:-])/i);

    if (categoryMatch && categoryMatch[1]) {
      flushCallout();
      currentCategory = categoryMatch[1].toLowerCase();

      // Extract summary: everything after the category keyword.
      // For "- **Code — Title:** desc" → "Title: desc"
      // For "**Code:** desc" → "desc"
      // For "**Code:**" → "" (category-only header, sub-bullets provide content)
      const afterCategory = line.replace(
        /^[-*\d.]*\s*\*\*\w+\s*[—–:-]?\s*/,  // strip prefix + **Category + separator
        ''
      );
      const rest = afterCategory
        .replace(/\*\*/g, '')           // strip remaining bold markers
        .replace(/^\s*:?\s*/, '')       // strip leading colon
        .trim();
      currentSummary = rest ? [rest] : [];
    } else if (currentCategory && line.trim()) {
      const trimmed = line.replace(/^\s*[-*]\s*/, '').trim();
      if (trimmed.match(/^\*\*[^*]+\*\*/)) {
        // Sub-bullet with bold text — new callout under same category
        flushCallout();
        const cleaned = trimmed.replace(/\*\*/g, '').replace(/^\s*[-:]\s*/, '').trim();
        currentSummary = cleaned ? [cleaned] : [];
      } else if (trimmed) {
        currentSummary.push(trimmed);
      }
    } else if (!line.trim() && currentCategory && currentSummary.length > 0) {
      // Empty line — flush current callout, keep category for next sub-bullet
      flushCallout();
    }
  }

  flushCallout();
  return results;
}

/**
 * Parse rejection cycle data from verify report's Previous Findings Resolution section.
 *
 * Looks for the machine-parseable table defined by Item 4 (S23 pipeline hardening):
 *   ### Previously UNSATISFIED Assertions
 *   | ID | Previous Issue | Current Status | Resolution |
 *
 * Returns cycle count and list of previously-failed assertions.
 *
 * @param content - Verify report content
 * @returns { cycles, failures }
 */
export function parseRejectionCycles(content: string): {
  cycles: number;
  failures: Array<{ id: string; summary: string }>;
} {
  // Find the "Previous Findings Resolution" section
  const section = content.match(/## Previous Findings Resolution([\s\S]*?)(?=\n## [^#]|$)/);
  if (!section || !section[1]) return { cycles: 0, failures: [] };

  // Find the "Previously UNSATISFIED Assertions" table
  const assertionTable = section[1].match(/### Previously UNSATISFIED Assertions\n([\s\S]*?)(?=\n### |$)/);
  if (!assertionTable || !assertionTable[1]) return { cycles: 0, failures: [] };

  const failures: Array<{ id: string; summary: string }> = [];
  const rowPattern = /\|\s*(A\d+)\s*\|\s*([^|]+)\s*\|/g;
  let match;
  while ((match = rowPattern.exec(assertionTable[1])) !== null) {
    const id = match[1];
    const summary = match[2];
    if (id && summary) {
      // Skip header row (contains "ID" or "Previous Issue")
      if (id === 'ID' || summary.trim() === 'Previous Issue') continue;
      failures.push({ id, summary: summary.trim() });
    }
  }

  return { cycles: failures.length > 0 ? 1 : 0, failures };
}

/**
 * Compute timing from save timestamps
 *
 * @param saves - Saves data from .saves.json
 * @returns Timing breakdown in minutes
 */
function computeTiming(saves: SavesData): ProofSummary['timing'] {
  const getTime = (key: string): number | null => {
    const entry = saves[key] as SaveEntry | undefined;
    return entry?.saved_at ? new Date(entry.saved_at).getTime() : null;
  };

  const scopeTime = getTime('scope');
  const contractTime = getTime('contract');
  const buildTime = getTime('build-report');
  const verifyTime = getTime('verify-report');

  const totalMs = (verifyTime && scopeTime) ? verifyTime - scopeTime : 0;

  const timing: ProofSummary['timing'] = {
    total_minutes: Math.round(totalMs / 60000),
  };
  if (contractTime && scopeTime) {
    timing.think = Math.round((contractTime - scopeTime) / 60000);
    timing.plan = Math.round((contractTime - scopeTime) / 60000);
  }
  if (buildTime && contractTime) {
    timing.build = Math.round((buildTime - contractTime) / 60000);
  }
  if (verifyTime && buildTime) {
    timing.verify = Math.round((verifyTime - buildTime) / 60000);
  }
  return timing;
}

/**
 * Get git author info
 *
 * @returns Object with name and email from git config
 */
function getAuthor(): { name: string; email: string } {
  try {
    const name = execSync('git config user.name', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    const email = execSync('git config user.email', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    return { name: name || 'Unknown', email: email || 'unknown@example.com' };
  } catch {
    return { name: 'Unknown', email: 'unknown@example.com' };
  }
}

/**
 * Generate proof summary from a slug directory
 *
 * @param slugDir - Path to the slug directory (active or completed)
 * @returns ProofSummary with all available data
 */
export function generateProofSummary(slugDir: string): ProofSummary {
  const slug = path.basename(slugDir);

  // Initialize with defaults
  const summary: ProofSummary = {
    feature: slug,
    result: 'UNKNOWN',
    author: getAuthor(),
    assertions: [],
    contract: {
      total: 0,
      covered: 0,
      uncovered: 0,
      satisfied: 0,
      unsatisfied: 0,
      deviated: 0,
    },
    acceptance_criteria: {
      total: 0,
      met: 0,
    },
    timing: {
      total_minutes: 0,
    },
    deviations: [],
    hashes: {},
    seal_commit: null,
    completed_at: new Date().toISOString(),
    callouts: [],
    rejection_cycles: 0,
    previous_failures: [],
    build_concerns: [],
  };

  // Source 1: .saves.json
  const savesPath = path.join(slugDir, '.saves.json');
  let saves: SavesData = {};
  if (fs.existsSync(savesPath)) {
    try {
      saves = JSON.parse(fs.readFileSync(savesPath, 'utf-8'));

      // Extract hashes
      for (const [key, value] of Object.entries(saves)) {
        if (key !== 'pre-check' && value && typeof value === 'object' && 'hash' in value) {
          const entry = value as SaveEntry;
          if (entry.hash) {
            summary.hashes[key] = entry.hash;
          }
        }
      }

      // Extract timing
      summary.timing = computeTiming(saves);

      // seal_commit is no longer populated — new saves have no commit field.
      // Old proof chain entries keep their values; only new entries get null.
      summary.seal_commit = null;

      // Extract pre-check data
      const preCheck = saves['pre-check'] as PreCheckData | undefined;
      if (preCheck) {

        // Build assertions from pre-check
        if (preCheck.assertions && Array.isArray(preCheck.assertions)) {
          summary.assertions = preCheck.assertions.map(a => ({
            id: a.id,
            says: a.says,
            preCheckStatus: a.status,
            verifyStatus: null,
          }));

          summary.contract.total = preCheck.assertions.length;
          summary.contract.covered = preCheck.covered || preCheck.assertions.filter(a => a.status === 'COVERED').length;
          summary.contract.uncovered = preCheck.uncovered || preCheck.assertions.filter(a => a.status === 'UNCOVERED').length;
        }
      }
    } catch {
      // Continue with defaults
    }
  }

  // Source 2: contract.yaml (for feature name fallback)
  const contractPath = path.join(slugDir, 'contract.yaml');
  if (fs.existsSync(contractPath)) {
    try {
      const contract: ContractYaml = yaml.parse(fs.readFileSync(contractPath, 'utf-8'));
      if (contract.feature) {
        summary.feature = contract.feature;
      }

      // If no pre-check data, build assertions from contract
      if (summary.assertions.length === 0 && contract.assertions) {
        summary.assertions = contract.assertions.map(a => ({
          id: a.id,
          says: a.says,
          preCheckStatus: 'UNCOVERED' as const,
          verifyStatus: null,
        }));
        summary.contract.total = contract.assertions.length;
        summary.contract.uncovered = contract.assertions.length;
      }
    } catch {
      // Continue with defaults
    }
  }

  // Source 3: verify reports (single-spec: verify_report.md, multi-spec: verify_report_N.md)
  // Read ALL verify reports and aggregate compliance, callouts, and results.
  const dirFiles = fs.readdirSync(slugDir);
  const verifyFiles = dirFiles
    .filter(f => f.match(/^verify_report(_\d+)?\.md$/))
    .sort();

  let lastResult: string | null = null;
  const allCallouts: Array<{ category: string; summary: string; file: string | null; anchor: string | null }> = [];

  for (const verifyFile of verifyFiles) {
    const verifyPath = path.join(slugDir, verifyFile);
    try {
      const verifyContent = fs.readFileSync(verifyPath, 'utf-8');

      // Track result from each phase — last phase determines overall result
      const phaseResult = parseResult(verifyContent);
      if (phaseResult !== 'UNKNOWN') lastResult = phaseResult;

      // Accumulate AC results from last phase (most complete)
      summary.acceptance_criteria = parseACResults(verifyContent);

      // Parse compliance table and overlay on assertions (each phase has different IDs)
      const complianceRows = parseComplianceTable(verifyContent);
      for (const row of complianceRows) {
        const assertion = summary.assertions.find(a => a.id === row.id);
        if (assertion) {
          assertion.verifyStatus = row.status as 'SATISFIED' | 'UNSATISFIED' | 'DEVIATED';
          assertion.evidence = row.evidence;
        }
      }

      // Aggregate callouts from all phases
      allCallouts.push(...parseCallouts(verifyContent));

      // Parse rejection cycles from each phase
      const rejectionData = parseRejectionCycles(verifyContent);
      summary.rejection_cycles += rejectionData.cycles;
      summary.previous_failures.push(...rejectionData.failures);
    } catch {
      // Continue with defaults
    }
  }

  if (lastResult) summary.result = lastResult;
  summary.callouts = allCallouts;

  // Update contract counts from verify statuses (aggregated across all phases)
  summary.contract.satisfied = summary.assertions.filter(a => a.verifyStatus === 'SATISFIED').length;
  summary.contract.unsatisfied = summary.assertions.filter(a => a.verifyStatus === 'UNSATISFIED').length;
  summary.contract.deviated = summary.assertions.filter(a => a.verifyStatus === 'DEVIATED').length;

  // Source 4: build reports (single-spec: build_report.md, multi-spec: build_report_N.md)
  // Read ALL build reports and aggregate deviations and build concerns.
  const buildFiles = dirFiles
    .filter(f => f.match(/^build_report(_\d+)?\.md$/))
    .sort();

  for (const buildFile of buildFiles) {
    const buildPath = path.join(slugDir, buildFile);
    try {
      const buildContent = fs.readFileSync(buildPath, 'utf-8');
      summary.deviations.push(...parseDeviations(buildContent));
      const concerns = parseBuildOpenIssues(buildContent);
      if (concerns.length > 0) {
        summary.build_concerns.push(...concerns);
      }
    } catch {
      // Continue with defaults
    }
  }

  return summary;
}

/**
 * Result of querying proof context for a single file
 */
export interface ProofContextResult {
  query: string;
  callouts: Array<{
    id: string;
    category: string;
    summary: string;
    file: string;
    anchor: string | null;
    from: string;
    date: string;
  }>;
  build_concerns: Array<{
    summary: string;
    file: string;
    from: string;
    date: string;
  }>;
  touch_count: number;
  last_touched: string | null;
}

/**
 * Proof chain entry structure for getProofContext (minimal projection)
 */
interface ProofChainEntryForContext {
  feature: string;
  completed_at?: string;
  modules_touched?: string[];
  callouts?: Array<{ id: string; category: string; summary: string; file: string | null; anchor: string | null }>;
  build_concerns?: Array<{ summary: string; file: string | null }>;
}

/**
 * Check if a stored file path matches a queried file path.
 *
 * Three-tier matching:
 * 1. Exact match — stored equals queried
 * 2. Path-suffix match — one ends with '/' + the other's basename
 * 3. Basename match — stored has no '/' (legacy) and basenames equal
 *
 * Path-boundary checks ('/' prefix) prevent false positives from partial names.
 *
 * @param stored - File path from proof chain callout/concern
 * @param queried - File path from user query
 * @returns Whether the files match
 */
function fileMatches(stored: string, queried: string): boolean {
  // Exact match
  if (stored === queried) return true;

  const storedBasename = path.basename(stored);
  const queriedBasename = path.basename(queried);

  // Basenames must match for any non-exact match
  if (storedBasename !== queriedBasename) return false;

  // Path-suffix: stored (full path) ends with '/' + queriedBasename
  if (stored.includes('/') && stored.endsWith('/' + queriedBasename)) return true;

  // Path-suffix: queried (full path) ends with '/' + storedBasename
  if (queried.includes('/') && queried.endsWith('/' + storedBasename)) return true;

  // Basename match: stored has no '/' (legacy data)
  if (!stored.includes('/')) return true;

  return false;
}

/**
 * Query proof chain for context about specific files.
 *
 * Reads proof_chain.json, matches callouts and build concerns against
 * queried file paths using three-tier matching (exact, path-suffix, basename).
 * Returns structured results per queried file.
 *
 * @param queries - Array of file paths to query
 * @param projectRoot - Project root directory (where .ana/ lives)
 * @returns Array of ProofContextResult, one per queried file
 */
export function getProofContext(queries: string[], projectRoot: string): ProofContextResult[] {
  const chainPath = path.join(projectRoot, '.ana', 'proof_chain.json');

  if (!fs.existsSync(chainPath)) {
    return queries.map(q => ({
      query: q,
      callouts: [],
      build_concerns: [],
      touch_count: 0,
      last_touched: null,
    }));
  }

  let entries: ProofChainEntryForContext[] = [];
  try {
    const content = fs.readFileSync(chainPath, 'utf-8');
    const chain = JSON.parse(content);
    entries = chain.entries ?? [];
  } catch {
    entries = [];
  }

  return queries.map(query => {
    const matchedCallouts: ProofContextResult['callouts'] = [];
    const matchedConcerns: ProofContextResult['build_concerns'] = [];
    const touchDates: string[] = [];

    for (const entry of entries) {
      let entryTouches = false;
      const entryDate = entry.completed_at ?? '';

      // Match callouts
      for (const callout of entry.callouts ?? []) {
        if (!callout.file) continue;
        if (fileMatches(callout.file, query)) {
          matchedCallouts.push({
            id: callout.id,
            category: callout.category,
            summary: callout.summary,
            file: callout.file,
            anchor: callout.anchor,
            from: entry.feature,
            date: entryDate,
          });
          entryTouches = true;
        }
      }

      // Match build concerns
      for (const concern of entry.build_concerns ?? []) {
        if (!concern.file) continue;
        if (fileMatches(concern.file, query)) {
          matchedConcerns.push({
            summary: concern.summary,
            file: concern.file,
            from: entry.feature,
            date: entryDate,
          });
          entryTouches = true;
        }
      }

      if (entryTouches && entryDate) {
        touchDates.push(entryDate);
      }
    }

    // Sort dates descending to find most recent
    touchDates.sort((a, b) => b.localeCompare(a));

    return {
      query,
      callouts: matchedCallouts,
      build_concerns: matchedConcerns,
      touch_count: touchDates.length,
      last_touched: touchDates[0] ?? null,
    };
  });
}
