# Spec: Proof Promote

**Created by:** AnaPlan
**Date:** 2026-04-29
**Scope:** .ana/plans/active/proof-promote/scope.md

## Approach

Add a `promote` subcommand to `ana proof` that follows the `close` subcommand's lifecycle pattern exactly: branch check → pull → read chain → find finding → validate → mutate → write chain → regenerate dashboard → stage/commit/push → output. Promote adds two operations that close doesn't have: read a skill file, find the target section, and append rule text (or replace a placeholder line).

The command is plumbing. It doesn't decide what to write or where — the caller provides `--skill` (required) and optionally `--text` and `--section`. Without `--text`, the finding's `summary` field becomes the rule. Without `--section`, the target is `## Rules`.

Register the subcommand in proof.ts immediately after the close subcommand registration (after line 566, `proofCommand.addCommand(closeCommand)`). Follow the identical structure: `new Command('promote')` with `.argument('<id>')`, options, and `.action()`.

**Structural analog:** The `close` subcommand (proof.ts lines 381-566). Same lifecycle with two additions: skill file read/append and three-file git staging.

**Functional analog for section detection:** `replaceRulesSection` in skills.ts (lines 458-472). Same boundary-finding logic (`indexOf('\n## ', sectionStart + 1)`), but promote appends instead of replacing. Don't import from skills.ts — duplicate the ~5 lines of boundary detection inline.

## Output Mockups

### Human-readable (success)

```
✓ Promoted F001 to coding-standards
  [validation] Missing request validation — src/api/payments.ts
  active → promoted
  Rule: - Missing request validation
  Section: ## Rules
  File: .claude/skills/coding-standards/SKILL.md

Chain: 5 runs · 2 active findings
```

### Human-readable (success with --text)

```
✓ Promoted F001 to coding-standards
  [validation] Missing request validation — src/api/payments.ts
  active → promoted
  Rule: - Always validate request bodies before processing
  Section: ## Rules
  File: .claude/skills/coding-standards/SKILL.md

Chain: 5 runs · 2 active findings
```

### Human-readable (duplicate warning)

```
⚠ Similar rule exists: "Validate all request inputs before processing"
✓ Promoted F001 to coding-standards
  [validation] Missing request validation — src/api/payments.ts
  active → promoted
  Rule: - Missing request validation
  Section: ## Rules
  File: .claude/skills/coding-standards/SKILL.md

Chain: 5 runs · 2 active findings
```

### JSON (success)

```json
{
  "command": "proof promote",
  "timestamp": "2026-04-29T10:00:00.000Z",
  "results": {
    "finding": {
      "id": "F001",
      "category": "validation",
      "summary": "Missing request validation",
      "file": "src/api/payments.ts",
      "severity": "risk",
      "suggested_action": "promote"
    },
    "promoted_to": ".claude/skills/coding-standards/SKILL.md",
    "rule_text": "- Missing request validation",
    "section": "## Rules"
  },
  "meta": {
    "chain_runs": 5,
    "findings": { "active": 2, "lesson": 1, "promoted": 1, "closed": 3 }
  }
}
```

### JSON (with duplicate warning)

Same as above, with `"duplicate_warning": "Similar rule exists: \"Validate all request inputs before processing\""` added to `results`.

### Error — missing --skill

```
Error: --skill is required.
  Available skills: coding-standards, deployment, git-workflow, testing-standards, troubleshooting
  Usage: ana proof promote {id} --skill {name}
```

### Error — skill not found

```
Error: Skill "data-access" not found.
  Available skills: coding-standards, deployment, git-workflow, testing-standards, troubleshooting
```

### Error — section not found

```
Error: Skill file .claude/skills/coding-standards/SKILL.md has no ## Rules section.
```

### Error — already promoted

```
Error: Finding "F001" is already promoted.
  Promoted to: .claude/skills/coding-standards/SKILL.md
```

### Error — already closed (without --force)

```
Error: Finding "F001" is already closed.
  Closed by: human on 2026-04-22T10:00:00Z
  Reason: auto-closed
  Use --force to promote a closed finding.
```

## File Changes

### `packages/cli/src/commands/proof.ts` (modify)
**What changes:** New `promote` subcommand registration (~200 lines) added after the close subcommand. Follows close's structure: command definition, exitError helper, validation, git workflow, mutation, output. Two new operations: skill file read/append, duplicate detection.
**Pattern to follow:** The close subcommand at lines 381-566 of the same file.
**Why:** This is the only command registration file for `ana proof`. All subcommands live here.

### `packages/cli/tests/commands/proof.test.ts` (modify)
**What changes:** New `Promote Subcommand Tests` section added after the close tests (after line ~1174). Includes `createPromoteTestProject` helper (extends `createCloseTestProject` with a `.claude/skills/{name}/SKILL.md` file), test fixtures, and test cases covering: success, --text, --section gotchas, --json envelope, error codes (SKILL_REQUIRED, SKILL_NOT_FOUND, SECTION_NOT_FOUND, TEXT_EMPTY, ALREADY_PROMOTED, ALREADY_CLOSED), --force override, duplicate warning, placeholder replacement, and lesson promotion.
**Pattern to follow:** The close test section at lines 926-1174 of the same file.
**Why:** All proof subcommand tests live in this file. The close tests establish the fixture pattern, assertion style, and git-based test setup.

## Acceptance Criteria

- [ ] AC1: `ana proof promote {id} --skill {name}` transitions the finding's status to `promoted`, sets `promoted_to` to the skill file path, regenerates the dashboard, and stages three files explicitly: `git add .ana/proof_chain.json .ana/PROOF_CHAIN.md .claude/skills/{name}/SKILL.md`
- [ ] AC2: Without `--text`, the finding's summary is appended verbatim as a bulleted rule (`- {summary}`) to the target section
- [ ] AC3: With `--text "..."`, the provided text is appended instead of the summary. The `rule_text` field in `--json` output shows what was actually written
- [ ] AC4: `--skill` is required. Omitting it produces a `SKILL_REQUIRED` error with contextual help listing available skills (discovered by globbing `.claude/skills/*/SKILL.md` at the project root)
- [ ] AC5: `--skill {name}` resolves to `.claude/skills/{name}/SKILL.md`. If the file doesn't exist, produces `SKILL_NOT_FOUND` error
- [ ] AC6: `--section gotchas` appends to `## Gotchas` instead of `## Rules`. Default is Rules. Only `rules` and `gotchas` are valid values
- [ ] AC7: Promoting a finding with `status: promoted` produces `ALREADY_PROMOTED` error showing the previous `promoted_to` path
- [ ] AC8: Promoting a finding with `status: closed` produces `ALREADY_CLOSED` error. `--force` overrides and allows promotion of a closed finding
- [ ] AC9: `--json` output follows the four-key envelope: `command: "proof promote"`, `results` containing `finding` (id, category, summary, file, severity, suggested_action), `promoted_to`, `rule_text`, and optionally `duplicate_warning`
- [ ] AC10: Duplicate detection — if an existing rule in the target section shares >50% of words (case-insensitive, after stripping markdown formatting) with the new rule text, a warning is emitted but the promotion proceeds
- [ ] AC11: If the target section contains only a placeholder line matching `*Not yet captured*`, the placeholder is replaced by the new rule. Otherwise the rule is appended after existing content
- [ ] AC12: The git commit message is `[proof] Promote {id} to {skill-name}` — consistent with the `[proof] Close` format
- [ ] AC13: Branch check, pull, and push follow the same pattern as `ana proof close` — require artifact branch, pull before read, push after commit, same error handling
- [ ] AC14: Tests pass with `pnpm vitest run`
- [ ] AC15: No build errors with `pnpm run build`
- [ ] AC16: `--text ""` produces `TEXT_EMPTY` error
- [ ] AC17: Skill file missing the target section produces `SECTION_NOT_FOUND` error

## Testing Strategy

- **Unit tests:** Follow the close test pattern. Each test creates a git-initialized temp directory via `createPromoteTestProject` (extends close's helper with a `.claude/skills/` tree containing at least one skill file with Rules and Gotchas sections). Tests exercise the command via `runProof(['promote', ...])` and assert on stdout/stderr, exit code, chain mutation, skill file content, and git commit messages.
- **Test matrix:**
  - Success: promote active finding → check chain status, promoted_to, skill file content, commit message
  - Success with `--text`: check custom text appears in skill file and JSON output
  - Success with `--section gotchas`: check rule lands in Gotchas section
  - JSON envelope: verify four-key structure, results fields
  - Error: missing `--skill` → SKILL_REQUIRED
  - Error: nonexistent skill → SKILL_NOT_FOUND
  - Error: missing section in skill file → SECTION_NOT_FOUND
  - Error: empty `--text ""` → TEXT_EMPTY
  - Error: already promoted → ALREADY_PROMOTED
  - Error: already closed → ALREADY_CLOSED
  - Error: already closed + `--force` → success
  - Error: wrong branch → WRONG_BRANCH
  - Error: nonexistent finding → FINDING_NOT_FOUND
  - Placeholder replacement: skill file with `*Not yet captured*` → placeholder replaced, not appended after
  - Duplicate warning: existing rule with >50% word overlap → warning emitted, promotion still succeeds
  - Lesson promotion: finding with `status: lesson` → transitions to promoted
- **Edge cases:** Placeholder replacement, duplicate detection with markdown-stripped words, section detection when target section is last in file (boundary is EOF)

## Dependencies

None. All required infrastructure exists: the proof chain types include `promoted` status and `promoted_to` field, the close subcommand establishes the git workflow pattern, and the skill file format is stable.

## Constraints

- No type changes. The `ProofChainEntry.findings` type already has `status: 'promoted'` and `promoted_to: string` fields.
- No new dependencies. All needed imports (`fs`, `path`, `execSync`, `spawnSync`, `chalk`, `Command`, `glob`) are already available in proof.ts or are Node built-ins.
- The skill file is outside `.ana/` — `.claude/skills/{name}/SKILL.md` is a real project file, not an Anatomia artifact. Staging it alongside `.ana/` files in the same commit is intentional.
- Test count must not decrease. Current: 1657 passed across 97 test files.

## Gotchas

- **Skill file path: repo-relative vs absolute.** Store `.claude/skills/{name}/SKILL.md` (repo-relative) in `promoted_to` and use it in human output. For `fs.readFileSync` and `git add`, join with `proofRoot`: `path.join(proofRoot, '.claude', 'skills', skillName, 'SKILL.md')`. The close command uses `proofRoot` for all file operations — follow the same.
- **Section boundary when target is last section.** If `## Gotchas` is followed by `## Examples`, indexOf finds it. If the skill file was hand-edited and `## Gotchas` is last, indexOf returns -1 — use `fileContent.length` as the boundary. The `replaceRulesSection` pattern handles this (`afterRules === -1 ? fileContent.length : afterRules`).
- **Appending position within the section.** After finding the section boundary, don't just append at the boundary. Find the last non-empty line within the section and append after it. This avoids inserting into trailing whitespace between sections. Trim trailing newlines from the section content, append `\n- {text}\n`, then re-add the separator.
- **Placeholder detection.** Placeholder text varies between skill files. Match on a line within the section whose trimmed content starts with `*Not yet captured`. Don't match on the full string — the suffix varies (`Add as you discover them during development.` vs `Add short snippets showing the RIGHT way.`).
- **Glob for available skills discovery.** Use `globSync('.claude/skills/*/SKILL.md', { cwd: proofRoot })` to discover available skill names for the SKILL_REQUIRED contextual help. Extract the directory name from each path. The `glob` package is already in the project's dependencies.
- **`--section` validation.** Only `rules` and `gotchas` are valid. Map to `## Rules` and `## Gotchas` headings. Reject anything else before reading the skill file.
- **Duplicate detection word extraction.** Strip backticks, `*`, and `**` from both the new rule text and existing rules before splitting on whitespace. Use `text.replace(/[`*]/g, '')` then split. Compare word sets with >50% overlap (intersection / union of the smaller set > 0.5, or more precisely: intersection size / smaller set size > 0.5).
- **The `glob` import.** proof.ts doesn't currently import `glob`. Add `import { globSync } from 'glob';` — the package is already a project dependency (see scan.json: `"glob": "^10.3.0"`). Use `.js` extension on all relative imports but not on package imports.

## Build Brief

### Rules That Apply
- All relative imports use `.js` extensions. Package imports (`glob`, `chalk`, `commander`) don't.
- Use `import type` for type-only imports, separate from value imports.
- Prefer named exports. No default exports.
- Early returns over nested conditionals.
- Exported functions require `@param` and `@returns` JSDoc. The promote action is inline (not exported), so JSDoc is not required on the action handler — but add a section comment like close has.
- `spawnSync` for git commit (avoids shell interpolation). `execSync` for git add, pull, push (matching close).
- Always pass `--run` to vitest to avoid watch mode hang.

### Pattern Extracts

**Close subcommand — exitError helper and validation (proof.ts:393-437):**
```typescript
      // Helper: output error and exit
      const exitError = (code: string, message: string, context: Record<string, unknown> = {}): void => {
        let chain: ProofChain | null = null;
        try {
          if (fs.existsSync(proofChainPath)) {
            chain = JSON.parse(fs.readFileSync(proofChainPath, 'utf-8'));
          }
        } catch { /* use null */ }

        if (useJson) {
          console.log(JSON.stringify(wrapJsonError('proof close', code, message, context, chain), null, 2));
        } else {
          console.error(chalk.red(`Error: ${message}`));
          // Print contextual help for specific error codes
          if (code === 'REASON_REQUIRED') {
            console.error('  Proof closures must explain why the finding no longer applies.');
            console.error('  Usage: ana proof close {id} --reason "explanation"');
          } else if (code === 'FINDING_NOT_FOUND') {
            console.error('  Run `ana proof audit` to see active findings.');
          } else if (code === 'ALREADY_CLOSED' && context['closed_by']) {
            console.error(`  Closed by: ${context['closed_by']} on ${context['closed_at'] ?? 'unknown'}`);
            if (context['closed_reason']) {
              console.error(`  Reason: ${context['closed_reason']}`);
            }
          } else if (code === 'WRONG_BRANCH') {
            const artifactBranch = readArtifactBranch(proofRoot);
            console.error(`  Run: git checkout ${artifactBranch}`);
          }
        }
        process.exit(1);
      };
```

**Close subcommand — git stage/commit/push (proof.ts:523-538):**
```typescript
      // Git: stage, commit, push
      try {
        execSync('git add .ana/proof_chain.json .ana/PROOF_CHAIN.md', { stdio: 'pipe', cwd: proofRoot });
        const commitMessage = `[proof] Close ${id}: ${options.reason}`;
        const commitResult = spawnSync('git', ['commit', '-m', commitMessage], { stdio: 'pipe', cwd: proofRoot });
        if (commitResult.status !== 0) throw new Error(commitResult.stderr?.toString() || 'Commit failed');
      } catch {
        console.error(chalk.red('Error: Failed to commit. Changes saved to proof_chain.json but not committed.'));
        process.exit(1);
      }

      try {
        execSync('git push', { stdio: 'pipe', cwd: proofRoot });
      } catch {
        console.error(chalk.yellow('Warning: Push failed. Changes committed locally. Run `git push` manually.'));
      }
```

**Section boundary detection (skills.ts:458-472):**
```typescript
function replaceRulesSection(fileContent: string, newRulesContent: string): string {
  const rulesIdx = fileContent.indexOf('## Rules');
  if (rulesIdx === -1) return fileContent;

  const afterRules = fileContent.indexOf('\n## ', rulesIdx + 1);
  const endIdx = afterRules === -1 ? fileContent.length : afterRules;

  const before = fileContent.slice(0, rulesIdx);
  const after = afterRules === -1 ? '' : fileContent.slice(endIdx);

  const trimmed = newRulesContent.trim();
  const body = trimmed ? trimmed + '\n' : '';

  return before + '## Rules\n' + body + after;
}
```

**Close test helper (proof.test.ts:932-957):**
```typescript
  async function createCloseTestProject(entries: unknown[], options?: { branch?: string }): Promise<void> {
    const branch = options?.branch ?? 'main';

    // Init git
    execSync('git init', { cwd: tempDir, stdio: 'ignore' });
    execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'ignore' });
    execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'ignore' });

    // Create .ana/ana.json
    const anaDir = path.join(tempDir, '.ana');
    await fs.mkdir(anaDir, { recursive: true });
    await fs.writeFile(
      path.join(anaDir, 'ana.json'),
      JSON.stringify({ artifactBranch: 'main' }),
    );

    // Write proof chain
    await fs.writeFile(
      path.join(anaDir, 'proof_chain.json'),
      JSON.stringify({ entries }, null, 2),
    );

    // Initial commit and set branch
    execSync('git add -A && git commit -m "init"', { cwd: tempDir, stdio: 'ignore' });
    execSync(`git branch -M ${branch}`, { cwd: tempDir, stdio: 'ignore' });
  }
```

### Proof Context

No active proof findings for affected files.

### Checkpoint Commands

- After adding the promote subcommand (before tests): `pnpm run build` — Expected: compiles without errors
- After writing tests: `(cd packages/cli && pnpm vitest run tests/commands/proof.test.ts --run)` — Expected: all proof tests pass
- After all changes: `(cd packages/cli && pnpm vitest run)` — Expected: all tests pass, no regressions
- Lint: `pnpm run lint`

### Build Baseline
- Current tests: 1657 passed, 2 skipped
- Current test files: 97 passed
- Command used: `(cd packages/cli && pnpm vitest run)`
- After build: expected ~1675+ tests in 97 test files (promote tests add to existing proof.test.ts)
- Regression focus: `tests/commands/proof.test.ts` — close tests share the same describe block and temp directory setup
