# Scope: Proof Promote

**Created by:** Ana
**Date:** 2026-04-29

## Intent

The developer wants to turn a recurring finding into a permanent skill rule. `ana proof promote` takes a finding ID and a target skill, appends the rule text to the skill file, transitions the finding to `promoted` status, and commits the change. The command handles plumbing — git workflow, status transition, dashboard regeneration, skill file mutation. The caller provides the judgment: which skill, and optionally what the rule should say via `--text`.

This is the action that closes the learning loop. Verify observes a pattern. The developer (or Learn) decides it should be permanent. Promote encodes it. Build reads the rule on the next run. The declining error rate becomes computable.

## Complexity Assessment
- **Size:** small
- **Files affected:**
  - `packages/cli/src/commands/proof.ts` — new `promote` subcommand registration (~100 lines, follows close pattern)
  - `packages/cli/src/types/proof.ts` — no changes needed, `promoted_to` already exists on `ProofChainEntry.findings`
  - Test files: `packages/cli/tests/commands/proof.test.ts`
- **Blast radius:** Low. Promote is a new subcommand. It mutates proof_chain.json (finding status), PROOF_CHAIN.md (dashboard), and one skill file (append a rule). The close command established the git workflow pattern — promote follows it with one additional staged file.
- **Estimated effort:** One pipeline scope
- **Multi-phase:** no

## Approach

Promote follows the close command's pattern exactly — branch check, pull, read chain, find finding, validate, mutate, write chain, regenerate dashboard, stage, commit, push — with two additions: read and append to a skill file, and stage the skill file alongside proof_chain.json and PROOF_CHAIN.md.

**The command is plumbing.** It doesn't decide what to write or where. `--skill` tells it the target. `--text` tells it the content. Without `--text`, the finding summary is the default. The intelligence is in the caller — a human uses the default, Learn drafts a rule in the skill's voice.

**Appending to the skill file.** Locate the target section (`## Rules` by default, `## Gotchas` with `--section gotchas`). Find the section boundary (next `## ` heading or EOF). If the section contains only a placeholder line (`*Not yet captured.*`), replace the placeholder. Otherwise, append after the last non-empty line in the section. The appended text is `- {rule text}\n` — a bulleted rule matching the existing format.

**Duplicate detection.** Before appending, check existing rules in the target section for word overlap. If any existing rule shares >50% of words with the new rule text, warn but don't block. The developer decides whether to proceed. In `--json` mode, the warning appears as a `duplicate_warning` field in results, not as a stderr message.

## Acceptance Criteria
- AC1: `ana proof promote {id} --skill {name}` transitions the finding's status to `promoted`, sets `promoted_to` to the skill file path, regenerates the dashboard, and commits proof_chain.json + PROOF_CHAIN.md + the skill file
- AC2: Without `--text`, the finding's summary is appended verbatim as a bulleted rule (`- {summary}`) to the target section
- AC3: With `--text "..."`, the provided text is appended instead of the summary. The `rule_text` field in `--json` output shows what was actually written
- AC4: `--skill` is required. Omitting it produces a `SKILL_REQUIRED` error with contextual help listing available skills
- AC5: `--skill {name}` resolves to `.claude/skills/{name}/SKILL.md`. If the file doesn't exist, produces `SKILL_NOT_FOUND` error
- AC6: `--section gotchas` appends to `## Gotchas` instead of `## Rules`. Default is Rules. Only `rules` and `gotchas` are valid values
- AC7: Promoting a finding with `status: promoted` produces `ALREADY_PROMOTED` error showing the previous `promoted_to` path
- AC8: Promoting a finding with `status: closed` produces `ALREADY_CLOSED` error. `--force` overrides and allows promotion of a closed finding (the observation may still be worth encoding even though the specific instance was resolved)
- AC9: `--json` output follows the four-key envelope: `command: "proof promote"`, `results` containing `finding` (id, category, summary, file, severity, suggested_action), `promoted_to`, `rule_text`, and optionally `duplicate_warning`
- AC10: Duplicate detection — if an existing rule in the target section shares >50% of words (case-insensitive, after splitting on whitespace) with the new rule text, a warning is emitted but the promotion proceeds. The developer decides
- AC11: If the target section contains only a placeholder line matching `*Not yet captured*`, the placeholder is replaced by the new rule. Otherwise the rule is appended after existing content
- AC12: The git commit message is `[proof] Promote {id} to {skill-name}` — consistent with the `[proof] Close` format
- AC13: Branch check, pull, and push follow the same pattern as `ana proof close` — require artifact branch, pull before read, push after commit, same error handling

## Edge Cases & Risks

**Promote a lesson.** Upstream observations (`status: lesson`) can become rules. "Contract A003 is too broad" could become "Write contract assertions with specific values, not broad matchers." No special handling needed — promote works on any non-promoted, non-closed finding regardless of status.

**Skill file with no Rules section.** A malformed skill file missing `## Rules` entirely. Produce a `SECTION_NOT_FOUND` error: "Skill file {path} has no ## Rules section." Don't create the section — that would modify the file structure unexpectedly. The skill file should be fixed first.

**Skill file with non-standard section ordering.** The section-boundary detection uses `\n## ` to find the next heading. If a skill file has content after `## Examples` with no trailing newline, the last section extends to EOF. This is correct behavior — append before EOF.

**Empty `--text`.** `--text ""` is an error. The rule text must be non-empty. Produce a `TEXT_EMPTY` error.

**Very long rule text.** No length limit. Skill rules can be multi-sentence paragraphs (see coding-standards and troubleshooting). The command writes what it's told.

**`--force` on a promoted finding.** Double promotion doesn't make sense. `ALREADY_PROMOTED` doesn't honor `--force`. Only `ALREADY_CLOSED` does. If the developer wants to promote to a second skill, they should close the finding first and re-promote (or just manually add the rule to the second skill).

**Concurrent promotes.** Two simultaneous `ana proof promote` calls on different findings. The pull-before-read pattern handles this — the second call sees the first's committed changes. Same concurrency model as close.

## Rejected Approaches

**Default skill mapping from category.** `code` → `coding-standards`, `test` → `testing-standards`. Rejected because a code finding about database pooling belongs in `data-access`, not `coding-standards`. The mapping is too coarse. Wrong defaults are worse than requiring `--skill`.

**Haiku integration in the command.** Building LLM-drafted rule text into the promote command itself. Rejected because it couples the CLI to an API key, adds a model dependency, requires a fallback path, and creates a V1/V2 distinction. The `--text` flag is simpler and more powerful — any caller can draft any text. The intelligence lives in the caller, not the command.

**Creating the skill file if it doesn't exist.** If `--skill data-access` targets a skill that hasn't been created by `ana init`, promote could create it. Rejected because skill file creation is init's job. The file structure, frontmatter, and section scaffolding should come from init, not from promote. Promote appends to existing files.

**Blocking on duplicate detection.** Requiring `--force` to override a duplicate warning. Rejected because word overlap is a rough heuristic — 50% shared words between "cache globSync results" and "avoid repeated globSync calls" would trigger, but these are genuinely different rules (one says cache, the other says avoid). Warn, don't block.

## Open Questions

Design decisions resolved in the F4 requirements session. No open questions for Plan.

## Exploration Findings

### Patterns Discovered
- `close` subcommand (proof.ts:381-566) is the exact structural analog. Same lifecycle: branch check → pull → read chain → find finding → validate → mutate → write chain → regenerate dashboard → git stage/commit/push → output. Promote adds: read skill file → append rule → stage skill file.
- `replaceRulesSection` in skills.ts:458-472 shows how to locate `## Rules` and find the section boundary (`\n## ` for next heading, EOF if last). Promote doesn't replace — it appends — but the boundary detection logic is the same.
- Skill files have a consistent structure: frontmatter → `## Detected` → `## Rules` → `## Gotchas` → `## Examples`. Rules are bulleted (`- `) paragraphs. Some gotchas are bold-prefixed (`- **Title:** description`).
- Placeholder text in unused sections: `*Not yet captured. Add as you discover them during development.*` Varies slightly by skill. Match on `*Not yet captured` prefix, not the full string.

### Constraints Discovered
- [TYPE-VERIFIED] `promoted_to` field exists on `ProofChainEntry.findings` (types/proof.ts:81). No type changes needed.
- [TYPE-VERIFIED] `status` union includes `'promoted'` (types/proof.ts:77). No type changes needed.
- [OBSERVED] The close command uses `spawnSync('git', ['commit', '-m', commitMessage])` (proof.ts:527). Promote follows the same pattern — no shell interpolation, no injection risk.
- [OBSERVED] Close stages two files: `git add .ana/proof_chain.json .ana/PROOF_CHAIN.md` (proof.ts:525). Promote stages three: adds the skill file path.
- [OBSERVED] `createCloseTestProject` (proof.test.ts:932-957) creates a temp directory with git, ana.json, and proof_chain.json. Promote tests need the same setup plus a `.claude/skills/{name}/SKILL.md` file.
- [OBSERVED] Five skill directories exist: coding-standards, deployment, git-workflow, testing-standards, troubleshooting. The `--skill` value maps directly to the directory name.

### Test Infrastructure
- `tests/commands/proof.test.ts` — close tests at lines 1003-1190. Promote tests follow the same pattern: `createPromoteTestProject` creates the environment, `runProof(['promote', ...])` exercises the command, assertions verify chain mutation + skill file mutation + git commit.
- The close test fixture (`closeEntry` at line 960) has findings with various statuses. Promote needs a similar fixture with a finding that has `suggested_action: promote` and a finding with `status: closed` (for `--force` testing).

## For AnaPlan

### Structural Analog
`close` subcommand in proof.ts (lines 381-566). Identical lifecycle pattern with two additions: skill file read/append and three-file git staging. ~185 lines for close; promote will be ~200 lines (close pattern + skill file operations + `--text`/`--section`/`--force` flags + duplicate detection).

### Relevant Code Paths
- `packages/cli/src/commands/proof.ts:381-566` — close subcommand. The pattern to follow line by line.
- `packages/cli/src/commands/init/skills.ts:458-472` — `replaceRulesSection`. Section boundary detection logic to reuse (not the replace, just the boundary finding).
- `packages/cli/src/utils/proofSummary.ts:767-774` — `wrapJsonResponse` for the envelope.
- `packages/cli/src/utils/proofSummary.ts:512-638` — `generateDashboard` for dashboard regeneration after status change.

### Patterns to Follow
- Error handling: `exitError(code, message, context)` helper, same as close (proof.ts:394-423)
- Parent `--json` inheritance: `const useJson = options.json || parentOpts['json']` (proof.ts:391)
- Git workflow: branch check → pull → read → mutate → write → dashboard → stage → commit → push (proof.ts:432-538)
- Commit message format: `[proof] Promote {id} to {skill-name}` matching `[proof] Close {id}: {reason}`

### Known Gotchas
- The skill file path must be repo-relative in the `promoted_to` field (`.claude/skills/testing-standards/SKILL.md`), but the `git add` command uses the full path or cwd-relative path. Use `path.join(proofRoot, promoted_to)` for file operations and store the relative path in the finding.
- Section boundary detection: `fileContent.indexOf('\n## ', sectionStart + 1)` finds the next heading. If the target section is the last section (e.g., `## Examples` is last), `indexOf` returns -1 and the boundary is EOF. Handle both cases.
- The placeholder text varies: `*Not yet captured. Add as you discover them during development.*` vs `*Not yet captured. Add short snippets showing the RIGHT way.*`. Match on `*Not yet captured` prefix only.
- `git add` needs the skill file path. Close does `git add .ana/proof_chain.json .ana/PROOF_CHAIN.md`. Promote does `git add .ana/proof_chain.json .ana/PROOF_CHAIN.md .claude/skills/{name}/SKILL.md`. The skill file is outside `.ana/` — this is correct, the promoted rule is a real code change to the project.

### Things to Investigate
- Whether the `--section` flag should support arbitrary section names or only `rules` and `gotchas`. The F4 doc says only these two. Plan should validate that no skill file has a section that would be a natural promotion target beyond Rules and Gotchas. (Examples is not a promotion target — it's for code snippets.)
- Whether the duplicate detection word-overlap calculation should strip markdown formatting (backticks, bold markers) before comparing. A rule about `` `globSync` `` and a finding about `globSync` (no backticks) should match. Stripping `` ` `` and `*` and `**` before splitting on whitespace is probably right.
