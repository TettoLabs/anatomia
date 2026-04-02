/**
 * Error handling infrastructure
 */

export type { DetectionError } from './DetectionError.js';
export { DetectionEngineError, ERROR_CODES } from './DetectionError.js';
export { DetectionCollector } from './DetectionCollector.js';
export { formatError, formatAllErrors, formatErrorSummary } from './formatter.js';
