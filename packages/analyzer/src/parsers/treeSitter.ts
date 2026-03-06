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

import type { ParsedFile } from '../types/parsed.js';

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
  cache?: any  // ASTCache type from CP2
): Promise<ParsedFile> {
  // TODO: CP1 - Implement tree-sitter parsing with queries
  return {
    file: filePath,
    language,
    functions: [],
    classes: [],
    imports: [],
    exports: [],
    decorators: [],
    parseTime: 0,
    parseMethod: 'tree-sitter',
    errors: 0,
  };
}
