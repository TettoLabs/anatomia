/**
 * Main framework detector (orchestrates language-specific detectors)
 *
 * Implements priority-based disambiguation:
 * - Next.js before React (Next includes React)
 * - Nest.js before Express (Nest uses Express)
 * - Django DRF vs plain Django
 * - Typer before Click (Typer uses Click)
 */

import type { ProjectType } from '../types/index.js';
import { readPythonDependencies } from '../parsers/python.js';
import { readNodeDependencies } from '../parsers/node.js';
import { readGoDependencies } from '../parsers/go.js';
import { readRustDependencies } from '../parsers/rust.js';

// Python detectors
import { detectFastAPI } from './python/fastapi.js';
import { detectDjango } from './python/django.js';
import { detectFlask } from './python/flask.js';
import { detectPythonCli } from './python/cli.js';

// Node detectors
import { detectNextjs } from './node/nextjs.js';
import { detectReact } from './node/react.js';
import { detectNestjs } from './node/nestjs.js';
import { detectExpress } from './node/express.js';
import { detectOtherNodeFrameworks } from './node/other.js';

// Go/Rust detectors
import { detectGoFramework } from './go.js';
import { detectRustFramework } from './rust.js';

export interface FrameworkResult {
  framework: string | null;
  confidence: number;
  indicators: string[];
}

/**
 * Detect framework for a project
 *
 * Uses priority-based disambiguation to prevent false positives
 *
 * @param rootPath - Project root directory
 * @param projectType - Detected project type
 * @returns Framework detection result with confidence
 */
export async function detectFramework(
  rootPath: string,
  projectType: ProjectType
): Promise<FrameworkResult> {
  switch (projectType) {
    case 'python':
      return detectPythonFramework(rootPath);
    case 'node':
      return detectNodeFramework(rootPath);
    case 'go':
      return detectGoFrameworkFromProject(rootPath);
    case 'rust':
      return detectRustFrameworkFromProject(rootPath);
    default:
      return { framework: null, confidence: 0.0, indicators: [] };
  }
}

/**
 * Detect Python framework (priority order)
 */
async function detectPythonFramework(rootPath: string): Promise<FrameworkResult> {
  const deps = await readPythonDependencies(rootPath);

  const fastapi = await detectFastAPI(rootPath, deps);
  if (fastapi.framework) return fastapi;

  const django = await detectDjango(rootPath, deps);
  if (django.framework) return django;

  const flask = await detectFlask(rootPath, deps);
  if (flask.framework) return flask;

  const cli = await detectPythonCli(deps);
  if (cli.framework) return cli;

  return { framework: null, confidence: 0.0, indicators: [] };
}

/**
 * Detect Node framework (priority order)
 * CRITICAL: Next before React, Nest before Express
 */
async function detectNodeFramework(rootPath: string): Promise<FrameworkResult> {
  const deps = await readNodeDependencies(rootPath);

  // 1. Next.js (BEFORE React)
  const nextjs = await detectNextjs(rootPath, deps);
  if (nextjs.framework) return nextjs;

  // 2. Nest.js (BEFORE Express)
  const nestjs = await detectNestjs(rootPath, deps);
  if (nestjs.framework) return nestjs;

  // 3. Express
  const express = await detectExpress(rootPath, deps);
  if (express.framework) return express;

  // 4. React
  const react = await detectReact(rootPath, deps);
  if (react.framework) return react;

  // 5. Other
  const other = await detectOtherNodeFrameworks(deps);
  if (other.framework) return other;

  return { framework: null, confidence: 0.0, indicators: [] };
}

async function detectGoFrameworkFromProject(rootPath: string): Promise<FrameworkResult> {
  const deps = await readGoDependencies(rootPath);
  return detectGoFramework(deps);
}

async function detectRustFrameworkFromProject(rootPath: string): Promise<FrameworkResult> {
  const deps = await readRustDependencies(rootPath);
  return detectRustFramework(deps);
}
