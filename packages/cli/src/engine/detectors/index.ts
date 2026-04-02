/**
 * Framework detectors (all languages)
 */

export { detectProjectType } from './projectType.js';
export type { ProjectTypeResult } from './projectType.js';

export { detectFramework } from './framework.js';
export type { FrameworkResult } from './framework.js';

// Re-export individual detectors for testing
export { detectFastAPI } from './python/fastapi.js';
export { detectDjango } from './python/django.js';
export { detectFlask } from './python/flask.js';
export { detectPythonCli } from './python/cli.js';

export { detectNextjs } from './node/nextjs.js';
export { detectReact } from './node/react.js';
export { detectNestjs } from './node/nestjs.js';
export { detectExpress } from './node/express.js';
export { detectOtherNodeFrameworks } from './node/other.js';

export { detectGoFramework } from './go.js';
export { detectRustFramework } from './rust.js';

export type { Detection } from './python/fastapi.js';
