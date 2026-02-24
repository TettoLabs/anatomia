/**
 * Collects errors during detection process
 * Enables graceful degradation with error aggregation
 */

import type { DetectionError } from './DetectionError.js';
import { DetectionEngineError } from './DetectionError.js';

export class DetectionCollector {
  private errors: DetectionError[] = [];
  private warnings: DetectionError[] = [];
  private info: DetectionError[] = [];

  /**
   * Add error (blocks functionality)
   */
  addError(error: DetectionEngineError | DetectionError): void {
    const detectionError =
      error instanceof DetectionEngineError ? error.toDetectionError() : error;
    this.errors.push(detectionError);
  }

  /**
   * Add warning (concerning but continues)
   */
  addWarning(error: DetectionEngineError | DetectionError): void {
    const detectionError =
      error instanceof DetectionEngineError ? error.toDetectionError() : error;
    this.warnings.push(detectionError);
  }

  /**
   * Add info message
   */
  addInfo(error: DetectionEngineError | DetectionError): void {
    const detectionError =
      error instanceof DetectionEngineError ? error.toDetectionError() : error;
    this.info.push(detectionError);
  }

  /**
   * Get all errors
   */
  getAllErrors(): DetectionError[] {
    return [...this.errors, ...this.warnings, ...this.info];
  }

  /**
   * Get errors by severity
   */
  getErrors(): DetectionError[] {
    return [...this.errors];
  }

  getWarnings(): DetectionError[] {
    return [...this.warnings];
  }

  getInfo(): DetectionError[] {
    return [...this.info];
  }

  /**
   * Check if critical errors occurred
   */
  hasCriticalErrors(): boolean {
    return this.errors.length > 0;
  }

  /**
   * Get counts by severity
   */
  getCounts() {
    return {
      errors: this.errors.length,
      warnings: this.warnings.length,
      info: this.info.length,
      total: this.getAllErrors().length,
    };
  }

  /**
   * Clear all errors (for testing)
   */
  clear(): void {
    this.errors = [];
    this.warnings = [];
    this.info = [];
  }
}
