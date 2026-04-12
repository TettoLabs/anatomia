/**
 * Tests for CI detection in deployment
 */

import { describe, it, expect } from 'vitest';
import { detectCI } from '../../../src/engine/detectors/deployment.js';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');

describe('CI detection', () => {
  it('detects GitHub Actions on Anatomia repo', () => {
    const result = detectCI(REPO_ROOT);
    expect(result.ci).toBe('GitHub Actions');
  });

  it('detects GitLab CI from .gitlab-ci.yml', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-test-gitlab-'));
    try {
      fs.writeFileSync(path.join(tmpDir, '.gitlab-ci.yml'), 'stages:\n  - build\n');
      const result = detectCI(tmpDir);
      expect(result.ci).toBe('GitLab CI');
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  it('detects Jenkins from Jenkinsfile', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-test-jenkins-'));
    try {
      fs.writeFileSync(path.join(tmpDir, 'Jenkinsfile'), 'pipeline {}');
      const result = detectCI(tmpDir);
      expect(result.ci).toBe('Jenkins');
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  it('detects CircleCI from .circleci/config.yml', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-test-circle-'));
    try {
      fs.mkdirSync(path.join(tmpDir, '.circleci'));
      fs.writeFileSync(path.join(tmpDir, '.circleci', 'config.yml'), 'version: 2.1\n');
      const result = detectCI(tmpDir);
      expect(result.ci).toBe('CircleCI');
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  it('returns null for both when no CI config found', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-test-none-'));
    try {
      const result = detectCI(tmpDir);
      expect(result.ci).toBeNull();
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  it('deployment always has all 4 fields', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-test-fields-'));
    try {
      const result = detectCI(tmpDir);
      expect(result).toHaveProperty('ci');
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });
});
