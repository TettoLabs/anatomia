// Consumed re-exports (verified S18 — only these have callers)
export type { EngineResult } from './types/engineResult.js';
export { scanProject } from './scan-engine.js';
export { ASTCache } from './cache/astCache.js';
export { ParserManager } from './parsers/treeSitter.js';

// analyze() DELETED — all its phases live in scanProject() now (Lane 0 Step 7).
// The 7-phase orchestration (projectType → framework → structure → parsing →
// patterns → conventions) is inlined in scan-engine.ts with direct detector calls
// instead of a dynamic-imported wrapper.
