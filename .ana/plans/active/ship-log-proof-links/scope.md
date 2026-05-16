# Scope: Ship log proof linking

**Created by:** Ana
**Date:** 2026-05-16

## Intent

Make the ship log's expanded proof rows link to their corresponding AnaDocs proof pages at `/docs/proof/{slug}`. The ship log is the public proof surface — clicking a row should take you to the full verification record. Currently the data is there (slug exists in proof_chain.json, the proof explorer pages exist) but the two surfaces aren't connected.

## Complexity Assessment
- **Kind:** feature
- **Size:** small — 4 files modified, 1 file possibly added (fallback component)
- **Files affected:**
  - `website/lib/proof-feed.ts` — add `slug` to `ProofEntry`, pass through in `mapEntry()`, add to mock entries
  - `website/components/proof-feed/ProofFeed.tsx` — wrap rows in `<Link>`
  - `website/components/proof-feed/proof-feed.module.css` — minor: ensure anchor resets (`text-decoration: none`, `color: inherit`) if needed (the `proofRow` class already has `text-decoration: none` at line 271)
  - `website/app/docs/proof/[slug]/page.tsx` — add `export const dynamicParams = true`, add runtime fallback fetch
- **Blast radius:** The proof feed component is consumed in one place (the marketing homepage between main and footer). The proof `[slug]` page is self-contained. No other routes share the proof data layer. Low risk.
- **Estimated effort:** 1-2 hours implementation, straightforward testing
- **Multi-phase:** no

## Approach

Connect two existing surfaces: the ship log (runtime feed via GitHub API) and the proof explorer (statically generated detail pages). The slug already exists in the source data — it's dropped during the `mapEntry()` transform. Pass it through, wrap rows in Next.js `<Link>`, and add `dynamicParams = true` to the proof page so that entries newer than the last Vercel build render on-demand rather than 404ing.

The fallback for not-yet-built pages fetches minimal data from proof_chain.json via the GitHub raw API and renders a lightweight proof summary — enough to confirm the entry exists and show key facts (feature, result, assertions count, completion date) until the next full build generates the rich page.

## Acceptance Criteria
- AC1: Each expanded ship log row links to `/docs/proof/{slug}` — clicking navigates to the proof detail page
- AC2: Rows where slug is unavailable (mock fallback when GitHub API fails) either link to known-valid slugs or render without a link — no broken links under any condition
- AC3: Visiting `/docs/proof/{new-slug}` for an entry that exists in proof_chain.json but hasn't been statically generated returns a valid page (not a 404)
- AC4: The fallback page shows: feature name, result (PASS/FAIL), assertion count, completion date, and a note that full details appear on next build
- AC5: Mobile (≤760px): the entire row is the tap target, no change to existing flex-wrap layout behavior
- AC6: Collapsed summary bar dots do NOT link (too small for tap targets)
- AC7: Hover state unchanged — existing `proofRow:hover` brand-soft background and hash color change apply naturally to the anchor element

## Edge Cases & Risks

1. **Timing gap (the main risk).** A pipeline run completes → proof_chain.json updates on GitHub → ship log shows the entry (60s ISR) → but the proof page was built at last deploy and doesn't know about this slug. Without `dynamicParams = true`, this is a 404. With it, the first visitor triggers ISR generation. The fallback component bridges the gap.

2. **Mock feed slugs.** When GitHub is unreachable, `mockFeed()` returns hardcoded entries. These slugs must either (a) match entries that exist in the static build, or (b) be omitted so the row renders without a link. Option (a) is cleaner since the mock data represents real historical entries — use slugs from completed plans that are guaranteed to exist in the build.

3. **Proof chain entry without corresponding plan directory.** The proof explorer's "View on GitHub" link points to `.ana/plans/completed/{slug}`. If a proof chain entry exists but the completed plan was somehow cleaned up, the detail page still works — GitHub link is just a broken external link (acceptable, not our page).

4. **The `<a>` inside a `<button>` nesting issue.** The expanded rows are `children` of `ProofFeedCard`, which is a client component. The rows themselves are rendered by the server component `ProofFeed`. The `ProofFeedCard` wraps everything in a `<div>`, not a `<button>` — the button is only the summary bar. No nesting issue. Rows inside `<div className={styles.collapse}>` → safe for `<Link>`.

5. **`text-decoration: none` on the anchor.** The `proofRow` class already sets this (line 271 in the CSS module). If we change the `<div>` to an `<a>` (via Link), CSS module classes still apply — they're class-based, not element-based. Grid layout on `<a>` works in all modern browsers.

6. **Accessibility.** Currently rows have `role="listitem"`. Wrapping in `<Link>` makes them navigable anchors. The `role="list"` container should still work — links inside list items are standard. Screen readers will announce each row as a link.

## Rejected Approaches

**Link only if page exists (check at render time).** Would require the ship log server component to call `getProofBySlug()` for each entry — but that reads from the build-time JSON, not the GitHub API. The whole point is that the feed shows entries newer than the build. Checking the static list would result in most entries being unlinked after a productive day.

**Prefetch/warm pages on proof chain update.** Over-engineering. Vercel's ISR with `dynamicParams` handles this — the first visitor gets a slight delay, then the page is cached. No webhook or build trigger needed.

**Open in new tab.** Same site, same navigation context. Users expect in-tab navigation for same-domain links. `target="_blank"` would break the flow.

## Open Questions

None — all architectural decisions are clear from the investigation.

## Exploration Findings

### Patterns Discovered
- `website/lib/proof-feed.ts`: `ProofChainEntry` (line 137) already has `slug: string`. The `mapEntry()` function (line 161) explicitly drops it when building the public `ProofEntry` — it was excluded by design choice (display-only feed), not by oversight.
- `website/components/proof-feed/ProofFeed.tsx`: Rows are rendered as `<div>` children inside a server component, passed through to the client `ProofFeedCard` as `children` prop. The client component doesn't inspect or transform children.
- `website/app/docs/proof/[slug]/page.tsx`: Uses `generateStaticParams()` and `notFound()`. No `dynamicParams` export, meaning unknown slugs → 404 by default.
- CSS line 271: `text-decoration: none` already on `.proofRow` — was this anticipating links? Either way, it's already correct.

### Constraints Discovered
- [TYPE-VERIFIED] No `dynamicParams` export (proof/[slug]/page.tsx) — Next.js defaults to `false`, meaning any slug not in `generateStaticParams()` returns 404
- [TYPE-VERIFIED] `getProofBySlug()` reads from build-time JSON via `readFileSync` — no runtime fetch capability
- [OBSERVED] The not-found.tsx page says "The page you're looking for doesn't exist yet. It might be coming soon." — decent UX even without a custom fallback, but a dedicated fallback is better
- [OBSERVED] All dynamic route pages in the app use `generateStaticParams` without `dynamicParams = true` — this would be the first page to enable runtime generation

### Test Infrastructure
- No existing tests for the proof-feed component (it's a marketing component, not CLI code)
- The proof data extraction has implicit testing via the prebuild step — if extraction fails, the build fails

## For AnaPlan

### Structural Analog
`website/components/docs/reference/SkillCard.tsx` — a card component that wraps content in `<Link>` for navigation to a detail page. Same pattern: list of items → each links to `/docs/reference/skills/{name}`.

### Relevant Code Paths
- `website/lib/proof-feed.ts` — data layer, `ProofEntry` type, `mapEntry()` transform, `mockFeed()` fallback
- `website/components/proof-feed/ProofFeed.tsx` — row rendering, server component
- `website/components/proof-feed/ProofFeedCard.tsx` — client wrapper, collapse state (don't modify)
- `website/app/docs/proof/[slug]/page.tsx` — static generation, `notFound()` handling
- `website/lib/docs-data/proofs.ts` — build-time data loader (`readFileSync`)

### Patterns to Follow
- `website/components/docs/reference/SkillCard.tsx` for Link wrapping pattern
- `website/lib/proof-feed.ts` for the existing `mapEntry()` field-mapping convention
- Existing `proofRow` CSS handles the visual states — don't add new hover/active styles

### Known Gotchas
- The `<Link>` component from `next/link` renders an `<a>`. The CSS grid on `.proofRow` is element-agnostic (class-based), but verify that the browser handles `display: grid` on `<a>` correctly in the grid-template-columns definition. It does in all modern browsers, but worth a visual check.
- `mockFeed()` slugs must map to entries that were present in the *last* static build. Use slugs from `.ana/plans/completed/` — those are stable.
- The proof page needs TWO code paths after this change: (1) static path using `getProofBySlug()` as today, (2) dynamic fallback when that returns null — fetch from GitHub API and render a minimal view. Keep them clearly separated.

### Things to Investigate
- What minimal data should the fallback page display? The proof_chain.json entry has slug, feature, result, contract (total/satisfied), completed_at, hashes, and findings (with severity). That's enough for a meaningful fallback without the full assertion ledger and pipeline Gantt.
- Should the fallback page set a `revalidate` time so it re-generates with full data on next build? Probably yes — `export const revalidate = 3600` would mean it refreshes hourly until the next full build replaces it with the static version.
