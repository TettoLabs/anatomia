/**
 * ana verify pre-check - Mechanical verification checks before AnaVerify review
 *
 * Usage:
 *   ana verify pre-check <slug>
 *
 * Runs three independent checks:
 * 1. Skeleton assertion compliance - compare test_skeleton.ts to final test file
 * 2. File changes audit - compare spec YAML to git diff
 * 3. Commit analysis - count, size, format, co-author presence
 *
 * Exit codes:
 *   0 - Always (informational tool, never blocks)
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'yaml';

/**
 * Result from skeleton compliance check
 */
interface SkeletonCheckResult {
  error?: string;
  skeletonPath?: string;
  testFilePath?: string;
  totalAssertions: number;
  exactMatch: number;
  modified: Array<{ skeletonLine: number; skeletonText: string; testLine: number; testText: string }>;
  missing: Array<{ line: number; text: string }>;
  added: number;
}

/**
 * Result from file changes audit
 */
interface FileChangesResult {
  error?: string;
  expectedFiles: Array<{ path: string; action: string }>;
  actualFiles: string[];
  matches: Array<{ path: string; action: string; status: string }>;
  unexpected: Array<{ path: string; note: string }>;
  missing: Array<{ path: string; action: string }>;
}

/**
 * Result from commit analysis
 */
interface CommitCheckResult {
  error?: string;
  commitCount: number;
  commits: Array<{
    message: string;
    fileCount: number;
    lineCount: number;
    hasCoAuthor: boolean;
    warnings: string[];
  }>;
}

/**
 * Extract assertions from a file
 *
 * @param content - File content
 * @param isCommented - Whether to look for commented assertions (skeleton)
 * @returns Array of assertions with line numbers
 */
function extractAssertions(content: string, isCommented: boolean): Array<{ line: number; text: string; target: string }> {
  const lines = content.split('\n');
  const assertions: Array<{ line: number; text: string; target: string }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const expectPattern = isCommented ? /\/\/\s*expect\(/ : /^\s*expect\(/;

    if (expectPattern.test(line)) {
      // Extract the full assertion (handle both commented and uncommented)
      let assertionText = line.trim();
      if (isCommented) {
        // Remove ALL comment prefixes and leading slashes (may be nested: "//     // expect...")
        assertionText = assertionText.replace(/^(\/\/\s*)+/, '');
      }

      // Extract target (everything from expect( to the matcher)
      const targetMatch = assertionText.match(/expect\((.*?)\)\.(\w+)/);
      if (targetMatch) {
        const target = targetMatch[1];
        assertions.push({
          line: i + 1,
          text: assertionText.trim(),
          target: target.trim()
        });
      }
    }
  }

  return assertions;
}

/**
 * Find the appropriate spec file for the current phase
 *
 * @param planDir - Plan directory path
 * @param phase - Optional phase number for multi-phase plans
 * @returns Spec file path or null if not found
 */
function findSpecFile(planDir: string, phase?: number): string | null {
  if (phase) {
    // Explicit phase: read spec-N.md
    const phaseSpec = `spec-${phase}.md`;
    const phaseSpecPath = path.join(planDir, phaseSpec);
    if (fs.existsSync(phaseSpecPath)) {
      return phaseSpecPath;
    }
    return null; // Phase specified but file not found
  }

  // No phase: prefer spec.md, fall back to first spec-N.md
  const specPath = path.join(planDir, 'spec.md');
  if (fs.existsSync(specPath)) {
    return specPath;
  }

  const specFiles = fs.readdirSync(planDir)
    .filter(f => f.match(/^spec-\d+\.md$/))
    .sort(); // Alphabetical = numerical for spec-1, spec-2, etc.

  return specFiles.length > 0 ? path.join(planDir, specFiles[0]) : null;
}

/**
 * Check skeleton compliance
 *
 * @param planDir - Plan directory path
 * @param slug - Work item slug
 * @param phase - Optional phase number for multi-phase plans
 * @returns Check result
 */
function checkSkeletonCompliance(planDir: string, slug: string, phase?: number): SkeletonCheckResult {
  // Find skeleton file
  let skeletonFiles: string[];
  try {
    const entries = fs.readdirSync(planDir);
    skeletonFiles = entries.filter(f => f.startsWith('test_skeleton'));
  } catch {
    return { error: `No skeleton file found for '${slug}'. Skipping skeleton check.`, totalAssertions: 0, exactMatch: 0, modified: [], missing: [], added: 0 };
  }

  if (skeletonFiles.length === 0) {
    return { error: `No skeleton file found for '${slug}'. Skipping skeleton check.`, totalAssertions: 0, exactMatch: 0, modified: [], missing: [], added: 0 };
  }

  const skeletonPath = path.join(planDir, skeletonFiles[0]);
  const skeletonContent = fs.readFileSync(skeletonPath, 'utf-8');

  // Extract skeleton assertions (commented)
  const skeletonAssertions = extractAssertions(skeletonContent, true);

  if (skeletonAssertions.length === 0) {
    return {
      skeletonPath,
      totalAssertions: 0,
      exactMatch: 0,
      modified: [],
      missing: [],
      added: 0
    };
  }

  // Find test file - first try spec YAML, then fall back to slug-based guessing
  let testFilePath: string | undefined;
  let testContent: string | undefined;

  // Try to find test file from spec YAML
  const specPath = findSpecFile(planDir, phase);

  // Print note if multiple specs exist and no phase specified
  if (!phase && specPath) {
    const allSpecFiles = fs.readdirSync(planDir).filter(f => f.match(/^spec-\d+\.md$/));
    if (allSpecFiles.length > 1) {
      console.log(`Note: Multiple specs found. Reading ${path.basename(specPath)}. Use --phase N to specify.`);
    }
  }

  if (specPath) {
    const specContent = fs.readFileSync(specPath, 'utf-8');
    const yamlMatch = specContent.match(/<!--\s*MACHINE-READABLE\s*\n([\s\S]*?)-->/);

    if (yamlMatch) {
      try {
        const parsedYaml: { file_changes?: Array<{ path: string; action: string }> } = yaml.parse(yamlMatch[1]);
        const testFile = parsedYaml.file_changes?.find(f => f.path.match(/\.(test|spec)\./));
        if (testFile) {
          const testPath = path.join(process.cwd(), testFile.path);
          if (fs.existsSync(testPath)) {
            testFilePath = testPath;
            testContent = fs.readFileSync(testPath, 'utf-8');
          }
        }
      } catch {
        // YAML parse failed, fall through to slug-based guessing
      }
    }
  }

  // Fallback: try common locations based on slug
  if (!testFilePath) {
    const possibleTestPaths = [
      path.join(process.cwd(), 'packages/cli/tests/commands', `${slug}.test.ts`),
      path.join(process.cwd(), 'tests', `${slug}.test.ts`),
      path.join(process.cwd(), 'test', `${slug}.test.ts`)
    ];

    for (const testPath of possibleTestPaths) {
      if (fs.existsSync(testPath)) {
        testFilePath = testPath;
        testContent = fs.readFileSync(testPath, 'utf-8');
        break;
      }
    }
  }

  if (!testFilePath || !testContent) {
    return {
      error: 'Test file not found. Checked spec YAML and common locations.',
      skeletonPath,
      totalAssertions: skeletonAssertions.length,
      exactMatch: 0,
      modified: [],
      missing: skeletonAssertions.map(a => ({ line: a.line, text: a.text })),
      added: 0
    };
  }

  // Extract test assertions (uncommented)
  const testAssertions = extractAssertions(testContent, false);

  // Compare
  const exactMatch: typeof testAssertions = [];
  const modified: SkeletonCheckResult['modified'] = [];
  const missing: SkeletonCheckResult['missing'] = [];

  for (const skeletonAssertion of skeletonAssertions) {
    const matchingTest = testAssertions.find(t => t.target === skeletonAssertion.target);

    if (!matchingTest) {
      missing.push({ line: skeletonAssertion.line, text: skeletonAssertion.text });
    } else if (matchingTest.text === skeletonAssertion.text) {
      exactMatch.push(matchingTest);
    } else {
      modified.push({
        skeletonLine: skeletonAssertion.line,
        skeletonText: skeletonAssertion.text,
        testLine: matchingTest.line,
        testText: matchingTest.text
      });
    }
  }

  // Count added (test assertions not in skeleton)
  const skeletonTargets = new Set(skeletonAssertions.map(a => a.target));
  const addedCount = testAssertions.filter(t => !skeletonTargets.has(t.target)).length;

  return {
    skeletonPath,
    testFilePath,
    totalAssertions: skeletonAssertions.length,
    exactMatch: exactMatch.length,
    modified,
    missing,
    added: addedCount
  };
}

/**
 * Check file changes against spec
 *
 * @param planDir - Plan directory path
 * @param artifactBranch - Artifact branch name
 * @param phase - Optional phase number for multi-phase plans
 * @returns Check result
 */
function checkFileChanges(planDir: string, artifactBranch: string, phase?: number): FileChangesResult {
  // Find spec file
  const specPath = findSpecFile(planDir, phase);

  // Print note if multiple specs exist and no phase specified
  if (!phase && specPath) {
    const allSpecFiles = fs.readdirSync(planDir).filter(f => f.match(/^spec-\d+\.md$/));
    if (allSpecFiles.length > 1) {
      console.log(`Note: Multiple specs found. Reading ${path.basename(specPath)}. Use --phase N to specify.`);
    }
  }

  if (!specPath) {
    return {
      error: 'No spec file found. Skipping file audit.',
      expectedFiles: [],
      actualFiles: [],
      matches: [],
      unexpected: [],
      missing: []
    };
  }

  const specContent = fs.readFileSync(specPath, 'utf-8');

  // Extract YAML block
  const yamlMatch = specContent.match(/<!--\s*MACHINE-READABLE\s*\n([\s\S]*?)-->/);
  if (!yamlMatch) {
    return {
      error: 'No file_changes YAML block found in spec. Skipping file audit.',
      expectedFiles: [],
      actualFiles: [],
      matches: [],
      unexpected: [],
      missing: []
    };
  }

  // Parse YAML
  let parsedYaml: { file_changes?: Array<{ path: string; action: string }> };
  try {
    parsedYaml = yaml.parse(yamlMatch[1]);
  } catch {
    return {
      error: 'Failed to parse YAML block. Skipping file audit.',
      expectedFiles: [],
      actualFiles: [],
      matches: [],
      unexpected: [],
      missing: []
    };
  }

  const expectedFiles = parsedYaml.file_changes || [];

  // Get git diff
  let actualFiles: string[];
  try {
    const diffOutput = execSync(`git diff --name-only ${artifactBranch}..HEAD`, {
      encoding: 'utf-8',
      stdio: 'pipe'
    }).trim();
    actualFiles = diffOutput ? diffOutput.split('\n') : [];
  } catch {
    return {
      error: 'Failed to run git diff. Skipping file audit.',
      expectedFiles,
      actualFiles: [],
      matches: [],
      unexpected: [],
      missing: []
    };
  }

  // Compare
  const matches: FileChangesResult['matches'] = [];
  const missing: FileChangesResult['missing'] = [];
  const unexpected: FileChangesResult['unexpected'] = [];

  for (const expected of expectedFiles) {
    const inDiff = actualFiles.includes(expected.path);
    if (inDiff) {
      matches.push({ path: expected.path, action: expected.action, status: 'in git diff' });
    } else {
      missing.push({ path: expected.path, action: expected.action });
    }
  }

  const expectedPaths = new Set(expectedFiles.map(f => f.path));
  for (const actual of actualFiles) {
    if (!expectedPaths.has(actual)) {
      // Check if it's a pipeline artifact
      const isPipelineArtifact = actual.includes('.ana/plans/active/') &&
        (actual.includes('build_report') || actual.includes('verify_report') || actual.includes('plan.md'));

      if (isPipelineArtifact) {
        unexpected.push({ path: actual, note: 'pipeline artifact' });
      } else {
        unexpected.push({ path: actual, note: 'NOT in spec' });
      }
    }
  }

  return {
    expectedFiles,
    actualFiles,
    matches,
    unexpected,
    missing
  };
}

/**
 * Analyze commits
 *
 * @param artifactBranch - Artifact branch name
 * @param coAuthor - Expected co-author string
 * @returns Check result
 */
function checkCommits(artifactBranch: string, coAuthor: string): CommitCheckResult {
  // Get commit list
  let commitHashes: string[];
  try {
    const output = execSync(`git log --oneline ${artifactBranch}..HEAD`, {
      encoding: 'utf-8',
      stdio: 'pipe'
    }).trim();
    commitHashes = output ? output.split('\n').map(line => line.split(' ')[0]) : [];
  } catch {
    return {
      error: 'Failed to get commit log.',
      commitCount: 0,
      commits: []
    };
  }

  if (commitHashes.length === 0) {
    return {
      commitCount: 0,
      commits: []
    };
  }

  const commits: CommitCheckResult['commits'] = [];

  // Reverse to get chronological order (oldest first)
  for (const hash of commitHashes.reverse()) {
    // Get commit message (subject only)
    const message = execSync(`git log -1 --format=%s ${hash}`, {
      encoding: 'utf-8',
      stdio: 'pipe'
    }).trim();

    // Get file count
    const files = execSync(`git diff-tree --no-commit-id --name-only -r ${hash}`, {
      encoding: 'utf-8',
      stdio: 'pipe'
    }).trim().split('\n').filter(Boolean);
    const fileCount = files.length;

    // Get line count
    const statOutput = execSync(`git diff --stat ${hash}^..${hash}`, {
      encoding: 'utf-8',
      stdio: 'pipe'
    }).trim();
    const lineMatch = statOutput.match(/(\d+) insertion|(\d+) deletion/g);
    const lineCount = lineMatch ? lineMatch.reduce((sum, m) => {
      const num = parseInt(m.match(/\d+/)?.[0] || '0');
      return sum + num;
    }, 0) : 0;

    // Check co-author
    const body = execSync(`git log -1 --format=%b ${hash}`, {
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    const hasCoAuthor = body.includes(coAuthor);

    // Warnings
    const warnings: string[] = [];
    if (fileCount > 5) {
      warnings.push(`⚠ ${fileCount} files in single commit`);
    }
    if (lineCount > 500) {
      warnings.push(`⚠ ${lineCount} lines in single commit`);
    }

    commits.push({
      message,
      fileCount,
      lineCount,
      hasCoAuthor,
      warnings
    });
  }

  return {
    commitCount: commitHashes.length,
    commits
  };
}

/**
 * Print skeleton check results
 *
 * @param result - Skeleton check result
 */
function printSkeletonResults(result: SkeletonCheckResult): void {
  console.log(chalk.bold('\n=== SKELETON COMPLIANCE ==='));

  if (result.error) {
    console.log(`  ${result.error}`);
    return;
  }

  console.log(`  Skeleton: ${result.skeletonPath}`);
  if (result.testFilePath) {
    console.log(`  Test file: ${result.testFilePath}`);
  }
  console.log();
  console.log(`  ${result.totalAssertions} assertions in skeleton`);
  console.log(`  ${result.exactMatch} exact match`);

  if (result.modified.length > 0) {
    console.log(`  ${result.modified.length} modified:`);
    for (const mod of result.modified) {
      console.log(`    Skeleton L${mod.skeletonLine}: ${mod.skeletonText}`);
      console.log(`    Test L${mod.testLine}:         ${mod.testText}`);
      console.log('    ---');
    }
  } else {
    console.log(`  ${result.modified.length} modified`);
  }

  if (result.missing.length > 0) {
    console.log(`  ${result.missing.length} missing from test file:`);
    for (const miss of result.missing) {
      console.log(`    Skeleton L${miss.line}: ${miss.text}`);
    }
  } else {
    console.log(`  ${result.missing.length} missing from test file`);
  }

  console.log(`  ${result.added} added by builder (not in skeleton)`);
}

/**
 * Print file changes results
 *
 * @param result - File changes result
 */
function printFileChangesResults(result: FileChangesResult): void {
  console.log(chalk.bold('\n=== FILE CHANGES ==='));

  if (result.error) {
    console.log(`  ${result.error}`);
    return;
  }

  const createCount = result.expectedFiles.filter(f => f.action === 'create').length;
  const modifyCount = result.expectedFiles.filter(f => f.action === 'modify').length;
  console.log(`  Spec expects: ${result.expectedFiles.length} files (${createCount} create, ${modifyCount} modify)`);
  console.log(`  Git shows: ${result.actualFiles.length} files changed`);
  console.log();

  for (const match of result.matches) {
    console.log(`  ✓ ${match.path} — spec: ${match.action}, git: ${match.status}`);
  }

  for (const unexp of result.unexpected) {
    console.log(`  ⚠ ${unexp.path} — ${unexp.note}`);
  }

  for (const miss of result.missing) {
    console.log(`  ✗ ${miss.path} — in spec (${miss.action}) but NOT in git diff`);
  }
}

/**
 * Print commit analysis results
 *
 * @param result - Commit check result
 */
function printCommitResults(result: CommitCheckResult): void {
  console.log(chalk.bold('\n=== COMMITS ==='));

  if (result.error) {
    console.log(`  ${result.error}`);
    return;
  }

  const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', {
    encoding: 'utf-8',
    stdio: 'pipe'
  }).trim();

  console.log(`  ${result.commitCount} commits on ${currentBranch}`);
  console.log();

  result.commits.forEach((commit, idx) => {
    console.log(`  Commit ${idx + 1}: ${commit.message}`);
    console.log(`    ${commit.fileCount} files, ${commit.lineCount} lines`);
    console.log(`    Co-author: ${commit.hasCoAuthor ? '✓' : '✗'}`);

    if (commit.warnings.length > 0) {
      commit.warnings.forEach(w => console.log(`    ${w}`));
    }

    if (idx < result.commits.length - 1) {
      console.log();
    }
  });
}

/**
 * Run pre-check for a work item
 *
 * @param slug - Work item slug
 * @param phase - Optional phase number for multi-phase plans
 */
export function runPreCheck(slug: string, phase?: number): void {
  // Read .meta.json
  const metaPath = path.join(process.cwd(), '.ana', '.meta.json');
  if (!fs.existsSync(metaPath)) {
    console.error(chalk.red('Error: No .ana/.meta.json found. Run `ana init` first.'));
    process.exit(1);
  }

  let meta: { artifactBranch?: string; coAuthor?: string };
  try {
    meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
  } catch {
    console.error(chalk.red('Error: Failed to read .meta.json'));
    process.exit(1);
  }

  const artifactBranch = meta.artifactBranch || 'main';
  const coAuthor = meta.coAuthor || 'Ana <build@anatomia.dev>';

  // Verify plan directory exists
  const planDir = path.join(process.cwd(), '.ana/plans/active', slug);
  if (!fs.existsSync(planDir)) {
    console.error(chalk.red(`Error: No active work found for '${slug}'.`));
    console.error(chalk.gray('Run `ana work status` to see active work items.'));
    process.exit(1);
  }

  // Run checks
  const skeletonResult = checkSkeletonCompliance(planDir, slug, phase);
  const fileChangesResult = checkFileChanges(planDir, artifactBranch, phase);
  const commitResult = checkCommits(artifactBranch, coAuthor);

  // Print results
  printSkeletonResults(skeletonResult);
  printFileChangesResults(fileChangesResult);
  printCommitResults(commitResult);

  console.log(); // Final newline
  process.exit(0);
}

/**
 * Register verify pre-check command
 *
 * @param program - Commander program instance
 */
export function registerVerifyPreCheckCommand(program: Command): void {
  const verifyCommand = new Command('verify')
    .description('Verification tools');

  verifyCommand
    .command('pre-check')
    .description('Run mechanical verification checks (skeleton, files, commits)')
    .argument('<slug>', 'Work item slug (e.g., add-status-command)')
    .option('--phase <number>', 'Phase number for multi-phase plans (reads spec-N.md)')
    .action((slug: string, options: { phase?: string }) => {
      const phase = options.phase ? parseInt(options.phase, 10) : undefined;
      runPreCheck(slug, phase);
    });

  program.addCommand(verifyCommand);
}
