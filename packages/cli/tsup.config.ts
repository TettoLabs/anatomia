import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node20',
  shims: true,
  clean: true,
  dts: true,
  external: ['anatomia-analyzer'], // Don't bundle dependency
});
