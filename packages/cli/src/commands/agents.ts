/**
 * ana agents - List deployed agents
 *
 * Usage:
 *   ana agents
 *
 * Exit codes:
 *   0 - Success
 *   1 - Error (agents directory not found)
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Agent information parsed from frontmatter
 */
interface AgentInfo {
  name: string;
  model: string;
  description: string;
}

/**
 * Parse YAML frontmatter from agent file
 *
 * @param content - File content
 * @returns Parsed agent info or null if invalid
 */
function parseFrontmatter(content: string): AgentInfo | null {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) {
    return null;
  }

  const frontmatter = match[1];
  if (!frontmatter) return null;
  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
  const modelMatch = frontmatter.match(/^model:\s*(.+)$/m);
  const descMatch = frontmatter.match(/^description:\s*["']?(.+?)["']?$/m);

  if (!nameMatch?.[1] || !modelMatch?.[1] || !descMatch?.[1]) {
    return null;
  }

  return {
    name: nameMatch[1].trim(),
    model: modelMatch[1].trim(),
    description: descMatch[1].trim().replace(/^["']|["']$/g, '').slice(0, 60)
  };
}

/**
 * List all deployed agents
 */
export function listAgents(): void {
  const agentsDir = path.join(process.cwd(), '.claude/agents');

  // Check if directory exists
  if (!fs.existsSync(agentsDir)) {
    console.error(chalk.red('No agents directory found.'));
    console.error(chalk.dim('Run `ana init` first.'));
    process.exit(1);
  }

  // Read all .md files
  const files = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'));

  if (files.length === 0) {
    console.log(chalk.bold('Agents:'));
    console.log(chalk.dim('  (none)'));
    return;
  }

  // Parse agent info
  const agents: AgentInfo[] = [];
  for (const file of files) {
    const filePath = path.join(agentsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const info = parseFrontmatter(content);
    if (info) {
      agents.push(info);
    }
  }

  // Sort alphabetically by name
  agents.sort((a, b) => a.name.localeCompare(b.name));

  // Print table
  console.log(chalk.bold('Agents:'));
  const maxNameLen = Math.max(...agents.map(a => a.name.length), 10);
  const maxModelLen = Math.max(...agents.map(a => a.model.length), 5);

  for (const agent of agents) {
    const namePadded = agent.name.padEnd(maxNameLen);
    const modelPadded = agent.model.padEnd(maxModelLen);
    console.log(`  ${chalk.cyan(namePadded)}  ${chalk.gray(modelPadded)}  ${agent.description}`);
  }
}

/**
 * Register agents command with the CLI
 *
 * @param program - Commander program instance
 */
export function registerAgentsCommand(program: Command): void {
  program
    .command('agents')
    .description('List deployed agents')
    .action(() => {
      listAgents();
    });
}
