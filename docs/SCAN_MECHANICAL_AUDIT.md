# Scan Mechanical Audit — How It Works Today

**Date:** 2026-04-06
**Verified against:** source code on main (commit bd8f609)

---

## CLI Interface

### Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `[path]` | No | `.` (current directory) | Directory to scan |

### Flags

| Flag | Default | What It Does | Stdout | File Output |
|------|---------|-------------|--------|-------------|
| (none) | — | Terminal report with spinner | Box-drawn report | None |
| `--json` | off | Full EngineResult as JSON | JSON to stdout | None |
| `--deep` | off | Include tree-sitter patterns + conventions | Adds Patterns + Conventions sections | None |
| `--verbose` | off | Debug output before report | Engine result summary to stderr + normal report | None |
| `--save` | off | Write scan.json to .ana/ | Normal report + "Scan saved" message | `.ana/scan.json` |

### Flag Combinations

All flags can combine freely:
- `--json --save` → JSON to stdout AND writes .ana/scan.json
- `--deep --save` → Deep scan with patterns/conventions, saves full result
- `--deep --json` → Full EngineResult including patterns/conventions as JSON
- `--json --verbose` → Verbose to stderr, JSON to stdout (spinner suppressed for both)
- `--deep --save --json` → All three: deep analysis, JSON output, file saved

### Default Behavior (No Flags)

1. Spinner shows "Scanning project..."
2. Runs surface-tier analysis (no tree-sitter)
3. Prints box-drawn terminal report to stdout
4. Creates no files
5. Exit code 0 on success, 1 on error

---

## Terminal Report Sections (in order)

The `formatHumanReadable()` function renders these sections:

| # | Section | Condition | Data Source |
|---|---------|-----------|-------------|
| 1 | **Header box** | Always | overview.project, overview.scannedAt |
| 2 | **Stack** | Always (shows "No code detected" if empty) | stack.* (7 categories) |
| 3 | **Services** | Only if externalServices.length > 0 or deployment != null | externalServices[], deployment |
| 4 | **Commands** | Only if any of build/test/lint detected | commands.build/test/lint |
| 5 | **Files + Git** | Always (side-by-side if git exists, stacked if no git) | files.*, git.* |
| 6 | **Structure** | Always (shows "(empty)" if none) | structure[] |
| 7 | **Packages** | Only if monorepo with packages | monorepo.packages[] (max 10) |
| 8 | **Patterns** | Only if deep tier AND patterns with confidence >= threshold | patterns.* (deep only) |
| 9 | **Conventions** | Only if deep tier AND conventions detected | conventions.naming/imports/indentation/docstrings (deep only) |
| 10 | **Blind Spots** | Only if blindSpots.length > 0 | blindSpots[] |
| 11 | **Footer CTA** | Always | Static text + monorepo package hint |

### What's NOT Rendered

These EngineResult fields exist but have NO terminal rendering:
- `schemas` — only used to enrich database display (e.g., "Prisma → PostgreSQL (3 models)")
- `secrets` — no terminal section. Data collected but not shown.
- `projectProfile` — no terminal section
- `recommendations` — always null
- `health` — empty stub
- `readiness` — empty stub

---

## Init Engine Flow

When `ana init` runs, it executes this exact sequence:

```
1. runAnalyzer(cwd)                    → EngineResult (depth: 'deep', always)
2. createDirectoryStructure(tmpAnaPath) → creates .ana/ directory tree
3. generateScaffolds(tmpAnaPath, ER)   → 7 context files with detected data
4. copyStaticFilesWithVerification()   → modes, hooks, setup files, SCHEMAS.md
5. copyHookScripts()                   → 4 hook scripts with +x permissions
6. saveScanJson(tmpAnaPath, ER)        → .ana/scan.json (full EngineResult)
7. createAnaJson(tmpAnaPath, ER)       → .ana/ana.json (extracted config)
8. storeSnapshot(tmpAnaPath, ER)       → .ana/state/snapshot.json (baseline)
9. buildSymbolIndexSafe()              → .ana/state/symbol-index.json
10. writeCliPath()                     → .ana/state/cli-path
11. atomicRename(tmp → .ana/)          → atomic swap
12. createClaudeConfiguration(cwd, ER) → .claude/ agents + settings + skills
```

**Key differences from standalone scan:**
- Init ALWAYS runs deep tier (tree-sitter patterns + conventions)
- Init writes scan.json automatically (no `--save` flag needed)
- Init creates ana.json with extracted fields (name, framework, language, commands, packageManager, artifactBranch, setupMode)
- Init stores snapshot.json (baseline for future drift detection)
- Init scaffolds 7 context files populated with detected data
- Init creates .claude/ directory with 9 agents, settings.json, 6 skills
- Init uses atomic rename — all-or-nothing, no partial state

### What ana.json Extracts from EngineResult

```json
{
  "name": "{overview.project}",
  "framework": "{stack.framework}",
  "language": "{stack.language}",
  "packageManager": "{commands.packageManager}",
  "commands": {
    "build": "{commands.build}",
    "test": "{commands.test}",
    "lint": "{commands.lint}",
    "dev": "{commands.dev}"
  },
  "coAuthor": "Ana <build@anatomia.dev>",
  "artifactBranch": "{git.branch || 'main'}",
  "setupMode": "not_started",
  "scanStaleDays": 7
}
```

---

## Surface vs Deep Tier

| Feature | Surface | Deep |
|---------|---------|------|
| Language detection | Yes (deps + projectType) | Yes |
| Framework detection | Yes (deps) | Yes |
| Database detection | Yes (deps) | Yes + pattern enrichment |
| Auth detection | Yes (deps) | Yes + pattern enrichment |
| Testing detection | Yes (deps) | Yes + pattern enrichment |
| Payments detection | Yes (deps) | Yes |
| Workspace/monorepo | Yes | Yes |
| File counts | Yes | Yes |
| Structure map | Yes | Yes |
| Commands | Yes | Yes |
| Git info | Yes | Yes |
| External services | Yes | Yes |
| Schemas | Yes | Yes |
| Secrets posture | Yes | Yes |
| Project profile | Yes | Yes |
| Blind spots | Yes | Yes |
| Deployment | Yes | Yes |
| **Patterns** | **null** | **Active** (error handling, validation, database, auth, testing with confidence scores) |
| **Conventions** | **null** | **Active** (naming, imports, indentation, docstrings) |
| Tree-sitter required | No | Yes |

### Timing on Anatomia (101 source files, 77 tests, pnpm monorepo)

| Tier | Wall time | Notes |
|------|-----------|-------|
| Surface | **~1.0s** | No tree-sitter, no WASM loading |
| Deep | **~0.5s** | Faster due to caching — tree-sitter grammar already loaded from prior runs |

**NOTE:** Deep is faster than surface on repeat runs because of AST cache. First deep run on a cold cache would be slower.

---

## Output Formats

| Invocation | Stdout | File Output | Exit Code |
|-----------|--------|-------------|-----------|
| `ana scan` | Terminal report (box-drawn) | None | 0 |
| `ana scan --json` | Full EngineResult JSON | None | 0 |
| `ana scan --save` | Terminal report + "Scan saved" | `.ana/scan.json` | 0 |
| `ana scan --deep` | Terminal report + Patterns + Conventions | None | 0 |
| `ana scan --verbose` | Debug to stderr + terminal report | None | 0 |
| `ana scan --json --save` | JSON to stdout | `.ana/scan.json` | 0 |
| `ana scan --deep --save` | Full report + "Scan saved" | `.ana/scan.json` (with patterns/conventions) | 0 |
| `ana scan /some/path` | Scans target path | None (or .ana/ in target if --save) | 0 |
| `ana scan` (error) | Error message to stderr | None | 1 |

### JSON Output Shape

`--json` outputs the COMPLETE EngineResult — all 19 top-level keys. Nothing is filtered or summarized. The JSON output is identical to what gets written to scan.json by `--save`.

---

## Invocation Contexts

### Top of Funnel: `npx anatomia-cli scan` (no .ana/ directory)

- **Works?** Yes. Scan is read-only. No .ana/ required.
- **Depth:** Surface (default). `--deep` available.
- **--json?** Yes. Full EngineResult to stdout.
- **--save?** Yes — creates `.ana/` directory automatically via `fs.mkdir(anaDir, { recursive: true })`. Writes scan.json inside it.
- **Terminal output:** Full report. Footer says "Run `ana init` to generate full context for your AI."

### Post-Init: `ana scan` (with .ana/ directory)

- **Default:** Surface scan, terminal report, no file changes.
- **--save:** Overwrites existing `.ana/scan.json` with fresh results.
- **--deep:** Adds Patterns + Conventions sections to terminal output.
- **--deep --save:** Writes full deep result to scan.json (replaces prior surface result).

### Inside Init: `ana init` calls engine directly

- **Always deep tier.** `analyzeProject(rootPath, { depth: 'deep' })`.
- **Always saves scan.json.** Via `saveScanJson()` function.
- **Does MORE than scan:** Scaffolds context files, creates ana.json, creates .claude/ config, builds symbol index, stores snapshot. Scan only produces output — init uses the same engine result to bootstrap the entire project.

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| `ana scan --save` with no `.ana/` | Creates `.ana/` directory, writes `scan.json` inside it |
| `ana scan --deep` with no WASM | Engine catches tree-sitter failure, returns surface-only result. patterns = null, conventions = null. No crash. Graceful degradation. |
| `ana scan --save` with existing scan.json | Overwrites silently. No `--force` needed. |
| `ana scan /nonexistent/path` | Error: "Path not found: /nonexistent/path", exit code 1 |
| `ana scan /a/file.txt` (not a directory) | Error: "Not a directory: /a/file.txt", exit code 1 |
| `ana scan` on empty directory | Works. Shows "No code detected" for stack, "(empty)" for structure. |
| No `--force` flag | Doesn't exist. Not needed — scan is read-only (except `--save` which always overwrites). |
| Path argument | Yes: `ana scan packages/cli` scans that subdirectory. Monorepo-aware: can scan individual packages. |

---

## Data Flow Summary

```
                              ┌─────────────────┐
                              │ analyzeProject() │
                              │ (engine entry)   │
                              └────────┬─────────┘
                                       │
                              EngineResult (19 keys)
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                   │
              ┌─────▼─────┐    ┌──────▼──────┐    ┌──────▼──────┐
              │  ana scan  │    │  ana init   │    │  --json     │
              │ (terminal) │    │ (bootstrap) │    │  (stdout)   │
              └─────┬──────┘    └──────┬──────┘    └─────────────┘
                    │                  │
           formatHumanReadable    ┌────┴─────────────────────┐
           (10 sections)          │ scan.json                │
                                  │ ana.json                 │
                                  │ snapshot.json            │
                                  │ 7 context scaffolds      │
                                  │ .claude/ (agents, skills)│
                                  │ symbol-index.json        │
                                  └──────────────────────────┘
```

---

## Surprising Findings

1. **`--save` creates `.ana/` from scratch.** This means `npx anatomia-cli scan --save` on a fresh project creates a `.ana/scan.json` without running init. This is good — it lowers the barrier between "scan" and "save context" without requiring full init commitment.

2. **Deep is sometimes faster than surface.** AST cache means repeat deep scans can be faster than surface scans. First cold run is slower, but subsequent runs benefit from cached tree-sitter parse results.

3. **secrets data is collected but never displayed.** The engine detects envFileExists, envExampleExists, gitignoreCoversEnv — but the terminal report has no Secrets section. This data is only visible in `--json` output or scan.json.

4. **schemas data is used only for database display enrichment.** When Prisma is detected and a schema file has a provider + model count, the stack line shows "Prisma → PostgreSQL (3 models)". Otherwise schemas data is invisible in the terminal.

5. **No payments field in terminal stack.** The `payments` key exists in EngineResult but the terminal rendering uses `stackOrder = ['language', 'framework', 'database', 'auth', 'testing', 'workspace']` — payments is NOT in the render order. If Stripe were detected, it would appear in externalServices (Services section) but NOT in the Stack section. This is a rendering gap.

6. **The footer CTA is static.** Always "Run `ana init` to generate full context for your AI." regardless of what was found. The only dynamic element is the monorepo package scan hint.

7. **Blind spots rendering exists but fires rarely.** The only current blind spot generators are "No git repository detected" and ".env file exists but .gitignore may not cover it." No other conditions generate blind spots. The section exists but is almost always empty on real projects.

8. **scan.json from init vs scan --save are identical in content.** Both write the full EngineResult. The difference is that init always uses deep tier while scan defaults to surface. Running `ana scan --deep --save` produces the same scan.json content as init would.

9. **Verbose mode goes to stderr.** The `--verbose` flag sends debug output to stderr, not stdout. This means `ana scan --json --verbose` produces clean JSON on stdout with debug info on stderr — composable with pipes.

10. **No framework detection for CLI tools.** Anatomia's own scan shows `Framework: null` because Commander.js, yargs, oclif etc. are not in the framework detection map. Every CLI project gets a blank framework.
