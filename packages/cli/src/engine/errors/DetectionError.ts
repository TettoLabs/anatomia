/**
 * Error handling for Anatomia detection engine
 *
 * Based on research:
 * - Vercel CLI error structure
 * - Next.js error patterns
 * - Node.js Error best practices
 */

/**
 * Structured error object for detection
 */
export interface DetectionError {
  /** Machine-readable error code */
  code: string;

  /** User-friendly message */
  message: string;

  /** Severity level */
  severity: 'error' | 'warning' | 'info';

  /** File that caused error (optional) */
  file?: string | undefined;

  /** Line number in file (optional) */
  line?: number | undefined;

  /** How to resolve (optional) */
  suggestion?: string | undefined;

  /** Detection phase that failed (optional) */
  phase?: string | undefined;

  /** Underlying error (optional) */
  cause?: Error | undefined;

  /** When error occurred */
  timestamp: Date;
}

/**
 * Custom error class for detection engine
 */
export class DetectionEngineError extends Error {
  code: string;
  severity: 'error' | 'warning' | 'info';
  file?: string | undefined;
  line?: number | undefined;
  suggestion?: string | undefined;
  phase?: string | undefined;

  constructor(
    code: string,
    message: string,
    severity: 'error' | 'warning' | 'info' = 'error',
    options?: {
      file?: string;
      line?: number;
      suggestion?: string;
      phase?: string;
      cause?: Error;
    }
  ) {
    super(message);
    this.name = 'DetectionEngineError';
    this.code = code;
    this.severity = severity;
    this.file = options?.file;
    this.line = options?.line;
    this.suggestion = options?.suggestion;
    this.phase = options?.phase;

    if (options?.cause) {
      this.cause = options.cause;
    }

    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert to DetectionError interface
   */
  toDetectionError(): DetectionError {
    const error: DetectionError = {
      code: this.code,
      message: this.message,
      severity: this.severity,
      timestamp: new Date(),
    };

    if (this.file) error.file = this.file;
    if (this.line) error.line = this.line;
    if (this.suggestion) error.suggestion = this.suggestion;
    if (this.phase) error.phase = this.phase;
    if (this.cause) error.cause = this.cause as Error;

    return error;
  }
}

/**
 * Error codes registry
 */
export const ERROR_CODES = {
  // File operations
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  IS_DIRECTORY: 'IS_DIRECTORY',
  ENCODING_ERROR: 'ENCODING_ERROR',

  // Parsing
  INVALID_JSON: 'INVALID_JSON',
  INVALID_YAML: 'INVALID_YAML',
  INVALID_TOML: 'INVALID_TOML',
  PARSE_ERROR: 'PARSE_ERROR',

  // Detection
  NO_SOURCE_FILES: 'NO_SOURCE_FILES',
  NO_DEPENDENCIES: 'NO_DEPENDENCIES',
  FRAMEWORK_DETECTION_FAILED: 'FRAMEWORK_DETECTION_FAILED',
  MISSING_MANIFEST: 'MISSING_MANIFEST',
  CIRCULAR_DEPENDENCY: 'CIRCULAR_DEPENDENCY',
  IMPORT_SCAN_FAILED: 'IMPORT_SCAN_FAILED',

  // Monorepo
  MONOREPO_DETECTED: 'MONOREPO_DETECTED',

  // System
  TIMEOUT: 'TIMEOUT',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;
