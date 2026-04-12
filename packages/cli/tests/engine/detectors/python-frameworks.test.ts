/**
 * Unit tests for Python framework detectors
 *
 * Tests FastAPI, Django, Flask, and CLI framework detection.
 * Detectors now receive (deps, hints) — no filesystem mocking needed.
 */

import { describe, it, expect } from 'vitest';
import { detectFastAPI } from '../../../src/engine/detectors/python/fastapi';
import { detectDjango } from '../../../src/engine/detectors/python/django';
import { detectFlask } from '../../../src/engine/detectors/python/flask';
import { detectPythonCli } from '../../../src/engine/detectors/python/cli';
import type { FrameworkHintEntry } from '../../../src/engine/types/census';

function hint(framework: string, path: string, sourceRootPath = '.'): FrameworkHintEntry {
  return { framework, sourceRootPath, path };
}

describe('FastAPI detector', () => {
  it('returns null when fastapi not in dependencies', () => {
    const result = detectFastAPI(['flask', 'django'], []);
    expect(result.framework).toBe(null);
    expect(result.confidence).toBe(0.0);
  });

  it('detects fastapi with dependency only (baseline 0.80 confidence)', () => {
    const result = detectFastAPI(['fastapi'], []);
    expect(result.framework).toBe('fastapi');
    expect(result.confidence).toBe(0.80);
  });

  it('detects fastapi with uvicorn companion package (0.85 confidence)', () => {
    const result = detectFastAPI(['fastapi', 'uvicorn'], []);
    expect(result.confidence).toBeCloseTo(0.85, 2);
    expect(result.indicators).toContain('companion packages: uvicorn');
  });

  it('detects fastapi with pydantic companion package (0.85 confidence)', () => {
    const result = detectFastAPI(['fastapi', 'pydantic'], []);
    expect(result.confidence).toBeCloseTo(0.85, 2);
  });

  it('detects fastapi with all dep signals (0.85 confidence)', () => {
    // Without scanForImports, max is dep(0.80) + companion(0.05) = 0.85
    const result = detectFastAPI(['fastapi', 'uvicorn', 'pydantic'], []);
    expect(result.confidence).toBeCloseTo(0.85, 2);
    expect(result.indicators).toContain('companion packages: uvicorn, pydantic');
  });
});

describe('Django detector', () => {
  it('returns null when django not in dependencies', () => {
    const result = detectDjango(['flask'], []);
    expect(result.framework).toBe(null);
  });

  it('detects django with dependency only (baseline 0.80 confidence)', () => {
    const result = detectDjango(['django'], []);
    expect(result.framework).toBe('django');
    expect(result.confidence).toBe(0.80);
  });

  it('detects django with manage.py (0.95 confidence)', () => {
    const result = detectDjango(['django'], [hint('django', 'manage.py')]);
    expect(result.confidence).toBeCloseTo(0.95, 2);
    expect(result.indicators).toContain('manage.py found');
  });

  it('detects django-drf when djangorestframework present', () => {
    const result = detectDjango(['django', 'djangorestframework'], []);
    expect(result.framework).toBe('django-drf');
    expect(result.indicators).toContain('djangorestframework detected (API framework)');
  });

  it('detects django-drf with manage.py (higher confidence)', () => {
    const result = detectDjango(['django', 'djangorestframework'], [hint('django', 'manage.py')]);
    expect(result.framework).toBe('django-drf');
    expect(result.confidence).toBeCloseTo(0.95, 2);
  });

  it('prioritizes DRF over plain Django when both could match', () => {
    const result = detectDjango(['django', 'djangorestframework'], []);
    expect(result.framework).toBe('django-drf');
  });
});

describe('Flask detector', () => {
  it('returns null when flask not in dependencies', () => {
    const result = detectFlask(['django'], []);
    expect(result.framework).toBe(null);
  });

  it('detects flask with dependency only (baseline 0.80 confidence)', () => {
    const result = detectFlask(['flask'], []);
    expect(result.framework).toBe('flask');
    expect(result.confidence).toBe(0.80);
  });

  it('detects flask with app.py (0.85 confidence)', () => {
    const result = detectFlask(['flask'], [hint('flask', 'app.py')]);
    expect(result.confidence).toBeCloseTo(0.85, 2);
    expect(result.indicators).toContain('app.py found');
  });
});

describe('Python CLI detector', () => {
  it('detects typer with 0.85 confidence', () => {
    const result = detectPythonCli(['typer'], []);
    expect(result.framework).toBe('typer');
    expect(result.confidence).toBeCloseTo(0.85, 2);
  });

  it('detects click with 0.75 confidence', () => {
    const result = detectPythonCli(['click'], []);
    expect(result.framework).toBe('click');
    expect(result.confidence).toBe(0.75);
  });

  it('prefers typer over click (typer uses click internally)', () => {
    const result = detectPythonCli(['typer', 'click'], []);
    expect(result.framework).toBe('typer');
  });

  it('returns null for no CLI framework', () => {
    const result = detectPythonCli(['requests'], []);
    expect(result.framework).toBe(null);
  });
});

describe('CRITICAL: Python framework disambiguation', () => {
  it('DRF wins over plain Django', () => {
    const result = detectDjango(['django', 'djangorestframework'], []);
    expect(result.framework).toBe('django-drf');
  });
});
