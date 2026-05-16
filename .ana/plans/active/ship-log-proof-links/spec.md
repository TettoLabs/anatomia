# Spec: Ship log proof linking

**Created by:** AnaPlan
**Date:** 2026-05-16
**Scope:** .ana/plans/active/ship-log-proof-links/scope.md

## Approach

Thread `slug` through the proof feed data layer so expanded ship log rows become clickable links to `/docs/proof/{slug}`. The slug already exists in `ProofChainEntry` — it's explicitly dropped in `mapEntry()`. Pass it through as an optional field on `ProofEntry`, wrap rows conditionally in Next.js `<Link>`, and enable `dynamicParams` on the proof detail page so entries newer than the last Vercel build render on-demand via a GitHub API fallback.

Two code paths in the proof detail page after this change:
1. **Static path** (existing) — `getProofBySlug()` finds the entry in build-time JSON → render rich page with Gantt, assertion ledger, findings, integrity seal.
2. **Dynamic fallback** (new) — `getProofBySlug()` returns null → fetch proof_chain.json from GitHub raw API → find the entry by slug → render minimal summary (feature, result, assertion count, date, "full details on next build" note) → or `notFound()` if slug doesn't exist anywhere.

The mock feed (GitHub API fallback) uses real slugs from completed pipeline runs that are guaranteed to exist in the static build.

## Output Mockups

**Ship log row (expanded) — with link:**
Each row looks identical to today but the cursor shows pointer and clicking navigates to `/docs/proof/{slug}`. The existing hover state (brand-soft background + hash color change) serves as the affordance.

**Fallback proof page (new slug not yet built):**
```
Breadcrumb: Proof Chain > {slug}

┌─────────────────────────────────────────────┐
│  {Feature Name}                             │
│  PASS · 24/24 assertions · May 16, 2026    │
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│  Full verification details will appear on   │
│  the next site build. This page shows a     │
│  summary from the proof chain.              │
│                                             │
│  → View source on GitHub                    │
└─────────────────────────────────────────────┘
```

## File Changes

### `website/lib/proof-feed.ts` (modify)
**What changes:** Add `slug?: string` to `ProofEntry` interface. Pass `entry.slug` through in `mapEntry()`. Add real slugs to mock entries.
**Pattern to follow:** Existing `mapEntry()` field mapping convention — one field per line, same order as the interface.
**Why:** Without slug in the feed data, the component can't construct link hrefs.

### `website/components/proof-feed/ProofFeed.tsx` (modify)
**What changes:** Import `Link` from `next/link`. In the entries map, conditionally wrap each row: `<Link>` when `e.slug` exists, `<div>` when it doesn't. The Link gets `href={/docs/proof/${e.slug}}` and the same `className={styles.proofRow}` + `role="listitem"`.
**Pattern to follow:** `website/components/docs/reference/SkillCard.tsx` — Link with class-based styling, `textDecoration: none`, `color: inherit`. But here the CSS module already handles those (`.proofRow` has `text-decoration: none` at line 271).
**Why:** This is the actual linking — connecting the feed surface to the detail pages.

### `website/app/docs/proof/[slug]/page.tsx` (modify)
**What changes:** Add `export const dynamicParams = true` at top level. After `getProofBySlug()` returns null, instead of calling `notFound()` immediately, attempt a GitHub fetch of proof_chain.json, find the entry by slug, and render a minimal fallback. Only call `notFound()` if the slug isn't found in the GitHub data either. Add `export const revalidate = 3600` so fallback pages cache for 1 hour.
**Pattern to follow:** The existing page structure — same Breadcrumb component, same article wrapper, same prose class. The fallback is a stripped-down version of the same layout.
**Why:** Without `dynamicParams`, any slug not in `generateStaticParams()` returns 404 — which breaks the link for entries shipped between Vercel builds.

### `website/components/proof-feed/proof-feed.module.css` (modify)
**What changes:** Likely nothing — `.proofRow` already has `text-decoration: none` and the grid/flex layout works on `<a>` elements. If testing reveals the anchor needs `display: grid` explicitly (unlikely since the class already sets it), add it. Also add `color: inherit` to `.proofRow` if not already present — verify during implementation.
**Pattern to follow:** Existing `.proofRow` declaration block.
**Why:** Defensive — ensure the anchor element doesn't introduce browser-default link styles.

## Acceptance Criteria
- [ ] AC1: Each expanded ship log row links to `/docs/proof/{slug}` — clicking navigates to the proof detail page
- [ ] AC2: Rows where slug is unavailable render without a link — no broken links under any condition
- [ ] AC3: Visiting `/docs/proof/{new-slug}` for an entry that exists in proof_chain.json but hasn't been statically generated returns a valid page (not a 404)
- [ ] AC4: The fallback page shows: feature name, result (PASS/FAIL), assertion count, completion date, and a note that full details appear on next build
- [ ] AC5: Mobile (≤760px): the entire row is the tap target, no change to existing flex-wrap layout behavior
- [ ] AC6: Collapsed summary bar dots do NOT link (too small for tap targets) — they remain `<span>` elements inside the button
- [ ] AC7: Hover state unchanged — existing `proofRow:hover` brand-soft background and hash color change apply naturally to the anchor element
- [ ] AC8: No TypeScript errors from `next build` perspective (types are consistent)
- [ ] AC9: The `generateMetadata` function handles both static and dynamic paths gracefully

## Testing Strategy

- **Unit tests:** None required — this is a marketing site component with no existing test infrastructure. The scope explicitly notes "No existing tests for the proof-feed component."
- **Integration tests:** Manual verification via `next dev`:
  - Click a ship log row → navigates to proof page
  - Visit `/docs/proof/{slug-not-in-static-build}` → see fallback page
  - Visit `/docs/proof/totally-invalid-slug` → see 404
  - Check mobile layout at 760px breakpoint
- **Build verification:** `pnpm build` in website/ must succeed with no type errors. This is the primary mechanical check.

## Dependencies

- The proof_chain.json file must be publicly accessible at the GitHub raw URL (it already is — `PROOF_CHAIN_URL` is defined and used in `proof-feed.ts`).
- Next.js 14+ with App Router (already in use).

## Constraints

- No new npm dependencies.
- The existing ISR timing (60s for feed, 3600s for proof pages) must not be shortened — GitHub API rate limits apply.
- The fallback page must not import any of the heavy proof visualization components (PipelineGantt, AssertionLedger, FindingsList) — those depend on the full `ProofEntry` type which the raw proof_chain.json entry doesn't satisfy.

## Gotchas

- **`<Link>` renders `<a>` — CSS grid on anchor elements.** The `.proofRow` class uses `display: grid` with `grid-template-columns`. This works fine on `<a>` in all modern browsers, but verify visually. The mobile breakpoint switches to `display: flex` with `flex-wrap: wrap` — also works on anchors.
- **The `role="listitem"` stays on the Link.** Next.js `<Link>` passes through props like `role` and `className`. The parent `div[role="list"]` + child `a[role="listitem"]` is valid HTML.
- **`generateMetadata` must handle the dynamic case.** When `getProofBySlug()` returns null for a dynamic slug, metadata generation needs the same GitHub fetch fallback — otherwise the page title shows "Proof not found" even though the page renders. Consider a shared fetch helper.
- **Mock feed slugs must exist in `proof-entries.json`.** Use these 6 slugs which are confirmed in the static data: `proof-list-view`, `add-project-kind-detection`, `fix-skill-template-gaps`, `monorepo-primary-agents-md`, `find-project-root`, `add-hook-detection`. Map them to the existing mock entries by position.
- **The `PROOF_CHAIN_URL` constant is already in `proof-feed.ts`.** For the proof detail page fallback, either import it or define a local copy. Since `proof-feed.ts` is a marketing lib and the proof page is in the docs app, a local constant is cleaner (avoids coupling the docs data layer to the marketing feed layer).
- **`revalidate` export placement.** Both `dynamicParams` and `revalidate` are route segment config exports — they go at the top level of the page file, not inside a function.

## Build Brief

### Rules That Apply
- Use `import type` for type-only imports, separate from value imports.
- 2-space indentation, no trailing whitespace.
- Named exports only (no default exports) — except Next.js page components which require `export default`.
- Website code uses `@/` path aliases (e.g., `@/lib/proof-feed`, `@/components/...`).
- Early returns over nested conditionals.

### Pattern Extracts

**SkillCard Link wrapping pattern** (`website/components/docs/reference/SkillCard.tsx` lines 17-19):
```tsx
<Link
  href={`/docs/reference/skills/${name}`}
  className={`docs-ref-card${className ? ` ${className}` : ""}`}
  style={{
    display: "block",
    textDecoration: "none",
    color: "inherit",
    cursor: "pointer",
  }}
>
```

**Current proof row rendering** (`website/components/proof-feed/ProofFeed.tsx` lines 97-118):
```tsx
{entries.map((e) => (
  <div
    key={e.hash}
    className={styles.proofRow}
    role="listitem"
  >
    <span className={styles.rowHash}>{e.hash}</span>
    <span className={cn(styles.rowKind, kindClass(e.kind))}>
      {kindLabel(e.kind)}
    </span>
    <span className={styles.rowFeat}>
      <span><Formatted text={e.feat} /></span>
      {e.hasRisk && <span className={styles.riskTag}>risk</span>}
    </span>
    <span className={styles.rowMeta}>
      <span className={styles.rowAssert}>
        <span className={styles.rowAssertPass}>{e.passed}</span>/{e.assertions}
      </span>
      <span className={styles.rowAgo}>{formatAge(e.ts)}</span>
    </span>
  </div>
))}
```

**mapEntry transform** (`website/lib/proof-feed.ts` lines 161-173):
```tsx
function mapEntry(entry: ProofChainEntry, version: string): ProofEntry {
  return {
    version,
    hash: entry.hashes.scope.slice(7, 14),
    ts: entry.completed_at,
    kind: resolveKind(entry),
    feat: entry.feature,
    feature_em: extractFeatureEm(entry.feature),
    assertions: entry.contract.total,
    passed: entry.contract.satisfied,
    hasRisk: (entry.findings ?? []).some(f => f.severity === 'risk'),
  };
}
```

### Proof Context
No active proof findings for affected files.

### Checkpoint Commands
- After modifying `proof-feed.ts`: `(cd website && npx tsc --noEmit)` — Expected: no type errors
- After all changes: `(cd website && pnpm build)` — Expected: successful build
- Lint: `pnpm run lint`

### Build Baseline
- CLI tests (not affected): `(cd packages/cli && pnpm vitest run)` — not relevant to this build
- Website build: `(cd website && pnpm build)` — the primary verification
- No website-specific test suite exists
- Regression focus: `website/app/docs/proof/[slug]/page.tsx` — ensure existing static proof pages still render correctly after adding dynamic params
