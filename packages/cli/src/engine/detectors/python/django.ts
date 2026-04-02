/**
 * Django framework detector with DRF disambiguation
 *
 * Distinguishes between:
 * - Plain Django (MVT pattern)
 * - Django REST Framework (API-focused)
 */

import { calculateConfidence, type ConfidenceSignals } from '../../utils/confidence.js';
import { exists } from '../../utils/file.js';
import * as path from 'node:path';
import type { Detection } from './fastapi.js';

/**
 * Detect Django framework (with DRF disambiguation)
 *
 * Detection logic:
 * 1. Check if 'django' in dependencies
 * 2. Disambiguate: djangorestframework → 'django-drf', else 'django'
 * 3. Check for Django-specific files (manage.py, settings.py)
 * 4. Calculate confidence
 *
 * @param rootPath - Project root directory
 * @param dependencies - Dependency list from parsers
 * @returns Detection result
 */
export async function detectDjango(
  rootPath: string,
  dependencies: string[]
): Promise<Detection> {
  const dependencyFound = dependencies.includes('django');
  if (!dependencyFound) {
    return { framework: null, confidence: 0.0, indicators: [] };
  }

  const indicators: string[] = ['django in dependencies'];

  // Disambiguate: Django REST Framework vs plain Django
  const hasDRF = dependencies.includes('djangorestframework');
  const framework = hasDRF ? 'django-drf' : 'django';

  if (hasDRF) {
    indicators.push('djangorestframework detected (API framework)');
  }

  // Check for Django-specific files
  const hasManagePy = await exists(path.join(rootPath, 'manage.py'));
  if (hasManagePy) {
    indicators.push('manage.py found');
  }

  // Calculate confidence
  const confidence = calculateConfidence({
    dependencyFound: true,
    importsFound: hasManagePy,  // manage.py is strong Django indicator
    configFilesFound: false,
  });

  return {
    framework,
    confidence,
    indicators,
  };
}
