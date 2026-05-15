---
name: Versioning strategy
description: Don't over-bump versions before users arrive. 1.1.0 = "ready for users" release. Ship to main without publishing, verify with real pipeline runs, then bump once.
type: project
---

Don't bump versions frequently before users arrive. The user wants first users to see 1.1 max.

**Why:** "Claude Code is only on version 21." Deliberate, meaningful version bumps. Each bump should tell a story. Currently at 1.0.2. Significant polish has shipped to main since then but hasn't been published.

**How to apply:** Ship worktrees + phase-aware timing + version awareness to main without publishing to npm. Run 3-5 real pipeline cycles through worktrees to verify. Then bump to 1.1.0 and publish as the "ready for users" release. Don't publish intermediate patches (1.0.3, 1.0.4) — nobody is on 1.0.2 except us. The next meaningful bump after 1.1.0 would be when `ana login` ships (platform integration).
