---
name: design-principles
description: "Anatomia design principles. Invoke when evaluating approaches, making architectural decisions, considering tradeoffs, or scoping features."
---

# Design Principles

## Partial results over no results
Graceful degradation is the core pattern. If one detector fails, return what succeeded. If a parser crashes on one file, skip it and parse the rest. A context file with 80% coverage is infinitely better than an error. This applies everywhere: setup, analysis, verification, the pipeline itself.

## Verified over trusted
Every claim Ana makes must be traceable to code. Generated context files are verified against the actual codebase — wrong line numbers, renamed functions, deleted files are caught mechanically. Trust stack tags (Detected, User confirmed, Inferred, Unexamined) exist because "the AI said so" is not a source. This principle extends to the pipeline: AnaVerify doesn't trust AnaBuild's self-report.

## Non-inferable content only
Don't extract what the LLM already knows from reading code. Focus on intent, rationale, constraints, tribal knowledge, and Unexamined trade-offs — things the model cannot discover by reading files. ETH Zurich proved that LLM-generated context containing discoverable info degrades performance. Our context helps because it contains what the model CAN'T figure out on its own.

## File-based state, no database
State lives on disk as markdown and JSON. File existence IS the state machine. Version-controllable. Inspectable with `cat`. No database to configure, migrate, or corrupt. `.ana/plans/active/{slug}/scope.md` exists means the task is scoped. No ORM. No connection string. No migration.

## Cross-platform, no native dependencies
WASM-based parsing. No C++ compiler required. Works on Mac, Linux, Windows without build toolchains. New dependencies must not require native compilation. If a feature needs native code, find a WASM or pure-JS alternative.

## Context window awareness
Every design decision should consider token cost. Don't load 7 files when 2 suffice. Don't write 400-line agent prompts when 250 achieves the same behavior. Skills load on demand, not upfront. Context files are read selectively. The pipeline works because each agent gets focused input, not everything.

## Confidence over certainty
Detections return 0.0-1.0 confidence scores. Low confidence is reported, not hidden. Unexamined findings are surfaced, not suppressed. The user decides what to act on. Anatomia doesn't pretend to know what it doesn't.

## The pipeline is the product
Think Build Verify isn't a suggestion — it's the value proposition. Every change gets a tracked record. The artifacts (scope, spec, build report, verify report) are more valuable than the code changes because they capture WHY decisions were made. Don't build features that bypass the pipeline. Don't optimize for skipping steps.

## Simplicity over sophistication
Four agents, not twenty-eight. Seven context files, not unlimited. One pipeline, not configurable workflows. Fewer moving parts means fewer failures, easier debugging, faster onboarding. Add complexity only when simplicity fails — and prove it failed first.
