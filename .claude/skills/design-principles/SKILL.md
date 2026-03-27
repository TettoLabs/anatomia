---
name: design-principles
description: "Anatomia design principles. Invoke when evaluating approaches, making architectural decisions, considering tradeoffs, or scoping features."
---

# Design Principles

## Ana shows her work
The product is the moment Ana shows what she found, where she found it, and asks if she's right. Provenance. Transparency. Easy confirmation. Every feature, every architectural decision, every prioritization call should be evaluated against: does this make that moment better? If not, it's not a priority.

## Verified over trusted
Don't trust AI. Verify it. Context files are checked against the actual codebase. AnaVerify runs tests independently — it never trusts AnaBuild's self-report. Hooks and scripts enforce what prompts can't guarantee. When software can verify something, don't rely on the LLM to do it right.

## Earn autonomy through track record
Day 1: the human confirms everything. Month 3: the human glances and approves. The system earns trust like a new hire earns trust — through consistent, verified results. Approval gates don't disappear, but the developer moves through them faster. Design every flow with today's friction and tomorrow's speed.

## Every character earns its place
No AI slop. Not in code, not in context files, not in prompts, not in documentation. If it's there, explain why. If three words do what five did, use three. The target audience is world-class developers who know what slop looks like — they're coming to us because they shipped it themselves and want to stop. We can't hand them more.

## Solve this problem so the next solution becomes obvious
Don't build the roadmap. Build the foundation that makes the roadmap inevitable. Context files make the pipeline possible. The pipeline makes drift detection possible. Drift detection makes auto-refresh possible. Each layer works because the previous layer was built right. Solve the current problem completely. The next one will be obvious.

## Don't trust prompts. Trust software.
Prompts are suggestions. Hooks are guarantees. When something must happen — validation, formatting, state transitions — use scripts, hooks, and mechanical checks. The LLM is the brain. The skeleton is software. Never rely on context or an LLM's intention to guarantee an outcome when code can guarantee it instead.

## Curated context over raw exploration
Context files give agents focused project knowledge without burning tokens reading source files. A 30-token summary is more useful than 15K tokens of raw code — higher signal, survives attention degradation, leaves the context window for the actual task. Include anything that helps agents work faster and more accurately. The value is curation, not secrecy.

## Surface what matters, not what checks a box
A world-class architect doesn't ask obvious questions. They ask "your auth flow creates a new session on every request — is that intentional?" The bar for surfacing something: would a senior person at this company want to know this before proceeding? Don't surface things to appear thorough. Surface things that change decisions.

## Each agent makes the next agent's job easier
Ana's breadcrumbs save AnaPlan exploration time. AnaPlan's gotchas prevent AnaBuild from hitting traps. AnaBuild's report gives AnaVerify exactly what to check. Every agent looks one step beyond its own output. Specs contain what the builder can't discover. Scopes contain what the planner can't infer. Spend tokens on what the next consumer needs, not on what they'll figure out themselves.

## Confirm before acting
Ana previews scope before writing. AnaPlan previews approach before speccing. The pipeline is collaborative — human judgment at every handoff catches misunderstandings no prompt engineering prevents. This is a deliberate choice against fully autonomous pipelines. The developer is an active participant in tradeoffs, not a rubber stamp.

## Only as complex as needed, as simple as possible
Four agents, not eighteen. Don't build for problems you don't have. Don't add abstraction layers for hypothetical scale. But don't create technical debt by cutting corners either. The test: would you have to rebuild this when the next problem arrives, or does it extend naturally? If it extends, ship it. If it needs rebuilding, you went too simple or too complex.

## Agent prompts are generic. Skills are specific.
Context files describe what the project IS. Skills describe what the team WANTS. Agent prompts describe how agents ACT. Teams edit skills. They don't touch agent files. This separation is how Anatomia scales to thousands of teams without forking. When something is project-specific, it belongs in a skill. When something is universal to the pipeline, it belongs in the agent prompt.

## The pipeline is the product
Think. Plan. Build. Verify. Every change gets a why, a how, a what, and a proof. The artifacts are as valuable as the code because they capture decisions. Don't build features that bypass the pipeline. Don't optimize for skipping steps. The pipeline is what turns vague intent into verified software.

## Dogfood is the compass
If Anatomia makes building Anatomia better every day, the product is right. Every feature is tested on ourselves first. Every pain point we hit is a pain point our users will hit. If we stop using our own tool, something is deeply wrong. The product we ship is the product we use.

## When building costs zero, taste is the differentiator
The cost of writing software has plummeted to zero. Everyone can build anything. The person who knows WHAT to build wins. That's taste. That's knowing the problem deeply enough to build the right thing, not just a thing. Anatomia exists in this world — it helps developers figure out what to build and why, not just how. The LLM interaction is a design surface. How Ana asks a question, how a scope is structured, how a confirmation feels — that's design. Not pixels. Design.

## Build for where AI is going, not where it is
Imagine context windows to be infinite. Question first principles. Don't design around today's limitations when those limitations disappear in 18 months. Don't build a caching system for context window limits that won't exist next year. Build the right abstraction that works today and gets better as the platform improves. We are limited by physics and the speed of light, not by current model capabilities.

## The tool grows with the team
One founder on day 1. Three engineers in month 6. Parallel workflows by month 12. Anatomia matures as the team matures — more seats, more autonomy, more parallel specs, more statefulness. The same system that walks a solo founder through every confirmation also supports a five-person team running concurrent pipelines. Design every feature with this growth arc in mind.

## Research, don't assume
Before building a feature, look at how others solved it. Study metaswarm, GSD, Spec Kit, and whatever emerges next. We don't have a low opinion of ourselves, but we don't assume we have the answer to everything. Challenge assumptions. Look at evidence. When something doesn't work as expected, the first response is research, not workaround. The difference between "this doesn't work" and "this doesn't work because of issue #18427" is the difference between guessing and knowing.

## Delay, don't debt
It's fine to defer a feature. It's not fine to ship something you know you'll throw away. Before building, ask: can this be extended later, or will it need to be replaced? If extended — ship it, even if it's minimal. If replaced — don't ship it, wait until the right foundation exists. Delay things that can be fixed later. Never sign up for rework.
