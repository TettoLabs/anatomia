import { describe, it, expect, beforeAll } from 'vitest';
import { parseGoMod } from '../../../src/engine/parsers/go';
import { parseCargoToml } from '../../../src/engine/parsers/rust';
import { skipIfNoWasm } from '../fixtures.js';

let wasmAvailable = false;

describe('parseGoMod', () => {
  beforeAll(async () => {
    wasmAvailable = await skipIfNoWasm();
  });

  it('parses require blocks with multiple dependencies', () => {
    if (!wasmAvailable) return;
    const content = `module github.com/user/myapp

require (
    github.com/gin-gonic/gin v1.9.0
    github.com/lib/pq v1.10.0
)`;

    const result = parseGoMod(content);
    expect(result).toEqual(['github.com/gin-gonic/gin', 'github.com/lib/pq']);
  });

  it('handles version suffixes (/v2, /v3, /v5) in module paths', () => {
    if (!wasmAvailable) return;
    const content = `require (
    github.com/go-chi/chi/v5 v5.0.0
)`;

    const result = parseGoMod(content);
    expect(result).toEqual(['github.com/go-chi/chi/v5']);
  });

  it('parses single-line require statements', () => {
    if (!wasmAvailable) return;
    const content = `require github.com/gin-gonic/gin v1.9.0`;

    const result = parseGoMod(content);
    expect(result).toEqual(['github.com/gin-gonic/gin']);
  });

  it('returns empty array for go.mod with no dependencies', () => {
    if (!wasmAvailable) return;
    const content = `module github.com/user/myapp`;

    const result = parseGoMod(content);
    expect(result).toEqual([]);
  });
});

describe('parseCargoToml', () => {
  beforeAll(async () => {
    wasmAvailable = await skipIfNoWasm();
  });

  it('parses dependencies section with simple and inline table formats', () => {
    if (!wasmAvailable) return;
    const content = `[dependencies]
axum = "0.6"
tokio = { version = "1.0", features = ["full"] }`;

    const result = parseCargoToml(content);
    expect(result).toEqual(['axum', 'tokio']);
  });

  it('parses dev-dependencies section', () => {
    if (!wasmAvailable) return;
    const content = `[dev-dependencies]
criterion = "0.5"`;

    const result = parseCargoToml(content);
    expect(result).toEqual(['criterion']);
  });

  it('parses both dependencies and dev-dependencies sections combined', () => {
    if (!wasmAvailable) return;
    const content = `[dependencies]
axum = "0.6"

[dev-dependencies]
tokio-test = "0.4"`;

    const result = parseCargoToml(content);
    expect(result).toEqual(['axum', 'tokio-test']);
  });

  it('returns empty array for Cargo.toml with no dependencies', () => {
    if (!wasmAvailable) return;
    const content = `[package]
name = "myapp"
version = "0.1.0"`;

    const result = parseCargoToml(content);
    expect(result).toEqual([]);
  });
});
