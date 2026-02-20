import { defineConfig } from 'tsup';
import * as fs from 'node:fs';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node20',
  shims: true,
  clean: true,
  dts: true,
  // Copy template files to dist/
  publicDir: 'templates',
  // Fallback: Ensure templates persist after DTS generation
  onSuccess: async () => {
    // Copy templates again if DTS deleted them
    const templatesExist = fs.existsSync('dist/templates');
    if (!templatesExist) {
      console.log('Re-copying templates after DTS...');
      fs.cpSync('templates', 'dist/templates', { recursive: true });
    }
  },
});
