/**
 * Node.js framework detectors in PRIORITY ORDER (Item 17).
 *
 * First match wins. Priority matters for disambiguation — Next.js depends on
 * React, Nest.js wraps Express, so the "parent" framework is always checked
 * before its dependency. The registry exists to make the priority chain the
 * single point of truth: before Item 17, the order was duplicated between
 * `detectors/framework.ts` (a hand-rolled sequence of `if (x.framework) return x`
 * blocks) and the priority comment inside each detector file. Splitting them
 * into a central array means adding or reordering a detector is a single-file
 * edit and the priority is visible at a glance.
 *
 * To add a new Node framework:
 *   1. Create `detectors/node/<framework>.ts` exporting `async detectX(rootPath, deps)`.
 *   2. Import it here.
 *   3. Insert it in this array at the correct priority position.
 *
 * Signature contract: every detector in this array MUST accept
 * `(rootPath: string, dependencies: string[])` and return `Promise<Detection>`.
 * Detectors that don't actually read `rootPath` should name the param
 * `_rootPath` (see `detectOtherNodeFrameworks`) — the registry keeps the
 * signature uniform so dispatch is a simple for-loop instead of per-detector
 * wrappers or runtime type checks.
 */

import type { Detection } from '../python/fastapi.js';
import { detectNextjs } from './nextjs.js';
import { detectNestjs } from './nestjs.js';
import { detectExpress } from './express.js';
import { detectReact } from './react.js';
import { detectOtherNodeFrameworks } from './other.js';

export type NodeFrameworkDetector = (
  rootPath: string,
  dependencies: string[]
) => Promise<Detection>;

/**
 * Priority-ordered list of Node framework detectors.
 *
 * Rationale for ordering:
 *   1. Next.js — bundles React; must beat plain React detection.
 *   2. Nest.js — wraps Express; must beat plain Express detection.
 *   3. Express — a common direct dependency, checked before React.
 *   4. React — fallback for pure React (no Next) projects.
 *   5. Other (Fastify/Koa) — catch-all for simpler frameworks.
 */
export const NODE_FRAMEWORK_DETECTORS: NodeFrameworkDetector[] = [
  detectNextjs,
  detectNestjs,
  detectExpress,
  detectReact,
  detectOtherNodeFrameworks,
];
