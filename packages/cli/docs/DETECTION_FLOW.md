# Detection Flow Diagram

This document provides a visual representation of the Anatomia detection engine flow, showing how the system analyzes a project from input to final output.

## Overview

The detection engine processes projects through 8 distinct phases:
1. **Input**: Directory path validation
2. **Monorepo Detection**: Check for monorepo configurations
3. **File Scanning**: Find dependency files
4. **Parsing**: Extract package names
5. **Project Type Detection**: Identify language (python/node/go/rust)
6. **Framework Detection**: Run framework-specific detectors
7. **Confidence Scoring**: Multi-signal confidence calculation
8. **Output**: AnalysisResult structure

## Detection Flow

```mermaid
flowchart TD
    Start([User Input: Directory Path]) --> Input[Phase 1: Input Validation]

    Input -->|Valid Path| Monorepo[Phase 2: Monorepo Detection]
    Input -->|Invalid Path| Error1[Error: Invalid Directory]

    Monorepo --> CheckPnpm{Check pnpm-workspace.yaml}
    CheckPnpm -->|Found| MonoResult1[Monorepo: pnpm]
    CheckPnpm -->|Not Found| CheckTurbo{Check turbo.json}

    CheckTurbo -->|Found| MonoResult2[Monorepo: turbo]
    CheckTurbo -->|Not Found| CheckNx{Check nx.json}

    CheckNx -->|Found| MonoResult3[Monorepo: nx]
    CheckNx -->|Not Found| CheckLerna{Check lerna.json}

    CheckLerna -->|Found| MonoResult4[Monorepo: lerna]
    CheckLerna -->|Not Found| CheckWorkspaces{Check package.json workspaces}

    CheckWorkspaces -->|Found| MonoResult5[Monorepo: npm-workspaces]
    CheckWorkspaces -->|Not Found| FallbackScan[Fallback: Recursive package.json scan]

    FallbackScan -->|Multiple packages| MonoResult6[Monorepo: none/tool-less]
    FallbackScan -->|Single package| NotMonorepo[Not a Monorepo]

    MonoResult1 --> FileScanning
    MonoResult2 --> FileScanning
    MonoResult3 --> FileScanning
    MonoResult4 --> FileScanning
    MonoResult5 --> FileScanning
    MonoResult6 --> FileScanning
    NotMonorepo --> FileScanning[Phase 3: File Scanning]

    FileScanning --> ScanFiles[Scan for dependency files:<br/>- Python: requirements.txt, pyproject.toml, Pipfile<br/>- Node: package.json, package-lock.json<br/>- Go: go.mod<br/>- Rust: Cargo.toml<br/>- Ruby: Gemfile<br/>- PHP: composer.json]

    ScanFiles -->|Files Found| Parsing[Phase 4: Parsing]
    ScanFiles -->|No Files| Unknown1[Result: Unknown Project]

    Parsing --> Parser1[Parser 1: requirements.txt<br/>Extract pip packages]
    Parsing --> Parser2[Parser 2: pyproject.toml<br/>Extract Poetry/Hatch deps]
    Parsing --> Parser3[Parser 3: Pipfile<br/>Extract Pipenv packages]
    Parsing --> Parser4[Parser 4: package.json<br/>Extract npm dependencies]
    Parsing --> Parser5[Parser 5: go.mod<br/>Extract Go modules]
    Parsing --> Parser6[Parser 6: Cargo.toml<br/>Extract Rust crates]

    Parser1 --> MergeDeps[Merge dependency lists]
    Parser2 --> MergeDeps
    Parser3 --> MergeDeps
    Parser4 --> MergeDeps
    Parser5 --> MergeDeps
    Parser6 --> MergeDeps

    MergeDeps -->|Dependencies Extracted| ProjectType[Phase 5: Project Type Detection]
    MergeDeps -->|No Dependencies| Unknown2[Result: Unknown Project]

    ProjectType --> TypeCheck{Identify Language}
    TypeCheck -->|Python files found| TypePython[Project Type: Python]
    TypeCheck -->|Node files found| TypeNode[Project Type: Node]
    TypeCheck -->|Go files found| TypeGo[Project Type: Go]
    TypeCheck -->|Rust files found| TypeRust[Project Type: Rust]
    TypeCheck -->|Ruby files found| TypeRuby[Project Type: Ruby]
    TypeCheck -->|PHP files found| TypePhp[Project Type: PHP]
    TypeCheck -->|Multiple languages| TypeMixed[Project Type: Mixed]

    TypePython --> Framework[Phase 6: Framework Detection]
    TypeNode --> Framework
    TypeGo --> Framework
    TypeRust --> Framework
    TypeRuby --> Framework
    TypePhp --> Framework
    TypeMixed --> Framework

    Framework --> FrameworkSwitch{Route by Project Type}

    FrameworkSwitch -->|Python| PythonDetectors[Python Framework Detectors<br/>Priority Order]
    FrameworkSwitch -->|Node| NodeDetectors[Node Framework Detectors<br/>Priority Order]
    FrameworkSwitch -->|Go| GoDetectors[Go Framework Detectors]
    FrameworkSwitch -->|Rust| RustDetectors[Rust Framework Detectors]
    FrameworkSwitch -->|Other| NoFramework[No Framework Detection]

    PythonDetectors --> PyDetect1{1. FastAPI<br/>Check: fastapi in deps}
    PyDetect1 -->|Found| PyFastAPI[Framework: FastAPI]
    PyDetect1 -->|Not Found| PyDetect2{2. Django<br/>Check: django in deps}

    PyDetect2 -->|Found| PyDjango[Framework: Django]
    PyDetect2 -->|Not Found| PyDetect3{3. Flask<br/>Check: flask in deps}

    PyDetect3 -->|Found| PyFlask[Framework: Flask]
    PyDetect3 -->|Not Found| PyDetect4{4. CLI Tools<br/>Check: typer/click in deps}

    PyDetect4 -->|Found| PyCli[Framework: CLI Tool]
    PyDetect4 -->|Not Found| PyNone[No Python Framework]

    NodeDetectors --> NodeDetect1{1. Next.js<br/>Check: next in deps<br/>BEFORE React}
    NodeDetect1 -->|Found| NodeNext[Framework: Next.js]
    NodeDetect1 -->|Not Found| NodeDetect2{2. Nest.js<br/>Check: @nestjs/core<br/>BEFORE Express}

    NodeDetect2 -->|Found| NodeNest[Framework: Nest.js]
    NodeDetect2 -->|Not Found| NodeDetect3{3. Express<br/>Check: express in deps}

    NodeDetect3 -->|Found| NodeExpress[Framework: Express]
    NodeDetect3 -->|Not Found| NodeDetect4{4. React<br/>Check: react in deps}

    NodeDetect4 -->|Found| NodeReact[Framework: React]
    NodeDetect4 -->|Not Found| NodeDetect5{5. Other<br/>Vue/Angular/Svelte}

    NodeDetect5 -->|Found| NodeOther[Framework: Other]
    NodeDetect5 -->|Not Found| NodeNone[No Node Framework]

    GoDetectors --> GoCheck{Check Go frameworks:<br/>Gin, Echo, Fiber, Chi, etc.}
    GoCheck -->|Found| GoFramework[Framework: Go Framework]
    GoCheck -->|Not Found| GoNone[No Go Framework]

    RustDetectors --> RustCheck{Check Rust frameworks:<br/>Actix, Rocket, Axum, etc.}
    RustCheck -->|Found| RustFramework[Framework: Rust Framework]
    RustCheck -->|Not Found| RustNone[No Rust Framework]

    PyFastAPI --> Confidence
    PyDjango --> Confidence
    PyFlask --> Confidence
    PyCli --> Confidence
    PyNone --> Confidence
    NodeNext --> Confidence
    NodeNest --> Confidence
    NodeExpress --> Confidence
    NodeReact --> Confidence
    NodeOther --> Confidence
    NodeNone --> Confidence
    GoFramework --> Confidence
    GoNone --> Confidence
    RustFramework --> Confidence
    RustNone --> Confidence
    NoFramework --> Confidence

    Confidence[Phase 7: Confidence Scoring] --> CalcSignals[Calculate Multi-Signal Score]

    CalcSignals --> Signal1[Signal 1: Dependency Found<br/>Weight: 0.80 - 80%]
    CalcSignals --> Signal2[Signal 2: Imports Found<br/>Weight: 0.15 - 15%]
    CalcSignals --> Signal3[Signal 3: Config Files<br/>Weight: 0.05 - 5%]
    CalcSignals --> Signal4[Signal 4: Framework Patterns<br/>Weight: 0.05 - 5%]

    Signal1 --> SumScore[Sum Weighted Scores<br/>Max: 1.0]
    Signal2 --> SumScore
    Signal3 --> SumScore
    Signal4 --> SumScore

    SumScore --> ConfLevel{Confidence Level}
    ConfLevel -->|>= 0.80| High[High Confidence<br/>Safe for auto-apply]
    ConfLevel -->|0.50-0.79| Moderate[Moderate Confidence<br/>Verification recommended]
    ConfLevel -->|0.30-0.49| Low[Low Confidence<br/>Manual confirmation required]
    ConfLevel -->|< 0.30| Uncertain[Uncertain<br/>Manual review needed]

    High --> Output
    Moderate --> Output
    Low --> Output
    Uncertain --> Output

    Output[Phase 8: Output - AnalysisResult] --> BuildResult[Build Result Object]

    BuildResult --> OutputFields[Output Fields:<br/>- projectType: 'python' | 'node' | 'go' | 'rust' | etc.<br/>- framework: 'fastapi' | 'nextjs' | 'express' | null<br/>- confidence.projectType: 0.0-1.0<br/>- confidence.framework: 0.0-1.0<br/>- indicators.projectType: string arrays<br/>- indicators.framework: string arrays<br/>- detectedAt: ISO timestamp<br/>- version: tool version]

    OutputFields --> End([Return AnalysisResult])

    Error1 --> End
    Unknown1 --> End
    Unknown2 --> End

    style Start fill:#e1f5ff
    style End fill:#e1f5ff
    style Monorepo fill:#fff4e6
    style FileScanning fill:#fff4e6
    style Parsing fill:#fff4e6
    style ProjectType fill:#fff4e6
    style Framework fill:#fff4e6
    style Confidence fill:#fff4e6
    style Output fill:#fff4e6
    style Error1 fill:#ffebee
    style Unknown1 fill:#ffebee
    style Unknown2 fill:#ffebee
    style High fill:#e8f5e9
    style Moderate fill:#fff9c4
    style Low fill:#ffe0b2
    style Uncertain fill:#ffebee
```

## Phase Details

### Phase 1: Input Validation
- **Input**: Directory path (string)
- **Process**: Validate path exists and is accessible
- **Output**: Valid path OR error
- **Data Flow**: Path string → Validation → Monorepo detection OR error

### Phase 2: Monorepo Detection
- **Input**: Valid directory path
- **Process**: Check for monorepo configurations in priority order:
  1. `pnpm-workspace.yaml` (pnpm)
  2. `turbo.json` (Turborepo)
  3. `nx.json` (Nx)
  4. `lerna.json` (Lerna)
  5. `package.json` workspaces (npm/yarn)
  6. Recursive scan fallback
- **Output**: MonorepoResult { isMonorepo, tool, workspacePatterns?, packages? }
- **Data Flow**: Path → Config checks → Monorepo metadata → File scanning

### Phase 3: File Scanning
- **Input**: Directory path + monorepo metadata
- **Process**: Scan for language-specific dependency files
- **Files Checked**:
  - Python: `requirements.txt`, `pyproject.toml`, `Pipfile`
  - Node: `package.json`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`
  - Go: `go.mod`, `go.sum`
  - Rust: `Cargo.toml`, `Cargo.lock`
  - Ruby: `Gemfile`, `Gemfile.lock`
  - PHP: `composer.json`, `composer.lock`
- **Output**: List of found dependency files
- **Data Flow**: Path → File system scan → File paths → Parsers

### Phase 4: Parsing
- **Input**: List of dependency file paths
- **Process**: Use 6 specialized parsers to extract package names
- **Parsers**:
  1. `parseRequirementsTxt()` - Python requirements.txt
  2. `parsePyprojectToml()` - Python pyproject.toml
  3. `parsePipfile()` - Python Pipfile
  4. `parsePackageJson()` - Node package.json
  5. `parseGoMod()` - Go go.mod
  6. `parseCargoToml()` - Rust Cargo.toml
- **Output**: Merged list of dependency names (strings)
- **Data Flow**: File paths → Parser functions → Dependency arrays → Project type detection

### Phase 5: Project Type Detection
- **Input**: Dependency files found + parsed dependencies
- **Process**: Identify primary language based on file indicators
- **Detection Logic**:
  - Python: `requirements.txt`, `pyproject.toml`, or `Pipfile` exists
  - Node: `package.json` exists
  - Go: `go.mod` exists
  - Rust: `Cargo.toml` exists
  - Ruby: `Gemfile` exists
  - PHP: `composer.json` exists
  - Mixed: Multiple language indicators (monorepo)
- **Output**: ProjectTypeResult { type, confidence, indicators }
- **Data Flow**: File indicators → Type detection → ProjectType → Framework detection

### Phase 6: Framework Detection
- **Input**: ProjectType + dependencies
- **Process**: Run language-specific framework detectors in priority order
- **Detectors** (18 total):

  **Python Detectors** (4):
  1. FastAPI (check `fastapi` in deps)
  2. Django (check `django` in deps)
  3. Flask (check `flask` in deps)
  4. CLI tools (check `typer`, `click`)

  **Node Detectors** (5):
  1. Next.js (check `next` - BEFORE React)
  2. Nest.js (check `@nestjs/core` - BEFORE Express)
  3. Express (check `express`)
  4. React (check `react`)
  5. Other (Vue, Angular, Svelte)

  **Go Detectors** (4):
  - Gin, Echo, Fiber, Chi

  **Rust Detectors** (3):
  - Actix, Rocket, Axum

  **Other** (2):
  - Ruby: Rails, Sinatra
  - PHP: Laravel, Symfony

- **Priority Order**: Critical for disambiguation (Next before React, Nest before Express)
- **Output**: FrameworkResult { framework, confidence, indicators }
- **Data Flow**: Dependencies → Framework detectors → Framework name → Confidence scoring

### Phase 7: Confidence Scoring
- **Input**: Detection signals from framework detector
- **Process**: Multi-signal confidence calculation
- **Signals** (weighted):
  1. **Dependency Found** (0.80 / 80%): Primary signal - authoritative
  2. **Imports Found** (0.15 / 15%): Verification signal - scans source files
  3. **Config Files** (0.05 / 5%): Bonus signal - framework-specific configs
  4. **Framework Patterns** (0.05 / 5%): Bonus signal - companion packages
- **Calculation**: Sum of active signal weights (max 1.0)
- **Interpretation**:
  - **High** (≥0.80): Safe for auto-template application
  - **Moderate** (0.50-0.79): Recommend verification
  - **Low** (0.30-0.49): Require manual confirmation
  - **Uncertain** (<0.30): Flag for manual review
- **Output**: Confidence score (0.0-1.0) + level interpretation
- **Data Flow**: Detection signals → Weight calculation → Confidence score → Result assembly

### Phase 8: Output
- **Input**: All detection results + confidence scores
- **Process**: Assemble final AnalysisResult object
- **Output Structure** (AnalysisResult):
```typescript
{
  projectType: 'python' | 'node' | 'go' | 'rust' | 'ruby' | 'php' | 'mixed' | 'unknown',
  framework: string | null,
  confidence: {
    projectType: 0.0-1.0,
    framework: 0.0-1.0
  },
  indicators: {
    projectType: string[],  // e.g., ["package.json", "pnpm-lock.yaml"]
    framework: string[]     // e.g., ["next in dependencies", "next.config.js exists"]
  },
  detectedAt: string,      // ISO timestamp
  version: string          // Tool version (e.g., "0.1.0-alpha")
}
```
- **Data Flow**: Detection results → Result assembly → AnalysisResult object → Return to caller

## Decision Nodes

The flowchart includes critical decision points that determine the analysis path:

1. **Monorepo Yes/No**: Determines whether to process as monorepo or single project
2. **Files Found**: Controls whether parsing can proceed or returns unknown
3. **Language Detection**: Routes to appropriate framework detectors
4. **Framework Found**: Each detector checks if framework exists before returning result
5. **Confidence Level**: Determines recommended action for user

## Data Flow Summary

```
Input Path
  → Monorepo Metadata
    → Dependency File Paths
      → Parsed Dependencies (package names)
        → Project Type + Confidence
          → Framework Name + Confidence
            → Multi-Signal Confidence Score
              → AnalysisResult Object
```

## Key Architectural Decisions

1. **Priority-Based Detection**: Framework detectors run in specific order to prevent false positives (Next.js before React, Nest.js before Express)
2. **Multi-Signal Confidence**: Combines 4 weighted signals for transparent, explainable confidence scores
3. **Fail-Safe Design**: Each phase can handle failures gracefully and continue to next phase
4. **Monorepo Awareness**: Detects 5 monorepo tools + fallback, but currently processes as single project (MVP)
5. **Parser Modularity**: 6 independent parsers handle different dependency file formats
6. **Type Safety**: All results validated with Zod schemas

## Version
- **Tool Version**: 0.1.0-alpha
- **Documentation Date**: 2026-02-24
- **Detection Engine**: @anatomia/analyzer
