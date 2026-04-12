/**
 * Django framework detector with DRF disambiguation
 *
 * Distinguishes between:
 * - Plain Django (MVT pattern)
 * - Django REST Framework (API-focused)
 */

import { calculateConfidence } from '../../utils/confidence.js';
import type { Detection } from './fastapi.js';
import type { FrameworkHintEntry } from '../../types/census.js';

/**
 * Detect Django framework (with DRF disambiguation).
 */
export function detectDjango(
  dependencies: string[],
  hints: FrameworkHintEntry[]
): Detection {
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

  // Check for manage.py via census hints
  const hasManagePy = hints.some(h => h.framework === 'django');
  if (hasManagePy) {
    indicators.push('manage.py found');
  }

  const confidence = calculateConfidence({
    dependencyFound: true,
    importsFound: hasManagePy,  // manage.py is strong Django indicator
    configFilesFound: false,
  });

  return { framework, confidence, indicators };
}
