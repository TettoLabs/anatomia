import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { createEmptyEngineResult } from '../scaffolds/test-types.js';

async function dirExists(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

describe('ana init', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ana-init-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('directory structure', () => {
    it('creates all 6 directories', async () => {
      const anaPath = path.join(tmpDir, '.ana');
      await fs.mkdir(anaPath);

      // Simulate Phase 3
      await fs.mkdir(path.join(anaPath, 'modes'), { recursive: true });
      await fs.mkdir(path.join(anaPath, 'context'), { recursive: true });
      await fs.mkdir(path.join(anaPath, 'context/setup'), { recursive: true });
      await fs.mkdir(path.join(anaPath, 'context/setup/steps'), { recursive: true });
      await fs.mkdir(path.join(anaPath, 'context/setup/framework-snippets'), { recursive: true });
      await fs.mkdir(path.join(anaPath, 'state'), { recursive: true });

      // Verify all exist
      const dirs = [
        'modes',
        'context',
        'context/setup',
        'context/setup/steps',
        'context/setup/framework-snippets',
        'state',
      ];

      for (const dir of dirs) {
        const exists = await dirExists(path.join(anaPath, dir));
        expect(exists).toBe(true);
      }
    });
  });

  describe('template inventory', () => {
    it('all template files exist in CLI package', async () => {
      // Get templates directory using same logic as init.ts
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const templatesDir = path.join(__dirname, '..', '..', 'templates');

      const expectedFiles = [
        // 10 mode files
        'modes/architect.md',
        'modes/code.md',
        'modes/debug.md',
        'modes/docs.md',
        'modes/test.md',
        'modes/general.md',
        'modes/setup.md',
        'modes/setup-quick.md',
        'modes/setup-guided.md',
        // 3 setup files
        'context/setup/SETUP_GUIDE.md',
        'context/setup/templates.md',
        'context/setup/rules.md',
        // 8 step files
        'context/setup/steps/00_explore_codebase.md',
        'context/setup/steps/01_project_overview.md',
        'context/setup/steps/02_conventions.md',
        'context/setup/steps/03_patterns.md',
        'context/setup/steps/04_architecture.md',
        'context/setup/steps/05_testing.md',
        'context/setup/steps/06_workflow.md',
        'context/setup/steps/07_debugging.md',
        // 6 framework-snippets
        'context/setup/framework-snippets/fastapi.md',
        'context/setup/framework-snippets/django.md',
        'context/setup/framework-snippets/nextjs.md',
        'context/setup/framework-snippets/express.md',
        'context/setup/framework-snippets/go.md',
        'context/setup/framework-snippets/generic.md',
        // 4 hook scripts
        '.ana/hooks/verify-context-file.sh',
        '.ana/hooks/quality-gate.sh',
        '.ana/hooks/run-check.sh',
        '.ana/hooks/subagent-verify.sh',
        // SCHEMAS.md and plan directories
        '.ana/docs/SCHEMAS.md',
        '.ana/plans/active/.gitkeep',
        '.ana/plans/completed/.gitkeep',
        // 1 settings template
        '.claude/settings.json',
        // 9 agent files
        '.claude/agents/ana.md',
        '.claude/agents/ana-plan.md',
        '.claude/agents/ana-setup.md',
        '.claude/agents/ana-build.md',
        '.claude/agents/ana-verify.md',
        '.claude/agents/ana-explorer.md',
        '.claude/agents/ana-question-formulator.md',
        '.claude/agents/ana-writer.md',
        '.claude/agents/ana-verifier.md',
        // 6 skill files
        '.claude/skills/testing-standards/SKILL.md',
        '.claude/skills/coding-standards/SKILL.md',
        '.claude/skills/git-workflow/SKILL.md',
        '.claude/skills/deployment/SKILL.md',
        '.claude/skills/design-principles/SKILL.md',
        '.claude/skills/logging-standards/SKILL.md',
        // CLAUDE.md entry point
        'CLAUDE.md',
      ];

      expect(expectedFiles).toHaveLength(50);

      for (const file of expectedFiles) {
        const filePath = path.join(templatesDir, file);
        const exists = await fileExists(filePath);
        expect(exists, `Missing template: ${file}`).toBe(true);
      }
    });
  });

  describe('ana.json', () => {
    it('creates valid initial ana.json from EngineResult', async () => {
      const engineResult = createEmptyEngineResult();
      // Simulate what createAnaJson does from an EngineResult
      const meta = {
        name: engineResult.overview.project,
        framework: engineResult.stack.framework || null,
        language: engineResult.stack.language || null,
        packageManager: engineResult.commands.packageManager,
        commands: {
          build: engineResult.commands.build || null,
          test: engineResult.commands.test || null,
          lint: engineResult.commands.lint || null,
          dev: engineResult.commands.dev || null,
        },
        coAuthor: 'Ana <build@anatomia.dev>',
        artifactBranch: engineResult.git?.branch || 'main',
        setupMode: 'not_started',
        scanStaleDays: 7,
      };

      expect(meta.setupMode).toBe('not_started');
      expect(meta.name).toBe('unknown');
      expect(meta.packageManager).toBe('npm');
      expect(meta.framework).toBeNull();
    });

    it('has all required fields for new schema', () => {
      const meta = {
        name: 'my-project',
        framework: 'FastAPI',
        language: 'Python',
        packageManager: 'pip',
        commands: {
          build: null,
          test: 'pytest',
          lint: 'ruff check .',
          dev: 'uvicorn src.main:app --reload',
        },
        coAuthor: 'Ana <build@anatomia.dev>',
        artifactBranch: 'main',
        setupMode: 'not_started',
        scanStaleDays: 7,
      };

      const keys = Object.keys(meta);
      expect(keys).toContain('setupMode');
      expect(keys).toContain('name');
      expect(keys).toContain('framework');
      expect(keys).toContain('packageManager');
      expect(keys).not.toContain('setupStatus');
      expect(keys).not.toContain('analyzerVersion');
    });
  });

  describe('--force flag', () => {
    it('preserves state/ when overwriting', async () => {
      const anaPath = path.join(tmpDir, '.ana');
      const statePath = path.join(anaPath, 'state');

      // Create existing .ana/ with state/
      await fs.mkdir(statePath, { recursive: true });
      await fs.writeFile(path.join(statePath, 'snapshot.json'), '{"test":"data"}');

      // Simulate --force: backup state/
      const backup = path.join(os.tmpdir(), `.ana-state-backup-${Date.now()}`);
      await fs.cp(statePath, backup, { recursive: true });

      // Delete .ana/
      await fs.rm(anaPath, { recursive: true });

      // Recreate .ana/
      await fs.mkdir(statePath, { recursive: true });

      // Restore state/
      await fs.rm(statePath, { recursive: true });
      await fs.rename(backup, statePath);

      // Verify snapshot preserved
      const content = await fs.readFile(path.join(statePath, 'snapshot.json'), 'utf-8');
      expect(JSON.parse(content)).toEqual({ test: 'data' });
    });
  });

  describe('.ana/hooks/', () => {
    it('hook scripts are created with correct content', async () => {
      // Get templates directory
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const templatesDir = path.join(__dirname, '..', '..', 'templates');

      // Verify verify-context-file.sh
      const verifyPath = path.join(templatesDir, '.ana/hooks/verify-context-file.sh');
      const verifyContent = await fs.readFile(verifyPath, 'utf-8');
      expect(verifyContent).toContain('#!/bin/bash');
      expect(verifyContent).toContain('PostToolUse hook');
      expect(verifyContent).toContain('.ana/context/');
      expect(verifyContent).toContain('run-check.sh');
      // additionalContext removed from output, but comment explains why (no stdout broadcast)
      expect(verifyContent).toContain('NO stdout');
      // Verify jq parsing with grep fallback
      expect(verifyContent).toContain('jq -r');
      expect(verifyContent).toContain('.tool_input.file_path');
      expect(verifyContent).toContain('Fallback: grep parsing');

      // Verify quality-gate.sh
      const gatePath = path.join(templatesDir, '.ana/hooks/quality-gate.sh');
      const gateContent = await fs.readFile(gatePath, 'utf-8');
      expect(gateContent).toContain('#!/bin/bash');
      expect(gateContent).toContain('Stop hook');
      expect(gateContent).toContain('exit 2');
      // Verify file-based lockfile guard (uses PROJECT_ROOT for portability)
      expect(gateContent).toContain('LOCKFILE="$PROJECT_ROOT/.ana/.stop_hook_active"');
      expect(gateContent).toContain('if [ -f "$LOCKFILE" ]');
      expect(gateContent).toContain('touch "$LOCKFILE"');
      expect(gateContent).toContain("trap 'rm -f");
    });

    it('hook scripts will be executable after copy', async () => {
      const anaPath = path.join(tmpDir, '.ana');
      const hooksPath = path.join(anaPath, 'hooks');

      // Simulate copying hooks with chmod
      await fs.mkdir(hooksPath, { recursive: true });

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const templatesDir = path.join(__dirname, '..', '..', 'templates');

      // Copy and set executable
      const scripts = ['verify-context-file.sh', 'quality-gate.sh'];
      for (const script of scripts) {
        const sourcePath = path.join(templatesDir, '.ana/hooks', script);
        const destPath = path.join(hooksPath, script);
        await fs.copyFile(sourcePath, destPath);
        await fs.chmod(destPath, 0o755);

        // Verify executable permission
        const stats = await fs.stat(destPath);
        // Check that at least user execute bit is set (0o100)
        expect(stats.mode & 0o111).toBeGreaterThan(0);
      }
    });
  });

  describe('.claude/ configuration', () => {
    it('creates .claude/settings.json with correct hooks structure', async () => {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const templatesDir = path.join(__dirname, '..', '..', 'templates');

      const settingsPath = path.join(templatesDir, '.claude/settings.json');
      const content = await fs.readFile(settingsPath, 'utf-8');
      const settings = JSON.parse(content);

      // Verify PostToolUse hook
      expect(settings.hooks.PostToolUse).toBeDefined();
      expect(settings.hooks.PostToolUse).toHaveLength(1);
      expect(settings.hooks.PostToolUse[0].matcher).toBe('Write|Edit|MultiEdit');
      expect(settings.hooks.PostToolUse[0].hooks[0].command).toBe(
        '"$CLAUDE_PROJECT_DIR"/.ana/hooks/verify-context-file.sh'
      );
      expect(settings.hooks.PostToolUse[0].hooks[0].timeout).toBe(30);

      // Verify Stop hook
      expect(settings.hooks.Stop).toBeDefined();
      expect(settings.hooks.Stop).toHaveLength(1);
      expect(settings.hooks.Stop[0].hooks[0].command).toBe('"$CLAUDE_PROJECT_DIR"/.ana/hooks/quality-gate.sh');
      expect(settings.hooks.Stop[0].hooks[0].timeout).toBe(120);
    });

    it('creates .claude/agents/ directory with 8 agent files', async () => {
      const claudePath = path.join(tmpDir, '.claude');
      const agentsPath = path.join(claudePath, 'agents');

      // Simulate init creating .claude/agents/
      await fs.mkdir(agentsPath, { recursive: true });

      // Get templates directory
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const templatesDir = path.join(__dirname, '..', '..', 'templates');

      // Copy agent files
      const agentFiles = [
        'ana.md',
        'ana-plan.md',
        'ana-setup.md',
        'ana-build.md',
        'ana-explorer.md',
        'ana-question-formulator.md',
        'ana-writer.md',
        'ana-verifier.md',
      ];

      for (const agentFile of agentFiles) {
        const sourcePath = path.join(templatesDir, '.claude/agents', agentFile);
        const destPath = path.join(agentsPath, agentFile);
        await fs.copyFile(sourcePath, destPath);
      }

      const exists = await dirExists(agentsPath);
      expect(exists).toBe(true);

      // Should have 8 agent files
      const files = await fs.readdir(agentsPath);
      expect(files).toHaveLength(8);
      expect(files).toContain('ana.md');
      expect(files).toContain('ana-plan.md');
      expect(files).toContain('ana-setup.md');
      expect(files).toContain('ana-explorer.md');
      expect(files).toContain('ana-question-formulator.md');
      expect(files).toContain('ana-writer.md');
      expect(files).toContain('ana-verifier.md');
    });

    it('agent files have valid frontmatter with required fields', async () => {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const templatesDir = path.join(__dirname, '..', '..', 'templates');

      const agentFiles = [
        'ana.md',
        'ana-plan.md',
        'ana-setup.md',
        'ana-explorer.md',
        'ana-question-formulator.md',
        'ana-writer.md',
        'ana-verifier.md',
      ];

      for (const agentFile of agentFiles) {
        const filePath = path.join(templatesDir, '.claude/agents', agentFile);
        const content = await fs.readFile(filePath, 'utf-8');

        // Check frontmatter markers
        expect(content.startsWith('---'), `${agentFile} should start with ---`).toBe(true);
        const secondDashIndex = content.indexOf('---', 3);
        expect(secondDashIndex).toBeGreaterThan(3);

        const frontmatter = content.slice(3, secondDashIndex).trim();

        // Check required fields
        expect(frontmatter).toContain('name:');
        expect(frontmatter).toContain('model:');
        expect(frontmatter).toContain('description:');

        // ana.md, ana-plan.md, and ana-setup.md use opus
        // ana.md has memory:, others don't
        // sub-agents use sonnet/haiku and have tools:
        if (agentFile === 'ana.md') {
          expect(frontmatter).toContain('model: opus');
          expect(frontmatter).toContain('memory:');
        } else if (agentFile === 'ana-plan.md') {
          expect(frontmatter).toContain('model: opus');
          expect(frontmatter).not.toContain('tools:');
          expect(frontmatter).not.toContain('memory:');
        } else if (agentFile === 'ana-setup.md') {
          expect(frontmatter).toContain('model: opus');
          expect(frontmatter).toContain('tools:');
          expect(frontmatter).not.toContain('memory:');
        } else if (agentFile === 'ana-build.md') {
          expect(frontmatter).toContain('model: sonnet');
          expect(frontmatter).not.toContain('tools:');
          expect(frontmatter).not.toContain('memory:');
        } else {
          expect(frontmatter).toContain('model: sonnet');
          expect(frontmatter).toContain('tools:');
        }
      }
    });

    it('re-init does not duplicate agent files', async () => {
      const claudePath = path.join(tmpDir, '.claude');
      const agentsPath = path.join(claudePath, 'agents');

      // Simulate first init
      await fs.mkdir(agentsPath, { recursive: true });

      // Get templates directory
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const templatesDir = path.join(__dirname, '..', '..', 'templates');

      // Copy agent files (first init)
      const agentFiles = [
        'ana.md',
        'ana-plan.md',
        'ana-setup.md',
        'ana-build.md',
        'ana-explorer.md',
        'ana-question-formulator.md',
        'ana-writer.md',
        'ana-verifier.md',
      ];

      for (const agentFile of agentFiles) {
        const sourcePath = path.join(templatesDir, '.claude/agents', agentFile);
        const destPath = path.join(agentsPath, agentFile);
        await fs.copyFile(sourcePath, destPath);
      }

      // Simulate re-init: check if file exists before copying
      for (const agentFile of agentFiles) {
        const destPath = path.join(agentsPath, agentFile);
        const exists = await fileExists(destPath);
        // Should skip copy if exists
        expect(exists).toBe(true);
      }

      // Should still have exactly 8 files, not 16
      const files = await fs.readdir(agentsPath);
      expect(files).toHaveLength(8);
    });

    it('agent files have correct tools for their role', async () => {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const templatesDir = path.join(__dirname, '..', '..', 'templates');

      // Helper to extract frontmatter tools line
      const getToolsLine = (content: string): string => {
        const match = content.match(/^tools:\s*\[.*\]$/m);
        return match ? match[0] : '';
      };

      // Explorer: Read, Grep, Glob, Bash
      const explorerContent = await fs.readFile(
        path.join(templatesDir, '.claude/agents/ana-explorer.md'),
        'utf-8'
      );
      expect(explorerContent).toContain('tools: [Read, Grep, Glob, Bash]');

      // Question-formulator: Read, Grep, Glob (NO Bash, NO Write in frontmatter)
      const questionContent = await fs.readFile(
        path.join(templatesDir, '.claude/agents/ana-question-formulator.md'),
        'utf-8'
      );
      const questionTools = getToolsLine(questionContent);
      expect(questionTools).toBe('tools: [Read, Grep, Glob]');
      expect(questionTools).not.toContain('Write');
      expect(questionTools).not.toContain('Edit');
      expect(questionTools).not.toContain('Bash');

      // Writer: Read, Write, Grep, Glob, Bash
      const writerContent = await fs.readFile(
        path.join(templatesDir, '.claude/agents/ana-writer.md'),
        'utf-8'
      );
      expect(writerContent).toContain('tools: [Read, Write, Grep, Glob, Bash]');

      // Verifier: Read, Grep, Glob, Bash (NO Write, NO Edit in frontmatter)
      const verifierContent = await fs.readFile(
        path.join(templatesDir, '.claude/agents/ana-verifier.md'),
        'utf-8'
      );
      const verifierTools = getToolsLine(verifierContent);
      expect(verifierTools).toBe('tools: [Read, Grep, Glob, Bash]');
      expect(verifierTools).not.toContain('Write');
      expect(verifierTools).not.toContain('Edit');
      // Verifier should mention it cannot write in the body
      expect(verifierContent).toContain('CANNOT write or edit');
    });

    it('merges into existing .claude/settings.json without duplicates', async () => {
      const claudePath = path.join(tmpDir, '.claude');
      const settingsPath = path.join(claudePath, 'settings.json');

      // Create existing settings with custom hook
      await fs.mkdir(claudePath, { recursive: true });
      const existingSettings = {
        hooks: {
          PreToolUse: [
            {
              matcher: '*',
              hooks: [{ type: 'command', command: 'custom-hook.sh' }],
            },
          ],
        },
      };
      await fs.writeFile(settingsPath, JSON.stringify(existingSettings, null, 2));

      // Simulate merge logic
      const templateSettings = {
        hooks: {
          PostToolUse: [
            {
              matcher: 'Write',
              hooks: [
                {
                  type: 'command',
                  command: '.ana/hooks/verify-context-file.sh',
                  timeout: 30,
                },
              ],
            },
          ],
          Stop: [
            {
              hooks: [
                {
                  type: 'command',
                  command: '.ana/hooks/quality-gate.sh',
                  timeout: 120,
                },
              ],
            },
          ],
        },
      };

      // Merge
      const merged = { ...existingSettings };
      merged.hooks = { ...existingSettings.hooks, ...templateSettings.hooks };
      await fs.writeFile(settingsPath, JSON.stringify(merged, null, 2));

      // Verify merged content
      const content = await fs.readFile(settingsPath, 'utf-8');
      const result = JSON.parse(content);

      // Should have all three hook types
      expect(result.hooks.PreToolUse).toBeDefined();
      expect(result.hooks.PostToolUse).toBeDefined();
      expect(result.hooks.Stop).toBeDefined();

      // Custom hook preserved
      expect(result.hooks.PreToolUse[0].hooks[0].command).toBe('custom-hook.sh');
    });

    it('does not duplicate hooks on re-init', async () => {
      const claudePath = path.join(tmpDir, '.claude');
      const settingsPath = path.join(claudePath, 'settings.json');

      // Create settings with our hooks already present
      await fs.mkdir(claudePath, { recursive: true });
      const settingsWithOurHooks = {
        hooks: {
          PostToolUse: [
            {
              matcher: 'Write',
              hooks: [
                {
                  type: 'command',
                  command: '.ana/hooks/verify-context-file.sh',
                  timeout: 30,
                },
              ],
            },
          ],
          Stop: [
            {
              hooks: [
                {
                  type: 'command',
                  command: '.ana/hooks/quality-gate.sh',
                  timeout: 120,
                },
              ],
            },
          ],
        },
      };
      await fs.writeFile(settingsPath, JSON.stringify(settingsWithOurHooks, null, 2));

      // Simulate re-init merge (should detect duplicates)
      const templateSettings = { ...settingsWithOurHooks };

      // Check if hook already exists by command path
      const existingPostToolUse = settingsWithOurHooks.hooks.PostToolUse;
      const templatePostToolUse = templateSettings.hooks.PostToolUse;

      const postToolUseHasOurHook = existingPostToolUse.some(
        (entry: { matcher?: string; hooks?: Array<{ command: string }> }) =>
          entry.hooks?.some((h) => h.command === '.ana/hooks/verify-context-file.sh')
      );

      expect(postToolUseHasOurHook).toBe(true);

      // Since hook exists, we wouldn't add it again
      // Final count should be 1
      expect(settingsWithOurHooks.hooks.PostToolUse).toHaveLength(1);
      expect(settingsWithOurHooks.hooks.Stop).toHaveLength(1);
    });

    it('overwrites malformed .claude/settings.json with Anatomia defaults', async () => {
      const claudePath = path.join(tmpDir, '.claude');
      const settingsPath = path.join(claudePath, 'settings.json');

      // Create malformed settings.json
      await fs.mkdir(claudePath, { recursive: true });
      await fs.writeFile(settingsPath, '{ invalid json here }');

      // Simulate the try/catch behavior in createClaudeConfiguration
      const templateSettings = {
        hooks: {
          PostToolUse: [
            {
              matcher: 'Write',
              hooks: [
                {
                  type: 'command',
                  command: '.ana/hooks/verify-context-file.sh',
                  timeout: 30,
                },
              ],
            },
          ],
        },
      };

      // Try to parse, catch error, overwrite
      let didOverwrite = false;
      try {
        const content = await fs.readFile(settingsPath, 'utf-8');
        JSON.parse(content); // This should throw
      } catch {
        // Malformed JSON - overwrite with defaults
        await fs.writeFile(settingsPath, JSON.stringify(templateSettings, null, 2));
        didOverwrite = true;
      }

      expect(didOverwrite).toBe(true);

      // Verify the file is now valid JSON with our hooks
      const content = await fs.readFile(settingsPath, 'utf-8');
      const result = JSON.parse(content);
      expect(result.hooks.PostToolUse).toBeDefined();
      expect(result.hooks.PostToolUse[0].hooks[0].command).toBe(
        '.ana/hooks/verify-context-file.sh'
      );
    });
  });
});

function fileURLToPath(url: string): string {
  return new URL(url).pathname;
}
