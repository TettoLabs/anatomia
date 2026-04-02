import { z } from 'zod';

/**
 * Function information extracted from AST
 *
 * Includes function name, line number, async flag, and decorators.
 *
 * @example Python FastAPI
 * ```typescript
 * {
 *   name: 'get_users',
 *   line: 15,
 *   async: true,
 *   decorators: ['app.get("/users")']
 * }
 * ```
 *
 * @example TypeScript NestJS
 * ```typescript
 * {
 *   name: 'findAll',
 *   line: 23,
 *   async: false,
 *   decorators: ['Get()', 'UseGuards(AuthGuard)']
 * }
 * ```
 */
export const FunctionInfoSchema = z.object({
  name: z.string(),                   // Function name
  line: z.number(),                   // Line number in file
  async: z.boolean(),                 // true if async function
  decorators: z.array(z.string()),    // Decorator strings (e.g., '@app.get("/users")')
});

export type FunctionInfo = z.infer<typeof FunctionInfoSchema>;

/**
 * Class information extracted from AST
 *
 * Includes class name, superclasses, methods, and decorators.
 *
 * @example Python Pydantic
 * ```typescript
 * {
 *   name: 'User',
 *   line: 10,
 *   superclasses: ['BaseModel'],
 *   methods: ['validate_email', 'to_dict'],
 *   decorators: []
 * }
 * ```
 *
 * @example TypeScript NestJS
 * ```typescript
 * {
 *   name: 'UserService',
 *   line: 45,
 *   superclasses: [],
 *   methods: ['findAll', 'findOne', 'create'],
 *   decorators: ['Injectable()']
 * }
 * ```
 */
export const ClassInfoSchema = z.object({
  name: z.string(),                   // Class name
  line: z.number(),                   // Line number
  superclasses: z.array(z.string()),  // Parent classes
  methods: z.array(z.string()),       // Method names
  decorators: z.array(z.string()),    // Class decorators
});

export type ClassInfo = z.infer<typeof ClassInfoSchema>;

/**
 * Import information extracted from AST
 *
 * Tracks which modules are imported.
 *
 * @example Python
 * ```typescript
 * {
 *   module: 'fastapi',
 *   names: ['FastAPI', 'HTTPException'],
 *   line: 1
 * }
 * ```
 *
 * @example TypeScript
 * ```typescript
 * {
 *   module: '@nestjs/common',
 *   names: ['Controller', 'Get', 'Post'],
 *   line: 1
 * }
 * ```
 */
export const ImportInfoSchema = z.object({
  module: z.string(),                 // Module name (e.g., 'fastapi', 'express')
  names: z.array(z.string()),         // Imported names
  line: z.number(),                   // Line number
});

export type ImportInfo = z.infer<typeof ImportInfoSchema>;

/**
 * Export information extracted from AST (TypeScript/JavaScript only)
 *
 * Tracks what the file exports.
 *
 * @example
 * ```typescript
 * {
 *   name: 'UserController',
 *   type: 'class',
 *   line: 50
 * }
 * ```
 */
export const ExportInfoSchema = z.object({
  name: z.string(),                   // Export name
  type: z.enum(['function', 'class', 'const', 'default']),  // Export type
  line: z.number(),                   // Line number
});

export type ExportInfo = z.infer<typeof ExportInfoSchema>;

/**
 * Decorator information extracted from AST
 *
 * Captures decorator name and arguments.
 *
 * @example Python FastAPI
 * ```typescript
 * {
 *   name: 'app.get',
 *   arguments: ['"/users"'],
 *   line: 14
 * }
 * ```
 *
 * @example TypeScript NestJS
 * ```typescript
 * {
 *   name: 'Controller',
 *   arguments: ['"users"'],
 *   line: 10
 * }
 * ```
 */
export const DecoratorInfoSchema = z.object({
  name: z.string(),                   // Decorator name (e.g., 'app.get', 'Controller')
  arguments: z.array(z.string()),     // Decorator arguments
  line: z.number(),                   // Line number
});

export type DecoratorInfo = z.infer<typeof DecoratorInfoSchema>;

/**
 * Parsed file result from tree-sitter extraction
 *
 * Contains all extracted code elements from one source file.
 *
 * @example
 * ```typescript
 * {
 *   file: 'app/main.py',
 *   language: 'python',
 *   functions: [{ name: 'startup', line: 12, async: true, decorators: [] }],
 *   classes: [{ name: 'User', line: 20, superclasses: ['BaseModel'], methods: [], decorators: [] }],
 *   imports: [{ module: 'fastapi', names: ['FastAPI'], line: 1 }],
 *   exports: [],  // Python doesn't have explicit exports
 *   decorators: [{ name: 'app.on_event', arguments: ['"startup"'], line: 11 }],
 *   parseTime: 45,
 *   parseMethod: 'tree-sitter',
 *   errors: 0
 * }
 * ```
 */
export const ParsedFileSchema = z.object({
  file: z.string(),                   // File path (relative to project root)
  language: z.string(),               // 'python' | 'typescript' | 'tsx' | 'javascript' | 'go'
  functions: z.array(FunctionInfoSchema),    // Extracted functions
  classes: z.array(ClassInfoSchema),         // Extracted classes
  imports: z.array(ImportInfoSchema),        // Extracted imports
  exports: z.array(ExportInfoSchema).optional(),     // TypeScript/JavaScript only
  decorators: z.array(DecoratorInfoSchema).optional(), // Python/TypeScript only
  parseTime: z.number(),              // Milliseconds to parse + extract
  parseMethod: z.enum(['tree-sitter', 'regex', 'cached']),  // How data was obtained
  errors: z.number(),                 // ERROR node count from tree
});

export type ParsedFile = z.infer<typeof ParsedFileSchema>;

/**
 * Complete parsed analysis result
 *
 * Contains parsed data from multiple files.
 *
 * @example
 * ```typescript
 * {
 *   files: [ParsedFile, ParsedFile, ...],
 *   totalParsed: 20,
 *   cacheHits: 15,
 *   cacheMisses: 5
 * }
 * ```
 */
export const ParsedAnalysisSchema = z.object({
  files: z.array(ParsedFileSchema),   // All parsed files
  totalParsed: z.number(),            // Total files parsed
  cacheHits: z.number(),              // Cache hits (for monitoring)
  cacheMisses: z.number(),            // Cache misses
});

export type ParsedAnalysis = z.infer<typeof ParsedAnalysisSchema>;

/**
 * Helper to create empty ParsedAnalysis (for tests, errors)
 */
export function createEmptyParsedAnalysis(): ParsedAnalysis {
  return {
    files: [],
    totalParsed: 0,
    cacheHits: 0,
    cacheMisses: 0,
  };
}
