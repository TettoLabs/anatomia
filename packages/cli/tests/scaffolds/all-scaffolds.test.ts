import { describe, it, expect } from 'vitest';
import {
  generateProjectOverviewScaffold,
  generateArchitectureScaffold,
  generatePatternsScaffold,
  generateConventionsScaffold,
  generateWorkflowScaffold,
  generateTestingScaffold,
  generateDebuggingScaffold,
} from '../../src/utils/scaffold-generators.js';
import { createEmptyEngineResult } from './test-types.js';

describe('all scaffolds integration', () => {
  const result = createEmptyEngineResult() as any;
  const projectName = 'test-project';
  const timestamp = '2026-03-19T10:00:00Z';
  const version = '0.2.0';

  it('all 7 generators produce valid scaffolds', () => {
    const scaffolds = [
      generateProjectOverviewScaffold(result, projectName, timestamp, version),
      generateArchitectureScaffold(result, projectName, timestamp, version),
      generatePatternsScaffold(result, projectName, timestamp, version),
      generateConventionsScaffold(result, projectName, timestamp, version),
      generateWorkflowScaffold(result, projectName, timestamp, version),
      generateTestingScaffold(result, projectName, timestamp, version),
      generateDebuggingScaffold(result, projectName, timestamp, version),
    ];

    // All should have scaffold marker
    scaffolds.forEach((scaffold) => {
      expect(scaffold).toContain('<!-- SCAFFOLD - Setup will fill this file -->');
    });

    // All should have project name in title
    scaffolds.forEach((scaffold) => {
      expect(scaffold).toContain(projectName);
    });

    // All should have timestamp or version in footer
    scaffolds.forEach((scaffold) => {
      expect(scaffold).toContain(timestamp);
    });
  });

  it('section count validation', () => {
    const overview = generateProjectOverviewScaffold(result, projectName, timestamp, version);
    const architecture = generateArchitectureScaffold(result, projectName, timestamp, version);
    const patterns = generatePatternsScaffold(result, projectName, timestamp, version);
    const conventions = generateConventionsScaffold(result, projectName, timestamp, version);
    const workflow = generateWorkflowScaffold(result, projectName, timestamp, version);
    const testing = generateTestingScaffold(result, projectName, timestamp, version);
    const debugging = generateDebuggingScaffold(result, projectName, timestamp, version);

    // Count ## headings (varies based on detected data for empty result)
    // Architecture and Debugging consolidate unexamined sections into ## Open Questions
    expect((overview.match(/^## /gm) || []).length).toBeGreaterThanOrEqual(3);
    expect((architecture.match(/^## /gm) || []).length).toBeGreaterThanOrEqual(2);
    expect((patterns.match(/^## /gm) || []).length).toBe(6); // 5 categories + Framework Patterns
    expect((conventions.match(/^## /gm) || []).length).toBeGreaterThanOrEqual(4);
    expect((workflow.match(/^## /gm) || []).length).toBeGreaterThanOrEqual(5);
    expect((testing.match(/^## /gm) || []).length).toBeGreaterThanOrEqual(4);
    expect((debugging.match(/^## /gm) || []).length).toBeGreaterThanOrEqual(1);
  });
});
