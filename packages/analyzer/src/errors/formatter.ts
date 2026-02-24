/**
 * Format errors for user display
 * Based on CP3 error message templates
 */

import chalk from 'chalk';
import type { DetectionError } from './DetectionError.js';

/**
 * Format single error for console output
 */
export function formatError(error: DetectionError): string {
  const lines: string[] = [];

  // Level indicator with color
  const levelColor = {
    error: chalk.red,
    warning: chalk.yellow,
    info: chalk.cyan,
  }[error.severity];

  const level = error.severity.toUpperCase();
  lines.push(levelColor.bold(`${level}: ${error.message}`));
  lines.push('');

  // Context
  if (error.file || error.line || error.phase) {
    lines.push(chalk.gray('Context:'));
    if (error.file) lines.push(chalk.gray(`  • File: ${error.file}`));
    if (error.line) lines.push(chalk.gray(`  • Line: ${error.line}`));
    if (error.phase) lines.push(chalk.gray(`  • Phase: ${error.phase}`));
    lines.push('');
  }

  // Suggestion
  if (error.suggestion) {
    lines.push(chalk.gray('How to fix:'));
    lines.push(chalk.gray(`  ${error.suggestion}`));
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format all errors in result
 */
export function formatAllErrors(errors: DetectionError[]): string {
  if (errors.length === 0) return '';

  const lines: string[] = [];

  // Group by severity
  const critical = errors.filter((e) => e.severity === 'error');
  const warnings = errors.filter((e) => e.severity === 'warning');
  const info = errors.filter((e) => e.severity === 'info');

  // Show errors first
  if (critical.length > 0) {
    lines.push(chalk.red.bold(`\n${critical.length} Error(s):\n`));
    critical.forEach((e) => lines.push(formatError(e)));
  }

  // Then warnings
  if (warnings.length > 0) {
    lines.push(chalk.yellow.bold(`\n${warnings.length} Warning(s):\n`));
    warnings.forEach((e) => lines.push(formatError(e)));
  }

  // Info messages (only if DEBUG or verbose mode)
  if (info.length > 0 && process.env['DEBUG']) {
    lines.push(chalk.cyan.bold(`\n${info.length} Info Message(s):\n`));
    info.forEach((e) => lines.push(formatError(e)));
  }

  return lines.join('\n');
}

/**
 * Format errors summary (counts only)
 */
export function formatErrorSummary(errors: DetectionError[]): string {
  const critical = errors.filter((e) => e.severity === 'error').length;
  const warnings = errors.filter((e) => e.severity === 'warning').length;
  const info = errors.filter((e) => e.severity === 'info').length;

  const parts: string[] = [];
  if (critical > 0) parts.push(chalk.red(`${critical} error(s)`));
  if (warnings > 0) parts.push(chalk.yellow(`${warnings} warning(s)`));
  if (info > 0) parts.push(chalk.cyan(`${info} info`));

  return parts.length > 0 ? parts.join(', ') : chalk.green('No issues');
}
