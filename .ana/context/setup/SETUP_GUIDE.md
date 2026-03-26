# SETUP_GUIDE — Legacy Reference

**Note:** Setup is now orchestrated by `modes/setup.md` with sub-agents. This file is no longer the primary orchestrator.

---

## Current Architecture

Setup uses a sub-agent architecture:

| Component | Location | Purpose |
|-----------|----------|---------|
| Orchestrator | `modes/setup.md` | User interaction, agent delegation |
| Tier files | `modes/setup-{quick,guided,complete}.md` | Question selection per tier |
| Explorer agent | `.claude/agents/ana-explorer.md` | Codebase exploration |
| Question agent | `.claude/agents/ana-question-formulator.md` | Pre-answer formulation |
| Writer agent | `.claude/agents/ana-writer.md` | Context file writing |
| Verifier agent | `.claude/agents/ana-verifier.md` | Citation verification |
| Step files | `context/setup/steps/0X_*.md` | Per-file writing instructions |

---

## State Management

Setup state is tracked in `.ana/.setup_state.json`:
- Phase tracking (exploration, questions, writing, verification)
- Per-file completion status
- Resumption on interruption

---

## Quality Gates

Verification is mechanical:
- **PostToolUse hook**: `ana setup check` runs after every Write to context files
- **Stop hook**: Quality gate blocks completion if files fail validation
- **Verifier agent**: Independent citation verification using factored CoVe pattern

---

## Reference Files

These files remain as references for the writer agent:
- `context/setup/templates.md` — Quality examples per section
- `context/setup/rules.md` — Line limits, ask-vs-infer rules
- `context/setup/steps/*.md` — Per-file extraction targets and structure
