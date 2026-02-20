/**
 * ana init - Initialize .ana/ context in current directory
 *
 * Creates:
 *   .ana/
 *   ├── node.json          # Node identity (project metadata)
 *   ├── context/
 *   │   └── main.md        # Placeholder context file
 *   └── modes/
 *       └── code.md        # Placeholder mode file
 *
 * @example
 *   $ ana init
 *   ? What is your project name? my-project
 *   ? What type of project is this? node
 *   ? Use default configuration? Yes
 *   ✓ Created .ana/ directory
 *   ✓ Created .ana/node.json
 *   ✓ Created .ana/context/main.md
 *   ✓ Created .ana/modes/code.md
 *   Success! .ana/ context initialized.
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import * as path from 'node:path';
import { fileWriter } from '../utils/file-writer.js';
import { renderTemplate } from '../utils/template-loader.js';

// Project types supported
const PROJECT_TYPES = ['python', 'node', 'go', 'rust', 'mixed'] as const;
type ProjectType = typeof PROJECT_TYPES[number];

// Prompt answers interface
interface InitAnswers {
  projectName: string;
  nodeId: string;
  projectType: ProjectType;
  federation: boolean;
  useDefaults: boolean;
}

// Create the init command
export const initCommand = new Command('init')
  .description('Initialize .ana/ context in current directory')
  .option('-f, --force', 'Overwrite existing .ana/ directory')
  .option('-y, --yes', 'Skip prompts, use defaults')
  .action(async (options: { force?: boolean; yes?: boolean }) => {
    const cwd = process.cwd();
    const anaPath = path.join(cwd, '.ana');

    console.log(chalk.blue('\n📁 Anatomia Init\n'));

    // Check if .ana/ already exists
    if (await fileWriter.exists(anaPath)) {
      if (!options.force) {
        const { overwrite } = await inquirer.prompt<{ overwrite: boolean }>([
          {
            type: 'confirm',
            name: 'overwrite',
            message: chalk.yellow('.ana/ directory already exists. Overwrite?'),
            default: false,
          },
        ]);

        if (!overwrite) {
          console.log(chalk.gray('Aborted. Use --force to overwrite.'));
          process.exit(0);
        }
      }

      // Remove existing .ana/ directory
      const removeSpinner = ora('Removing existing .ana/...').start();
      await fileWriter.removeDir(anaPath);
      removeSpinner.succeed('Removed existing .ana/');
    }

    // Get project configuration
    let answers: InitAnswers;

    if (options.yes) {
      // Use defaults
      answers = {
        projectName: path.basename(cwd),
        nodeId: 'main',
        projectType: 'node',
        federation: false,
        useDefaults: true,
      };
      console.log(chalk.gray(`Using defaults: ${answers.projectName} (${answers.projectType}, standalone)`));
    } else {
      // Interactive prompts
      answers = await inquirer.prompt<InitAnswers>([
        {
          type: 'input',
          name: 'projectName',
          message: 'What is your project name?',
          default: path.basename(cwd),
          validate: (input: string) => {
            if (!input.trim()) {
              return 'Project name cannot be empty';
            }
            return true;
          },
        },
        {
          type: 'input',
          name: 'nodeId',
          message: 'Node ID (for federation, or "main" for standalone):',
          default: 'main',
          validate: (input: string) => {
            // Alphanumeric + hyphens only
            if (!/^[a-z0-9-]+$/.test(input)) {
              return 'Node ID must be alphanumeric + hyphens (e.g., main, api-service, frontend-1)';
            }
            return true;
          },
        },
        {
          type: 'list',
          name: 'projectType',
          message: 'What type of project is this?',
          choices: PROJECT_TYPES,
          default: 'node',
        },
        {
          type: 'confirm',
          name: 'federation',
          message: 'Enable federation (multi-service context)?',
          default: false,
        },
        {
          type: 'confirm',
          name: 'useDefaults',
          message: 'Use default configuration?',
          default: true,
        },
      ]);
    }

    // Create .ana/ structure
    const spinner = ora('Creating .ana/ structure...').start();

    try {
      // Create directories
      await fileWriter.createDir(path.join(anaPath, 'context'));
      await fileWriter.createDir(path.join(anaPath, 'modes'));

      // Prepare template data
      const templateData = {
        projectName: answers.projectName,
        nodeId: answers.nodeId,
        timestamp: new Date().toISOString(),
        federation: answers.federation,
      };

      // Render and write ENTRY.md
      const entryContent = renderTemplate('ENTRY.md.hbs', templateData);
      await fileWriter.writeFile(path.join(anaPath, 'ENTRY.md'), entryContent);
      spinner.text = 'Created .ana/ENTRY.md';

      // Render and write node.json
      const nodeJsonContent = renderTemplate('node.json.hbs', templateData);
      await fileWriter.writeFile(path.join(anaPath, 'node.json'), nodeJsonContent);
      spinner.text = 'Created .ana/node.json';

      // Create context/main.md (still placeholder for now - CP2 will improve)
      const mainContext = `# Project Context

## Overview
<!-- TODO: Add 2-3 sentence project description -->
<!-- Example: "FastAPI backend for multi-tenant SaaS product with user authentication, billing, and analytics" -->

## Architecture
<!-- TODO: Describe high-level architecture -->
<!-- Example: "Layered architecture: API layer (FastAPI) → Service layer (business logic) → Data layer (SQLAlchemy ORM → PostgreSQL)" -->

## Tech Stack
- **Language:** ${answers.projectType}
- **Framework:** <!-- TODO: Add framework (e.g., FastAPI, Next.js, Express) -->
- **Database:** <!-- TODO: Add database if any (e.g., PostgreSQL, MongoDB, None) -->

## Key Concepts
<!-- TODO: Define domain-specific terms -->
<!-- Example: "Multi-tenant: Each customer has isolated data. Tenant ID passed in JWT token." -->

---
*Fill this file with your project details. Better context = better AI assistance.*
`;
      await fileWriter.writeFile(path.join(anaPath, 'context', 'main.md'), mainContext);
      spinner.text = 'Created .ana/context/main.md';

      // Create modes/code.md (still placeholder - CP2 will create all 5 modes properly)
      const codeMode = `# Code Mode

## Purpose
Day-to-day feature implementation, refactoring, code modifications.

## What This Mode Produces
- Working code following project patterns and conventions
- Focused implementations (features, bug fixes, refactors)
- Tests for new code

## What This Mode Delegates
- Architecture changes → Switch to architect mode
- Complex debugging → Switch to debug mode
- Documentation → Switch to docs mode

## Hard Constraints
- Do not make architectural changes without discussion
- Do not modify files outside current scope
- Do not add new frameworks without proposal

---
*This is a placeholder mode file. Full modes created in STEP_0.2 CP2.*
`;
      await fileWriter.writeFile(path.join(anaPath, 'modes', 'code.md'), codeMode);
      spinner.text = 'Created .ana/modes/code.md';

      spinner.succeed('Created .ana/ structure');

      // Success message
      console.log('');
      console.log(chalk.green('✓ Success!') + ' .ana/ context initialized.');
      console.log('');
      console.log(chalk.gray('Created files:'));
      console.log(chalk.gray('  📄 .ana/ENTRY.md        - Orientation contract'));
      console.log(chalk.gray('  📄 .ana/node.json       - Project identity'));
      console.log(chalk.gray('  📄 .ana/context/main.md - Project overview (fill manually)'));
      console.log(chalk.gray('  📄 .ana/modes/code.md   - Code mode (more modes in CP2)'));
      console.log('');
      console.log(chalk.gray('Next steps:'));
      console.log(chalk.gray('  1. Edit .ana/context/main.md with your project details'));
      console.log(chalk.gray('  2. Reference .ana/ENTRY.md in your AI chat'));
      console.log(chalk.gray('  3. Use `ana mode <name>` to load mode-specific context'));
      console.log('');
    } catch (error) {
      spinner.fail('Failed to create .ana/ structure');
      if (error instanceof Error) {
        console.error(chalk.red(`Error: ${error.message}`));
      }
      process.exit(1);
    }
  });
