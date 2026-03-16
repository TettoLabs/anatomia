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

    // STEP_2.1 pattern detection queries
    tryExcept: `(try_statement
  (block) @try.body
  (except_clause) @except
)`,

    baseModelClass: `(class_definition
  name: (identifier) @class.name
  (argument_list
    (identifier) @superclass
  )
)`,

    specificImport: `(import_from_statement
  module_name: (dotted_name) @module
  (import_names
    (imported_name (identifier) @name)
  )
)`,

    asyncDef: `(function_definition
  name: (identifier) @function.name
)`,

    // STEP_2.2 convention detection queries (CP0)
    variables: `(assignment left: (identifier) @variable.name)`,
  },

  typescript: {
    functions: `(function_declaration name: (identifier) @function.name)
(method_definition name: (property_identifier) @method.name)`,
    classes: `(class_declaration name: (type_identifier) @class.name)`,
    interfaces: `(interface_declaration name: (type_identifier) @interface.name)`,
    exports: `(export_statement) @export`,
    decorators: `(decorator) @decorator`,
    imports: `(import_statement source: (string) @import.module)`,

    // STEP_2.1 pattern detection queries
    tryCatch: `(try_statement
  (block) @try.body
  (catch_clause) @catch
)`,

    memberCall: `(call_expression
  function: (member_expression
    object: (identifier) @obj
    property: (property_identifier) @method
  )
)`,

    namedImport: `(import_statement
  source: (string) @source
  (import_clause
    (named_imports
      (import_specifier
        (identifier) @name
      )
    )
  )
)`,
  },

  tsx: {
    functions: `(function_declaration name: (identifier) @function.name)
(method_definition name: (property_identifier) @method.name)`,
    classes: `(class_declaration name: (type_identifier) @class.name)`,
    interfaces: `(interface_declaration name: (type_identifier) @interface.name)`,
    exports: `(export_statement) @export`,
    decorators: `(decorator) @decorator`,
    imports: `(import_statement source: (string) @import.module)`,

    // STEP_2.1 pattern detection queries (same as TypeScript)
    tryCatch: `(try_statement
  (block) @try.body
  (catch_clause) @catch
)`,

    memberCall: `(call_expression
  function: (member_expression
    object: (identifier) @obj
    property: (property_identifier) @method
  )
)`,

    namedImport: `(import_statement
  source: (string) @source
  (import_clause
    (named_imports
      (import_specifier
        (identifier) @name
      )
    )
  )
)`,

    // STEP_2.2 convention detection queries (CP0)
    variables: `(lexical_declaration
  (variable_declarator
    name: (identifier) @variable.name))`,
  },

  javascript: {
    functions: `(function_declaration name: (identifier) @function.name)
(method_definition name: (property_identifier) @method.name)`,
    classes: `(class_declaration name: (identifier) @class.name)`,
    exports: `(export_statement) @export`,
    imports: `(import_statement source: (string) @import.module)`,

    // STEP_2.1 pattern detection queries
    tryCatch: `(try_statement
  (block) @try.body
  (catch_clause) @catch
)`,

    memberCall: `(call_expression
  function: (member_expression
    object: (identifier) @obj
    property: (property_identifier) @method
  )
)`,

    // STEP_2.2 convention detection queries (CP0)
    variables: `(variable_declaration
  (variable_declarator
    name: (identifier) @variable.name))`,
  },

  go: {
    functions: `(function_declaration name: (identifier) @function.name)`,
    methods: `(method_declaration name: (field_identifier) @method.name)`,
    structs: `(type_spec name: (type_identifier) @struct.name type: (struct_type))`,
    imports: `(import_spec path: (interpreted_string_literal) @import.path)`,

    // STEP_2.1 pattern detection queries
    ifErrNotNil: `(if_statement
  condition: (binary_expression
    left: (identifier) @var
    operator: "!="
    right: (identifier) @nil
  )
)`,

    structWithTags: `(type_spec
  name: (type_identifier) @struct.name
  type: (struct_type
    (field_declaration
      tag: (raw_string_literal) @tag
    )
  )
)`,

    // STEP_2.2 convention detection queries (CP0)
    variables: `(var_declaration
  (var_spec
    name: (identifier) @variable.name))`,

    shortVars: `(short_var_declaration
  left: (expression_list
    (identifier) @variable.name))`,
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
  | 'structs'
  // STEP_2.1 pattern detection queries
  | 'tryExcept'      // Python
  | 'baseModelClass' // Python
  | 'specificImport' // Python
  | 'asyncDef'       // Python
  | 'tryCatch'       // TypeScript/JavaScript
  | 'memberCall'     // TypeScript/JavaScript
  | 'namedImport'    // TypeScript
  | 'ifErrNotNil'    // Go
  | 'structWithTags' // Go
  // STEP_2.2 convention detection queries (CP0)
  | 'variables'      // All languages
  | 'shortVars';     // Go only

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
