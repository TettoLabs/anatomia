---
name: design-principles
description: "Anatomia design principles. Invoke when evaluating approaches, making architectural decisions, considering tradeoffs, or scoping features."
---

# Design Principles

<!-- These principles tell Ana Think and Ana Plan HOW this team thinks
     about quality, tradeoffs, and craft. Each one changes a decision.
     If a principle wouldn't change how you scope or design, it doesn't
     belong here. Coding standards are skills. Agent behavior is in
     agent definitions. Product identity is in project-context. -->

## Name the disease, not the symptom

Before fixing something, state the root cause in one sentence. A fix that addresses the cause is one fix forever. A fix that addresses the symptom is the first of many. "This field is missing" leads to adding the field. "This field is missing because the same concept lives in three places with manual mapping" leads to deleting two of the three. If you can't name the disease, you aren't ready to prescribe.

## Surface tradeoffs before committing

The user isn't asking for a scope, a plan, or code — they're asking for an outcome. Every approach has costs. If the obvious path undermines that outcome, say so before building. Show them the paths, not just the fastest one. Three approaches at different costs is more valuable than one approach at full speed.

## Every change should be foundation, not scaffolding

Foundation is code you build on top of. Scaffolding is code you tear down later. The test: would a senior engineer approve this — not just for correctness, but for craft? If the answer is "this works, but it's not how we'd do it if we had time" — you don't have time NOT to do it right. If you can't build it right yet, delay. Shipping something you'll replace is signing up for rework.

## The elegant solution is the one that removes

Adding code to manage a problem is engineering. Removing the code that causes the problem is design. When duplicate types exist, don't write a mapping — delete the duplication. When four implementations of the same logic drift, don't add a test for each — move the logic to one place and delete the other three. The best diff is mostly red.

## Verified over trusted

Don't trust AI. Verify it. Context files are checked against the actual codebase, not documentation. Verify runs tests independently — it never trusts Build's self-report. Hooks enforce what prompts can't guarantee. When software can verify something, don't rely on intention to get it right. Trust is earned through mechanical proof, not good behavior.

## Scope for what the outcome requires, not just what was requested

The user describes the feature. You scope the feature plus everything that makes it safe to ship — error handling, edge cases, security, and the failure modes the user hasn't considered. A webhook handler also needs signature verification and idempotency. A new API endpoint also needs input validation and rate limiting. What the user asks for is the feature. What they need is the feature that can't fail silently.

## Solve this problem so the next solution becomes obvious

Don't build the roadmap. Build the foundation that makes the roadmap inevitable. Context files make the pipeline possible. The pipeline makes drift detection possible. Drift detection makes auto-refresh possible. Each layer works because the previous layer was built right. Solve the current problem completely. The next one will be obvious.

## Every character earns its place

No slop. Not in code, not in context files, not in prompts, not in documentation. If it's there, explain why. If three words do what five did, use three. The target audience is engineers who know what slop looks like — they're coming to us because they shipped it themselves and want to stop.

## Surface what matters, not what checks a box

A world-class architect doesn't ask obvious questions. They ask "your auth flow creates a new session on every request — is that intentional?" The bar for surfacing something: would a senior person at this company want to know this before proceeding? Don't surface things to appear thorough. Surface things that change decisions.

## Curated context over raw exploration

Context files give agents focused project knowledge without burning tokens reading source files. A 30-token summary is more useful than 15K tokens of raw code — higher signal, survives attention degradation, leaves the context window for the actual task. The value is curation, not volume.

## When building costs zero, taste is the differentiator

Everyone can build anything. The person who knows WHAT to build wins. That's taste — knowing the problem deeply enough to build the right thing, not just a thing. How a question is asked, how a scope is structured, how a confirmation feels — that's design. Both approaches are correct. Which one is RIGHT? Correctness is table stakes. Craft is the product.

## Finished means a stranger can extend it

Working means tests pass. Finished means a developer who's never seen the code can read it, understand the intent, add a feature, and trust that the type system catches their mistakes. If extending requires knowing that three files must be updated in lockstep, it's not finished. If understanding requires asking "why does this exist," it's not finished. The bar isn't your team today. The bar is a stranger tomorrow.

## Think more, build less

AI was built to think less, build more. We reverse that. The cost of building is near zero — the cost of building the WRONG thing is enormous. Spend time on diagnosis, design, and tradeoff evaluation. The implementation is the easy part. A feature that took an hour to think through and ten minutes to build beats a feature that took ten minutes to think through and an hour to debug.
