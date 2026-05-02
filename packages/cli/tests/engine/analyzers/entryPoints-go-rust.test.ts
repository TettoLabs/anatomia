/**
 * Entry point detection tests for Go and Rust
 *
 * Tests findEntryPoints() for Go and Rust project types
 * including cmd glob patterns and standard layouts.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { findEntryPoints } from '../../../src/engine/analyzers/structure/index.js';
import { mkdir, writeFile, rm, mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('Go and Rust entry point detection', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'test-entry-points-go-rust-'));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('Go', () => {
    it('detects cmd/*/main.go pattern (standard Go layout)', async () => {
      await mkdir(join(testDir, 'cmd/myapp'), { recursive: true });
      await writeFile(join(testDir, 'cmd/myapp/main.go'), 'package main\n');

      const result = await findEntryPoints(testDir, 'go', null);

      expect(result.entryPoints).toContain('cmd/myapp/main.go');
      expect(result.confidence).toBeGreaterThanOrEqual(0.95);
      expect(result.source).toBe('convention');
    });

    it('detects multiple binaries (Go microservices)', async () => {
      await mkdir(join(testDir, 'cmd/api'), { recursive: true });
      await mkdir(join(testDir, 'cmd/worker'), { recursive: true });
      await writeFile(join(testDir, 'cmd/api/main.go'), 'package main\n');
      await writeFile(join(testDir, 'cmd/worker/main.go'), 'package main\n');

      const result = await findEntryPoints(testDir, 'go', null);

      expect(result.entryPoints).toHaveLength(2);
      expect(result.entryPoints).toContain('cmd/api/main.go');
      expect(result.entryPoints).toContain('cmd/worker/main.go');
      expect(result.confidence).toBe(1.0);
      expect(result.source).toBe('convention');
    });

    it('detects simple Go project (main.go at root)', async () => {
      await writeFile(join(testDir, 'main.go'), 'package main\n');

      const result = await findEntryPoints(testDir, 'go', null);

      expect(result.entryPoints).toEqual(['main.go']);
      expect(result.confidence).toBe(0.95);
      expect(result.source).toBe('convention');
    });

    it('detects Go with Gin framework', async () => {
      await mkdir(join(testDir, 'cmd/api'), { recursive: true });
      await writeFile(join(testDir, 'cmd/api/main.go'), 'package main\n');

      const result = await findEntryPoints(testDir, 'go', 'gin');

      expect(result.entryPoints).toContain('cmd/api/main.go');
      expect(result.confidence).toBeGreaterThanOrEqual(0.95);
      expect(result.source).toBe('convention');
    });

    it('detects Go library (no entry point)', async () => {
      await mkdir(join(testDir, 'pkg/mylib'), { recursive: true });
      await writeFile(join(testDir, 'pkg/mylib/lib.go'), 'package mylib\n');

      const result = await findEntryPoints(testDir, 'go', null);

      expect(result.entryPoints).toEqual([]);
      expect(result.confidence).toBe(0.0);
      expect(result.source).toBe('not-found');
    });
  });

  describe('Rust', () => {
    it('detects src/main.rs (Rust binary)', async () => {
      await mkdir(join(testDir, 'src'));
      await writeFile(join(testDir, 'src/main.rs'), 'fn main() {}\n');

      const result = await findEntryPoints(testDir, 'rust', null);

      expect(result.entryPoints).toEqual(['src/main.rs']);
      expect(result.confidence).toBe(0.95);
      expect(result.source).toBe('convention');
    });

    it('detects src/lib.rs (Rust library)', async () => {
      await mkdir(join(testDir, 'src'));
      await writeFile(join(testDir, 'src/lib.rs'), 'pub fn hello() {}\n');

      const result = await findEntryPoints(testDir, 'rust', null);

      expect(result.entryPoints).toEqual(['src/lib.rs']);
      expect(result.confidence).toBe(0.95);
      expect(result.source).toBe('convention');
    });

    it('detects Rust with Axum framework', async () => {
      await mkdir(join(testDir, 'src'));
      await writeFile(join(testDir, 'src/main.rs'), 'fn main() {}\n');

      const result = await findEntryPoints(testDir, 'rust', 'axum');

      expect(result.entryPoints).toEqual(['src/main.rs']);
      expect(result.confidence).toBe(0.95);
      expect(result.source).toBe('convention');
    });
  });
});
