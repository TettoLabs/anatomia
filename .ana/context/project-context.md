# Project Context

## What This Product Does

**Detected:** pnpm monorepo.

Anatomia is an open-source methodology and CLI tool for verified AI development. It exports a framework — think, plan, build, verify — that turns AI coding tools from fast-but-unreliable into structured-and-proven. The CLI (`ana`) is the delivery mechanism: it scans a project, generates validated context, and runs every change through a four-agent pipeline (Think, Plan, Build, Verify) with a fifth agent (Learn) that tends the proof chain between cycles

Three things Anatomia provides that don't exist elsewhere:

1. **Validated context.** Machine-generated project intelligence (scan.json, skills, gotchas) that is verified against the actual codebase — not documentation, not stale READMEs. The system detects when context goes stale and refreshes it.
2. **The pipeline.** Think → Plan → Build → Verify. Four agents with specific roles, typed handoffs, and independence guarantees. Verify never reads Build's report — the developer gets two independent accounts. This prevents the "grade your own homework" failure mode.
3. **Proof chains.** Every pipeline run produces a verification record: which contract assertions passed, which failed, what the verifier found independently. The proof chain is the mechanical audit trail of every AI-assisted change.

The target customer is a startup at an inflection point — 2 to 5 people, technically capable but without senior engineering depth, carrying technical debt from building fast with AI tools. They need a methodology, not just another tool. Anatomia gives them structured engineering discipline without requiring them to have learned it the hard way. The product enforces LLMs to act against their nature: think more, build less, surface tradeoffs instead of rushing to implementation.

The platform is an advocate for quality — it exists to surface tradeoffs, challenge assumptions, and ensure that what gets built is what should get built.

The product has three surfaces:
1. **Scan + Init** — zero-config project analysis. Produces scan.json, CLAUDE.md, AGENTS.md, skills with rules and gotchas, and context scaffolds. Entry point for every user.
2. **The Pipeline** — scope → spec → build → verify → proof. Managed through `ana work`, `ana artifact`, `ana verify`, `ana pr`. Where ongoing development happens with mechanical verification.
3. **Proof Intelligence** — quality trajectory, active findings, staleness detection, finding-to-rule promotion. Managed through `ana proof` subcommands and the Learn agent. Where quality compounds across pipeline cycles.

## How the Pipeline Works

The pipeline is both the development process AND a product feature. Each stage produces typed artifacts that the next stage consumes:

```
Think (Ana)        →  scope.md           →  "what and why"
Plan (AnaPlan)     →  spec.md + contract.yaml + plan.md  →  "how, with assertions"
Build (AnaBuild)   →  code + tests + build_report.md     →  "implementation + evidence"
Verify (AnaVerify) →  verify_report.md   →  "independent proof"
```

**Key constraints:**
- Each agent runs in a separate session. No shared memory between stages.
- Build and Verify are independent — Verify reads the spec and the code, never the build report. The developer compares both reports.
- Artifacts are saved with SHA-256 hash verification and atomic commits. The CLI validates structure before accepting each artifact.
- On PASS, Verify creates a PR. After merge, the developer completes the work item, which archives the plan and writes a proof chain entry.

**The flywheel:** Each completed pipeline run adds a proof chain entry with findings. Learn triages findings between cycles — closing resolved ones, promoting recurring patterns to skill rules. Promoted rules reach Build through Plan's Build Brief. Health tracks risks/run as the north star metric. The declining error rate proves the system works.

## Architecture

**Detected:** pnpm · 2 packages (anatomia-cli, demo-site)
**Detected:** 3 directories mapped: .github/, packages/, tests/
**Detected deployment:** GitHub Actions

- **`packages/cli`** — the product. All development happens here. The CLI has three layers:
  - **Commands** (`src/commands/`) — user-facing surface. init, scan, setup, artifact, work, verify, pr, proof, agents.
  - **Engine** (`src/engine/`) — scan intelligence. Pure functions, no CLI dependencies. Census model → detectors → analyzers → findings.
  - **Utils + Data** (`src/utils/`, `src/data/`) — shared helpers. Scaffold generators, gotcha matcher, gotcha library.
- **`website/`** — marketing/demo site. Next.js + Tailwind. No code dependency on the CLI.

### Where to Make Changes

| To do this... | Look here |
|---------------|-----------|
| Add a scan detector | `src/engine/detectors/` |
| Add a gotcha | `src/data/gotchas.ts` (library) + `src/utils/gotchas.ts` (matcher) |
| Change what init generates | `src/commands/init/assets.ts` (generators) or `templates/` (templates) |
| Change skill rules | `templates/.claude/skills/{name}/SKILL.md` |
| Add a CLI command | `src/commands/`, register in `src/index.ts` |
| Change EngineResult schema | `src/engine/types/engineResult.ts` + `createEmptyEngineResult()` + all consumers |
| Add a finding rule | `src/engine/findings/rules/` |
| Change agent definitions | `templates/.claude/agents/` |
| Change proof chain commands | `src/commands/proof.ts` |
| Change proof computation | `src/utils/proofSummary.ts` |
| Change work complete flow | `src/commands/work.ts` |

### Templates vs. Generators

This is the most common source of wrong-location errors:

- **Templates** are copied verbatim during init. Agent definitions (`templates/.claude/agents/*.md`) and skill rule sections (`templates/.claude/skills/*/SKILL.md`) are templates. To change what users get, edit the template file.
- **Generators** produce content from code. CLAUDE.md, AGENTS.md, project-context.md, and skill `## Detected` sections are generated by code in `assets.ts`, `scaffold-generators.ts`, and `skills.ts`. To change what users get, edit the generator function.

An LLM asked to "change the default coding-standards rules" should edit `templates/.claude/skills/coding-standards/SKILL.md`. An LLM asked to "change what the Detected section shows" should edit the injector in `src/commands/init/skills.ts`. These are different files with different change processes.

## What Looks Wrong But Is Intentional

- **allDeps merges all workspace packages.** Database, auth, testing, payments, and AI SDK detection run against the merged dependency map from ALL packages. Framework and uiSystem detection run against the primary package only. The split is intentional — database/auth/testing are project-wide facts; framework is identity.
- **init is idempotent but asymmetric.** Re-running init refreshes machine-owned content (Detected sections, scan.json) but preserves human-owned content (Rules, Gotchas, Examples, context files). Most init commands are destructive. This one isn't.
- **scan.json is designed for LLM agents, not humans.** Its field names, structure, and content are optimized for agent consumption. The human-readable version is the `ana scan` terminal display.
- **Pre-commit hooks enforce types, not the build.** The build uses SWC (strips types without checking). The pre-commit hook runs `tsc --noEmit`. If you skip the hook, type errors ship silently.
- **Gotcha triggers use display names, not package names.** `{ aiSdk: 'Anthropic' }` not `{ aiSdk: '@anthropic-ai/sdk' }`. Because `stack.aiSdk` stores display names from the detection layer.

## Key Decisions

**Census model.** All detectors receive a `ProjectCensus` object built once at scan start. Every detector sees the same snapshot. This prevents bugs where detectors read inconsistent filesystem state.

**Compound gotcha triggers.** Gotchas can require multiple conditions (e.g., Prisma + Vercel for the serverless singleton). The matcher uses `.every()` — all conditions must match. Prevents irrelevant advice.

**Atomic init via rename.** Init builds the complete `.ana/` tree in a temp directory, then atomically swaps. Crash-safe. SIGKILL recovery via stale-directory detection.

**Merge-not-overwrite on re-init.** CLAUDE.md, AGENTS.md, and agent definitions are not overwritten if they exist. Skills get Detected refreshed but Rules/Gotchas/Examples preserved. User content survives.

**Two-tier scanning.** Surface tier (dependency-based, fast, no WASM) and deep tier (tree-sitter AST for conventions, patterns, naming). `--quick` forces surface-only.

## Current Realities

- **CLI is the primary development focus.** The website is secondary — marketing only, no code dependency on the CLI.
- **The scan produces one result per repo, not per package.** Per-package scanning for multi-product monorepos is a known limitation. The `primaryDeps` field on census is the foundation for future per-package support.
- **The CLI is not yet published to npm.** Installation is from source.
- **Test count must not decrease.** CI runs across 3 OS × 2 Node versions. Coverage thresholds enforced in vitest.config.ts.

## Domain Vocabulary

- **Scan** — engine analysis of a project. Produces `EngineResult` (serialized as `scan.json`). Two tiers: surface and deep.
- **Init** — bootstraps `.ana/` and `.claude/` from scan data. Idempotent — re-init refreshes scan without destroying user content.
- **Census** — the `ProjectCensus` object: source roots, deps, configs, primary root. Built once, consumed by all detectors.
- **Scan finding** — deterministic check from the engine (secrets, validation, env hygiene). Severity: critical, warn, info, pass. Lives in `scan.json`.
- **Proof finding** — verification observation from Verify or Build. Severity: risk (could hurt you), debt (codebase getting worse), observation (information). Suggested action: promote (encode as rule), scope (needs work), monitor (watch), accept (closeable). Lives in `proof_chain.json` with lifecycle state: active → promoted, closed, or lesson.
- **Gotcha** — stack-specific tip injected into skill Gotchas sections. Triggered by stack field matches. The library grows over time.
- **Skill** — `.claude/skills/{name}/SKILL.md`. Four sections: Detected (machine-owned), Rules, Gotchas, Examples (human-owned).
- **Contract** — `contract.yaml` written by Plan. Each assertion has: `id` (A001, A002...), `says` (plain-English description a non-engineer would understand), `block` (test label), `target` (what's checked, dot notation), `matcher` (equals, exists, contains, greater, truthy, not_equals, not_contains), and `value` (expected result). Build tags tests with `// @ana A001`. Verify checks each tag independently against the code.
- **Proof chain** — `proof_chain.json` + `PROOF_CHAIN.md`. One entry per completed pipeline run. Each entry contains: result (PASS/FAIL), contract assertions with status, proof findings with severity and suggested action, build concerns, modules touched, timing, SHA-256 hashes. The structured record that Learn triages and health computes on.
- **Health** — `ana proof health`. Quality trajectory across pipeline runs. North star metric: risks/run trending down.
- **Promote** — `ana proof promote`. A proof finding becomes a skill rule. The mechanism that turns verification intelligence into agent behavior change.
- **Stale** — a finding whose referenced file was modified by subsequent pipeline runs. Detected by `ana proof stale` via `modules_touched` cross-reference. Confidence tiers: high (3+ subsequent entries), medium (1-2). Learn's highest-priority triage targets.
- **Strengthen** — `ana proof strengthen`. Commit ceremony for Learn's edits to existing skill rules. Learn edits the file, strengthen stages + commits + closes findings atomically. Distinct from promote (which appends new rules).
- **Audit** — `ana proof audit`. Active findings grouped by file with severity and action classification. `--full` removes truncation for agent consumption.
- **Learn** — `claude --agent ana-learn`. The fifth agent. Triages findings, promotes patterns to skills, routes developer observations. Runs between pipeline cycles.
- **Trajectory** — risks/run averaged over a window. Computed per-entry (what did this run produce?), not cumulative. Trend: improving, stable, worsening, or insufficient data.
- **Primary root** — in monorepos, the package that defines project identity. Largest `apps/` package with framework hints, or largest package overall.
- **Slug** — kebab-case work item identifier. Used in branches (`feature/{slug}`), commits (`[{slug}]`), and plan directories.
