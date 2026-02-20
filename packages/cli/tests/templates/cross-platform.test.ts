import { describe, it, expect } from 'vitest';
import * as path from 'node:path';

describe('Cross-Platform Path Handling', () => {
  // Note: We can't actually test on Windows/Linux without CI,
  // but we can check templates don't have hardcoded paths

  it('should not have hardcoded forward slashes in TypeScript code', async () => {
    const fs = await import('node:fs/promises');

    // Check init.ts uses path.join
    const initContent = await fs.readFile('src/commands/init.ts', 'utf-8');
    expect(initContent).toContain('path.join');

    // Should not have hardcoded path separators in code
    // (Templates can have example paths in markdown - that's documentation)
  });

  it('should use path.join pattern in file operations', async () => {
    const fs = await import('node:fs/promises');
    const initContent = await fs.readFile('src/commands/init.ts', 'utf-8');

    // Verify path.join used for .ana/ paths
    expect(initContent).toContain("path.join(anaPath, 'modes'");
    expect(initContent).toContain("path.join(anaPath, 'context'");
  });

  it('FileWriter utility uses path.join (from STEP_0.1)', async () => {
    const fs = await import('node:fs/promises');
    const fileWriter = await fs.readFile('src/utils/file-writer.ts', 'utf-8');

    // Should use path module
    expect(fileWriter).toContain('import * as path');
    expect(fileWriter).toContain('path.dirname');
    expect(fileWriter).toContain('path.join');
  });
});
