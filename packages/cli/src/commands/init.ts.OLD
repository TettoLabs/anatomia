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
import { fileURLToPath } from 'node:url';
import { fileWriter } from '../utils/file-writer.js';
import { renderTemplate } from '../utils/template-loader.js';

// Get __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Project types supported
const PROJECT_TYPES = ['python', 'node', 'go', 'rust', 'mixed'] as const;
type ProjectType = typeof PROJECT_TYPES[number];

// Prompt answers interface
interface InitAnswers {
  projectName: string;
  nodeId: string;
  projectType: ProjectType;
  framework?: string | null;
  language?: string;
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
        framework: null,
        language: 'typescript', // Default for node projects
        federation: false,
        useDefaults: true,
      };
      console.log(chalk.gray(`Using defaults: ${answers.projectName} (${answers.projectType}, ${answers.language}, standalone)`));
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
          type: 'list',
          name: 'framework',
          message: 'Framework (optional):',
          choices: [
            { name: 'FastAPI (Python)', value: 'fastapi' },
            { name: 'Django (Python)', value: 'django' },
            { name: 'Next.js (Node)', value: 'nextjs' },
            { name: 'Express (Node)', value: 'express' },
            { name: 'Standard Library (Go)', value: 'stdlib' },
            { name: 'Skip (generic templates)', value: null },
          ],
          default: null,
        },
        {
          type: 'list',
          name: 'language',
          message: 'Primary language:',
          choices: ['python', 'typescript', 'javascript', 'go', 'rust', 'other'],
          default: (answers: Partial<InitAnswers>) => {
            // Infer from project type
            if (answers.projectType === 'python') return 'python';
            if (answers.projectType === 'node') return 'typescript';
            if (answers.projectType === 'go') return 'go';
            if (answers.projectType === 'rust') return 'rust';
            return 'other';
          },
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
        framework: answers.framework,
        language: answers.language,
      };

      // Render and write ENTRY.md
      const entryContent = renderTemplate('ENTRY.md.hbs', templateData);
      await fileWriter.writeFile(path.join(anaPath, 'ENTRY.md'), entryContent);
      spinner.text = 'Created .ana/ENTRY.md';

      // Render and write node.json
      const nodeJsonContent = renderTemplate('node.json.hbs', templateData);
      await fileWriter.writeFile(path.join(anaPath, 'node.json'), nodeJsonContent);
      spinner.text = 'Created .ana/node.json';

      // Render 5 mode templates
      const modes = ['architect', 'code', 'debug', 'docs', 'test'];
      for (const mode of modes) {
        const modeContent = renderTemplate(`${mode}.md.hbs`, templateData);
        await fileWriter.writeFile(path.join(anaPath, 'modes', `${mode}.md`), modeContent);
        spinner.text = `Created .ana/modes/${mode}.md`;
      }

      // Copy 3 context templates (static files with simple {{projectName}} replacement)
      const contextTemplates = ['main.md', 'patterns.md', 'conventions.md'];
      for (const ctx of contextTemplates) {
        // Determine template path (src/ vs dist/)
        const isCompiled = __dirname.includes('dist');
        const templatePath = isCompiled
          ? path.join(__dirname, '..', 'templates', ctx)
          : path.join(__dirname, '..', '..', 'templates', ctx);

        // Read static template
        const content = await fileWriter.readFile(templatePath);

        // Replace {{projectName}} (simple string replacement, no Handlebars needed)
        const renderedContent = content.replace(/\{\{projectName\}\}/g, answers.projectName);

        await fileWriter.writeFile(path.join(anaPath, 'context', ctx), renderedContent);
        spinner.text = `Created .ana/context/${ctx}`;
      }

      spinner.succeed('Created .ana/ structure');

      // Enhanced success message
      console.log('');
      console.log(chalk.green('✓ Success!') + ' .ana/ context initialized.');
      console.log('');
      console.log(chalk.gray('Created files:'));
      console.log(chalk.gray('  📄 .ana/ENTRY.md           - Orientation contract'));
      console.log(chalk.gray('  📄 .ana/node.json          - Project identity'));
      console.log(chalk.gray('  📂 .ana/modes/             - 5 mode files:'));
      console.log(chalk.gray('     • architect.md          - System design'));
      console.log(chalk.gray('     • code.md               - Implementation'));
      console.log(chalk.gray('     • debug.md              - Debugging'));
      console.log(chalk.gray('     • docs.md               - Documentation'));
      console.log(chalk.gray('     • test.md               - Testing'));
      console.log(chalk.gray('  📂 .ana/context/           - 3 context files:'));
      console.log(chalk.gray('     • main.md               - Project overview (fill manually)'));
      console.log(chalk.gray('     • patterns.md           - Code patterns (fill manually)'));
      console.log(chalk.gray('     • conventions.md        - Coding standards (fill manually)'));
      console.log('');
      console.log(chalk.gray('Next steps:'));
      console.log(chalk.gray('  1. Fill .ana/context/*.md files with your project details'));
      console.log(chalk.gray('  2. Reference .ana/ENTRY.md in your AI chat'));
      console.log(chalk.gray('  3. Use `ana mode <name>` to load specific mode context'));
      console.log('');
    } catch (error) {
      spinner.fail('Failed to create .ana/ structure');
      if (error instanceof Error) {
        console.error(chalk.red(`Error: ${error.message}`));
      }
      process.exit(1);
    }
  });
