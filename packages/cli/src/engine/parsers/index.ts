/**
 * Dependency parsers for all supported languages
 */

// High-level readers (main API)
export { readPythonDependencies } from './python.js';
export { readNodeDependencies } from './node.js';
export { readGoDependencies } from './go.js';
export { readRustDependencies } from './rust.js';
export { readRubyDependencies } from './ruby.js';
export { readPhpDependencies } from './php.js';

// Re-export individual parsers for testing
export { parseRequirementsTxt } from './python/requirements.js';
export { parsePyprojectToml } from './python/pyproject.js';
export { parsePipfile } from './python/Pipfile.js';
export { parsePackageJson } from './node/package.js';
export { parsePackageLock } from './node/packageLock.js';
export { parseGoMod } from './go.js';
export { parseCargoToml } from './rust.js';
export { parseGemfile } from './ruby.js';
export { parseComposerJson } from './php.js';
