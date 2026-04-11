import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  classifyNamingStyle,
  analyzeNamingConvention,
  isKeyword,
  analyzeFunctionNaming,
  analyzeClassNaming,
  analyzeVariableNaming,
  analyzeConstantNaming,
} from '../../../src/engine/analyzers/conventions/naming.js';
import type { ParsedFile } from '../../../src/engine/types/parsed.js';
import { ParserManager } from '../../../src/engine/parsers/treeSitter.js';
import { skipIfNoWasm } from '../fixtures.js';

describe('classifyNamingStyle', () => {
  it('detects snake_case', () => {
    expect(classifyNamingStyle('user_name')).toBe('snake_case');
    expect(classifyNamingStyle('get_user_by_id')).toBe('snake_case');
    expect(classifyNamingStyle('api_response')).toBe('snake_case');
  });

  it('detects camelCase', () => {
    expect(classifyNamingStyle('userName')).toBe('camelCase');
    expect(classifyNamingStyle('getUserById')).toBe('camelCase');
    expect(classifyNamingStyle('apiResponse')).toBe('camelCase');
  });

  it('detects PascalCase', () => {
    expect(classifyNamingStyle('UserName')).toBe('PascalCase');
    expect(classifyNamingStyle('GetUserById')).toBe('PascalCase');
    expect(classifyNamingStyle('ApiResponse')).toBe('PascalCase');
  });

  it('detects kebab-case', () => {
    expect(classifyNamingStyle('user-name')).toBe('kebab-case');
    expect(classifyNamingStyle('get-user-by-id')).toBe('kebab-case');
    expect(classifyNamingStyle('api-response')).toBe('kebab-case');
  });

  it('detects SCREAMING_SNAKE_CASE', () => {
    expect(classifyNamingStyle('MAX_RETRIES')).toBe('SCREAMING_SNAKE_CASE');
    expect(classifyNamingStyle('API_KEY')).toBe('SCREAMING_SNAKE_CASE');
    expect(classifyNamingStyle('DEFAULT_TIMEOUT')).toBe('SCREAMING_SNAKE_CASE');
  });

  it('handles leading/trailing underscores', () => {
    expect(classifyNamingStyle('_private_var')).toBe('snake_case');  // Strips _ → private_var
    expect(classifyNamingStyle('__dunder__')).toBe('lowercase');  // Strips __ → dunder → lowercase
    expect(classifyNamingStyle('_userName')).toBe('camelCase');  // Strips _ → userName
  });

  it('returns lowercase for single lowercase words', () => {
    expect(classifyNamingStyle('user')).toBe('lowercase');
    expect(classifyNamingStyle('data')).toBe('lowercase');
  });

  it('returns unknown for ambiguous names', () => {
    expect(classifyNamingStyle('x')).toBe('unknown');  // Single char
    expect(classifyNamingStyle('')).toBe('unknown');  // Empty
  });
});

describe('analyzeNamingConvention', () => {
  it('detects clear majority (86%)', () => {
    const names = [
      ...Array(43).fill('user_name'),  // 43 snake_case
      ...Array(5).fill('userName'),    // 5 camelCase
      ...Array(2).fill('UserName'),    // 2 PascalCase
    ];

    const result = analyzeNamingConvention(names, 'python');

    expect(result.majority).toBe('snake_case');
    expect(result.confidence).toBeCloseTo(0.86, 2);
    expect(result.mixed).toBe(false);  // ≥70%
    expect(result.sampleSize).toBe(50);
  });

  it('detects mixed convention (65%)', () => {
    const names = [
      ...Array(33).fill('user_name'),  // 65% snake_case (33/50 = 0.66, but after rounding)
      ...Array(15).fill('userName'),   // 30% camelCase
      ...Array(2).fill('UserName'),    // 4% PascalCase (total 50)
    ];

    const result = analyzeNamingConvention(names, 'python');

    expect(result.majority).toBe('snake_case');
    expect(result.confidence).toBeCloseTo(0.66, 2);
    expect(result.mixed).toBe(true);  // <70%
  });

  it('detects threshold at 70%', () => {
    const names = [
      ...Array(35).fill('user_name'),  // 70% snake_case
      ...Array(15).fill('userName'),   // 30% camelCase
    ];

    const result = analyzeNamingConvention(names, 'python');

    expect(result.majority).toBe('snake_case');
    expect(result.confidence).toBe(0.70);
    expect(result.mixed).toBe(false);  // Exactly 70% is NOT mixed (≥70%)
  });

  it('filters language keywords', () => {
    const names = [
      'user_name', 'get_data',  // 2 snake_case
      'class', 'def', 'if', 'for',  // 4 keywords (excluded)
    ];

    const result = analyzeNamingConvention(names, 'python');

    expect(result.majority).toBe('snake_case');
    expect(result.confidence).toBe(1.0);  // 2/2 valid names
    expect(result.sampleSize).toBe(6);  // Total including keywords
  });
});

describe('isKeyword', () => {
  it('detects Python keywords', () => {
    expect(isKeyword('class', 'python')).toBe(true);
    expect(isKeyword('def', 'python')).toBe(true);
    expect(isKeyword('User', 'python')).toBe(false);
  });

  it('detects TypeScript keywords', () => {
    expect(isKeyword('const', 'typescript')).toBe(true);
    expect(isKeyword('interface', 'typescript')).toBe(true);
    expect(isKeyword('UserService', 'typescript')).toBe(false);
  });

  it('detects Go keywords', () => {
    expect(isKeyword('func', 'go')).toBe(true);
    expect(isKeyword('struct', 'go')).toBe(true);
    expect(isKeyword('User', 'go')).toBe(false);
  });
});

describe('analyze*Naming integration', () => {
  const sampleFiles: ParsedFile[] = [
    {
      file: 'src/user_service.py',
      language: 'python',
      functions: [
        { name: 'get_user', line: 10, async: false, decorators: [] },
        { name: 'create_user', line: 20, async: false, decorators: [] },
      ],
      classes: [
        { name: 'UserModel', line: 30, superclasses: ['BaseModel'], methods: ['validate'], decorators: [] },
      ],
      imports: [],
      parseTime: 0,
      parseMethod: 'cached',
      errors: 0,
    },
  ];

  it('analyzes function naming from parsed.files', () => {
    const result = analyzeFunctionNaming(sampleFiles, 'python');

    expect(result.majority).toBe('snake_case');
    expect(result.confidence).toBe(1.0);
  });

  it('analyzes class naming from parsed.files', () => {
    const result = analyzeClassNaming(sampleFiles, 'python');

    expect(result.majority).toBe('PascalCase');
    expect(result.confidence).toBe(1.0);
  });
});

// Regression: extractVariables previously joined rootPath with file.file even
// though file.file is already absolute (set by parseProjectFiles in
// treeSitter.ts). The doubled path didn't exist on disk, readFile threw
// ENOENT, the catch silently continued, and variable/constant naming returned
// sampleSize: 0 for every language on every scan. Test asserts the analyzer
// actually reads files and surfaces their variable declarations.
const wasmAvailable = await skipIfNoWasm();

describe.skipIf(!wasmAvailable)('variable extraction reads files from disk', () => {
  let tempDir: string;

  beforeAll(async () => {
    await ParserManager.getInstance().initialize();
    tempDir = await mkdtemp(join(tmpdir(), 'naming-varfix-'));
    await mkdir(tempDir, { recursive: true });
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('extracts variables from .tsx files (Commit 1 regression)', async () => {
    const filePath = join(tempDir, 'fixture.tsx');
    await writeFile(
      filePath,
      `const TOP_LEVEL = 42;
const anotherVar = 'hello';
export const EXPORTED_CONST = true;
let mutableVar = 0;
`,
      'utf-8',
    );

    // file.file is absolute (matches how parseProjectFiles sets it)
    const files: ParsedFile[] = [
      {
        file: filePath,
        language: 'tsx',
        functions: [],
        classes: [],
        imports: [],
        parseTime: 0,
        parseMethod: 'tree-sitter',
        errors: 0,
      },
    ];

    const variables = await analyzeVariableNaming(files, 'node', tempDir);
    const constants = await analyzeConstantNaming(files, 'node', tempDir);

    // Path-doubling bug made these 0 on every scan ever run.
    expect(variables.sampleSize).toBeGreaterThan(0);
    expect(['camelCase', 'SCREAMING_SNAKE_CASE', 'snake_case', 'PascalCase', 'lowercase', 'mixed'])
      .toContain(variables.majority);

    // Fixture has two SCREAMING_SNAKE constants (TOP_LEVEL, EXPORTED_CONST).
    expect(constants.sampleSize).toBeGreaterThanOrEqual(2);
    expect(constants.majority).toBe('SCREAMING_SNAKE_CASE');
  });

});
