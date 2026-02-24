/**
 * Unit tests for Go and Rust framework detectors
 *
 * Tests framework detection for Go (Gin, Echo, Chi, Cobra, Fiber) and
 * Rust (Axum, Actix, Rocket, Clap) with dependency-only detection.
 * No mocking required - detectors only check dependency arrays.
 */

import { describe, it, expect } from 'vitest';
import { detectGoFramework } from '../../src/detectors/go';
import { detectRustFramework } from '../../src/detectors/rust';

describe('Go framework detector', () => {
  it('detects Gin framework', async () => {
    const result = await detectGoFramework(['github.com/gin-gonic/gin']);

    expect(result.framework).toBe('gin');
    expect(result.confidence).toBe(0.90);
    expect(result.indicators).toEqual(['gin-gonic/gin in go.mod']);
  });

  it('detects Echo framework', async () => {
    const result = await detectGoFramework(['github.com/labstack/echo']);

    expect(result.framework).toBe('echo');
    expect(result.confidence).toBe(0.90);
    expect(result.indicators).toEqual(['labstack/echo in go.mod']);
  });

  it('detects Chi framework with version suffix', async () => {
    const result = await detectGoFramework(['github.com/go-chi/chi/v5']);

    expect(result.framework).toBe('chi');
    expect(result.confidence).toBe(0.85);
    expect(result.indicators).toEqual(['github.com/go-chi/chi/v5 in go.mod']);
  });

  it('detects Cobra CLI framework', async () => {
    const result = await detectGoFramework(['github.com/spf13/cobra']);

    expect(result.framework).toBe('cobra-cli');
    expect(result.confidence).toBe(0.90);
    expect(result.indicators).toEqual(['spf13/cobra in go.mod (CLI framework)']);
  });

  it('detects Fiber framework', async () => {
    const result = await detectGoFramework(['github.com/gofiber/fiber/v2']);

    expect(result.framework).toBe('fiber');
    expect(result.confidence).toBe(0.90);
    expect(result.indicators).toEqual(['github.com/gofiber/fiber/v2 in go.mod']);
  });

  it('returns null when no Go framework is present', async () => {
    const result = await detectGoFramework([
      'github.com/lib/pq',
      'github.com/stretchr/testify',
    ]);

    expect(result.framework).toBe(null);
    expect(result.confidence).toBe(0.0);
    expect(result.indicators).toEqual([]);
  });

  it('prioritizes Gin over other frameworks when multiple present', async () => {
    const result = await detectGoFramework([
      'github.com/gin-gonic/gin',
      'github.com/labstack/echo',
    ]);

    expect(result.framework).toBe('gin');
    expect(result.confidence).toBe(0.90);
  });

  it('detects Chi without version suffix', async () => {
    const result = await detectGoFramework(['github.com/go-chi/chi']);

    expect(result.framework).toBe('chi');
    expect(result.confidence).toBe(0.85);
    expect(result.indicators).toEqual(['github.com/go-chi/chi in go.mod']);
  });
});

describe('Rust framework detector', () => {
  it('detects Axum framework alone', async () => {
    const result = await detectRustFramework(['axum']);

    expect(result.framework).toBe('axum');
    expect(result.confidence).toBe(0.85);
    expect(result.indicators).toEqual(['axum in Cargo.toml']);
  });

  it('detects Axum with tokio (boosted confidence)', async () => {
    const result = await detectRustFramework(['axum', 'tokio']);

    expect(result.framework).toBe('axum');
    expect(result.confidence).toBe(0.95);
    expect(result.indicators).toEqual([
      'axum in Cargo.toml',
      'tokio async runtime',
    ]);
  });

  it('detects Axum with tower (boosted confidence)', async () => {
    const result = await detectRustFramework(['axum', 'tower']);

    expect(result.framework).toBe('axum');
    expect(result.confidence).toBe(0.95);
    expect(result.indicators).toEqual([
      'axum in Cargo.toml',
      'tower middleware',
    ]);
  });

  it('detects Axum with both tokio and tower (maximum confidence)', async () => {
    const result = await detectRustFramework(['axum', 'tokio', 'tower']);

    expect(result.framework).toBe('axum');
    expect(result.confidence).toBe(0.95);
    expect(result.indicators).toEqual([
      'axum in Cargo.toml',
      'tokio async runtime',
      'tower middleware',
    ]);
  });

  it('detects Actix Web framework', async () => {
    const result = await detectRustFramework(['actix-web']);

    expect(result.framework).toBe('actix-web');
    expect(result.confidence).toBe(0.90);
    expect(result.indicators).toEqual(['actix-web in Cargo.toml']);
  });

  it('detects Rocket framework', async () => {
    const result = await detectRustFramework(['rocket']);

    expect(result.framework).toBe('rocket');
    expect(result.confidence).toBe(0.90);
    expect(result.indicators).toEqual(['rocket in Cargo.toml']);
  });

  it('detects Clap CLI framework', async () => {
    const result = await detectRustFramework(['clap']);

    expect(result.framework).toBe('clap-cli');
    expect(result.confidence).toBe(0.80);
    expect(result.indicators).toEqual(['clap in Cargo.toml (CLI framework)']);
  });

  it('returns null when no Rust framework is present', async () => {
    const result = await detectRustFramework([
      'serde',
      'tokio',
      'tower',
    ]);

    expect(result.framework).toBe(null);
    expect(result.confidence).toBe(0.0);
    expect(result.indicators).toEqual([]);
  });

  it('prioritizes Axum over Actix when both present', async () => {
    const result = await detectRustFramework(['axum', 'actix-web']);

    expect(result.framework).toBe('axum');
    expect(result.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it('detects Actix Web with other dependencies', async () => {
    const result = await detectRustFramework([
      'serde',
      'actix-web',
      'tokio',
    ]);

    expect(result.framework).toBe('actix-web');
    expect(result.confidence).toBe(0.90);
  });
});
