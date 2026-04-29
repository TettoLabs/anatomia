# Spec: Namespaced Assertion IDs

**Created by:** AnaPlan
**Date:** 2026-04-29
**Scope:** .ana/plans/active/namespaced-assertion-ids/scope.md

## Approach

Tag collision (INFRA-064) is the most recurring proof system finding — 7 instances across 7 runs. Every contract generates `A001`, `A002`, etc., so pre-check matches tags from ANY feature's test files, not just the current one. The fix: prefix assertion IDs with a slug-derived namespace. `A001` becomes `HGCC-A001` (for `harden-git-commit-calls`).

Three things change:

1. **Plan template** — instruct Plan to generate slug-derived prefixed IDs in every contract. The `id` field description and contract YAML example both change. Add collision-avoidance instruction.
2. **Build and Verify templates** — update all `@ana` tag examples and assertion ID references to use the prefixed format.
3. **verify.ts** — fix the pre-check regex at two locations (lines 163 and 200) to allow hyphens in the character class between `@ana` and the assertion ID. One character: `[\w,\s]*` → `[\w,\s-]*`.

Dogfood copies (`.claude/agents/ana-{plan,build,verify}.md`) get the exact same changes as the templates. The changed sections must match character-for-character.

## Output Mockups

### Pre-check output with prefixed IDs

```
NAI-A001  ✓ COVERED  "Prefixed assertion IDs match correctly in pre-check"
NAI-A002  ✓ COVERED  "Comma-separated prefixed IDs both match"
NAI-A003  ✗ UNCOVERED "Unprefixed tags don't match prefixed contract IDs"
```

### Contract YAML example (as it appears in the Plan template)

```yaml
assertions:
  - id: HGCC-A001
    says: "Creating a payment returns a successful response"
    block: "creates payment intent"
    target: "response.status"
    matcher: "equals"
    value: 200
```

### Test tag format (as it appears in the Build template)

```typescript
// @ana HGCC-A001
it('creates payment intent with valid amount', () => {
  expect(response.status).toBe(200);
});
```

## File Changes

### `packages/cli/templates/.claude/agents/ana-plan.md` (modify)
**What changes:** Three sections within the contract instructions:
1. The contract YAML example block — all `id:` values change from `A001`/`A002` to `HGCC-A001`/`HGCC-A002`.
2. The `id` field description — changes from "Unique ID, format A001, A002, etc. Sequential." to include the prefix rule with multi-word and single-word examples.
3. Add a new paragraph after the `id` field description explaining collision avoidance: check existing contracts in `.ana/plans/` for prefix collisions.

**Pattern to follow:** The existing contract schema section starting at line 221.
**Why:** This is the instruction that makes every future contract use namespaced IDs. Without it, the pipeline keeps generating collision-prone unprefixed IDs.

### `packages/cli/templates/.claude/agents/ana-build.md` (modify)
**What changes:** The "Test Tagging with @ana" section (around line 159):
1. The code example changes `// @ana A001` to `// @ana HGCC-A001`.
2. The multi-ID rule changes `// @ana A001, A002` to `// @ana HGCC-A001, HGCC-A002`.
3. The coverage report instruction changes `@ana` tag description to mention prefixed IDs.

**Pattern to follow:** The existing tagging section starting at line 159.
**Why:** Build needs to see prefixed examples to generate prefixed tags. The LLM mirrors what it reads.

### `packages/cli/templates/.claude/agents/ana-verify.md` (modify)
**What changes:** Pre-check output examples and assertion table examples:
1. The pre-check output block (lines 158-161) changes `A001`/`A002`/`A003` to `HGCC-A001`/`HGCC-A002`/`HGCC-A003`.
2. The contract compliance table example (lines 215-219) changes `A001`/`A002`/`A003` to `HGCC-A001`/`HGCC-A002`/`HGCC-A003`.
3. The re-verify resolution table (line 326) changes `A015` to `HGCC-A015`.
4. Any other inline references to unprefixed assertion IDs in examples.

**Pattern to follow:** The existing pre-check and compliance sections.
**Why:** Verify needs to recognize the prefixed format as normal. Examples set expectations.

### `.claude/agents/ana-plan.md` (modify)
**What changes:** Exact same changes as the template copy.
**Why:** Dogfood sync — this project's own pipeline uses these agents.

### `.claude/agents/ana-build.md` (modify)
**What changes:** Exact same changes as the template copy.
**Why:** Dogfood sync.

### `.claude/agents/ana-verify.md` (modify)
**What changes:** Exact same changes as the template copy.
**Why:** Dogfood sync.

### `packages/cli/src/commands/verify.ts` (modify)
**What changes:** Two regex patterns:
- Line 163: `@ana\\s+[\\w,\\s]*\\b` → `@ana\\s+[\\w,\\s-]*\\b`
- Line 200: `@ana\\s+[\\w,\\s]*\\b` → `@ana\\s+[\\w,\\s-]*\\b`

One character addition (`-`) in each character class.

**Pattern to follow:** The existing regex on those lines.
**Why:** Without the hyphen, the regex can't scan past earlier prefixed IDs in a comma-separated list. `@ana HGCC-A001, HGCC-A002` — when matching `HGCC-A002`, the regex needs to skip `HGCC-A001, ` which contains a hyphen.

### `packages/cli/tests/commands/verify.test.ts` (modify)
**What changes:** Add 3 new tests to the existing pre-check describe block:
1. Prefixed ID matches — contract has `HGCC-A001`, test file has `// @ana HGCC-A001`, result is COVERED.
2. Comma-separated prefixed IDs — contract has `HGCC-A001` and `HGCC-A002`, test file has `// @ana HGCC-A001, HGCC-A002`, both COVERED.
3. Unprefixed tag does NOT match prefixed contract — contract has `HGCC-A001`, test file has `// @ana A001`, result is UNCOVERED.

**Pattern to follow:** The existing test at line 173 ("reports INTACT when contract unchanged") — same `createContractProject` helper, same assertion pattern.
**Why:** These three tests verify the regex fix works for the exact scenarios that caused INFRA-064.

## Acceptance Criteria

- [ ] AC1: Plan template instructs Plan to generate a slug-derived prefix for all assertion IDs. The instruction includes the prefix rule: first letter of each slug word, uppercase, for multi-word slugs. First 3 characters uppercase for single-word slugs. Minimum 3 characters.
- [ ] AC2: Plan template instructs Plan to check existing contracts in `.ana/plans/` and avoid prefix collisions. If collision detected, extend by one character.
- [ ] AC3: Contract YAML example in Plan template uses prefixed IDs: `HGCC-A001` format.
- [ ] AC4: Build template tag format example uses prefixed IDs: `// @ana HGCC-A001`.
- [ ] AC5: Verify template reference format uses full prefixed IDs.
- [ ] AC6: Pre-check regex at verify.ts lines 163 and 200 matches prefixed IDs correctly. `[\w,\s]*` → `[\w,\s-]*`.
- [ ] AC7: Pre-check matches `@ana HGCC-A001` in test files.
- [ ] AC8: Pre-check matches comma-separated prefixed IDs: `@ana HGCC-A001, HGCC-A002` — both IDs reported as COVERED.
- [ ] AC9: Pre-check does NOT match unprefixed `A001` when the contract specifies `HGCC-A001`.
- [ ] AC10: Dogfood copies (`.claude/agents/ana-plan.md`, `.claude/agents/ana-build.md`, `.claude/agents/ana-verify.md`) contain the same prefix instructions as the templates. The changed sections match exactly.
- [ ] AC11: Tests pass: `(cd packages/cli && pnpm vitest run)`
- [ ] AC12: Lint passes: `pnpm lint`
- [ ] AC13: No existing tests break — the regex change is additive (allows hyphens, doesn't require them).

## Testing Strategy

- **Unit tests:** 3 new tests in `packages/cli/tests/commands/verify.test.ts`, added to the existing `describe('contract pre-check')` block. Follow the existing pattern using `createContractProject` helper with contract YAML containing prefixed IDs and test files with prefixed `@ana` tags.
- **Regression:** All 12 existing pre-check tests continue to pass unchanged — they use unprefixed IDs, and the regex fix is additive (adds `-` to the character class, doesn't remove anything).
- **Edge cases:**
  - Comma-separated prefixed IDs (the actual failure scenario from INFRA-064)
  - Unprefixed tag against prefixed contract (must be UNCOVERED — this proves collision resistance)

## Dependencies

None. All affected files exist and are current on main.

## Constraints

- The regex change must be additive — existing unprefixed ID matching must still work for in-progress pipeline runs.
- Template changes are instructional only — no code generators, no prefix validation logic. The LLM follows the instructions.
- Dogfood copies must match templates character-for-character in the changed sections.

## Gotchas

- **Two regex locations in verify.ts.** Lines 163 AND 200. Both need the fix. Line 200 is the fallback global search that runs when scoped search finds UNCOVERED assertions. Missing the second location means the out-of-scope detection breaks for prefixed IDs.
- **Don't touch existing test assertions.** The existing tests use unprefixed IDs (`A001`) and must continue passing. The new tests add prefixed scenarios alongside them.
- **The `\b` word boundary works correctly with hyphens.** `\b` treats `-` as a non-word character, so `\bHGCC-A001\b` matches correctly. The only issue is the character class `[\w,\s]*` between `@ana` and the ID — it needs to include `-` to skip past earlier prefixed IDs in a comma list.
- **Template line numbers are approximate.** The templates are large markdown files. Search for the content described (e.g., search for `id: A001` in the contract example) rather than relying on line numbers.
- **The "Bad" examples in the Plan template.** Line 265 says `Bad: "A001 test"`. This should stay as-is — it's illustrating bad `says` field content, not bad ID format. The ID prefix is irrelevant to that example's point.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions and `node:` prefix for built-ins.
- Always pass `--run` flag when invoking Vitest to avoid watch mode hang.
- Test behavior, not implementation — assert on what pre-check returns, not how it constructs the regex.
- Assert on specific expected values: `expect(status).toBe('COVERED')` not `expect(status).toBeDefined()`.
- Dogfood sync: changed sections must match character-for-character between template and `.claude/agents/` copy.

### Pattern Extracts

**Pre-check regex — verify.ts lines 163 and 200:**
```typescript
// Line 163 (scoped search):
const pattern = new RegExp(`@ana\\s+[\\w,\\s]*\\b${assertion.id}\\b`);

// Line 200 (global fallback):
const pattern = new RegExp(`@ana\\s+[\\w,\\s]*\\b${assertion.id}\\b`);
```

Both become: `new RegExp(\`@ana\\s+[\\w,\\s-]*\\b${assertion.id}\\b\`)`

**Existing test pattern — verify.test.ts lines 173-196:**
```typescript
// @ana A001
it('reports INTACT when contract unchanged', async () => {
  const contract = `version: "1.0"
sealed_by: "AnaPlan"
feature: "Test Feature"
assertions:
  - id: A001
    says: "Test passes"
    block: "test"
    target: "result"
    matcher: "truthy"
file_changes:
  - path: src/test.ts
    action: create`;

  await createContractProject({
    slug: 'test-slug',
    contract,
    testFiles: [{ path: 'tests/test.test.ts', content: '// @ana A001\ntest()' }],
  });

  const result = runContractPreCheck('test-slug', tempDir);
  expect(result.seal).toBe('INTACT');
});
```

New tests follow this exact shape — swap `A001` for `HGCC-A001` in the contract and test file content.

**Plan template contract example — ana-plan.md lines 228-240:**
```yaml
assertions:
  - id: A001
    says: "Creating a payment returns a successful response"
    block: "creates payment intent"
    target: "response.status"
    matcher: "equals"
    value: 200

  - id: A002
    says: "Payment response includes a client secret for the frontend"
    block: "creates payment intent"
    target: "response.body.clientSecret"
    matcher: "exists"
```

Both IDs become `HGCC-A001` and `HGCC-A002`.

**Build template tagging section — ana-build.md lines 163-172:**
```typescript
// @ana A001
it('creates payment intent with valid amount', () => {
  expect(response.status).toBe(200);
});
```

Becomes `// @ana HGCC-A001`. Multi-ID rule: `// @ana A001, A002` becomes `// @ana HGCC-A001, HGCC-A002`.

### Proof Context

- [code] `verify.ts` — `execSync` import retained for merge-base/diff commands. Not relevant to this change — the regex is in a different code path.
- No active proof findings for verify.test.ts.

### Checkpoint Commands

- After verify.ts regex fix: `(cd packages/cli && pnpm vitest run tests/commands/verify.test.ts --run)` — Expected: all existing tests pass (12 tests in this describe block)
- After adding new tests: `(cd packages/cli && pnpm vitest run tests/commands/verify.test.ts --run)` — Expected: 12 + 3 = 15 pre-check tests pass
- After all changes: `(cd packages/cli && pnpm vitest run)` — Expected: 1602+ tests pass (1599 current + 3 new)
- Lint: `pnpm lint`

### Build Baseline
- Current tests: 1599 passed, 2 skipped (1601 total)
- Current test files: 97
- Command used: `(cd packages/cli && pnpm vitest run)`
- After build: expected 1602 passed in 97 test files (3 new tests, no new test files)
- Regression focus: `packages/cli/tests/commands/verify.test.ts` — existing pre-check tests must not break
