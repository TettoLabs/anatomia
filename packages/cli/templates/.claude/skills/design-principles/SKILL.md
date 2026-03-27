---
name: design-principles
description: "Team design principles. Invoke when evaluating approaches, making architectural decisions, or scoping features."
---

# Design Principles

## Partial results over no results
If one operation fails, return what succeeded. A response with 80% of the data is better than an error.

## Curated context over raw exploration
Context files give agents focused project knowledge without burning tokens reading source files. The value is curation, not secrecy.

## File-based state, no database
State lives on disk as markdown and JSON. File existence IS the state machine.

## Context window awareness
Don't load everything when a subset suffices. Skills load on demand. Each agent gets focused input.

## Confirm before acting
Ana and AnaPlan preview output before writing artifacts. Human judgment at every handoff is worth the friction.

## Spend tokens on what the next consumer can't discover
Each artifact focuses on what the next agent can't figure out on its own.

## Simplicity over sophistication
Fewer moving parts means fewer failures. Add complexity only when simplicity fails.

<!-- Add your team's principles below -->
