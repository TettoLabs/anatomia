/**
 * Test template loader utility
 */

import { loadTemplate, renderTemplate, listTemplates } from './utils/template-loader.js';

console.log('=== Template Loader Test ===\n');

// Test 1: List templates
console.log('Test 1: List available templates');
const templates = listTemplates();
console.log(`Found ${templates.length} templates:`, templates);
if (templates.length === 0) {
  console.error('✗ No templates found (check templates/ directory exists)');
  process.exit(1);
}
console.log('✓ Templates found\n');

// Test 2: Load template
console.log('Test 2: Load test.md.hbs');
try {
  const template = loadTemplate('test.md.hbs');
  console.log('✓ Template loaded and compiled\n');

  // Test 3: Render template
  console.log('Test 3: Render template');
  const output = renderTemplate('test.md.hbs', {
    projectName: 'LoaderTest',
    nodeId: 'test',
    timestamp: new Date().toISOString(),
    description: 'Testing template loader utility',
    federation: false,
  });

  console.log('✓ Template rendered\n');
  console.log('Output (first 300 chars):');
  console.log('---');
  console.log(output.substring(0, 300));
  console.log('---\n');

  console.log('=== Template Loader Working ===');
  console.log('✓ Can list templates');
  console.log('✓ Can load templates');
  console.log('✓ Can render templates');
  console.log('\nReady to use in init.ts command (CP1)');
} catch (error) {
  console.error('✗ Template loader failed:', error);
  process.exit(1);
}
