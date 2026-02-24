/**
 * Unit tests for Python framework detectors
 *
 * Tests FastAPI, Django, Flask, and CLI framework detection with mocked I/O.
 * Validates confidence scoring and detection accuracy.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectFastAPI } from '../../src/detectors/python/fastapi';
import { detectDjango } from '../../src/detectors/python/django';
import { detectFlask } from '../../src/detectors/python/flask';
import { detectPythonCli } from '../../src/detectors/python/cli';

// Mock modules
vi.mock('../../src/utils/importScanner.js', () => ({
  scanForImports: vi.fn(),
}));

vi.mock('../../src/utils/file.js', () => ({
  exists: vi.fn(),
}));

// Import mocked functions
import { scanForImports } from '../../src/utils/importScanner.js';
import { exists } from '../../src/utils/file.js';

const mockScanForImports = vi.mocked(scanForImports);
const mockExists = vi.mocked(exists);

describe('FastAPI detector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null with 0.0 confidence when fastapi not in dependencies', async () => {
    const result = await detectFastAPI('/test/project', ['flask', 'django']);

    expect(result.framework).toBe(null);
    expect(result.confidence).toBe(0.0);
    expect(result.indicators).toEqual([]);
    expect(mockScanForImports).not.toHaveBeenCalled();
  });

  it('detects fastapi with dependency only (baseline 0.80 confidence)', async () => {
    mockScanForImports.mockResolvedValue({ found: false, count: 0 });

    const result = await detectFastAPI('/test/project', ['fastapi']);

    expect(result.framework).toBe('fastapi');
    expect(result.confidence).toBe(0.80);
    expect(result.indicators).toEqual(['fastapi in dependencies']);
  });

  it('detects fastapi with imports (0.95 confidence)', async () => {
    mockScanForImports.mockResolvedValue({ found: true, count: 3 });

    const result = await detectFastAPI('/test/project', ['fastapi']);

    expect(result.framework).toBe('fastapi');
    expect(result.confidence).toBeCloseTo(0.95, 2);
    expect(result.indicators).toContain('fastapi in dependencies');
    expect(result.indicators).toContain('imports found (3 occurrences)');
  });

  it('detects fastapi with uvicorn companion package (0.85 confidence)', async () => {
    mockScanForImports.mockResolvedValue({ found: false, count: 0 });

    const result = await detectFastAPI('/test/project', ['fastapi', 'uvicorn']);

    expect(result.framework).toBe('fastapi');
    expect(result.confidence).toBeCloseTo(0.85, 2);
    expect(result.indicators).toContain('fastapi in dependencies');
    expect(result.indicators).toContain('companion packages: uvicorn');
  });

  it('detects fastapi with pydantic companion package (0.85 confidence)', async () => {
    mockScanForImports.mockResolvedValue({ found: false, count: 0 });

    const result = await detectFastAPI('/test/project', ['fastapi', 'pydantic']);

    expect(result.framework).toBe('fastapi');
    expect(result.confidence).toBeCloseTo(0.85, 2);
    expect(result.indicators).toContain('companion packages: pydantic');
  });

  it('detects fastapi with all signals (1.0 confidence)', async () => {
    mockScanForImports.mockResolvedValue({ found: true, count: 5 });

    const result = await detectFastAPI('/test/project', ['fastapi', 'uvicorn', 'pydantic']);

    expect(result.framework).toBe('fastapi');
    expect(result.confidence).toBe(1.0);
    expect(result.indicators).toHaveLength(3);
    expect(result.indicators).toContain('fastapi in dependencies');
    expect(result.indicators).toContain('imports found (5 occurrences)');
    expect(result.indicators).toContain('companion packages: uvicorn, pydantic');
  });
});

describe('Django detector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null with 0.0 confidence when django not in dependencies', async () => {
    const result = await detectDjango('/test/project', ['fastapi', 'flask']);

    expect(result.framework).toBe(null);
    expect(result.confidence).toBe(0.0);
    expect(result.indicators).toEqual([]);
  });

  it('detects django with dependency only (baseline 0.80 confidence)', async () => {
    mockExists.mockResolvedValue(false);

    const result = await detectDjango('/test/project', ['django']);

    expect(result.framework).toBe('django');
    expect(result.confidence).toBe(0.80);
    expect(result.indicators).toEqual(['django in dependencies']);
  });

  it('detects django with manage.py (0.95 confidence)', async () => {
    mockExists.mockResolvedValue(true);

    const result = await detectDjango('/test/project', ['django']);

    expect(result.framework).toBe('django');
    expect(result.confidence).toBeCloseTo(0.95, 2);
    expect(result.indicators).toContain('django in dependencies');
    expect(result.indicators).toContain('manage.py found');
    expect(mockExists).toHaveBeenCalledWith('/test/project/manage.py');
  });

  it('detects django-drf when djangorestframework present', async () => {
    mockExists.mockResolvedValue(false);

    const result = await detectDjango('/test/project', ['django', 'djangorestframework']);

    expect(result.framework).toBe('django-drf');
    expect(result.confidence).toBeGreaterThanOrEqual(0.80);
    expect(result.indicators).toContain('django in dependencies');
    expect(result.indicators).toContain('djangorestframework detected (API framework)');
  });

  it('detects django-drf with manage.py (higher confidence)', async () => {
    mockExists.mockResolvedValue(true);

    const result = await detectDjango('/test/project', ['django', 'djangorestframework']);

    expect(result.framework).toBe('django-drf');
    expect(result.confidence).toBeCloseTo(0.95, 2);
    expect(result.indicators).toHaveLength(3);
    expect(result.indicators).toContain('manage.py found');
  });

  it('prioritizes DRF over plain Django when both could match', async () => {
    mockExists.mockResolvedValue(true);

    const result = await detectDjango('/test/project', ['django', 'djangorestframework', 'celery']);

    expect(result.framework).toBe('django-drf');
    expect(result.indicators).toContain('djangorestframework detected (API framework)');
  });
});

describe('Flask detector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null with 0.0 confidence when flask not in dependencies', async () => {
    const result = await detectFlask('/test/project', ['django', 'fastapi']);

    expect(result.framework).toBe(null);
    expect(result.confidence).toBe(0.0);
    expect(result.indicators).toEqual([]);
  });

  it('detects flask with dependency only (baseline 0.80 confidence)', async () => {
    mockScanForImports.mockResolvedValue({ found: false, count: 0 });
    mockExists.mockResolvedValue(false);

    const result = await detectFlask('/test/project', ['flask']);

    expect(result.framework).toBe('flask');
    expect(result.confidence).toBe(0.80);
    expect(result.indicators).toEqual(['flask in dependencies']);
  });

  it('detects flask with imports (0.95 confidence)', async () => {
    mockScanForImports.mockResolvedValue({ found: true, count: 2 });
    mockExists.mockResolvedValue(false);

    const result = await detectFlask('/test/project', ['flask']);

    expect(result.framework).toBe('flask');
    expect(result.confidence).toBeCloseTo(0.95, 2);
    expect(result.indicators).toContain('flask in dependencies');
    expect(result.indicators).toContain('flask imports found (2 occurrences)');
  });

  it('detects flask with app.py (0.85 confidence)', async () => {
    mockScanForImports.mockResolvedValue({ found: false, count: 0 });
    mockExists.mockResolvedValue(true);

    const result = await detectFlask('/test/project', ['flask']);

    expect(result.framework).toBe('flask');
    expect(result.confidence).toBeCloseTo(0.85, 2);
    expect(result.indicators).toContain('flask in dependencies');
    expect(result.indicators).toContain('app.py found');
    expect(mockExists).toHaveBeenCalledWith('/test/project/app.py');
  });

  it('detects flask with all signals (1.0 confidence)', async () => {
    mockScanForImports.mockResolvedValue({ found: true, count: 4 });
    mockExists.mockResolvedValue(true);

    const result = await detectFlask('/test/project', ['flask']);

    expect(result.framework).toBe('flask');
    expect(result.confidence).toBe(1.0);
    expect(result.indicators).toHaveLength(3);
    expect(result.indicators).toContain('flask in dependencies');
    expect(result.indicators).toContain('flask imports found (4 occurrences)');
    expect(result.indicators).toContain('app.py found');
  });
});

describe('Python CLI detector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null with 0.0 confidence when no CLI framework present', async () => {
    const result = await detectPythonCli(['flask', 'django']);

    expect(result.framework).toBe(null);
    expect(result.confidence).toBe(0.0);
    expect(result.indicators).toEqual([]);
  });

  it('detects typer with 0.85 confidence', async () => {
    const result = await detectPythonCli(['typer']);

    expect(result.framework).toBe('typer');
    expect(result.confidence).toBe(0.85);
    expect(result.indicators).toEqual(['typer in dependencies']);
  });

  it('detects click with 0.75 confidence', async () => {
    const result = await detectPythonCli(['click']);

    expect(result.framework).toBe('click');
    expect(result.confidence).toBe(0.75);
    expect(result.indicators).toEqual(['click in dependencies']);
  });

  it('prioritizes typer over click when both present', async () => {
    const result = await detectPythonCli(['click', 'typer']);

    expect(result.framework).toBe('typer');
    expect(result.confidence).toBe(0.85);
    expect(result.indicators).toEqual(['typer in dependencies']);
  });

  it('prioritizes typer over click (different order)', async () => {
    const result = await detectPythonCli(['typer', 'click', 'requests']);

    expect(result.framework).toBe('typer');
    expect(result.confidence).toBe(0.85);
  });

  it('detects click when mixed with non-CLI frameworks', async () => {
    const result = await detectPythonCli(['flask', 'click', 'sqlalchemy']);

    expect(result.framework).toBe('click');
    expect(result.confidence).toBe(0.75);
  });
});
