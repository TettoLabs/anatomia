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
    // Smoothed: 0.86 * 50/(50+5) ≈ 0.782
    expect(result.confidence).toBeCloseTo(0.782, 2);
    expect(result.mixed).toBe(false);  // ≥70% raw majority
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
    // Smoothed: 0.66 * 50/(50+5) ≈ 0.60
    expect(result.confidence).toBeCloseTo(0.60, 2);
    expect(result.mixed).toBe(true);  // <70% raw majority
  });

  it('detects threshold at 70%', () => {
    const names = [
      ...Array(35).fill('user_name'),  // 70% snake_case
      ...Array(15).fill('userName'),   // 30% camelCase
    ];

    const result = analyzeNamingConvention(names, 'python');

    expect(result.majority).toBe('snake_case');
    // Smoothed: 0.70 * 50/(50+5) ≈ 0.636
    expect(result.confidence).toBeCloseTo(0.636, 2);
    expect(result.mixed).toBe(false);  // Exactly 70% raw is NOT mixed (≥70%)
  });

  it('filters language keywords', () => {
    const names = [
      'user_name', 'get_data',  // 2 snake_case
      'class', 'def', 'if', 'for',  // 4 keywords (excluded)
    ];

    const result = analyzeNamingConvention(names, 'python');

    expect(result.majority).toBe('snake_case');
    // Smoothed: 1.0 * 2/(2+5) ≈ 0.286
    expect(result.confidence).toBeCloseTo(0.286, 2);
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
    // Smoothed: 1.0 * 2/(2+5) ≈ 0.286
    expect(result.confidence).toBeCloseTo(0.286, 2);
  });

  it('analyzes class naming from parsed.files', () => {
    const result = analyzeClassNaming(sampleFiles, 'python');

    expect(result.majority).toBe('PascalCase');
    // Smoothed: 1.0 * 1/(1+5) ≈ 0.167
    expect(result.confidence).toBeCloseTo(0.167, 2);
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

  it('extracts variables from .ts files (Commit 2 regression — typescript grammar query)', async () => {
    // Must be .ts (not .tsx) — the typescript grammar entry in queries.ts was
    // missing a `variables` query, so every .ts file silently skipped
    // extraction even after the path-doubling fix.
    const filePath = join(tempDir, 'fixture.ts');
    await writeFile(
      filePath,
      `const DATABASE_URL = 'postgres://localhost';
const appConfig = { port: 3000 };
export const API_VERSION = 'v2';
`,
      'utf-8',
    );

    const files: ParsedFile[] = [
      {
        file: filePath,
        language: 'typescript',
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

    expect(variables.sampleSize).toBeGreaterThan(0);
    expect(constants.sampleSize).toBeGreaterThanOrEqual(2);
    expect(constants.majority).toBe('SCREAMING_SNAKE_CASE');
  });
});

describe('Disease C — classifier filters language-mandated method names', () => {
  it('constructor entries do not pollute function naming majority', () => {
    // Simulates trigger.dev-style input: many constructors outnumber real functions.
    // Without the FILTERED_METHOD_NAMES filter, constructor (classified as lowercase)
    // would become the majority style — a wrong answer caused by language-mandated names.
    const files: ParsedFile[] = [{
      file: 'src/app.ts',
      language: 'typescript',
      functions: [
        // 25 constructor entries (language-mandated, should be filtered)
        ...Array.from({ length: 25 }, () => ({ name: 'constructor', line: 1, async: false, decorators: [] as string[] })),
        // 5 camelCase functions (user-chosen, should vote)
        ...Array.from({ length: 5 }, (_, i) => ({ name: `getData${i}`, line: 1, async: false, decorators: [] as string[] })),
      ],
      classes: [],
      imports: [],
      parseTime: 0,
      parseMethod: 'cached' as const,
      errors: 0,
    }];

    const result = analyzeFunctionNaming(files, 'typescript');
    expect(result.majority).toBe('camelCase');
    expect(result.majority).not.toBe('lowercase');
  });

  it('single-word lowercase names abstain from voting', () => {
    // Names like value, result, handler are evidence-free — they look the
    // same in camelCase, snake_case, and lowercase
    const names = ['value', 'result', 'handler', 'getData', 'fetchUser'];
    const result = analyzeNamingConvention(names, 'typescript');
    // Only getData and fetchUser should vote (both camelCase)
    expect(result.majority).toBe('camelCase');
  });

  it('sample-size smoothing: sampleSize=1 yields confidence < 0.2', () => {
    const result = analyzeNamingConvention(['getData'], 'typescript');
    // Formula: 1.0 * 1 / (1 + 5) ≈ 0.167
    expect(result.confidence).toBeLessThan(0.2);
  });

  it('sample-size smoothing: sampleSize=50 with 90% majority yields ~0.818', () => {
    const names = [
      ...Array.from({ length: 45 }, (_, i) => `getData${i}`),   // camelCase
      ...Array.from({ length: 5 }, (_, i) => `get_data_${i}`),   // snake_case
    ];
    const result = analyzeNamingConvention(names, 'typescript');
    expect(result.majority).toBe('camelCase');
    // Formula: 0.9 * 50 / (50 + 5) ≈ 0.818
    expect(result.confidence).toBeGreaterThan(0.8);
    expect(result.confidence).toBeLessThan(0.85);
  });
});
