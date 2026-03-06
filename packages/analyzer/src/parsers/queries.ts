/**
 * Tree-sitter query patterns for code extraction
 *
 * Simplified queries that focus on reliable extraction.
 * Complex patterns (decorators with args, etc.) can be added incrementally.
 */

import Parser from 'tree-sitter';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

// Load language grammars
const Python = require('tree-sitter-python');
const TypeScriptGrammar = require('tree-sitter-typescript');
const JavaScript = require('tree-sitter-javascript');
const Go = require('tree-sitter-go');

const { typescript, tsx } = TypeScriptGrammar;

type Language = 'python' | 'typescript' | 'tsx' | 'javascript' | 'go';

/**
 * Query patterns organized by language and query type
 */
export const QUERIES: Record<Language, Record<string, string>> = {
  python: {
    functions: `(function_definition name: (identifier) @function.name)`,
    classes: `(class_definition name: (identifier) @class.name)`,
    decorators: `(decorator) @decorator`,
    imports: `(import_from_statement module_name: (dotted_name) @import.module)
(import_statement name: (dotted_name) @import.module)`,
  },

  typescript: {
    functions: `(function_declaration name: (identifier) @function.name)
(method_definition name: (property_identifier) @method.name)`,
    classes: `(class_declaration name: (type_identifier) @class.name)`,
    interfaces: `(interface_declaration name: (type_identifier) @interface.name)`,
    exports: `(export_statement) @export`,
    decorators: `(decorator) @decorator`,
    imports: `(import_statement source: (string) @import.module)`,
  },

  tsx: {
    functions: `(function_declaration name: (identifier) @function.name)
(method_definition name: (property_identifier) @method.name)`,
    classes: `(class_declaration name: (type_identifier) @class.name)`,
    interfaces: `(interface_declaration name: (type_identifier) @interface.name)`,
    exports: `(export_statement) @export`,
    decorators: `(decorator) @decorator`,
    imports: `(import_statement source: (string) @import.module)`,
  },

  javascript: {
    functions: `(function_declaration name: (identifier) @function.name)
(method_definition name: (property_identifier) @method.name)`,
    classes: `(class_declaration name: (identifier) @class.name)`,
    exports: `(export_statement) @export`,
    imports: `(import_statement source: (string) @import.module)`,
  },

  go: {
    functions: `(function_declaration name: (identifier) @function.name)`,
    methods: `(method_declaration name: (field_identifier) @method.name)`,
    structs: `(type_spec name: (type_identifier) @struct.name type: (struct_type))`,
    imports: `(import_spec path: (interpreted_string_literal) @import.path)`,
  },
};

/**
 * Valid query types per language
 */
export type QueryType =
  | 'functions'
  | 'classes'
  | 'imports'
  | 'decorators'
  | 'exports'
  | 'interfaces'
  | 'methods'
  | 'structs';

/**
 * Query compilation cache
 *
 * Compiles S-expression queries once per language+type, caches for reuse.
 */
export class QueryCache {
  private compiled = new Map<string, any>();

  /**
   * Get compiled query for language and query type
   *
   * @param language - Language to query
   * @param queryType - Type of query
   * @returns Compiled query object
   */
  getQuery(language: Language, queryType: QueryType): any {
    const key = `${language}:${queryType}`;

    if (!this.compiled.has(key)) {
      const queryString = QUERIES[language]?.[queryType];

      if (!queryString) {
        throw new Error(`No query defined for ${key}`);
      }

      // Get language grammar
      let languageGrammar: any;
      switch (language) {
        case 'python':
          languageGrammar = Python;
          break;
        case 'typescript':
          languageGrammar = typescript;
          break;
        case 'tsx':
          languageGrammar = tsx;
          break;
        case 'javascript':
          languageGrammar = JavaScript;
          break;
        case 'go':
          languageGrammar = Go;
          break;
        default:
          throw new Error(`Unsupported language: ${language}`);
      }

      // Create query using Parser.Query constructor
      const compiled = new (Parser as any).Query(languageGrammar, queryString);
      this.compiled.set(key, compiled);
    }

    return this.compiled.get(key)!;
  }

  clearCache(): void {
    this.compiled.clear();
  }

  getCacheSize(): number {
    return this.compiled.size;
  }
}

// Export singleton instance
export const queryCache = new QueryCache();
