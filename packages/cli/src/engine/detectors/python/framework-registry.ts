/**
 * Python framework detectors in PRIORITY ORDER (Item 17).
 *
 * First match wins. Web frameworks (FastAPI, Django, Flask) are checked
 * before CLI frameworks (Typer/Click) because a project can be both a
 * web API and a CLI, and the web framework is the more prominent identity.
 * Within the CLI detector, Typer is preferred over Click because Typer
 * uses Click internally — detecting plain Click first would hide a Typer
 * project behind its transitive dep.
 *
 * See `detectors/node/framework-registry.ts` for the full rationale — this
 * file mirrors that pattern so Node and Python have identical shapes.
 *
 * To add a new Python framework:
 *   1. Create `detectors/python/<framework>.ts` exporting `async detectX(rootPath, deps)`.
 *   2. Import it here.
 *   3. Insert it in this array at the correct priority position.
 *
 * Signature contract: every detector MUST accept
 * `(rootPath: string, dependencies: string[])`. Detectors that don't read
 * `rootPath` should name the param `_rootPath` (see `detectPythonCli`).
 */

import type { Detection } from './fastapi.js';
import { detectFastAPI } from './fastapi.js';
import { detectDjango } from './django.js';
import { detectFlask } from './flask.js';
import { detectPythonCli } from './cli.js';

export type PythonFrameworkDetector = (
  rootPath: string,
  dependencies: string[]
) => Promise<Detection>;

/**
 * Priority-ordered list of Python framework detectors.
 *
 * Rationale for ordering:
 *   1. FastAPI — modern, explicit identity.
 *   2. Django — mature, explicit identity.
 *   3. Flask — simpler, often the "catch-all" web framework.
 *   4. CLI (Typer/Click) — fallback for pure-CLI projects.
 */
export const PYTHON_FRAMEWORK_DETECTORS: PythonFrameworkDetector[] = [
  detectFastAPI,
  detectDjango,
  detectFlask,
  detectPythonCli,
];
