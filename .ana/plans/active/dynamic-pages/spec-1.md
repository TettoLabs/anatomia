# Spec: Dynamic Pages — Phase 1 (Data Pipeline + Reference Pages)

**Created by:** AnaPlan
**Date:** 2026-05-13
**Scope:** .ana/plans/active/dynamic-pages/scope.md

## Approach

Three layers of work, bottom-up: fix prerequisites, extend the extraction pipeline, build reference pages.

**Prerequisites (2 fixes):**
1. Word boundary regex in the extraction script's keyword fallback — all 5 regex patterns at lines 115–119 of `extract-docs-data.ts` need `\b` wrapping so substring matches like "scannable" → "scan" stop happening.
2. Transformer URLs in `source.ts` lines 43–46 — change from the old slug-style paths to the blueprint routes.

**Extraction pipeline extension:** The current `ProofEntry` type has summary counts only. Proof detail pages (Phase 2) need full arrays. Extend the extraction to pull assertions, findings, timing, hashes, severity counts, and pre-computed adjacent slugs. Keep existing `assertionCount`/`findingCount` fields — existing consumers (CuratedProofs, overview page) depend on them. Add new fields alongside.

Three data normalization issues to handle:
- **Timing fields incomplete on 7 entries.** 5 entries missing `verify` (fast-tracked, total_minutes: 0). 2 entries (`findings-lifecycle-foundation`, `content-pages`) missing both `build` and `verify`. Default all missing timing stages to 0.
- **Contract object has 2 shapes.** 34 entries have 6 keys (total, satisfied, unsatisfied, deviated, covered, uncovered). 55 entries have 4 keys. Normalize on the common 3: total, satisfied, unsatisfied.
- **62 findings lack severity.** Default to `"observation"`.

**Skill and agent type extensions:** Add `conditional`, `rules`, and `content` to SkillTemplate. Add `role` to AgentTemplate. The `role` field doesn't exist in frontmatter — use a static `AGENT_ROLES` map (same pattern as the existing `AGENT_READS_WRITES` map in the same file).

**Reference pages:** 4 index routes + 14 detail routes. All follow the catch-all page pattern (`[...slug]/page.tsx`): import data from loaders, render with `docs-content-area` class, render RightRail alongside. Content is translated verbatim from the supermock render functions — not authored from descriptions.

**Agent roles map (6 values):**
| Agent | Role |
|-------|------|
| ana | your project-aware thinking partner |
| ana-plan | The architect |
| ana-build | The builder |
| ana-verify | fault-finder and code reviewer |
| ana-learn | quality gardener |
| ana-setup | Setup orchestrator |

**Conditional skills list (3 values):** `api-patterns`, `data-access`, `ai-patterns`. Static list — matches `CONDITIONAL_SKILL_TRIGGERS` in the CLI constants.

## Output Mockups

### CLI Reference Page (`/docs/reference/cli`)

```
Docs / Reference / CLI commands

CLI commands
────────────────────────────────────────
Every command in the `ana` CLI, grouped by category.
Run `ana --help` or `ana <command> --help` for flags and usage.

Commands · 32    Last reviewed · 2026-05-11
════════════════════════════════════════

## Project Setup

  ana scan
  Scan project structure and dependencies
  Flags: --quick  --deep  --verbose

  ana init
  Initialize Anatomia in a project
  Flags: --force  --skip-scan

## Pipeline
  ...
```

### Agent Index Page (`/docs/reference/agents`)

```
Docs / Reference / Agent templates

Agent templates
────────────────────────────────────────
These are the actual agent definitions that ship into
your repo on `ana init`. Six markdown files, each defining
a role, a model, and behavioral instructions.

Agents · 6    Template path · .claude/agents/

[Note] These are the same templates every user gets...

## Pipeline agents
The four agents that run in sequence during every pipeline cycle.

┌─────────────────────────────────────────┐
│ `ana`                  opus[1m]         │
│ your project-aware thinking partner     │
│ Ana — your project-aware thinking...    │
├─────────────────────────────────────────┤
│ `ana-plan`             opus[1m]         │
│ The architect                           │
│ AnaPlan — reads scope, produces...      │
└─────────────────────────────────────────┘

## System agents
Agents that run outside the pipeline — between cycles or during setup.

┌─────────────────────────────────────────┐
│ `ana-learn`            opus[1m]         │
│ quality gardener                        │
│ Ana Learn — quality gardener...         │
└─────────────────────────────────────────┘
```

### Agent Detail Page (`/docs/reference/agents/{name}`)

```
Docs / Reference / Agent templates / ana-build

ana-build
────────────────────────────────────────
AnaBuild — reads spec, produces working code, tests, and build report. The builder.

Model · opus[1m]  Role · The builder  Template · .claude/agents/ana-build.md
View on GitHub ↗

## What it reads, writes, and cannot touch

| Reads             | Writes                     | Forbidden          |
|-------------------|----------------------------|--------------------|
| spec.md, contract | code, tests, build_report  | (forbidden items)  |

## The actual template
This is the real `ana-build.md` that ships into your repo...

[full markdown body in CodeBlock]

View on GitHub ↗
```

### Skill Index Page (`/docs/reference/skills`)

```
Docs / Reference / Skill files

Skill files
────────────────────────────────────────
Templates that ship on `ana init`. Each has four sections:
Detected (machine-populated), Rules (actionable constraints),
Gotchas (stack-specific traps), Examples (code snippets).
Core skills install for every project. Conditional skills
install when the scan detects their triggers.

Skills · 8    Template path · .claude/skills/{name}/SKILL.md

## Core skills
Installed for every project regardless of stack.

┌─────────────────────────────────────┐
│ `coding-standards`        core      │
│ Invoke when implementing features...│
│ 11 rules                            │
├─────────────────────────────────────┤
│ `testing-standards`       core      │
│ ...                                 │
└─────────────────────────────────────┘

## Conditional skills
Installed only when the scan detects their trigger...

┌─────────────────────────────────────┐
│ `api-patterns`        conditional   │
│ ...                                 │
└─────────────────────────────────────┘
```

### Skill Detail Page (`/docs/reference/skills/{name}`)

```
Docs / Reference / Skill files / coding-standards

coding-standards
────────────────────────────────────────
Invoke when implementing features, writing code...

Type · Core skill  Rules · 11  Template · .claude/skills/coding-standards/SKILL.md
View on GitHub ↗

## The SKILL.md template
Core skill — installs for every project...

[full SKILL.md content in CodeBlock]

View on GitHub ↗

[Note] This is the template that ships with `ana init`...
```

### Context Reference Page (`/docs/reference/context`)

```
Docs / Reference / Context files

Context files
────────────────────────────────────────
The files in `.ana/` that give agents project-specific
knowledge. These are from the Anatomia repo itself —
the same system that documents your project documents ours.

Files · 4    Path · .ana/context/ and .ana/

## project-context.md
**Path:** `.ana/context/project-context.md`
[description]
[full content in CodeBlock]

## design-principles.md
...

[Note] These are Anatomia's own context files...
```

## File Changes

### `website/scripts/extract-docs-data.ts` (modify)
**What changes:** Word boundary fix on 5 keyword regexes. Extraction pipeline extension: ProofEntry gets assertions array, findings array, timing object, hashes, findingSeverity counts, duration, prevSlug/nextSlug. SkillTemplate gets conditional, rules, content. AgentTemplate gets role via static map. Contract object normalized to 3 common fields.
**Pattern to follow:** Existing `extractProofEntries()`, `extractAgentTemplates()`, `extractSkillTemplates()` functions in the same file.
**Why:** Without pipeline extension, Phase 2 proof pages have no data. Without normalization, components break on entries with missing fields.

### `website/lib/docs-data/types.ts` (modify)
**What changes:** ProofEntry type extended with new fields (assertions array, findings array, timing, hashes, findingSeverity, duration, prevSlug, nextSlug). SkillTemplate extended with conditional, rules, content. AgentTemplate extended with role. New sub-interfaces for ProofAssertion, ProofFinding, ProofTiming.
**Pattern to follow:** Existing type definitions in the same file.
**Why:** Type safety for all downstream consumers.

### `website/lib/source.ts` (modify)
**What changes:** 4 transformer URLs updated from old slug-style to blueprint routes.
**Pattern to follow:** Existing URL patterns in the same file.
**Why:** Sidebar links must match actual page routes.

### `website/lib/docs-data/proofs.ts` (modify)
**What changes:** Add `getProofBySlug(slug)` function. Update `getProofStats()` to use new fields.
**Pattern to follow:** Existing `getAgentByName()` in agents.ts — same cache + find pattern.
**Why:** Proof detail pages need individual entry lookup. Phase 2 needs stats from new fields.

### `website/lib/docs-data/skills.ts` (modify)
**What changes:** No changes needed — existing `getSkillTemplates()` and `getSkillByName()` already return the full object. The new fields come from the type extension.
**Pattern to follow:** N/A
**Why:** Listed for completeness — the loader code doesn't need changes, only the types and extraction.

### `website/lib/docs-data/agents.ts` (modify)
**What changes:** No changes needed — same as skills. The new `role` field comes from the type extension.
**Pattern to follow:** N/A
**Why:** Listed for completeness.

### `website/lib/docs-data/index.ts` (modify)
**What changes:** Export `getProofBySlug` from proofs module.
**Pattern to follow:** Existing re-exports in the same file.
**Why:** Reference pages and Phase 2 pages import from the barrel.

### `website/app/docs/reference/cli/page.tsx` (create)
**What changes:** CLI reference page. Imports `getCommandGroups`, `getCommandCount` from data loaders. Renders all command groups with name, args, description, flags. Includes Breadcrumb, MetaRow, RightRail. Uses `docs-content-area` class.
**Pattern to follow:** `website/app/docs/[...slug]/page.tsx` for page structure. Supermock `renderCLIReference()` (pages.js:1547–1568) for content. No supermock CSS classes needed — commands use prose table/div styling.
**Why:** AC8.

### `website/app/docs/reference/agents/page.tsx` (create)
**What changes:** Agent templates index. Imports `getAgentTemplates` from data loaders. Renders cards split into Pipeline agents (ana, ana-plan, ana-build, ana-verify) and System agents (ana-learn, ana-setup). Each card shows name, model badge, role, description.
**Pattern to follow:** Supermock `renderAgentIndex()` (pages.js:1626–1664) for content. Supermock CSS `.ref-grid`, `.ref-card`, `.ref-card-head`, `.ref-card-name`, `.ref-card-badge`, `.ref-card-role`, `.ref-card-desc` (styles.css:844–860) for styling.
**Why:** AC9.

### `website/app/docs/reference/agents/[name]/page.tsx` (create)
**What changes:** Agent detail pages. Uses `generateStaticParams` for all 6 agents. Renders reads/writes/forbidden table, full template markdown in CodeBlock, "View on GitHub ↗" link.
**Pattern to follow:** Supermock `renderAgentDetail()` (pages.js:1666–1700) for content. Agent detail pages use the standard prose table styling (styles.css, prose table rules already in docs.css).
**Why:** AC10, AC35.

### `website/app/docs/reference/skills/page.tsx` (create)
**What changes:** Skill files index. Imports `getSkillTemplates`. Cards split into Core and Conditional sections. Each card shows name, core/conditional badge, description, rule count.
**Pattern to follow:** Supermock `renderSkillIndex()` (pages.js:1703–1739) for content. Same `.ref-grid`, `.ref-card` CSS as agent index (styles.css:844–860).
**Why:** AC11.

### `website/app/docs/reference/skills/[name]/page.tsx` (create)
**What changes:** Skill detail pages. Uses `generateStaticParams` for all 8 skills. Renders full SKILL.md content in CodeBlock, "View on GitHub ↗" link.
**Pattern to follow:** Supermock `renderSkillDetail()` (pages.js:1741–1766) for content. Same styling patterns as agent detail.
**Why:** AC12, AC35.

### `website/app/docs/reference/context/page.tsx` (create)
**What changes:** Context files reference. Imports `getContextFiles`. Renders all 4 files with path, description, full content in CodeBlock.
**Pattern to follow:** Supermock `renderContextReference()` (pages.js:1769–1788) for content.
**Why:** AC13.

### `website/components/docs/reference/ReferenceGrid.tsx` (create)
**What changes:** Reusable grid container for reference cards. Accepts `className` prop. Renders a 2-column CSS grid matching supermock `.ref-grid`.
**Pattern to follow:** Supermock CSS `.ref-grid` (styles.css:845).
**Why:** AC17 — shared by agent index and skill index pages.

### `website/components/docs/reference/AgentCard.tsx` (create)
**What changes:** Card for agent index grid. Shows name (mono, bold), model badge, role, description. Accepts `className` prop. Links to detail page.
**Pattern to follow:** Supermock CSS `.ref-card`, `.ref-card-head`, `.ref-card-name`, `.ref-card-badge`, `.ref-card-role`, `.ref-card-desc` (styles.css:846–858).
**Why:** AC9.

### `website/components/docs/reference/SkillCard.tsx` (create)
**What changes:** Card for skill index grid. Shows name, core/conditional badge, description, rule count. Accepts `className` prop. Links to detail page.
**Pattern to follow:** Same `.ref-card` CSS as AgentCard (styles.css:846–859), with `.ref-card-meta` for rule count.
**Why:** AC11.

### `website/components/docs/reference/CommandGroup.tsx` (create)
**What changes:** Renders a single command group: heading + list of commands with name, args, description, flags. Accepts `className` prop.
**Pattern to follow:** Supermock `renderCLIReference()` command rendering (pages.js:1548–1558). Uses inline styles matching the supermock's command block styling.
**Why:** AC8.

### `website/app/docs/docs.css` (modify)
**What changes:** Add reference card grid styles (`.docs-ref-grid`, `.docs-ref-card`, etc.), hover states for reference cards, responsive collapse rules for ≤1180px (2-col → 1-col grid), ≤880px (single column), ≤660px. Add `docs-content-full` class for Phase 2 explorer (no right padding).
**Pattern to follow:** Existing responsive breakpoint blocks in the same file (lines 388–523). Single-dash kebab naming.
**Why:** AC14, AC17.

## Acceptance Criteria

- [x] AC1: Word boundary regex fix — all 5 keyword fallback patterns use `\b` word boundaries.
- [ ] AC2: Transformer URLs in `source.ts` match blueprint: `/docs/reference/cli`, `/docs/reference/agents`, `/docs/reference/skills`, `/docs/reference/context`.
- [ ] AC3: `ProofEntry` type extended with: `assertions` array (id, says, status), `findings` array (severity, file, summary, suggestedAction, status), `timing` object (think, plan, build, verify, totalMinutes), `hashes` object, `findingSeverity` object (risk, debt, observation), `duration` (totalMinutes), `prevSlug`, `nextSlug`.
- [ ] AC4: `SkillTemplate` type extended with `conditional` (boolean), `rules` (number), `content` (full markdown body).
- [ ] AC5: AgentTemplate type extended with `role` field.
- [ ] AC6: Extraction script produces the extended data for all proof entries. Findings without severity default to `"observation"`. Missing timing stages default to 0. Contract normalized to total/satisfied/unsatisfied.
- [ ] AC7: `prevSlug` and `nextSlug` pre-computed based on chronological sort. First has `prevSlug: null`, last has `nextSlug: null`.
- [ ] AC8: CLI reference page renders at `/docs/reference/cli` from `commands.json`.
- [ ] AC9: Agent templates index renders at `/docs/reference/agents` with Pipeline and System sections.
- [ ] AC10: Agent detail pages render at `/docs/reference/agents/{name}` for all 6 agents.
- [ ] AC11: Skill files index renders at `/docs/reference/skills` with Core and Conditional sections.
- [ ] AC12: Skill detail pages render at `/docs/reference/skills/{name}` for all 8 skills.
- [ ] AC13: Context files reference renders at `/docs/reference/context` with all 4 files.
- [ ] AC14: All reference pages use `docs-content-area` class on content container.
- [ ] AC15: All reference pages render their own RightRail with appropriate TOC entries.
- [ ] AC16: `pnpm build` succeeds with all new routes.
- [ ] AC17: Reference card grids have className props. Responsive collapse rules in `docs.css`.
- [ ] AC34: All reference page ledes, callouts, section headings — translated verbatim from supermock render functions.
- [ ] AC35: Agent and skill detail pages render working "View on GitHub ↗" links pointing to actual template files.
- [ ] Tests pass with project test command.
- [ ] No build errors.

## Testing Strategy

- **Build validation:** `pnpm build` in `website/` is the primary test surface. All routes must statically generate without errors.
- **Extraction validation:** The extraction script's existing validation block (lines 609–625) catches count mismatches. The extended extraction must pass these same checks.
- **Type safety:** TypeScript compilation catches mismatches between types and loaders/components.
- **No unit tests for website components.** This matches existing patterns — the website has zero test files. Verification is via build success + Vercel preview.

## Dependencies

- `proof_chain.json` must exist at `.ana/proof_chain.json` with entries containing assertions, findings, timing, hashes arrays.
- Agent templates at `packages/cli/templates/.claude/agents/*.md` (6 files).
- Skill templates at `packages/cli/templates/.claude/skills/*/SKILL.md` (8 files).
- Existing components: Breadcrumb, MetaRow, Callout, CodeBlock, RightRail.

## Constraints

- Token isolation: all CSS in `docs.css`, scoped under `.docs-layout`. Never `globals.css`.
- No default exports from components — named exports only.
- Website has no `.js` extension requirement (Next.js handles resolution). This differs from the CLI package.
- `generateStaticParams` return objects must match the dynamic segment name exactly: `{ name }` for `[name]`.

## Gotchas

- **RightRail renders in page.tsx, not layout.tsx.** `page.data.toc` is only accessible inside page components. For reference pages there's no MDX toc — build the TOC array manually from section headings.
- **Next.js route specificity.** `/docs/reference/cli/page.tsx` takes priority over `/docs/[...slug]/page.tsx` automatically. No conflict resolution needed.
- **Variable shadowing in extractSkillTemplates.** The inner `content` variable in the section-parsing loop shadows the outer `content` variable (file content). Known issue from proof chain findings. When adding the `content` field to the return object, use the outer `content` (full body), not the inner `content` (section content). The `body` variable (from `parseFrontmatter`) is the cleaner choice — it's the markdown body after frontmatter, which is what `content` should be.
- **Timing normalization.** 5 entries have `total_minutes: 0` with missing verify stage. 2 entries (`findings-lifecycle-foundation`, `content-pages`) are missing both build and verify timing. Default all missing timing keys to 0. The `totalMinutes` in the output should use `timing.total_minutes` from the source, not recalculate from stages (they may not sum correctly on entries with zero stages).
- **Contract shape normalization.** 34 entries have `covered`/`uncovered` keys. 55 don't. Only extract `total`, `satisfied`, `unsatisfied`. Ignore all other keys.
- **Breadcrumb for reference pages.** The catch-all page builds breadcrumbs from URL segments. Reference pages build their own breadcrumb segments manually — pass the correct hierarchy.
- **Skills rule count.** Count the `-` bullet items in the `## Rules` section of each SKILL.md. This is the `rules` number shown on skill cards.

## Build Brief

### Rules That Apply
- Token isolation: all CSS scoped to `docs.css` under `.docs-layout`, never in `globals.css` (D22).
- RightRail renders in page.tsx (D13 learning).
- Content translation: read supermock render functions and translate content VERBATIM — do not author from descriptions (Scope 4 lesson).
- Named exports only — no default exports from components.
- Website components use inline styles matching supermock patterns, with CSS classes only for hover states, pseudo-elements, and responsive rules.
- `generateStaticParams` return objects must match the dynamic segment name exactly.

### Pattern Extracts

**Catch-all page pattern** (`website/app/docs/[...slug]/page.tsx:95–142`):
```tsx
return (
  <div style={{ display: "flex" }}>
    <article className="docs-prose docs-content-area min-w-0 flex-1" style={{ padding: "32px 120px 96px 40px" }}>
      <Breadcrumb segments={segments} />
      <h1 style={{
        fontFamily: "var(--font-serif)", fontWeight: 500, fontSize: "36px",
        lineHeight: 1.1, letterSpacing: "-0.02em", marginBottom: "14px",
        textWrap: "balance", color: "var(--fg)",
      }}>
        {page.data.title}
      </h1>
      {/* ... content ... */}
    </article>
    <RightRail toc={tocItems} commitSha={meta.commitSha} buildTimestamp={meta.buildTimestamp} editUrl={editUrl} />
  </div>
);
```

**Reference card CSS** (supermock `styles.css:844–860`):
```css
.ref-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 24px 0; }
.ref-card {
  display: block; padding: 16px 18px; border: 1px solid var(--border); border-radius: 6px;
  text-decoration: none; color: inherit; cursor: pointer; transition: border-color 120ms;
}
.ref-card:hover { border-color: var(--brand-light); }
.ref-card-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.ref-card-name { font-size: 14px; font-weight: 600; color: var(--ink); }
.ref-card-badge {
  font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;
  padding: 2px 6px; border-radius: 3px; background: var(--bg-code); color: var(--ink-60);
}
.ref-card-role { font-size: 12px; color: var(--ink-40); margin-bottom: 4px; }
.ref-card-desc { font-size: 13px; color: var(--ink-80); line-height: 1.45; }
.ref-card-meta { font-size: 11px; color: var(--ink-40); margin-top: 6px; }
@media (max-width: 660px) { .ref-grid { grid-template-columns: 1fr; } }
```

**MetaRow component** (`website/components/docs/content/MetaRow.tsx:11–41`) — reuse for all reference page meta rows. It accepts `readingTime` and `lastReviewed`. For reference pages, create a simple inline meta row matching the supermock's `.meta-row` style (mono 11px, ink-60, flex with 16px gap, bold labels) with custom fields like "Commands · 32" and "Template path · .claude/agents/".

**Existing Callout component** (`website/components/docs/content/Callout.tsx`) — reuse with `variant="note"` for the agent index callout about template identity.

**Existing CodeBlock component** (`website/components/docs/content/CodeBlock.tsx`) — reuse for rendering full agent and skill template markdown.

### Supermock Source References

Read these render functions and translate content VERBATIM:

| Page | File | Lines | What to translate |
|------|------|-------|-------------------|
| CLI reference | pages.js | 1547–1568 | Lede, meta row values, command group rendering |
| Agent index | pages.js | 1626–1664 | Lede, callout text, section headings/descriptions |
| Agent detail | pages.js | 1666–1700 | Lede, meta row, reads/writes/forbidden table, CodeBlock label, GitHub link |
| Skill index | pages.js | 1703–1739 | Lede, section headings/descriptions |
| Skill detail | pages.js | 1741–1766 | Lede, meta row, conditional/core description, CodeBlock label, GitHub link, callout |
| Context reference | pages.js | 1769–1788 | Lede, meta row, file section rendering, callout |

Supermock location: `/Users/rsmith/Projects/anatomia_project/anatomia_reference/docs-research/supermock/pages.js`

### JSX Pattern Examples

Study these existing Scope 4 files BEFORE writing any component. They demonstrate the exact technique for translating supermock HTML → production JSX with inline styles:

- `website/content/docs/guides/reading-a-proof.mdx` — severity badges, finding cards, integrity seal. **Closest analog to Phase 2 proof components.** Study the inline style objects, the CSS variable usage, the `<div style={{...}}>` pattern.
- `website/content/docs/guides/verifying-changes.mdx` — PASS/FAIL cards, verdict styling.
- `website/content/docs/guides/using-ana-setup.mdx` — colored terminal output, styled cards.

### Proof Context
- `extract-docs-data.ts`: Keyword fallback lacks word boundaries (this spec fixes it). Variable shadowing in `extractSkillTemplates` — use `body` not inner `content`.
- `source.ts`: Page tree URLs don't match blueprint routes (this spec fixes it).
- `proofs.ts`: `process.cwd()` assumes Next.js runs from website root — correct for build, fragile for tests. Not relevant to this build.

### Checkpoint Commands

- After word boundary fix + transformer URL fix: `(cd website && pnpm build)` — Expected: build succeeds, existing pages render.
- After extraction extension: `(cd website && npx tsx scripts/extract-docs-data.ts)` — Expected: all 7 files extracted, proof entries have new fields.
- After all reference pages: `(cd website && pnpm build)` — Expected: build succeeds with all new routes.
- CLI tests: `(cd packages/cli && pnpm vitest run)` — Expected: 2178 tests pass (no regression).
- Lint: `pnpm run lint`

### Build Baseline
- Current tests: 2178 passed, 2 skipped (100 test files)
- Command used: `(cd packages/cli && pnpm vitest run)`
- After build: 2178 tests (no new test files — website has no test infrastructure)
- Regression focus: No CLI tests should break. `pnpm build` in website/ is the website test.
