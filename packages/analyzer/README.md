# anatomia-analyzer

Code analysis engine for Anatomia - detects project types, frameworks, and code structure.

## Installation

```bash
npm install anatomia-analyzer
```

## Usage

```typescript
import { analyze } from 'anatomia-analyzer';

const result = await analyze('/path/to/project');

console.log(result.projectType);  // 'python' | 'node' | 'go' | 'rust' | 'unknown'
console.log(result.framework);    // 'fastapi' | 'nextjs' | 'express' | null
console.log(result.structure);    // Entry points, architecture, test locations
console.log(result.parsed);       // Functions, classes, imports (tree-sitter)
```

## What It Does

**Project Detection:**
- Identifies project type by analyzing dependency files
- Supports: Python, Node.js, Go, Rust, Ruby, PHP
- Returns confidence scores

**Framework Detection:**
- Detects frameworks from dependencies and file patterns
- Supports 18+ frameworks across multiple languages
- Python: FastAPI, Django, Flask
- Node: Next.js, Express, Nest.js, Fastify
- Go: Gin, Echo, Chi, Cobra
- Rust: Axum, Actix, Rocket

**Structure Analysis:**
- Finds entry points (where code execution starts)
- Classifies architecture (layered, microservices, DDD, monolith, modular)
- Locates test directories
- Maps configuration files

**Code Parsing:**
- Tree-sitter AST parsing for TypeScript, Python, JavaScript, Go
- Extracts functions, classes, imports, decorators
- Smart caching for performance

## API Documentation

See [docs/STRUCTURE_API.md](./docs/STRUCTURE_API.md) for complete API reference.

## Requirements

- Node.js >=20.0.0
- C++ compiler for tree-sitter (Xcode Command Line Tools on macOS, build-essential on Linux)

## Testing

```bash
pnpm test
```

## License

MIT - See [LICENSE](./LICENSE)
