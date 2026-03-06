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
 * - CP1: Query system and extraction (planned)
 * - CP2: Caching layer (planned)
 * - CP3: Integration with analyze() (planned)
 */

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

// Import using require for native modules (they use CommonJS)
import Parser from 'tree-sitter';
const Python = require('tree-sitter-python');
const TypeScriptGrammar = require('tree-sitter-typescript');
const JavaScript = require('tree-sitter-javascript');
const Go = require('tree-sitter-go');

// Extract typescript and tsx grammars
const { typescript, tsx } = TypeScriptGrammar;

import type { Tree, SyntaxNode } from 'tree-sitter';
import type { ParsedFile, FunctionInfo, ClassInfo, ImportInfo, DecoratorInfo, ExportInfo } from '../types/parsed.js';
import { queryCache } from './queries.js';
import { readFile } from '../utils/file.js';
import type { ASTCache } from '../cache/astCache.js';

export type Language = 'python' | 'typescript' | 'tsx' | 'javascript' | 'go';

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
 * @example
 * ```typescript
 * const manager = ParserManager.getInstance();
 * const pythonParser = manager.getParser('python');
 *
 * // Reuse parser for multiple files
 * const tree1 = pythonParser.parse(file1Code);
 * const tree2 = pythonParser.parse(file2Code);
 * ```
 */
export class ParserManager {
  private static instance: ParserManager;
  private parsers = new Map<Language, Parser>();

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
   * Get parser for language
   *
   * Returns cached parser if exists, creates new parser if first time.
   * Each language has separate parser (cannot share).
   *
   * @param language - Language to parse
   * @returns Parser instance with language set
   *
   * @throws Error if language unsupported
   */
  getParser(language: Language): Parser {
    if (!this.parsers.has(language)) {
      const parser = new Parser();
      parser.setLanguage(this.getGrammar(language));
      this.parsers.set(language, parser);
    }
    return this.parsers.get(language)!;
  }

  /**
   * Load grammar for language
   *
   * CRITICAL: tree-sitter-typescript exports TWO grammars (typescript and tsx)
   * Other grammars export single default grammar.
   *
   * @param language - Language name
   * @returns Grammar object for parser.setLanguage()
   */
  private getGrammar(language: Language): any {
    switch (language) {
      case 'python':
        return Python;
      case 'typescript':
        return typescript;  // From named import
      case 'tsx':
        return tsx;  // From named import (DIFFERENT from typescript)
      case 'javascript':
        return JavaScript;
      case 'go':
        return Go;
      default:
        throw new Error(`Unsupported language: ${language}`);
    }
  }

  /**
   * Reset parsers (for testing)
   *
   * Clears parser cache. Useful in tests to ensure clean state.
   */
  reset(): void {
    this.parsers.clear();
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
function checkIfAsync(node: SyntaxNode): boolean {
  let current: SyntaxNode | null = node.parent;

  while (current) {
    // Check if we're at function definition level
    if (
      current.type === 'function_definition' ||  // Python
      current.type === 'function_declaration' ||    // TypeScript/JavaScript
      current.type === 'arrow_function' // Arrow functions
    ) {
      // Look for async keyword in children
      for (const child of current.children) {
        if (child.type === 'async') {
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
    const query = queryCache.getQuery(language as any, 'functions');
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
  } catch (error) {
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
function extractSuperclasses(classNode: SyntaxNode): string[] {
  const superclasses: string[] = [];
  let current: SyntaxNode | null = classNode.parent;

  while (current) {
    if (
      current.type === 'class_definition' ||  // Python
      current.type === 'class_declaration'    // TypeScript/JavaScript
    ) {
      // Python: superclasses in argument_list
      // TypeScript: superclass in heritage clause
      for (const child of current.children) {
        if (child.type === 'argument_list' || child.type === 'class_heritage') {
          // Extract identifier nodes from arguments/heritage
          const identifiers = child.children.filter((c: SyntaxNode) =>
            c.type === 'identifier' || c.type === 'type_identifier'
          );
          superclasses.push(...identifiers.map(id => id.text));
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
function extractMethods(classNode: SyntaxNode): string[] {
  const methods: string[] = [];
  let current: SyntaxNode | null = classNode.parent;

  while (current) {
    if (
      current.type === 'class_definition' ||
      current.type === 'class_declaration'
    ) {
      // Find class body
      const body = current.children.find((c: SyntaxNode) => c.type === 'block' || c.type === 'class_body');
      if (body) {
        // Extract function/method definitions from body
        for (const child of body.children) {
          if (
            child.type === 'function_definition' ||  // Python
            child.type === 'method_definition'       // TypeScript/JavaScript
          ) {
            const nameNode = child.children.find((c: SyntaxNode) =>
              c.type === 'identifier' || c.type === 'property_identifier'
            );
            if (nameNode) {
              methods.push(nameNode.text);
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
    const query = queryCache.getQuery(language as any, 'classes');
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
  } catch (error) {
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
    const query = queryCache.getQuery(language as any, 'imports');
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
  } catch (error) {
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
    const query = queryCache.getQuery(language as any, 'decorators');
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
  } catch (error) {
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
    const query = queryCache.getQuery(language as any, 'exports');
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
function countErrors(node: SyntaxNode): number {
  let count = 0;

  if (node.type === 'ERROR') {
    count++;
  }

  for (const child of node.children) {
    count += countErrors(child);
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
  const parser = parserManager.getParser(language as any);

  // Parse code → tree
  const startTime = performance.now();
  const tree = parser.parse(content);
  const parseTime = performance.now() - startTime;

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
}
