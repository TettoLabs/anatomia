/**
 * Scaffold generators for context files (S15 consolidation: 7→2)
 *
 * Two generators:
 * - generateProjectContextScaffold: scan-seeded D6.6 format with 6 sections
 * - generateDesignPrinciplesTemplate: static human-content template
 *
 * Old generators (patterns, conventions, workflow, testing, debugging)
 * were migrated to skill templates in S13.
 *
 * @module scaffold-generators
 */

import type { EngineResult } from '../engine/types/engineResult.js';
import { SCAFFOLD_MARKER, getStackSummary } from '../constants.js';

/**
 * Placeholder line for sections the scan couldn't seed.
 * S19/CLI-010: extracted from 6 identical inline copies.
 */
const NOT_YET_CAPTURED = '*Not yet captured. Run `claude --agent ana-setup` to fill this.*';

/**
 * Generate project-context.md scaffold (D6.6 format)
 *
 * Produces 6 sections with scan-seeded **Detected:** lines.
 * Machine sections show detected data; human sections show HTML comment placeholders.
 *
 * @param result - Engine result
 * @returns Markdown scaffold string
 */
export function generateProjectContextScaffold(result: EngineResult): string {
  let s = `${SCAFFOLD_MARKER}\n\n`;
  s += `# Project Context\n\n`;

  // Section 1: What This Project Does
  s += `## What This Project Does\n`;
  const stackParts = getStackSummary(result);
  if (stackParts.length > 0) {
    s += `**Detected:** ${stackParts.join(' · ')}\n`;
  }
  if (result.externalServices.length > 0) {
    const names = result.externalServices.map(svc => svc.name).join(', ');
    s += `**Detected services:** ${names}\n`;
  }
  const cmdParts: string[] = [];
  if (result.commands.build) cmdParts.push(`build: \`${result.commands.build}\``);
  if (result.commands.test) cmdParts.push(`test: \`${result.commands.test}\``);
  if (result.commands.lint) cmdParts.push(`lint: \`${result.commands.lint}\``);
  if (result.commands.dev) cmdParts.push(`dev: \`${result.commands.dev}\``);
  if (cmdParts.length > 0) {
    s += `**Detected commands:** ${cmdParts.join(' · ')}\n`;
  }
  const infoParts: string[] = [];
  if (result.commands.packageManager &&
      !(result.monorepo.isMonorepo && result.monorepo.tool === result.commands.packageManager)) {
    infoParts.push(`${result.commands.packageManager}`);
  }
  // aiSdk removed — already shown in Stack Detected line (Item 6)
  if (result.monorepo.isMonorepo) {
    const tool = result.monorepo.tool || 'monorepo';
    infoParts.push(`${tool} (${result.monorepo.packages.length} packages)`);
  }
  if (infoParts.length > 0) {
    s += `**Detected infrastructure:** ${infoParts.join(' · ')}\n`;
  }
  s += `${NOT_YET_CAPTURED}\n\n`;

  // Section 2: Architecture
  s += `## Architecture\n`;
  if (result.monorepo.isMonorepo) {
    const tool = result.monorepo.tool || 'monorepo';
    s += `**Detected:** ${tool} · ${result.monorepo.packages.length} packages`;
    if (result.monorepo.packages.length > 0) {
      const pkgNames = result.monorepo.packages.slice(0, 5).map(p => p.name).join(', ');
      s += ` (${pkgNames})`;
    }
    s += '\n';
  }
  if (result.structure.length > 0) {
    const dirCount = result.structure.length;
    const topDirs = result.structure.slice(0, 8).map(e => e.path).join(', ');
    s += `**Detected:** ${dirCount} directories mapped: ${topDirs}\n`;
  }
  s += `${NOT_YET_CAPTURED}\n\n`;

  // Section 3: Key Decisions
  s += `## Key Decisions\n`;
  s += `${NOT_YET_CAPTURED}\n\n`;

  // Section 4: Key Files (partially seeded from scan)
  s += `## Key Files\n`;
  const keyFiles: string[] = [];
  for (const [, schema] of Object.entries(result.schemas)) {
    if (schema.found && schema.path) keyFiles.push(`- Database schema: \`${schema.path}\``);
  }
  if (result.deployment.configFile) keyFiles.push(`- Deployment config: \`${result.deployment.configFile}\``);
  if (result.deployment.ciConfigFile) keyFiles.push(`- CI pipeline: \`${result.deployment.ciConfigFile}\``);
  if (keyFiles.length > 0) {
    s += keyFiles.join('\n') + '\n';
    s += `*Scan detected the items above. Run \`claude --agent ana-setup\` to add: database client, auth config, AI client locations, test helpers.*\n\n`;
  } else {
    s += `${NOT_YET_CAPTURED}\n\n`;
  }

  // Section 5: Active Constraints
  s += `## Active Constraints\n`;
  s += `${NOT_YET_CAPTURED}\n\n`;

  // Section 6: Domain Vocabulary
  s += `## Domain Vocabulary\n`;
  s += `${NOT_YET_CAPTURED}\n`;

  return s;
}

/**
 * Generate design-principles.md template (static, no scan data)
 *
 * Returns the S13 template — 100% human content placeholder.
 * No EngineResult data injected.
 *
 * @returns Markdown template string
 */
export function generateDesignPrinciplesTemplate(): string {
  return `# Design Principles

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
`;
}
