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
  completed_at: string;
  scope_summary?: string | undefined;
  // S23 pipeline hardening — intelligence capture
  findings: Array<{
    category: string;
    summary: string;
    file: string | null;
    anchor: string | null;
    line?: number;
    severity?: 'risk' | 'debt' | 'observation';
    suggested_action?: 'promote' | 'scope' | 'monitor' | 'accept';
    related_assertions?: string[];
  }>;
  rejection_cycles: number;
  previous_failures: Array<{ id: string; summary: string }>;
  build_concerns: Array<{
    summary: string;
    file: string | null;
    severity?: 'risk' | 'debt' | 'observation';
    suggested_action?: 'promote' | 'scope' | 'monitor' | 'accept';
  }>;
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
 * Extract file references from finding summary text.
 *
 * Matches patterns like:
 *   - filename.ts:123 (with line number)
 *   - filename.ts:123-456 (with line range)
 *   - filename.ts (without line number)
 *
 * Supports extensions: .ts, .tsx, .js, .jsx, .json, .yaml, .yml, .md
 *
 * @param summary - Finding summary text
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
      // Skip URL-like paths (from links in finding text)
      if (match[1].startsWith('//') || match[1].includes('://')) continue;
      refs.add(match[1]);
    }
  }
  return Array.from(refs);
}

/**
 * Resolve finding/build-concern file fields from basenames to full paths.
 *
 * For each item where `file` is non-null and contains no `/`, finds matching
 * modules using path-boundary check (`module.endsWith('/' + file)`). If exactly
 * one match, replaces `file` with the full path. Mutates in place.
 *
 * Idempotent — files that already exist at their declared path (relative to
 * `projectRoot`) are skipped. Files that don't exist — whether bare basenames
 * or partial monorepo paths — enter the resolution chain.
 *
 * @param items - Array of objects with a `file` field (findings or build_concerns)
 * @param modules - Array of full relative paths from modules_touched
 * @param projectRoot - Project root for existence checks and glob fallback
 * @param globCache - Optional shared cache to avoid redundant globSync calls across invocations
 * @returns void (mutates items in place)
 */
export function resolveFindingPaths(
  items: Array<{ file: string | null }>,
  modules: string[],
  projectRoot: string,
  globCache: Map<string, string[]> = new Map(),
): void {
  for (const item of items) {
    if (!item.file) continue;
    if (fs.existsSync(path.join(projectRoot, item.file))) continue;

    const basename = item.file;
    const matches = modules.filter(m => m === basename || m.endsWith('/' + basename));

    if (matches.length === 1) {
      item.file = matches[0]!;
    } else {
      // Glob fallback: search the project filesystem for an unambiguous match
      let globMatches = globCache.get(basename);
      if (globMatches === undefined) {
        globMatches = globSync('**/' + basename, {
          cwd: projectRoot,
          ignore: ['**/node_modules/**', '**/.ana/**'],
        });
        globCache.set(basename, globMatches);
      }
      if (globMatches.length === 1) {
        item.file = globMatches[0]!;
      }
    }
  }
}

/**
 * Finding with feature context for Active Issues index
 */
interface FindingWithFeature {
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
  findings?: Array<{ id: string; category: string; summary: string; file: string | null; anchor: string | null; status?: string }>;
}

/**
 * Generate Active Issues markdown section from proof chain entries.
 *
 * Groups findings by file reference, caps at 30 total findings (FIFO — oldest dropped),
 * and returns markdown with file headings. Findings without file refs go under "General".
 *
 * @param entries - Proof chain entries (oldest first, as stored in JSON)
 * @returns Markdown string starting with "# Active Issues"
 */
export function generateActiveIssuesMarkdown(entries: ProofChainEntryForIndex[]): string {
  // Collect all findings with feature context, newest entries first
  const allFindings: Array<FindingWithFeature & { entryDate: string }> = [];

  // Reverse to get newest first
  const reversedEntries = [...entries].reverse();

  for (const entry of reversedEntries) {
    // Handle entries without findings (older entries may not have this field)
    const findings = entry.findings || [];
    for (const finding of findings) {
      // Filter to active findings only (status === 'active' or undefined for backward compat)
      if (finding.status && finding.status !== 'active') continue;
      allFindings.push({
        category: finding.category,
        summary: finding.summary,
        file: finding.file,
        feature: entry.feature,
        entryDate: entry.completed_at,
      });
    }
  }

  // Cap at MAX_ACTIVE_ISSUES (take from start = most recent)
  const MAX_ACTIVE_ISSUES = 30;
  const totalCount = allFindings.length;
  const cappedFindings = allFindings.slice(0, MAX_ACTIVE_ISSUES);

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
  if (cappedFindings.length === 0) {
    return `${heading}

*No active issues.*

---
`;
  }

  // Group by file reference
  const fileGroups = new Map<string, FindingWithFeature[]>();

  for (const finding of cappedFindings) {
    const key = finding.file ?? 'General';
    const existing = fileGroups.get(key) || [];
    existing.push(finding);
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
    const findings = fileGroups.get(fileName) || [];
    md += `## ${fileName}\n\n`;

    for (const finding of findings) {
      // Truncate summary for index display (JSON keeps full text up to 1000 chars)
      let truncatedSummary = finding.summary;
      if (truncatedSummary.length > 250) {
        const lastSpace = truncatedSummary.lastIndexOf(' ', 250);
        const cutPoint = lastSpace > 0 ? lastSpace : 250;
        truncatedSummary = truncatedSummary.substring(0, cutPoint) + '...';
      }
      md += `- **${finding.category}:** ${truncatedSummary} — *${finding.feature}*\n`;
    }
    md += '\n';
  }

  md += '---\n';

  return md;
}

/**
 * Extract the first paragraph of the ## Intent section from a scope.md file.
 *
 * "First paragraph" = text between `## Intent\n` and the next blank line or `##` heading.
 * Returns undefined if scope.md doesn't exist or has no Intent section.
 *
 * @param scopePath - Absolute path to scope.md
 * @returns First paragraph text, or undefined
 */
export function extractScopeSummary(scopePath: string): string | undefined {
  if (!fs.existsSync(scopePath)) return undefined;
  try {
    const content = fs.readFileSync(scopePath, 'utf-8');
    const intentMatch = content.match(/## Intent\n([\s\S]*?)(?=\n## |\n\n|$)/);
    if (!intentMatch || !intentMatch[1]) return undefined;
    const paragraph = intentMatch[1].trim();
    return paragraph || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Dashboard entry type for generateDashboard
 */
interface DashboardEntry {
  slug: string;
  feature: string;
  completed_at: string;
  findings?: Array<{ id: string; category: string; summary: string; file: string | null; anchor: string | null; status?: string }>;
}

/**
 * Generate a quality dashboard from proof chain entries.
 *
 * Contains: summary line, Hot Modules section, Promoted Rules placeholder,
 * and Active Findings section (via generateActiveIssuesMarkdown logic, grouped by file).
 *
 * @param entries - Proof chain entries (oldest first)
 * @param stats - Chain health stats
 * @param stats.runs - Total pipeline runs
 * @param stats.active - Active finding count
 * @param stats.lessons - Lesson finding count
 * @param stats.promoted - Promoted finding count
 * @param stats.closed - Closed finding count
 * @returns Markdown string for PROOF_CHAIN.md
 */
export function generateDashboard(entries: DashboardEntry[], stats: { runs: number; active: number; lessons: number; promoted: number; closed: number }): string {
  let md = '# Proof Chain Dashboard\n\n';

  // Summary line
  md += `${stats.runs} runs · ${stats.active} active · ${stats.lessons} lessons · ${stats.promoted} promoted · ${stats.closed} closed\n\n`;

  // Hot Modules: files with active findings from 2+ distinct entries
  const fileEntryMap = new Map<string, Set<string>>();
  const fileActiveCount = new Map<string, number>();

  for (const entry of entries) {
    for (const finding of entry.findings ?? []) {
      if (!finding.file) continue;
      if (finding.status && finding.status !== 'active') continue;
      const entrySet = fileEntryMap.get(finding.file) || new Set();
      entrySet.add(entry.slug);
      fileEntryMap.set(finding.file, entrySet);
      fileActiveCount.set(finding.file, (fileActiveCount.get(finding.file) || 0) + 1);
    }
  }

  md += '## Hot Modules\n\n';
  const hotModules = Array.from(fileEntryMap.entries())
    .filter(([, entrySet]) => entrySet.size >= 2)
    .map(([file, entrySet]) => ({ file, active: fileActiveCount.get(file) || 0, entries: entrySet.size }))
    .sort((a, b) => b.active - a.active)
    .slice(0, 5);

  if (hotModules.length > 0) {
    md += '| File | Active | Entries |\n';
    md += '|------|--------|--------|\n';
    for (const mod of hotModules) {
      md += `| ${mod.file} | ${mod.active} | ${mod.entries} |\n`;
    }
  } else {
    md += '*No hot modules yet.*\n';
  }

  md += '\n## Promoted Rules\n\n*No promoted rules yet.*\n\n';

  // Active Findings section (reuse generateActiveIssuesMarkdown logic)
  // Collect active findings
  const allActive: Array<FindingWithFeature & { entryDate: string }> = [];
  const reversedEntries = [...entries].reverse();
  for (const entry of reversedEntries) {
    for (const finding of entry.findings ?? []) {
      if (finding.status && finding.status !== 'active') continue;
      allActive.push({
        category: finding.category,
        summary: finding.summary,
        file: finding.file,
        feature: entry.feature,
        entryDate: entry.completed_at,
      });
    }
  }

  const MAX_ACTIVE = 30;
  const totalActive = allActive.length;
  const capped = allActive.slice(0, MAX_ACTIVE);

  if (totalActive === 0) {
    md += '## Active Findings\n\n*No active findings.*\n';
  } else {
    if (totalActive <= MAX_ACTIVE) {
      md += `## Active Findings (${totalActive})\n\n`;
    } else {
      md += `## Active Findings (${MAX_ACTIVE} shown of ${totalActive} total)\n\n`;
    }

    // Group by file
    const fileGroups = new Map<string, Array<FindingWithFeature & { entryDate: string }>>();
    for (const finding of capped) {
      const key = finding.file ?? 'General';
      const existing = fileGroups.get(key) || [];
      existing.push(finding);
      fileGroups.set(key, existing);
    }

    const fileNames = Array.from(fileGroups.keys()).sort((a, b) => {
      if (a === 'General') return 1;
      if (b === 'General') return -1;
      return a.localeCompare(b);
    });

    for (const fileName of fileNames) {
      const findings = fileGroups.get(fileName) || [];
      md += `### ${fileName}\n\n`;
      for (const finding of findings) {
        md += `- **${finding.category}:** ${finding.summary} — *${finding.feature}*\n`;
      }
      md += '\n';
    }
  }

  return md;
}

/**
 * Chain health counts for metadata.
 */
export interface ChainHealth {
  chain_runs: number;
  findings: {
    active: number;
    closed: number;
    lesson: number;
    promoted: number;
    total: number;
    by_severity: {
      risk: number;
      debt: number;
      observation: number;
      unclassified: number;
    };
    by_action: {
      promote: number;
      scope: number;
      monitor: number;
      accept: number;
      unclassified: number;
    };
  };
}

/**
 * JSON envelope for successful proof responses.
 */
export interface JsonEnvelope<T = unknown> {
  command: string;
  timestamp: string;
  results: T;
  meta: ChainHealth;
}

/**
 * JSON envelope for error proof responses.
 */
export interface JsonErrorEnvelope {
  command: string;
  timestamp: string;
  error: {
    code: string;
    message: string;
    [key: string]: unknown;
  };
  meta: ChainHealth;
}

// ─── Health Report Constants ─────────────────────────────────────────
/** Minimum active findings for a module to be "hot" */
export const MIN_FINDINGS_HOT = 3;
/** Minimum distinct entries for a module to be "hot" */
export const MIN_ENTRIES_HOT = 2;
/** Number of recent entries for trajectory window */
export const TRAJECTORY_WINDOW = 5;
/** Minimum entries before trend can be computed */
export const MIN_ENTRIES_FOR_TREND = 10;
/** Minimum subsequent entries before promotion effectiveness is computed */
const MIN_ENTRIES_FOR_EFFECTIVENESS = 5;

/**
 * Compute health report from a parsed proof chain.
 *
 * Pure synchronous function — caller handles file I/O.
 * Analyzes trajectory, hot modules, promotion candidates, and promotion effectiveness.
 *
 * @param chain - Parsed proof chain (must have `entries` array)
 * @param chain.entries - Array of proof chain entries with findings
 * @returns HealthReport with trajectory, hot modules, promotion candidates, and effectiveness
 */
export function computeHealthReport(chain: {
  entries: Array<{
    slug?: string;
    findings?: Array<{
      id?: string;
      status?: string;
      severity?: string;
      category?: string;
      suggested_action?: string;
      summary?: string;
      file?: string | null;
      promoted_to?: string;
    }>;
  }>;
}): import('../types/proof.js').HealthReport {
  const runs = chain.entries.length;

  if (runs === 0) {
    return {
      runs: 0,
      trajectory: {
        risks_per_run_last5: null,
        risks_per_run_all: null,
        trend: 'insufficient_data',
        unclassified_count: 0,
      },
      hot_modules: [],
      promotion_candidates: [],
      promotions: [],
    };
  }

  // ─── Trajectory ──────────────────────────────────────────────────
  let totalUnclassified = 0;
  const riskCounts: number[] = [];
  let hasClassifiedData = false;

  for (const entry of chain.entries) {
    let entryRisks = 0;
    let entryHasClassified = false;
    for (const f of entry.findings || []) {
      if (!f.severity) {
        totalUnclassified++;
        continue;
      }
      hasClassifiedData = true;
      entryHasClassified = true;
      if (f.severity === 'risk') {
        entryRisks++;
      }
    }
    if (entryHasClassified) {
      riskCounts.push(entryRisks);
    }
  }

  let risksPerRunAll: number | null = null;
  let risksPerRunLast5: number | null = null;
  let trend: import('../types/proof.js').TrajectoryData['trend'] = 'insufficient_data';

  if (!hasClassifiedData && totalUnclassified > 0) {
    trend = 'no_classified_data';
  } else if (hasClassifiedData) {
    const sum = riskCounts.reduce((a, b) => a + b, 0);
    risksPerRunAll = Math.round((sum / riskCounts.length) * 10) / 10;

    const window = riskCounts.slice(-TRAJECTORY_WINDOW);
    const windowSum = window.reduce((a, b) => a + b, 0);
    risksPerRunLast5 = Math.round((windowSum / window.length) * 10) / 10;

    if (riskCounts.length < MIN_ENTRIES_FOR_TREND) {
      trend = 'insufficient_data';
    } else {
      // Compare first half vs second half
      const half = Math.floor(riskCounts.length / 2);
      const firstHalf = riskCounts.slice(0, half);
      const secondHalf = riskCounts.slice(half);
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      if (secondAvg < firstAvg) {
        trend = 'improving';
      } else if (secondAvg > firstAvg) {
        trend = 'worsening';
      } else {
        trend = 'stable';
      }
    }
  }

  const trajectory: import('../types/proof.js').TrajectoryData = {
    risks_per_run_last5: risksPerRunLast5,
    risks_per_run_all: risksPerRunAll,
    trend,
    unclassified_count: totalUnclassified,
  };

  // ─── Hot Modules ─────────────────────────────────────────────────
  const moduleMap = new Map<string, {
    findings: number;
    entries: Set<number>;
    risk: number;
    debt: number;
    observation: number;
    unclassified: number;
  }>();

  for (let i = 0; i < chain.entries.length; i++) {
    const entry = chain.entries[i]!;
    for (const f of entry.findings || []) {
      // Only count active findings
      if (f.status && f.status !== 'active') continue;
      if (!f.file) continue;

      let mod = moduleMap.get(f.file);
      if (!mod) {
        mod = { findings: 0, entries: new Set(), risk: 0, debt: 0, observation: 0, unclassified: 0 };
        moduleMap.set(f.file, mod);
      }
      mod.findings++;
      mod.entries.add(i);
      switch (f.severity) {
        case 'risk': mod.risk++; break;
        case 'debt': mod.debt++; break;
        case 'observation': mod.observation++; break;
        default: mod.unclassified++; break;
      }
    }
  }

  const hotModules: import('../types/proof.js').HotModule[] = [];
  for (const [file, data] of moduleMap) {
    if (data.findings >= MIN_FINDINGS_HOT && data.entries.size >= MIN_ENTRIES_HOT) {
      hotModules.push({
        file,
        finding_count: data.findings,
        entry_count: data.entries.size,
        by_severity: {
          risk: data.risk,
          debt: data.debt,
          observation: data.observation,
          unclassified: data.unclassified,
        },
      });
    }
  }

  // Sort by finding count descending, cap at 5
  hotModules.sort((a, b) => b.finding_count - a.finding_count);
  const topHotModules = hotModules.slice(0, 5);

  // ─── Promotion Candidates ───────────────────────────────────────
  const candidates: import('../types/proof.js').PromotionCandidate[] = [];
  // Track scope findings by (severity + category + file) for recurrence detection
  const scopeRecurrence = new Map<string, { count: number; finding: { id: string; severity: string; suggested_action: string; summary: string; file: string | null; entry_slug: string } }>();

  for (const entry of chain.entries) {
    for (const f of entry.findings || []) {
      if (f.status && f.status !== 'active') continue;

      if (f.suggested_action === 'promote') {
        candidates.push({
          id: f.id || 'unknown',
          severity: f.severity || 'unclassified',
          suggested_action: 'promote',
          summary: f.summary || '',
          file: f.file ?? null,
          entry_slug: entry.slug || '',
        });
      } else if (f.suggested_action === 'scope') {
        const key = `${f.severity || ''}:${f.category || ''}:${f.file || ''}`;
        const existing = scopeRecurrence.get(key);
        if (existing) {
          existing.count++;
          // Update to latest entry
          existing.finding = {
            id: f.id || 'unknown',
            severity: f.severity || 'unclassified',
            suggested_action: 'scope',
            summary: f.summary || '',
            file: f.file ?? null,
            entry_slug: entry.slug || '',
          };
        } else {
          scopeRecurrence.set(key, {
            count: 1,
            finding: {
              id: f.id || 'unknown',
              severity: f.severity || 'unclassified',
              suggested_action: 'scope',
              summary: f.summary || '',
              file: f.file ?? null,
              entry_slug: entry.slug || '',
            },
          });
        }
      }
    }
  }

  // Add recurring scope findings (2+ entries)
  for (const [, data] of scopeRecurrence) {
    if (data.count >= 2) {
      candidates.push({
        ...data.finding,
        recurrence_count: data.count,
      });
    }
  }

  // ─── Promotion Effectiveness ─────────────────────────────────────
  const promotions: import('../types/proof.js').PromotionEffectiveness[] = [];

  for (let i = 0; i < chain.entries.length; i++) {
    const entry = chain.entries[i]!;
    for (const f of entry.findings || []) {
      if (f.status !== 'promoted') continue;

      const severity = f.severity || '';
      const category = f.category || '';
      const file = f.file ?? null;

      // Count matching findings in subsequent entries
      const subsequentEntries = chain.entries.slice(i + 1);
      let matchingFindings = 0;
      for (const subEntry of subsequentEntries) {
        for (const sf of subEntry.findings || []) {
          if (sf.severity === severity && sf.category === category && (sf.file ?? null) === file) {
            matchingFindings++;
          }
        }
      }

      const subsequent = subsequentEntries.length;
      let status: 'tracking' | 'effective' | 'ineffective';
      let reductionPct: number | null = null;

      if (subsequent < MIN_ENTRIES_FOR_EFFECTIVENESS) {
        status = 'tracking';
      } else {
        // Compare: if matching findings decreased relative to baseline (1 per entry), it's effective
        const expectedBaseline = subsequent; // 1 match per entry would be no change
        reductionPct = Math.round((1 - matchingFindings / expectedBaseline) * 100);
        status = reductionPct > 0 ? 'effective' : 'ineffective';
      }

      promotions.push({
        id: f.id || 'unknown',
        summary: f.summary || '',
        severity,
        category,
        file,
        promoted_to: f.promoted_to ?? null,
        subsequent_entries: subsequent,
        status,
        reduction_pct: reductionPct,
        match_criteria: { severity, category, file },
      });
    }
  }

  return {
    runs,
    trajectory,
    hot_modules: topHotModules,
    promotion_candidates: candidates,
    promotions,
  };
}

/**
 * Detect health changes by comparing current chain vs chain-minus-last-entry.
 *
 * @param chain - Full parsed proof chain
 * @param chain.entries - Array of proof chain entries with findings
 * @returns HealthChange indicating whether anything meaningful changed
 */
export function detectHealthChange(chain: {
  entries: Array<{
    slug?: string;
    findings?: Array<{
      id?: string;
      status?: string;
      severity?: string;
      category?: string;
      suggested_action?: string;
      summary?: string;
      file?: string | null;
      promoted_to?: string;
    }>;
  }>;
}): import('../types/proof.js').HealthChange {
  const current = computeHealthReport(chain);
  const noChange: import('../types/proof.js').HealthChange = {
    changed: false,
    trajectory: current.trajectory,
    triggers: [],
    details: [],
  };

  // Single entry or empty — no comparison possible
  if (chain.entries.length <= 1) {
    return noChange;
  }

  const previous = computeHealthReport({ entries: chain.entries.slice(0, -1) });
  const triggers: import('../types/proof.js').HealthChange['triggers'] = [];
  const details: string[] = [];

  // Check trend direction change
  const trendOrder = ['worsening', 'stable', 'improving'] as const;
  const currentTrendIdx = trendOrder.indexOf(current.trajectory.trend as typeof trendOrder[number]);
  const previousTrendIdx = trendOrder.indexOf(previous.trajectory.trend as typeof trendOrder[number]);

  if (currentTrendIdx >= 0 && previousTrendIdx >= 0 && currentTrendIdx !== previousTrendIdx) {
    if (currentTrendIdx > previousTrendIdx) {
      triggers.push('trend_improved');
      details.push(`trend improved (risks/run ${previous.trajectory.risks_per_run_last5} → ${current.trajectory.risks_per_run_last5})`);
    } else {
      triggers.push('trend_worsened');
      details.push(`trend worsened (risks/run ${previous.trajectory.risks_per_run_last5} → ${current.trajectory.risks_per_run_last5})`);
    }
  }

  // Check new hot modules
  const previousHotFiles = new Set(previous.hot_modules.map(m => m.file));
  const newHotModules = current.hot_modules.filter(m => !previousHotFiles.has(m.file));
  if (newHotModules.length > 0) {
    triggers.push('new_hot_module');
    for (const m of newHotModules) {
      details.push(`${m.file} is now a hot module`);
    }
  }

  // Check new promotion candidates
  const previousCandidateIds = new Set(previous.promotion_candidates.map(c => c.id));
  const newCandidates = current.promotion_candidates.filter(c => !previousCandidateIds.has(c.id));
  if (newCandidates.length > 0) {
    triggers.push('new_candidates');
    details.push(`${newCandidates.length} new promotion candidate${newCandidates.length !== 1 ? 's' : ''}`);
  }

  if (triggers.length === 0) {
    return noChange;
  }

  return {
    changed: true,
    trajectory: current.trajectory,
    triggers,
    details,
  };
}

/**
 * Compute chain health counts from a parsed ProofChain object.
 *
 * Pure synchronous function — caller handles file I/O.
 *
 * @param chain - Parsed proof chain (must have `entries` array)
 * @param chain.entries - Array of proof chain entries
 * @returns Chain health counts for use in JSON meta fields
 */
export function computeChainHealth(chain: { entries: Array<{ findings?: Array<{ status?: string; severity?: string; suggested_action?: string }> }> }): ChainHealth {
  const runs = chain.entries.length;
  let total = 0;
  let active = 0;
  let closed = 0;
  let lesson = 0;
  let promoted = 0;

  // Severity breakdowns
  let sevRisk = 0;
  let sevDebt = 0;
  let sevObservation = 0;
  let sevUnclassified = 0;

  // Action breakdowns
  let actPromote = 0;
  let actScope = 0;
  let actMonitor = 0;
  let actAccept = 0;
  let actUnclassified = 0;

  for (const e of chain.entries) {
    for (const f of e.findings || []) {
      total++;
      switch (f.status) {
        case 'active': active++; break;
        case 'lesson': lesson++; break;
        case 'promoted': promoted++; break;
        case 'closed': closed++; break;
        default: active++; break; // undefined = active
      }
      switch (f.severity) {
        case 'risk': sevRisk++; break;
        case 'debt': sevDebt++; break;
        case 'observation': sevObservation++; break;
        default: sevUnclassified++; break;
      }
      switch (f.suggested_action) {
        case 'promote': actPromote++; break;
        case 'scope': actScope++; break;
        case 'monitor': actMonitor++; break;
        case 'accept': actAccept++; break;
        default: actUnclassified++; break;
      }
    }
  }

  return {
    chain_runs: runs,
    findings: {
      active, closed, lesson, promoted, total,
      by_severity: { risk: sevRisk, debt: sevDebt, observation: sevObservation, unclassified: sevUnclassified },
      by_action: { promote: actPromote, scope: actScope, monitor: actMonitor, accept: actAccept, unclassified: actUnclassified },
    },
  };
}

/**
 * Wrap a successful command result in the standard JSON envelope.
 *
 * @param command - Command name (e.g., "proof", "proof close")
 * @param results - Command-specific results object
 * @param chain - Parsed proof chain for health metadata
 * @param chain.entries - Array of proof chain entries
 * @returns Four-key JSON envelope
 */
export function wrapJsonResponse<T>(command: string, results: T, chain: { entries: Array<{ findings?: Array<{ status?: string; severity?: string; suggested_action?: string }> }> }): JsonEnvelope<T> {
  return {
    command,
    timestamp: new Date().toISOString(),
    results,
    meta: computeChainHealth(chain),
  };
}

/**
 * Wrap an error in the standard JSON error envelope.
 *
 * @param command - Command name (e.g., "proof close")
 * @param code - Machine-readable error code (e.g., "WRONG_BRANCH")
 * @param message - Human-readable error message
 * @param context - Additional context fields for the error
 * @param chain - Parsed proof chain for health metadata (null if chain unavailable)
 * @param chain.entries - Array of proof chain entries
 * @returns Four-key JSON error envelope
 */
export function wrapJsonError(
  command: string,
  code: string,
  message: string,
  context: Record<string, unknown>,
  chain: { entries: Array<{ findings?: Array<{ status?: string; severity?: string; suggested_action?: string }> }> } | null,
): JsonErrorEnvelope {
  const meta: ChainHealth = chain
    ? computeChainHealth(chain)
    : {
      chain_runs: 0,
      findings: {
        active: 0, closed: 0, lesson: 0, promoted: 0, total: 0,
        by_severity: { risk: 0, debt: 0, observation: 0, unclassified: 0 },
        by_action: { promote: 0, scope: 0, monitor: 0, accept: 0, unclassified: 0 },
      },
    };

  return {
    command,
    timestamp: new Date().toISOString(),
    error: { code, message, ...context },
    meta,
  };
}

/**
 * Parse findings from verify report's ## Callouts section.
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
export function parseFindings(content: string): Array<{ category: string; summary: string; file: string | null; anchor: string | null }> {
  const results: Array<{ category: string; summary: string; file: string | null; anchor: string | null }> = [];

  // Find ## Callouts or ## Findings section (backward compatible)
  const findingsMatch = content.match(/## (?:Callouts|Findings)\n([\s\S]*?)(?=\n## |$)/);
  if (!findingsMatch || !findingsMatch[1]) return results;

  const section = findingsMatch[1];
  const lines = section.split('\n');

  let currentCategory: string | null = null;
  let currentSummary: string[] = [];

  const flushFinding = () => {
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
      flushFinding();
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
        // Sub-bullet with bold text — new finding under same category
        flushFinding();
        const cleaned = trimmed.replace(/\*\*/g, '').replace(/^\s*[-:]\s*/, '').trim();
        currentSummary = cleaned ? [cleaned] : [];
      } else if (trimmed) {
        currentSummary.push(trimmed);
      }
    } else if (!line.trim() && currentCategory && currentSummary.length > 0) {
      // Empty line — flush current finding, keep category for next sub-bullet
      flushFinding();
    }
  }

  flushFinding();
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
    completed_at: new Date().toISOString(),
    findings: [],
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
  // Read ALL verify reports and aggregate compliance, findings, and results.
  const dirFiles = fs.readdirSync(slugDir);
  const verifyFiles = dirFiles
    .filter(f => f.match(/^verify_report(_\d+)?\.md$/))
    .sort();

  let lastResult: string | null = null;
  const allFindings: ProofSummary['findings'] = [];

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

      // YAML-first findings reader: derive companion path, read if exists, fall back to regex
      const companionName = verifyFile.replace(/_report/, '_data').replace(/\.md$/, '.yaml');
      const companionPath = path.join(slugDir, companionName);

      if (fs.existsSync(companionPath)) {
        try {
          const yamlContent = yaml.parse(fs.readFileSync(companionPath, 'utf-8'));
          if (yamlContent && Array.isArray(yamlContent.findings)) {
            for (const f of yamlContent.findings as Array<Record<string, unknown>>) {
              const finding: ProofSummary['findings'][0] = {
                category: String(f['category'] ?? 'code'),
                summary: String(f['summary'] ?? ''),
                file: typeof f['file'] === 'string' ? f['file'] : null,
                anchor: typeof f['anchor'] === 'string' ? f['anchor'] : null,
              };
              if (typeof f['line'] === 'number') finding.line = f['line'];
              if (typeof f['severity'] === 'string') finding.severity = f['severity'] as 'risk' | 'debt' | 'observation';
              if (typeof f['suggested_action'] === 'string') finding.suggested_action = f['suggested_action'] as 'promote' | 'scope' | 'monitor' | 'accept';
              if (Array.isArray(f['related_assertions'])) finding.related_assertions = f['related_assertions'] as string[];
              allFindings.push(finding);
            }
          }
        } catch {
          // YAML parse failed — fall back to regex
          allFindings.push(...parseFindings(verifyContent));
        }
      } else {
        // No companion — fall back to regex extraction
        allFindings.push(...parseFindings(verifyContent));
      }

      // Parse rejection cycles from each phase
      const rejectionData = parseRejectionCycles(verifyContent);
      summary.rejection_cycles += rejectionData.cycles;
      summary.previous_failures.push(...rejectionData.failures);
    } catch {
      // Continue with defaults
    }
  }

  if (lastResult) summary.result = lastResult;
  summary.findings = allFindings;

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

      // YAML-first build concerns reader: derive companion, read if exists, fall back to regex
      const buildCompanionName = buildFile.replace(/_report/, '_data').replace(/\.md$/, '.yaml');
      const buildCompanionPath = path.join(slugDir, buildCompanionName);

      if (fs.existsSync(buildCompanionPath)) {
        try {
          const yamlContent = yaml.parse(fs.readFileSync(buildCompanionPath, 'utf-8'));
          if (yamlContent && Array.isArray(yamlContent.concerns)) {
            for (const c of yamlContent.concerns as Array<Record<string, unknown>>) {
              const concern: ProofSummary['build_concerns'][0] = {
                summary: String(c['summary'] ?? ''),
                file: typeof c['file'] === 'string' ? c['file'] : null,
              };
              if (typeof c['severity'] === 'string') concern.severity = c['severity'] as 'risk' | 'debt' | 'observation';
              if (typeof c['suggested_action'] === 'string') concern.suggested_action = c['suggested_action'] as 'promote' | 'scope' | 'monitor' | 'accept';
              summary.build_concerns.push(concern);
            }
          }
        } catch {
          // YAML parse failed — fall back to regex
          const concerns = parseBuildOpenIssues(buildContent);
          if (concerns.length > 0) {
            summary.build_concerns.push(...concerns);
          }
        }
      } else {
        // No companion — fall back to regex extraction
        const concerns = parseBuildOpenIssues(buildContent);
        if (concerns.length > 0) {
          summary.build_concerns.push(...concerns);
        }
      }
    } catch {
      // Continue with defaults
    }
  }

  // Source 5: scope.md (for scope_summary)
  const scopePath = path.join(slugDir, 'scope.md');
  summary.scope_summary = extractScopeSummary(scopePath);

  return summary;
}

/**
 * Result of querying proof context for a single file
 */
export interface ProofContextResult {
  query: string;
  findings: Array<{
    id: string;
    category: string;
    summary: string;
    file: string;
    anchor: string | null;
    line?: number;
    severity?: 'risk' | 'debt' | 'observation';
    suggested_action?: 'promote' | 'scope' | 'monitor' | 'accept';
    related_assertions?: string[];
    from: string;
    date: string;
    status?: string | undefined;
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
  findings?: Array<{
    id: string;
    category: string;
    summary: string;
    file: string | null;
    anchor: string | null;
    line?: number;
    severity?: 'risk' | 'debt' | 'observation';
    suggested_action?: 'promote' | 'scope' | 'monitor' | 'accept';
    related_assertions?: string[];
    status?: string;
  }>;
  build_concerns?: Array<{
    summary: string;
    file: string | null;
    severity?: 'risk' | 'debt' | 'observation';
    suggested_action?: 'promote' | 'scope' | 'monitor' | 'accept';
  }>;
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
 * @param stored - File path from proof chain finding/concern
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
 * Reads proof_chain.json, matches findings and build concerns against
 * queried file paths using three-tier matching (exact, path-suffix, basename).
 * Returns structured results per queried file.
 *
 * @param queries - Array of file paths to query
 * @param projectRoot - Project root directory (where .ana/ lives)
 * @param options - Optional configuration
 * @param options.includeAll - When true, returns all findings regardless of status
 * @returns Array of ProofContextResult, one per queried file
 */
export function getProofContext(queries: string[], projectRoot: string, options?: { includeAll?: boolean }): ProofContextResult[] {
  const chainPath = path.join(projectRoot, '.ana', 'proof_chain.json');

  if (!fs.existsSync(chainPath)) {
    return queries.map(q => ({
      query: q,
      findings: [],
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
    const matchedFindings: ProofContextResult['findings'] = [];
    const matchedConcerns: ProofContextResult['build_concerns'] = [];
    const touchDates: string[] = [];

    for (const entry of entries) {
      let entryTouches = false;
      const entryDate = entry.completed_at ?? '';

      // Match findings
      for (const finding of entry.findings ?? []) {
        if (!finding.file) continue;
        // Filter by status: default excludes closed/lesson/promoted, includeAll returns everything
        if (!options?.includeAll && finding.status && finding.status !== 'active') continue;
        if (fileMatches(finding.file, query)) {
          const matched: ProofContextResult['findings'][0] = {
            id: finding.id,
            category: finding.category,
            summary: finding.summary,
            file: finding.file,
            anchor: finding.anchor,
            from: entry.feature,
            date: entryDate,
            status: finding.status,
          };
          if (finding.line !== undefined) matched.line = finding.line;
          if (finding.severity !== undefined) matched.severity = finding.severity;
          if (finding.suggested_action !== undefined) matched.suggested_action = finding.suggested_action;
          if (finding.related_assertions !== undefined) matched.related_assertions = finding.related_assertions;
          matchedFindings.push(matched);
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
      findings: matchedFindings,
      build_concerns: matchedConcerns,
      touch_count: touchDates.length,
      last_touched: touchDates[0] ?? null,
    };
  });
}
