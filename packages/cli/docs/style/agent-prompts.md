# Agent Prompt Style Guide

## Purpose

This document codifies how agent prompts in `templates/.claude/agents/` should express constraints. It exists because the templates were written over time by many hands, each developing its own habits around negation (`NEVER`, `Do NOT`, `Don't`, `MUST NOT`). The result was 120+ negation patterns across five templates with no shared rule for when negation belongs and when it's noise.

This is a prose style guide. It is not a linter and does not try to eliminate all negations — some constraints are clearest as negations.

## Rationale

Positive framing is clearer for the reader and easier to audit.

- A reader scanning a template for "what does this agent do?" lands on positive statements faster than on negation-plus-alternative pairs.
- A reviewer auditing whether a constraint is legitimate or filler can recognize a positive instruction immediately — negations often hide filler behind `Don't X`-shaped prose.
- A human editor updating a template can rewrite a positive instruction without accidentally reversing its meaning.

Older literature (primarily GPT-3 era) argued that model attention mechanisms handle negation poorly. That is of uncertain applicability to current Claude models and is **not** the reason for this guide. The benefit is reader and reviewer clarity, not model compliance.

## The three-bucket rule

Every negation in an agent template falls into one of three buckets. Each bucket has a different default.

### Bucket A — Keep as negation

Hard safety boundaries and pipeline invariants where the prohibition **is** the content. The alternative is not "do Y instead," it is "nothing else is safe here." Typical shapes:

- `NEVER modify the ## Detected section directly.`
- `Never delete or weaken existing tests to make the suite pass.`
- `Do NOT merge anything — the developer reviews and merges.`
- `NEVER guess at types or interfaces.`

Test: if you tried to rewrite the statement as a positive ("Instead, do Z"), there would be no plausible Z. The rule is the boundary.

**Optional elevation:** cluster Bucket A negations under a named section (e.g., `## Safety Invariants`, `## Pipeline Boundaries`) so a reader looking for the contract surface finds it in one place instead of scattered throughout the prompt.

### Bucket B — Rewrite to positive

Behavioral constraints that name an undesired action without describing the alternative. A positive restatement exists and is sharper. Typical shapes:

| Negation | Positive rewrite |
|---|---|
| `Don't narrate your process.` | `Just build — show the diff, not the journey.` |
| `Don't cascade fixes.` | `Three attempts, then stop and report.` |
| `Don't start implementing.` | `Route to AnaPlan — scoping stops at the scope.md write.` |
| `Don't skip tradeoff analysis.` | `Surface at least one alternative approach in every scope.` |

Test: if you can complete the sentence "... instead, Y" with a concrete Y, write it as Y.

### Bucket C — Delete

Content-free filler negations. They restate something a prior rule already covered, or gesture vaguely at anti-patterns the rest of the prompt has already closed. Typical shapes:

- `Don't say "probably" when you can verify.` (already covered by "be specific," "cite sources")
- `Don't give generic advice.` (already covered by "be specific to THIS project")
- `Don't implement features — AnaBuild does that.` (already covered by the pipeline-boundaries section)

Test: if deleting the sentence would leave the template materially equivalent, delete it.

## Applying the rule

When writing or revising an agent template:

1. Read every `NEVER` / `Do NOT` / `Don't` / `MUST NOT` match in the file.
2. For each one, decide A / B / C with the three tests above.
3. Apply the bucket's default: keep, rewrite, delete.
4. When rewriting to positive (Bucket B), name the action to take, not the action to avoid.
5. When deleting (Bucket C), trust the rest of the prompt to carry the guidance.

## What this guide does not do

- It does not mandate a negation budget. If a template legitimately has 30 safety invariants, all 30 belong.
- It does not forbid `NEVER` as emphasis. Bucket A negations are often the ones that use the strongest wording — that is intentional.
- It does not rewrite templates on its own. Bucket decisions are editorial; they require reading the sentence in context.
