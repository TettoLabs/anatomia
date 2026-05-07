# Spec: Ship Log Polish

**Created by:** AnaPlan
**Date:** 2026-05-07
**Scope:** .ana/plans/active/ship-log-polish/scope.md

## Approach

Two layers, one build. Layer 1: fix copy strings and tag display on the website. Layer 2: add a `kind` field to the proof chain so classification comes from data, not slug heuristics.

The structural analog is `scope_summary` — an optional field parsed from scope.md, threaded through `ProofSummary` → `generateProofSummary()` → `writeProofChain()` → `ProofChainEntry`. Follow that wiring path exactly for `kind`.

The `kind` value is set at scope time by Ana Think (where the diagnosis happens). `extractScopeKind()` parses it from scope.md's Complexity Assessment section. The website prefers explicit `kind` when present, falls back to the existing slug heuristic for old entries.

**Open question resolutions:**
- "Should `ana proof` display show `kind`?" → No. Out of scope. The data exists — terminal display is a trivial follow-up.
- "Parser tolerance?" → Match `**Kind:**` line via regex. Accept `feature`, `fix`, `chore` (case-insensitive on value). Invalid → undefined.

## Output Mockups

### Ship log header (collapsed)
```
● Ship log · 6 verified changes
```

### Ship log header (expanded)
```
Every change has receipts.
```

### Ship log row tags
```
a7b3c4d  FEATURE  Website Direct Polish         12/12  2d ago
f1e2d3c  FIX      CLI Proof Health               8/8   5d ago
b2c3d4e  IMPROVE  Test Suite Cleanup             6/6   1w ago
```

Tags: `feature` (brand color), `fix` (neutral), `improve` (subtle border). CSS classes already exist — `kindFeature`, `kindFix`, `kindChore`. Only the label text changes.

### Ship log footer
```
Source of truth: PROOF_CHAIN.md          Full proof chain →
```

Link points to `https://github.com/TettoLabs/anatomia/blob/main/PROOF_CHAIN.md`.

## File Changes

### `website/lib/copy.ts` (modify)
**What changes:** Three copy strings in the `proofFeed` object:
- `headTitle`: `"Every change has *receipts*."` (no more "commit")
- `footSource`: `"PROOF_CHAIN.md"`
- `footLink`: label becomes `"Full proof chain →"`, href becomes the GitHub blob URL for PROOF_CHAIN.md
**Pattern to follow:** Existing `proofFeed` object structure at line 222.
**Why:** The ship log currently says "commits" and links to GitHub commits. The source of truth is the proof chain, not individual commits.

### `website/components/proof-feed/ProofFeed.tsx` (modify)
**What changes:** Two things:
1. Replace `{entries.length} commits · all verified` with `{entries.length} verified changes` in the collapsed header's `kOpen` span.
2. Replace the tag display `{e.kind === "feature" ? "new" : e.kind}` with a `kindLabel()` function that maps: `feature→"feature"`, `fix→"fix"`, `chore→"improve"`. Define `kindLabel` as a plain function (not a hook — this is a server component), alongside the existing `kindClass` function.
**Pattern to follow:** The existing `kindClass` function at line 19 — same if/return structure.
**Why:** "new" is meaningless as a tag. "feature" matches the classification. "improve" is the user-facing label for chores (implementation polish, hygiene).

### `website/components/proof-feed/proof-feed.module.css` (modify)
**What changes:** Widen the kind column from `54px` to `62px` in the grid-template-columns on `.proofRow`. The labels "FEATURE" and "IMPROVE" are 7 characters each at uppercase with letter-spacing — they need slightly more room than "NEW" (3 chars).
**Pattern to follow:** Existing grid-template-columns declaration at line 261.
**Why:** Without this, "FEATURE" and "IMPROVE" will clip or overflow the tag pill at the current 54px column width.

### `website/lib/proof-feed.ts` (modify)
**What changes:** Two things:
1. Add `kind?: string` to the internal `ProofChainEntry` interface (line 139). This is the website's own interface for the raw API data — separate from the CLI type.
2. Update `mapEntry()` (line 153): prefer `entry.kind` when present and valid (`feature`, `fix`, `chore`), fall back to the existing slug heuristic. Cast to `ProofKind` after validation.
**Pattern to follow:** Existing `mapEntry()` structure — add kind resolution before the return statement.
**Why:** Old proof chain entries lack `kind`. The fallback ensures they still display correctly. New entries get accurate classification from data.

### `packages/cli/src/types/proof.ts` (modify)
**What changes:** Add `kind?: 'feature' | 'fix' | 'chore' | undefined` to `ProofChainEntry` interface. Place it next to `scope_summary` (line 65) — both are optional intelligence-capture fields.
**Pattern to follow:** `scope_summary?: string | undefined` on line 65 — same optional pattern with explicit `| undefined`.
**Why:** The CROSS-CUTTING comment at line 14 documents the 4-location protocol. This is location 1.

### `packages/cli/src/utils/proofSummary.ts` (modify)
**What changes:** Three things:
1. Add `kind?: 'feature' | 'fix' | 'chore' | undefined` to the `ProofSummary` interface, next to `scope_summary` (line 66).
2. Add `extractScopeKind()` — a new exported function following the exact pattern of `extractScopeSummary()` at line 410. Reads scope.md, regex matches `**Kind:**` line in Complexity Assessment, validates against three allowed values, returns the value or undefined.
3. In `generateProofSummary()`, call `extractScopeKind()` right after `extractScopeSummary()` (line 1794) and assign to `summary.kind`.
**Pattern to follow:** `extractScopeSummary()` at line 410-421 — same file-exists check, same try/catch, same return-undefined-on-failure pattern.
**Why:** This is locations 2 (type default) and the parser. The field flows through `generateProofSummary()` into the proof summary that `writeProofChain()` consumes.

### `packages/cli/src/commands/work.ts` (modify)
**What changes:** Add `kind: proof.kind` to the entry construction object, next to `scope_summary: proof.scope_summary` at line 838.
**Pattern to follow:** `scope_summary: proof.scope_summary` — identical one-line wiring.
**Why:** This is location 3 from the CROSS-CUTTING comment. Wires the parsed kind into the proof chain entry.

### `packages/cli/templates/.claude/agents/ana.md` (modify)
**What changes:** Add `- **Kind:** feature / fix / chore` as the first bullet in the Complexity Assessment section, before `**Size:**`.
**Pattern to follow:** Existing bullet format in the same section: `- **Size:** small / medium / large`.
**Why:** This is the template that ships to customers. Ana Think reads this template when writing scope.md. The `Kind` line tells it to classify the work, which `extractScopeKind()` then parses.

### `.claude/agents/ana.md` (modify)
**What changes:** Same `- **Kind:** feature / fix / chore` line as the template.
**Pattern to follow:** Must match the template file exactly in the Complexity Assessment section.
**Why:** Dogfood copy. This is the ana.md that Anatomia's own pipeline uses. Template sync is required — both files must have identical content in this section.

## Acceptance Criteria

- [ ] AC1: `headTitle` in copy.ts reads `"Every change has *receipts*."` — no instance of the word "commit" or "commits" in the proof feed section
- [ ] AC2: Source of truth link points to `PROOF_CHAIN.md` on GitHub, label reads "Full proof chain →"
- [ ] AC3: Tags display as "feature", "fix", or "improve" — never "new"
- [ ] AC4: Expanded header says `"{n} verified changes"` not `"{n} commits · all verified"`
- [ ] AC5: `templates/.claude/agents/ana.md` scope template includes `**Kind:** feature / fix / chore` in the Complexity Assessment section
- [ ] AC6: `.claude/agents/ana.md` (dogfood copy) has the same `**Kind:**` line as the template
- [ ] AC7: `extractScopeKind()` exists in `proofSummary.ts`, returns parsed kind or undefined
- [ ] AC8: `ProofSummary` type has `kind?: 'feature' | 'fix' | 'chore'`
- [ ] AC9: `ProofChainEntry` type has `kind?: 'feature' | 'fix' | 'chore'`
- [ ] AC10: `writeProofChain()` writes `kind` to the entry (same pattern as `scope_summary`)
- [ ] AC11: `generateProofSummary()` calls `extractScopeKind()` and sets `proof.kind`
- [ ] AC12: A scope with `**Kind:** fix` produces a proof chain entry with `kind: "fix"`
- [ ] AC13: A scope missing `**Kind:**` produces an entry with `kind: undefined` (no crash)
- [ ] AC14: Existing proof chain entries without `kind` still load and display correctly
- [ ] AC15: Website `mapEntry()` prefers explicit `kind` from entry, falls back to slug heuristic
- [ ] AC16: Website `kindLabel()` mapping: feature→"feature", fix→"fix", chore→"improve"
- [ ] AC17: The `ProofEntry` interface in `proof-feed.ts` includes `kind?: string` so TypeScript accepts the field from the API
- [ ] Tests pass with `(cd packages/cli && pnpm vitest run)`
- [ ] No build errors with `pnpm run build`

## Testing Strategy

- **Unit tests:** Add tests for `extractScopeKind()` in `packages/cli/tests/utils/proofSummary.test.ts`, following the existing `extractScopeSummary` describe block (line 1542). Test cases:
  - Scope with `**Kind:** fix` → returns `"fix"`
  - Scope with `**Kind:** feature` → returns `"feature"`
  - Scope with `**Kind:** chore` → returns `"chore"`
  - Scope with `**Kind:** Feature` (capitalized value) → returns `"feature"`
  - Scope with `**Kind:** invalid` → returns `undefined`
  - Scope with no Kind line → returns `undefined`
  - Scope file doesn't exist → returns `undefined`
  - Scope with Kind outside Complexity Assessment section → returns `undefined` (parser should match within the section context, but if the regex is line-based this is acceptable to match anywhere — document the choice)
- **Integration:** The `generateProofSummary()` function is already tested indirectly through proof chain integration tests. The `kind` field wiring follows `scope_summary` which is already covered.
- **Edge cases:** Invalid kind values, missing scope files, old proof chain entries without `kind`.
- **No website tests.** Website has no test suite. Visual verification only.

## Dependencies

None. All affected files exist. No new packages needed.

## Constraints

- `ProofChainEntry` is consumed by every proof command, health computation, and the website. The `kind` field must be optional with `| undefined` to maintain backward compatibility with old entries.
- Template files are raw markdown — no type checking. The `**Kind:**` line format must match what `extractScopeKind()` regex expects.
- `ProofFeed.tsx` is a server component (async). No hooks. `kindLabel()` must be a plain function.

## Gotchas

- The CROSS-CUTTING comment in `proof.ts` (line 14-21) lists 4 locations. This scope touches 3 of them (type, generateProofSummary, writeProofChain). Location 4 is display in proof.ts commands — deliberately skipped per open question resolution. Don't add terminal display changes.
- The `ProofEntry` interface in `website/lib/proof-feed.ts` (line 23) is separate from the CLI's `ProofChainEntry`. They're in different packages with no shared types. Both need `kind` added independently.
- The website `ProofChainEntry` interface (line 139 in proof-feed.ts) is a minimal subset — it only has `slug`, `feature`, `result`, `contract`, `hashes`, `completed_at`. Add `kind?: string` here (not the full union type — the website validates in `mapEntry()`).
- `kindClass()` in ProofFeed.tsx (line 19-23) already handles the CSS class mapping correctly for all three kinds. Don't change it — only add the new `kindLabel()` function for the display text.
- The mobile grid template (line 322 in CSS) has the kind column at `54px` — update this to `62px` too.

## Build Brief

### Rules That Apply
- All imports use `.js` extensions: `import { extractScopeKind } from './proofSummary.js'` if needed (though it's in the same file).
- Use `import type` for type-only imports.
- Explicit return types on exported functions: `extractScopeKind()` must declare its return type.
- `@param` and `@returns` JSDoc on exported functions.
- Optional fields use `?: type | undefined` pattern (match `scope_summary` precedent).
- Early returns over nested conditionals.

### Pattern Extracts

**`extractScopeSummary()` — the parser pattern to follow (proofSummary.ts:410-421):**
```typescript
export function extractScopeSummary(scopePath: string): string | undefined {
  if (!fs.existsSync(scopePath)) return undefined;
  try {
    const content = fs.readFileSync(scopePath, 'utf-8');
    const intentMatch = content.match(/## Intent\n([\s\S]*?)(?=\n## |\n\n|$)/);
    if (!intentMatch || !intentMatch[1]) return undefined;
    const paragraph = intentMatch[1].trim();
    return paragraph || undefined;
  } catch {
    return undefined;
  }
}
```

**`scope_summary` wiring in generateProofSummary() (proofSummary.ts:1792-1794):**
```typescript
  // Source 5: scope.md (for scope_summary)
  const scopePath = path.join(slugDir, 'scope.md');
  summary.scope_summary = extractScopeSummary(scopePath);
```

**Entry construction wiring in writeProofChain() (work.ts:838):**
```typescript
    scope_summary: proof.scope_summary,
```

**Website mapEntry() — slug heuristic to replace (proof-feed.ts:153-164):**
```typescript
function mapEntry(entry: ProofChainEntry, version: string): ProofEntry {
  return {
    version,
    hash: entry.hashes.scope.slice(7, 14),
    ts: entry.completed_at,
    kind: entry.slug.startsWith("fix-") ? "fix" : "feature",
    feat: entry.feature,
    feature_em: extractFeatureEm(entry.feature),
    assertions: entry.contract.total,
    passed: entry.contract.satisfied,
  };
}
```

**Website tag display — the line to replace (ProofFeed.tsx:96):**
```tsx
                  {e.kind === "feature" ? "new" : e.kind}
```

**Test pattern to follow (proofSummary.test.ts:1542-1577):**
```typescript
describe('extractScopeSummary', () => {
  let tempDir: string;

  beforeEach(async () => {
    // creates temp dir
  });

  it('extracts first paragraph from Intent section', () => {
    const scopePath = path.join(tempDir, 'scope.md');
    fs.writeFileSync(scopePath, '# Scope\n\n## Intent\nThis is the intent paragraph text.\n\n## Other section\n');
    const result = extractScopeSummary(scopePath);
    expect(result).toBe('This is the intent paragraph text.');
  });

  it('returns undefined when scope.md does not exist', () => {
    const result = extractScopeSummary(path.join(tempDir, 'nonexistent.md'));
    expect(result).toBeUndefined();
  });
```

### Proof Context
- `proofSummary.ts`: File is ~1550 lines and growing. Known concern. This change adds ~15 lines — acceptable. No blockers.
- No active proof findings for other affected files.

### Checkpoint Commands

- After type changes (proof.ts, proofSummary.ts types): `pnpm run build` — Expected: compiles clean
- After `extractScopeKind()` + tests: `(cd packages/cli && pnpm vitest run)` — Expected: all tests pass including new ones
- After all changes: `(cd packages/cli && pnpm vitest run)` — Expected: 2020+ tests pass
- Lint: `pnpm run lint`

### Build Baseline
- Current tests: 2013 passed, 2 skipped (2015 total)
- Current test files: 96
- Command used: `(cd packages/cli && pnpm vitest run)`
- After build: expected ~2021+ tests in 96 files (new tests are additive to existing test file)
- Regression focus: `proofSummary.test.ts` — existing `extractScopeSummary` tests must still pass
