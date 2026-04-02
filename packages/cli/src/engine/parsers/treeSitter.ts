/**
 * Tree-sitter parsing for Anatomia
 *
 * Parses source files using tree-sitter to extract:
 * - Functions (with decorators, async flags)
 * - Classes (with methods, superclasses)
 * - Imports (module dependencies)
 * - Exports (TypeScript/JavaScript only)
 * - Decorators (Python @app.get, TypeScript @Controller)
 *
 * Implementation status:
 * - CP0: Types and ParserManager ✓
 * - CP1: Query system and extraction ✓
 * - CP2: Caching layer ✓
 * - CP3: Integration with analyze() ✓
 * - SS-10: WASM migration ✓
 */

import { accessSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  Parser as TSParser,
  Language as TSLanguage,
  type Tree,
  type Node as TSNode,
} from 'web-tree-sitter';

import type { ParsedFile, FunctionInfo, ClassInfo, ImportInfo, DecoratorInfo, ExportInfo, ParsedAnalysis } from '../types/parsed.js';
import { readFile, joinPath } from '../utils/file.js';
import type { ASTCache } from '../cache/astCache.js';
import { ASTCache as ASTCacheClass } from '../cache/astCache.js';
import { sampleFiles } from '../sampling/fileSampler.js';
import type { AnalysisResult } from '../types/index.js';
// Import queryCache - NO circular dependency since queries.ts doesn't import from here
import { queryCache } from './queries.js';

// Re-export types from web-tree-sitter for consumers
export type { Tree } from 'web-tree-sitter';
// Alias SyntaxNode to web-tree-sitter's Node for backwards compatibility
export type SyntaxNode = TSNode;

export type Language = 'python' | 'typescript' | 'tsx' | 'javascript' | 'go';

// Get current module directory for path construction
const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Resolve WASM file path without loading grammar package modules
 *
 * DO NOT use require.resolve() on grammar packages — they have native tree-sitter
 * as peer deps, and any resolution through their module graph triggers native loading.
 *
 * Instead: Walk up from our module location and check known node_modules paths directly.
 * @param packageName
 * @param wasmFileName
 */
function resolveWasmPath(packageName: string, wasmFileName: string): string {
  const candidates = [
    // packages/analyzer/node_modules/<pkg>/<file>.wasm
    join(__dirname, '..', '..', 'node_modules', packageName, wasmFileName),
    // monorepo root node_modules/<pkg>/<file>.wasm (pnpm hoists)
    join(__dirname, '..', '..', '..', '..', 'node_modules', packageName, wasmFileName),
  ];

  for (const candidate of candidates) {
    try {
      accessSync(candidate);
      return candidate;
    } catch {
      continue;
    }
  }

  throw new Error(`WASM file not found: ${packageName}/${wasmFileName}. Checked: ${candidates.join(', ')}`);
}

/**
 * Parser manager singleton
 *
 * Creates tree-sitter parsers once per language, reuses for all files.
 * Prevents expensive parser initialization (5-10ms) on every file.
 *
 * Pattern: Singleton with getInstance() - ensures one global instance
 *
 * Performance: Saves 100-200ms over 20 files (5-10ms × 20 files avoided)
 *
 * WASM Migration (SS-10):
 * - Must call initialize() once before any parsing
 * - Grammars are pre-loaded during initialization
 * - getParser() is sync after initialization
 *
 * @example
 * ```typescript
 * const manager = ParserManager.getInstance();
 * await manager.initialize(); // Required once before parsing
 * const pythonParser = manager.getParser('python');
 *
 * // Reuse parser for multiple files
 * const tree1 = pythonParser.parse(file1Code);
 * // ... extract data from tree1 ...
 * tree1.delete(); // CRITICAL: Free WASM memory
 *
 * const tree2 = pythonParser.parse(file2Code);
 * // ... extract data from tree2 ...
 * tree2.delete();
 * ```
 */
export class ParserManager {
  private static instance: ParserManager;
  private parsers = new Map<Language, TSParser>();
  private languages = new Map<Language, TSLanguage>();
  private initialized = false;

  /**
   * Private constructor - prevents direct instantiation
   * Forces use of getInstance() for singleton pattern
   */
  private constructor() {}

  /**
   * Get singleton instance
   *
   * Creates instance on first call, returns same instance on subsequent calls.
   *
   * @returns ParserManager singleton instance
   */
  static getInstance(): ParserManager {
    if (!ParserManager.instance) {
      ParserManager.instance = new ParserManager();
    }
    return ParserManager.instance;
  }

  /**
   * Initialize WASM parser runtime and pre-load all grammars
   *
   * MUST be called once before any parsing operations.
   * Safe to call multiple times (idempotent).
   *
   * @throws Error if TSParser.init() or Language.load() fails
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Initialize WASM runtime with explicit path resolution
    // Use direct path construction to avoid loading any modules
    await TSParser.init({
      locateFile(scriptName: string) {
        const candidates = [
          join(__dirname, '..', '..', 'node_modules', 'web-tree-sitter', scriptName),
          join(__dirname, '..', '..', '..', '..', 'node_modules', 'web-tree-sitter', scriptName),
        ];
        for (const c of candidates) {
          try {
            accessSync(c);
            return c;
          } catch {
            continue;
          }
        }
        throw new Error(`WASM runtime not found: ${scriptName}`);
      }
    } as any); // Cast to any - web-tree-sitter types reference undefined EmscriptenModule

    // Pre-load all grammars
    const grammarPaths: Record<Language, [string, string]> = {
      python: ['tree-sitter-python', 'tree-sitter-python.wasm'],
      javascript: ['tree-sitter-javascript', 'tree-sitter-javascript.wasm'],
      typescript: ['tree-sitter-typescript', 'tree-sitter-typescript.wasm'],
      tsx: ['tree-sitter-typescript', 'tree-sitter-tsx.wasm'],
      go: ['tree-sitter-go', 'tree-sitter-go.wasm'],
    };

    for (const [lang, [pkg, wasm]] of Object.entries(grammarPaths) as [Language, [string, string]][]) {
      const wasmPath = resolveWasmPath(pkg, wasm);
      const language = await TSLanguage.load(wasmPath);
      this.languages.set(lang, language);
    }

    this.initialized = true;
  }

  /**
   * Check if ParserManager has been initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get pre-loaded Language object for a language
   *
   * Used by QueryCache to create queries against the language.
   *
   * @param language - Language name
   * @returns Loaded WASM Language object
   * @throws Error if not initialized or language unsupported
   */
  getLanguage(language: Language): TSLanguage {
    if (!this.initialized) {
      throw new Error('ParserManager not initialized — call initialize() first');
    }
    const lang = this.languages.get(language);
    if (!lang) {
      throw new Error(`Unsupported language: ${language}`);
    }
    return lang;
  }

  /**
   * Get parser for language
   *
   * Returns cached parser if exists, creates new parser if first time.
   * Each language has separate parser (cannot share).
   *
   * @param language - Language to parse
   * @returns TSParser instance with language set
   *
   * @throws Error if not initialized or language unsupported
   */
  getParser(language: Language): TSParser {
    if (!this.initialized) {
      throw new Error('ParserManager not initialized — call initialize() first');
    }

    if (!this.parsers.has(language)) {
      const parser = new TSParser();
      const lang = this.languages.get(language);
      if (!lang) {
        throw new Error(`Unsupported language: ${language}`);
      }
      parser.setLanguage(lang);
      this.parsers.set(language, parser);
    }
    return this.parsers.get(language)!;
  }

  /**
   * Reset parsers (for testing)
   *
   * Clears parser cache. Useful in tests to ensure clean state.
   * NOTE: Does not reset initialized flag - grammars stay loaded.
   */
  reset(): void {
    this.parsers.clear();
  }

  /**
   * Full reset including initialization state (for testing)
   *
   * Clears parser cache AND resets initialization state.
   * After calling this, initialize() must be called again before parsing.
   */
  resetFull(): void {
    this.parsers.clear();
    this.languages.clear();
    this.initialized = false;
  }
}

// Export singleton instance for convenience
export const parserManager = ParserManager.getInstance();

/**
 * Detect language from file extension
 *
 * Maps file extensions to tree-sitter language parser names.
 *
 * CRITICAL: .tsx uses 'tsx' grammar (not 'typescript') - separate grammars
 *
 * @param filePath - File path with extension
 * @returns Language string or null if unsupported
 *
 * Supported extensions:
 * - .py → python
 * - .ts → typescript
 * - .tsx → tsx (DIFFERENT from typescript)
 * - .js, .jsx → javascript
 * - .go → go
 *
 * @example
 * ```typescript
 * detectLanguage('app/main.py')      // → 'python'
 * detectLanguage('src/app.tsx')      // → 'tsx' (not 'typescript')
 * detectLanguage('src/index.ts')     // → 'typescript'
 * detectLanguage('server.js')        // → 'javascript'
 * detectLanguage('README.md')        // → null (unsupported)
 * ```
 */
export function detectLanguage(filePath: string): Language | null {
  const ext = filePath.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'py':
      return 'python';

    case 'ts':
      return 'typescript';

    case 'tsx':
      return 'tsx';  // Separate grammar from typescript

    case 'js':
    case 'jsx':
      return 'javascript';  // JSX uses JavaScript parser

    case 'go':
      return 'go';

    default:
      return null;  // Unsupported extension
  }
}

/**
 * Check if function is async
 *
 * Walks up AST to parent function definition, checks for async keyword.
 *
 * @param node - Function name node
 * @returns true if function has async keyword
 */
function checkIfAsync(node: TSNode): boolean {
  let current: TSNode | null = node.parent;

  while (current) {
    // Check if we're at function definition level
    if (
      current.type === 'function_definition' ||  // Python
      current.type === 'function_declaration' ||    // TypeScript/JavaScript
      current.type === 'arrow_function' // Arrow functions
    ) {
      // Look for async keyword in children
      for (let i = 0; i < current.childCount; i++) {
        const child = current.child(i);
        if (child && child.type === 'async') {
          return true;
        }
      }
      break;  // Found function definition, stop searching
    }
    current = current.parent;
  }

  return false;
}

/**
 * Extract functions from AST tree
 *
 * Uses query API to find all function definitions, extracts:
 * - Function name
 * - Line number
 * - Async flag
 * - Decorators (extracted separately, linked later)
 *
 * @param tree - Parsed syntax tree
 * @param sourceCode - Source code string (for node.text context)
 * @param language - Language being parsed
 * @returns Array of FunctionInfo objects
 *
 * @example
 * ```typescript
 * const tree = parser.parse(code);
 * const functions = extractFunctions(tree, code, 'python');
 * // → [{ name: 'hello', line: 1, async: false, decorators: [] }]
 * ```
 */
export function extractFunctions(
  tree: Tree,
  sourceCode: string,
  language: string
): FunctionInfo[] {
  try {
    const tsLang = parserManager.getLanguage(language as Language);
    const query = queryCache.getQuery(language as Language, 'functions', tsLang);
    const captures = query.captures(tree.rootNode);

    const functions: FunctionInfo[] = [];
    const seen = new Set<string>();  // Deduplicate by name:line

    for (const capture of captures) {
      // Filter to name captures (ignore params, other captures)
      const isNameCapture =
        capture.name === 'function.name' ||
        capture.name === 'async.name' ||
        capture.name === 'method.name' ||
        capture.name === 'name';

      if (!isNameCapture) {
        continue;
      }

      const node = capture.node;
      const name = node.text;
      const line = node.startPosition.row + 1;  // Convert 0-indexed to 1-indexed
      const key = `${name}:${line}`;

      // Skip if already processed (multiple captures can match same function)
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);

      functions.push({
        name,
        line,
        async: checkIfAsync(node),  // Check parent for async keyword
        decorators: [],  // Will be populated by linkDecorators() later
      });
    }

    return functions;
  } catch (_error) {
    // Query might not exist for this language
    return [];
  }
}

/**
 * Extract superclass names from class node
 *
 * @param classNode - Class name node from query capture
 * @returns Array of superclass names
 */
function extractSuperclasses(classNode: TSNode): string[] {
  const superclasses: string[] = [];
  let current: TSNode | null = classNode.parent;

  while (current) {
    if (
      current.type === 'class_definition' ||  // Python
      current.type === 'class_declaration'    // TypeScript/JavaScript
    ) {
      // Python: superclasses in argument_list
      // TypeScript: superclass in heritage clause
      for (let i = 0; i < current.childCount; i++) {
        const child = current.child(i);
        if (child && (child.type === 'argument_list' || child.type === 'class_heritage')) {
          // Extract identifier nodes from arguments/heritage
          for (let j = 0; j < child.childCount; j++) {
            const c = child.child(j);
            if (c && (c.type === 'identifier' || c.type === 'type_identifier')) {
              superclasses.push(c.text);
            }
          }
        }
      }
      break;
    }
    current = current.parent;
  }

  return superclasses;
}

/**
 * Extract method names from class
 *
 * @param classNode - Class name node
 * @returns Array of method names
 */
function extractMethods(classNode: TSNode): string[] {
  const methods: string[] = [];
  let current: TSNode | null = classNode.parent;

  while (current) {
    if (
      current.type === 'class_definition' ||
      current.type === 'class_declaration'
    ) {
      // Find class body
      let body: TSNode | null = null;
      for (let i = 0; i < current.childCount; i++) {
        const c = current.child(i);
        if (c && (c.type === 'block' || c.type === 'class_body')) {
          body = c;
          break;
        }
      }

      if (body) {
        // Extract function/method definitions from body
        for (let i = 0; i < body.childCount; i++) {
          const child = body.child(i);
          if (
            child &&
            (child.type === 'function_definition' ||  // Python
             child.type === 'method_definition')      // TypeScript/JavaScript
          ) {
            for (let j = 0; j < child.childCount; j++) {
              const nameNode = child.child(j);
              if (nameNode && (nameNode.type === 'identifier' || nameNode.type === 'property_identifier')) {
                methods.push(nameNode.text);
                break;
              }
            }
          }
        }
      }
      break;
    }
    current = current.parent;
  }

  return methods;
}

/**
 * Extract classes from AST tree
 *
 * @param tree - Parsed syntax tree
 * @param sourceCode - Source code string
 * @param language - Language being parsed
 * @returns Array of ClassInfo objects
 *
 * @example Python
 * ```typescript
 * const tree = parser.parse('class User(BaseModel): pass');
 * const classes = extractClasses(tree, code, 'python');
 * // → [{ name: 'User', line: 1, superclasses: ['BaseModel'], methods: [], decorators: [] }]
 * ```
 */
export function extractClasses(
  tree: Tree,
  sourceCode: string,
  language: string
): ClassInfo[] {
  try {
    const tsLang = parserManager.getLanguage(language as Language);
    const query = queryCache.getQuery(language as Language, 'classes', tsLang);
    const captures = query.captures(tree.rootNode);

    const classes: ClassInfo[] = [];
    const seen = new Set<string>();

    for (const capture of captures) {
      const isNameCapture =
        capture.name === 'class.name' ||
        capture.name === 'struct.name' || // Go structs
        capture.name === 'name';

      if (!isNameCapture) {
        continue;
      }

      const node = capture.node;
      const name = node.text;
      const line = node.startPosition.row + 1;
      const key = `${name}:${line}`;

      if (seen.has(key)) {
        continue;
      }
      seen.add(key);

      classes.push({
        name,
        line,
        superclasses: extractSuperclasses(node),
        methods: extractMethods(node),
        decorators: [],  // Populated by linkDecorators() later
      });
    }

    return classes;
  } catch (_error) {
    return [];
  }
}

/**
 * Extract imports from AST tree
 *
 * @param tree - Parsed syntax tree
 * @param sourceCode - Source code string
 * @param language - Language being parsed
 * @returns Array of ImportInfo objects
 *
 * @example Python
 * ```typescript
 * const tree = parser.parse('from fastapi import FastAPI');
 * const imports = extractImports(tree, code, 'python');
 * // → [{ module: 'fastapi', names: [], line: 1 }]
 * ```
 */
export function extractImports(
  tree: Tree,
  sourceCode: string,
  language: string
): ImportInfo[] {
  try {
    const tsLang = parserManager.getLanguage(language as Language);
    const query = queryCache.getQuery(language as Language, 'imports', tsLang);
    const captures = query.captures(tree.rootNode);

    const imports: ImportInfo[] = [];
    const seen = new Set<string>();

    for (const capture of captures) {
      const isModuleCapture =
        capture.name === 'import.module' ||
        capture.name === 'import.path' ||
        capture.name === 'module';

      if (!isModuleCapture) {
        continue;
      }

      const node = capture.node;
      let moduleName = node.text;

      // Go imports are quoted strings ("fmt") - remove quotes
      if (language === 'go' && moduleName.startsWith('"')) {
        moduleName = moduleName.slice(1, -1);
      }

      // JavaScript imports include quotes - remove them
      if ((language === 'javascript' || language === 'typescript' || language === 'tsx') &&
          (moduleName.startsWith('"') || moduleName.startsWith("'"))) {
        moduleName = moduleName.slice(1, -1);
      }

      const line = node.startPosition.row + 1;
      const key = `${moduleName}:${line}`;

      if (seen.has(key)) {
        continue;
      }
      seen.add(key);

      imports.push({
        module: moduleName,
        names: [],  // Simplified - just capture module names for now
        line,
      });
    }

    return imports;
  } catch (_error) {
    return [];
  }
}

/**
 * Extract decorators from AST tree
 *
 * Handles both simple decorators (@dataclass) and complex decorators (@app.get("/users")).
 *
 * @param tree - Parsed syntax tree
 * @param sourceCode - Source code string
 * @param language - Language being parsed
 * @returns Array of DecoratorInfo objects
 *
 * @example Python FastAPI
 * ```typescript
 * const tree = parser.parse('@app.get("/users")\\ndef get_users(): pass');
 * const decorators = extractDecorators(tree, code, 'python');
 * // → [{ name: 'app.get', arguments: ['"/users"'], line: 1 }]
 * ```
 */
export function extractDecorators(
  tree: Tree,
  sourceCode: string,
  language: string
): DecoratorInfo[] {
  // Only Python and TypeScript have decorators
  if (language !== 'python' && language !== 'typescript' && language !== 'tsx') {
    return [];
  }

  try {
    const tsLang = parserManager.getLanguage(language as Language);
    const query = queryCache.getQuery(language as Language, 'decorators', tsLang);
    const captures = query.captures(tree.rootNode);

    const decorators: DecoratorInfo[] = [];
    const processed = new Set<number>(); // Track processed lines

    for (const capture of captures) {
      const node = capture.node;
      const line = node.startPosition.row + 1;

      // Skip if already processed this line
      if (processed.has(line)) {
        continue;
      }

      let decoratorName = '';
      let decoratorArgs: string[] = [];

      // Handle different capture types
      if (capture.name === 'decorator.name') {
        // Simple decorator: @dataclass
        decoratorName = node.text;
        processed.add(line);
      } else if (capture.name === 'decorator.object') {
        // Attribute decorator: @app.get - combine with method
        const methodCapture = captures.find(
          (c: any) => c.name === 'decorator.method' && c.node.startPosition.row === node.startPosition.row
        );
        if (methodCapture) {
          decoratorName = `${node.text}.${methodCapture.node.text}`;
          processed.add(line);
        }
      } else {
        continue;
      }

      // Look for arguments on same line
      const argsCapture = captures.find(
        (c: any) => c.name === 'decorator.args' && c.node.startPosition.row === (line - 1)
      );
      if (argsCapture) {
        decoratorArgs = [argsCapture.node.text];
      }

      if (decoratorName) {
        decorators.push({
          name: decoratorName,
          arguments: decoratorArgs,
          line,
        });
      }
    }

    return decorators;
  } catch (_error) {
    return [];
  }
}

/**
 * Link decorators to functions based on line proximity
 *
 * Decorators appear immediately before functions/classes they decorate.
 * Match by line number (decorator.line should be function.line - 1 or similar).
 *
 * @param functions - Extracted functions
 * @param decorators - Extracted decorators
 * @returns Functions with decorators field populated
 */
function linkDecoratorsToFunctions(
  functions: FunctionInfo[],
  decorators: DecoratorInfo[]
): FunctionInfo[] {
  return functions.map(func => {
    // Find decorators within 5 lines before function (handles multi-line decorators)
    const functionDecorators = decorators.filter(
      dec => dec.line >= func.line - 5 && dec.line < func.line
    );

    return {
      ...func,
      decorators: functionDecorators.map(dec =>
        dec.arguments.length > 0
          ? `${dec.name}(${dec.arguments.join(', ')})`
          : dec.name
      ),
    };
  });
}

/**
 * Link decorators to classes
 *
 * @param classes - Extracted classes
 * @param decorators - Extracted decorators
 * @returns Classes with decorators field populated
 */
function linkDecoratorsToClasses(
  classes: ClassInfo[],
  decorators: DecoratorInfo[]
): ClassInfo[] {
  return classes.map(cls => {
    const classDecorators = decorators.filter(
      dec => dec.line >= cls.line - 5 && dec.line < cls.line
    );

    return {
      ...cls,
      decorators: classDecorators.map(dec =>
        dec.arguments.length > 0
          ? `${dec.name}(${dec.arguments.join(', ')})`
          : dec.name
      ),
    };
  });
}

/**
 * Extract exports (TypeScript/JavaScript only)
 *
 * Simplified implementation - extracts export statements.
 *
 * @param tree - Parsed syntax tree
 * @param sourceCode - Source code
 * @param language - Language
 * @returns Array of ExportInfo objects
 */
function extractExports(
  tree: Tree,
  sourceCode: string,
  language: string
): ExportInfo[] {
  try {
    const tsLang = parserManager.getLanguage(language as Language);
    const query = queryCache.getQuery(language as Language, 'exports', tsLang);
    const captures = query.captures(tree.rootNode);

    return captures.slice(0, 10).map((capture: any) => ({
      name: capture.node.text.slice(0, 50),  // First 50 chars
      type: 'default' as const,
      line: capture.node.startPosition.row + 1,
    }));
  } catch {
    return [];  // Exports query optional
  }
}

/**
 * Count ERROR nodes in tree
 *
 * ERROR nodes indicate syntax errors (malformed code).
 * tree-sitter doesn't throw - returns tree with ERROR nodes.
 *
 * @param node - Root node or any node
 * @returns Count of ERROR nodes in subtree
 */
function countErrors(node: TSNode): number {
  let count = 0;

  if (node.type === 'ERROR') {
    count++;
  }

  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child) {
      count += countErrors(child);
    }
  }

  return count;
}

/**
 * Parse file and extract code elements using tree-sitter
 *
 * @param filePath - Absolute path to source file
 * @param language - Language to parse ('python' | 'typescript' | 'tsx' | 'javascript' | 'go')
 * @param cache - Optional ASTCache instance (CP2 will implement)
 * @returns ParsedFile with extracted functions, classes, imports, etc.
 *
 * Performance: ≤25ms per medium file (5KB), ≤150ms per large file (100KB)
 *
 * Implementation: CP1 (queries + extraction), CP2 (cache integration)
 *
 * @example
 * ```typescript
 * const parsed = await parseFile('/path/to/main.py', 'python');
 * console.log('Functions:', parsed.functions.length);
 * console.log('Classes:', parsed.classes.length);
 * ```
 */
export async function parseFile(
  filePath: string,
  language: string,
  cache?: ASTCache  // Cache now functional (CP2)
): Promise<ParsedFile> {
  // Check cache first (CP2 integration)
  if (cache) {
    const cached = await cache.get(filePath);
    if (cached) {
      // Cache hit - return cached data (fast path: 5-10ms)
      return {
        file: filePath,
        language,
        functions: cached.functions,
        classes: cached.classes,
        imports: cached.imports,
        exports: cached.exports,
        decorators: cached.decorators,
        parseTime: cached.parseTime,
        parseMethod: 'cached',
        errors: 0,  // Cached data was valid when stored
      };
    }
  }

  // Cache miss - parse file (slow path: 50-150ms)
  const content = await readFile(filePath);

  // Get parser for language
  const parser = parserManager.getParser(language as Language);

  // Parse code → tree
  const startTime = performance.now();
  const tree = parser.parse(content);
  const parseTime = performance.now() - startTime;

  // Handle parse failure (null tree)
  if (!tree) {
    return {
      file: filePath,
      language,
      functions: [],
      classes: [],
      imports: [],
      exports: undefined,
      decorators: undefined,
      parseTime,
      parseMethod: 'tree-sitter',
      errors: 1, // Parse failed entirely
    };
  }

  try {
    // Extract elements using queries (from CP1)
    let functions = extractFunctions(tree, content, language);
    let classes = extractClasses(tree, content, language);
    const imports = extractImports(tree, content, language);
    const decorators = extractDecorators(tree, content, language);

    // Link decorators to functions/classes
    functions = linkDecoratorsToFunctions(functions, decorators);
    classes = linkDecoratorsToClasses(classes, decorators);

    // Count ERROR nodes
    const errorCount = countErrors(tree.rootNode);

    const result: ParsedFile = {
      file: filePath,
      language,
      functions,
      classes,
      imports,
      exports: language === 'typescript' || language === 'javascript' || language === 'tsx'
        ? extractExports(tree, content, language)
        : undefined,
      decorators: language === 'python' || language === 'typescript' || language === 'tsx'
        ? decorators
        : undefined,
      parseTime,
      parseMethod: 'tree-sitter',
      errors: errorCount,
    };

    // Store in cache for next run (CP2 integration)
    if (cache) {
      const cacheData: any = {
        functions: result.functions,
        classes: result.classes,
        imports: result.imports,
        parseTime: result.parseTime,
      };

      if (result.exports !== undefined) {
        cacheData.exports = result.exports;
      }
      if (result.decorators !== undefined) {
        cacheData.decorators = result.decorators;
      }

      await cache.set(filePath, cacheData);
    }

    return result;
  } finally {
    // CRITICAL: Free WASM memory
    tree.delete();
  }
}

/**
 * Parse project files using tree-sitter
 *
 * Orchestrates: file sampling → parsing → caching
 *
 * @param projectRoot - Absolute path to project root
 * @param analysis - AnalysisResult with structure field
 * @param options - Options with maxFiles
 * @param options.maxFiles
 * @returns ParsedAnalysis or undefined if no structure
 *
 * @example
 * ```typescript
 * const analysis = await analyze(rootPath);
 * const parsed = await parseProjectFiles(rootPath, analysis, { maxFiles: 20 });
 * // → { files: ParsedFile[], totalParsed: 20, cacheHits: 15, cacheMisses: 5 }
 * ```
 */
export async function parseProjectFiles(
  projectRoot: string,
  analysis: AnalysisResult,
  options: { maxFiles?: number } = {}
): Promise<ParsedAnalysis | undefined> {
  // Require structure analysis for sampling
  if (!analysis.structure) {
    return undefined;
  }

  // Ensure parser is initialized
  if (!parserManager.isInitialized()) {
    await parserManager.initialize();
  }

  // Initialize cache
  const cache = new ASTCacheClass(projectRoot);

  // Sample files intelligently
  const filesToParse = await sampleFiles(projectRoot, analysis, {
    maxFiles: options.maxFiles ?? 20,
    minConfidence: 0.8,
    includeTests: false,
  });

  if (filesToParse.length === 0) {
    return {
      files: [],
      totalParsed: 0,
      cacheHits: 0,
      cacheMisses: 0,
    };
  }

  // Parse files sequentially (worker threads incompatible with WASM)
  const parsedFiles: ParsedFile[] = [];

  for (const relativeFile of filesToParse) {
    const absolutePath = joinPath(projectRoot, relativeFile);

    // Detect language from extension
    const language = detectLanguage(absolutePath);
    if (!language) {
      // Skip unsupported file types
      continue;
    }

    try {
      const parsed = await parseFile(absolutePath, language, cache);
      parsedFiles.push(parsed);
    } catch (_error) {
      // Parse failed - continue with other files
      continue;
    }
  }

  const stats = cache.getStats();

  return {
    files: parsedFiles,
    totalParsed: parsedFiles.length,
    cacheHits: stats.hits,
    cacheMisses: stats.misses,
  };
}
