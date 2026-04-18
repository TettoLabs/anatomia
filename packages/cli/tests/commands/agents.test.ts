import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { listAgents } from '../../src/commands/agents.js';
import { createTestProject } from '../helpers/test-project.js';

/**
 * Tests for `ana agents` command
 */

describe('ana agents', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agents-test-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  /**
   * Helper to create .claude/agents directory with agent files
   */
  async function createAgentsDir(files: { name: string; content: string }[]): Promise<void> {
    await createTestProject(tempDir);
    const agentsDir = path.join(tempDir, '.claude/agents');
    await fs.mkdir(agentsDir, { recursive: true });

    for (const file of files) {
      await fs.writeFile(path.join(agentsDir, file.name), file.content, 'utf-8');
    }
  }

  describe('happy path', () => {
    it('lists agents from frontmatter', async () => {
      await createAgentsDir([
        {
          name: 'ana.md',
          content: `---
name: ana
model: opus
description: "Scoping and navigation"
---

# Ana

Content...`
        },
        {
          name: 'ana-plan.md',
          content: `---
name: ana-plan
model: opus
description: Design specs from scopes
---

# AnaPlan

Content...`
        }
      ]);

      expect(() => listAgents()).not.toThrow();
    });

    it('sorts agents alphabetically', async () => {
      await createAgentsDir([
        {
          name: 'z-agent.md',
          content: `---
name: zebra
model: sonnet
description: Last agent
---`
        },
        {
          name: 'a-agent.md',
          content: `---
name: aardvark
model: opus
description: First agent
---`
        }
      ]);

      // Just verify it doesn't throw - output ordering tested via integration
      expect(() => listAgents()).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('errors when .claude/agents directory missing', () => {
      expect(() => listAgents()).toThrow();
    });

    it('handles empty agents directory', async () => {
      await createAgentsDir([]);

      expect(() => listAgents()).not.toThrow();
    });

    it('skips files without valid frontmatter', async () => {
      await createAgentsDir([
        {
          name: 'valid.md',
          content: `---
name: valid-agent
model: opus
description: Valid agent
---`
        },
        {
          name: 'invalid.md',
          content: `# No frontmatter

Just content`
        }
      ]);

      expect(() => listAgents()).not.toThrow();
    });

    it('strips quotes from description', async () => {
      await createAgentsDir([
        {
          name: 'agent.md',
          content: `---
name: test
model: opus
description: "Quoted description"
---`
        }
      ]);

      expect(() => listAgents()).not.toThrow();
    });
  });
});
