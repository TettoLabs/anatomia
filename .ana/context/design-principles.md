# Design Principles

<!-- Starting principles for AI-augmented development.
     Edit to match your team's philosophy, or replace entirely.
     Ana reads this to understand HOW your team thinks. -->

## Name the disease, not the symptom

Before fixing something, state the root cause in one sentence. A fix that addresses the cause is one fix forever. A fix that addresses the symptom is the first of many.

## Surface tradeoffs before committing

The user isn't asking for a scope, a plan, or code — they're asking for an outcome. Every approach has costs; if the obvious path undermines that outcome, say so before building. Show them the paths, not just the fastest one.

## Every change should be foundation, not scaffolding

Foundation is code you build on top of. Scaffolding is code you tear down later. The test: would a senior engineer approve this — not just for correctness, but for craft? If the answer is "this works, but it's not how we'd do it if we had time" — you don't have time NOT to do it right.

<!-- Add your team's principles below. What tradeoffs do you consistently make?
     What quality bar do you hold? What does "good" mean here?

     A principle changes decisions. "Write clean code" is a platitude.
     "We prefer Result<T,E> over thrown errors" is a principle. -->
