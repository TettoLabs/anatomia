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
import { createEmptyAnalysisResult } from './test-types.js';

describe('all scaffolds integration', () => {
  const analysis = createEmptyAnalysisResult();
  const projectName = 'test-project';
  const timestamp = '2026-03-19T10:00:00Z';
  const version = '0.2.0';

  it('all 7 generators produce valid scaffolds', () => {
    const scaffolds = [
      generateProjectOverviewScaffold(analysis, projectName, timestamp, version),
      generateArchitectureScaffold(analysis, projectName, timestamp, version),
      generatePatternsScaffold(analysis, projectName, timestamp, version),
      generateConventionsScaffold(analysis, projectName, timestamp, version),
      generateWorkflowScaffold(analysis, projectName, timestamp, version),
      generateTestingScaffold(analysis, projectName, timestamp, version),
      generateDebuggingScaffold(analysis, projectName, timestamp, version),
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
    const overview = generateProjectOverviewScaffold(analysis, projectName, timestamp, version);
    const architecture = generateArchitectureScaffold(analysis, projectName, timestamp, version);
    const patterns = generatePatternsScaffold(analysis, projectName, timestamp, version);
    const conventions = generateConventionsScaffold(analysis, projectName, timestamp, version);
    const workflow = generateWorkflowScaffold(analysis, projectName, timestamp, version);
    const testing = generateTestingScaffold(analysis, projectName, timestamp, version);
    const debugging = generateDebuggingScaffold(analysis, projectName, timestamp, version);

    expect((overview.match(/^## /gm) || []).length).toBe(4);
    expect((architecture.match(/^## /gm) || []).length).toBe(4);
    expect((patterns.match(/^## /gm) || []).length).toBe(6); // 5 categories + Framework Patterns
    expect((conventions.match(/^## /gm) || []).length).toBe(4);
    expect((workflow.match(/^## /gm) || []).length).toBe(6);
    expect((testing.match(/^## /gm) || []).length).toBe(6);
    expect((debugging.match(/^## /gm) || []).length).toBe(5);
  });
});
