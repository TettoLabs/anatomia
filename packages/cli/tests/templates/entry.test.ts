import { describe, it, expect } from 'vitest';
import { renderTemplate } from '../../src/utils/template-loader.js';

describe('ENTRY.md Template', () => {
  it('should render with minimum required variables', () => {
    const output = renderTemplate('ENTRY.md.hbs', {
      projectName: 'TestProject',
      nodeId: 'main',
      timestamp: '2026-02-18T12:00:00Z',
      federation: false,
    });

    expect(output).toContain('TestProject');
    expect(output).toContain('main');
    expect(output).not.toContain('{{projectName}}'); // Variables substituted
    expect(output).not.toContain('{{nodeId}}');
  });

  it('should include federation section when enabled', () => {
    const output = renderTemplate('ENTRY.md.hbs', {
      projectName: 'FederatedProject',
      nodeId: 'node-1',
      timestamp: '2026-02-18T12:00:00Z',
      federation: true,
    });

    expect(output).toContain('Federation (Multi-Service Context)');
    expect(output).toContain('**This node:** node-1'); // Markdown bold syntax
    expect(output).toContain('ana query');
  });

  it('should NOT include federation section when disabled', () => {
    const output = renderTemplate('ENTRY.md.hbs', {
      projectName: 'StandaloneProject',
      nodeId: 'main',
      timestamp: '2026-02-18T12:00:00Z',
      federation: false,
    });

    expect(output).not.toContain('Federation (Multi-Service Context)');
    expect(output).not.toContain('ana query');
  });

  it('should include all required sections', () => {
    const output = renderTemplate('ENTRY.md.hbs', {
      projectName: 'Test',
      nodeId: 'main',
      timestamp: '2026-02-18T12:00:00Z',
      federation: false,
    });

    // Required sections
    expect(output).toContain('What is .ana/?');
    expect(output).toContain('5 Modes');
    expect(output).toContain('7 Non-Negotiable Principles');
    expect(output).toContain('How to Use Modes');
    expect(output).toContain('Safety Guidelines');
  });

  it('should list all 5 modes', () => {
    const output = renderTemplate('ENTRY.md.hbs', {
      projectName: 'Test',
      nodeId: 'main',
      timestamp: '2026-02-18T12:00:00Z',
      federation: false,
    });

    expect(output).toContain('architect');
    expect(output).toContain('code');
    expect(output).toContain('debug');
    expect(output).toContain('docs');
    expect(output).toContain('test');
  });

  it('should be within length target (60-80 lines non-empty)', () => {
    const output = renderTemplate('ENTRY.md.hbs', {
      projectName: 'Test',
      nodeId: 'main',
      timestamp: '2026-02-18T12:00:00Z',
      federation: false,
    });

    // Count non-empty lines
    const nonEmptyLines = output.split('\n').filter(line => line.trim().length > 0).length;
    expect(nonEmptyLines).toBeGreaterThanOrEqual(60);
    expect(nonEmptyLines).toBeLessThanOrEqual(80);
  });
});

describe('node.json Template', () => {
  it('should render valid JSON', () => {
    const output = renderTemplate('node.json.hbs', {
      projectName: 'test-project',
      nodeId: 'main',
      timestamp: '2026-02-18T12:00:00Z',
      federation: false,
    });

    // Should parse without error
    const parsed = JSON.parse(output);
    expect(parsed.name).toBe('test-project');
    expect(parsed.nodeId).toBe('main');
  });

  it('should set federation.queryable based on federation flag', () => {
    // Test federation: false
    const output1 = renderTemplate('node.json.hbs', {
      projectName: 'test',
      nodeId: 'main',
      timestamp: '2026-02-18T12:00:00Z',
      federation: false,
    });
    const parsed1 = JSON.parse(output1);
    expect(parsed1.federation.queryable).toBe(false); // Boolean false, not string

    // Test federation: true
    const output2 = renderTemplate('node.json.hbs', {
      projectName: 'test',
      nodeId: 'main',
      timestamp: '2026-02-18T12:00:00Z',
      federation: true,
    });
    const parsed2 = JSON.parse(output2);
    expect(parsed2.federation.queryable).toBe(true); // Boolean true
  });

  it('should include all required fields', () => {
    const output = renderTemplate('node.json.hbs', {
      projectName: 'test',
      nodeId: 'main',
      timestamp: '2026-02-18T12:00:00Z',
      federation: false,
    });

    const parsed = JSON.parse(output);
    expect(parsed).toHaveProperty('name');
    expect(parsed).toHaveProperty('nodeId');
    expect(parsed).toHaveProperty('role');
    expect(parsed).toHaveProperty('version');
    expect(parsed).toHaveProperty('created');
    expect(parsed).toHaveProperty('federation');
  });
});
