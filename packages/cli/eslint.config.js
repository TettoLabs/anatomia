import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import jsdoc from 'eslint-plugin-jsdoc';

export default [
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      jsdoc,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'jsdoc/require-jsdoc': ['error', {
        publicOnly: true,
        require: { FunctionDeclaration: true, ClassDeclaration: true },
      }],
      'jsdoc/require-description': 'error',
      'jsdoc/require-param': 'error',
      'jsdoc/require-returns': 'error',
      'no-warning-comments': ['error', { terms: ['TODO', 'FIXME'] }],
    },
  },
  {
    ignores: ['dist/', 'node_modules/', '*.config.ts', '*.config.js', 'tests/'],
  },
];
