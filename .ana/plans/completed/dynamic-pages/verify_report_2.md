# Verify Report: Dynamic Pages — Phase 2 (Proof Explorer + Proof Detail Pages)

**Result:** PASS
**Created by:** AnaVerify
**Date:** 2026-05-13
**Spec:** .ana/plans/active/dynamic-pages/spec-2.md
**Branch:** feature/dynamic-pages

## Pre-Check Results

```
=== CONTRACT COMPLIANCE ===
  Contract: /Users/rsmith/Projects/anatomia_project/anatomia/.ana/worktrees/dynamic-pages/.ana/plans/active/dynamic-pages/contract.yaml
  Seal: INTACT (hash sha256:00f899ef966a211fafb1851aedac9a391a6e310ebe09bfca809feaf0c51df8a1)
```

Seal: **INTACT**

Tests: 2178 passed, 2 skipped (100 test files). No regressions.
Build: success — 89 proof detail routes statically generated, `/docs/proof` explorer route present.
Lint: 1 warning — `formatDuration` defined but never used in `PipelineGantt.tsx:8`.

## Contract Compliance

Phase 2 assertions (A033–A058). No `@ana` tags exist for these assertions — the website has no test infrastructure. All verification is by source inspection and build output.

| ID | Says | Status | Evidence |
|----|------|--------|----------|
| A033 | The proof explorer page builds successfully at its route | ✅ SATISFIED | Build output: `├ ○ /docs/proof` present in routes |
| A034 | The explorer is a client component with interactive filter and sort state | ✅ SATISFIED | `ProofExplorer.tsx:1` has `"use client"`, lines 32-38 use `useState` for filter/sort |
| A035 | Filter chips are computed from the actual proof data, not hardcoded | ✅ SATISFIED | `ProofExplorer.tsx:42-43`: `new Set(entries.map((e) => e.stage))` computes stages from data |
| A036 | The explorer table has all seven required columns | ✅ SATISFIED | `ProofExplorer.tsx` thead has 7 `<th>`: Proof, Stage, Assertions, Findings, Duration, Shipped, (verdict) |
| A037 | Assertions, Findings, Duration, and Shipped columns are sortable | ✅ SATISFIED | `ProofExplorer.tsx:216,229,242,255` — 4 `<th>` elements have `onClick={() => handleSort(...)}` |
| A038 | The explorer hides the right rail and uses full-width content | ✅ SATISFIED | `proof/page.tsx:14` uses `docs-content-full` class, no `<RightRail>` rendered. `docs.css:390-392`: `.docs-content-full { padding-right: 40px !important; }` |
| A039 | Explorer table rows navigate to the proof detail page when clicked | ✅ SATISFIED | `ProofExplorer.tsx:285`: `onClick={() => router.push(\`/docs/proof/${e.slug}\`)}` on each `<tr>` |
| A040 | The filter bar shows how many proofs are currently visible out of the total | ✅ SATISFIED | `ProofExplorer.tsx:182`: `showing {sorted.length} of {stats.entries}` |
| A041 | Proof detail pages are statically generated for every proof entry | ✅ SATISFIED | `[slug]/page.tsx:26-28`: `generateStaticParams` maps all entries to `{ slug }`. Build shows 89 routes |
| A042 | Proof detail pages display the hero section with verdict, score, and findings breakdown | ✅ SATISFIED | `[slug]/page.tsx:63`: `<ProofHero entry={entry} />`. `ProofHero.tsx:68-98` renders verdict pill, score, findings breakdown, duration, cycles, shipped |
| A043 | The pipeline Gantt chart shows four timing bars with proportional widths | ✅ SATISFIED | `PipelineGantt.tsx:15-19`: STAGES array `[think, plan, build, verify]`. Line 49: width computed as `Math.round((value / total) * 100)` |
| A044 | The Gantt chart handles entries with zero-duration stages without breaking | ✅ SATISFIED | `PipelineGantt.tsx:23`: returns "No timing data" when `totalMinutes === 0`. Line 51: `value === 0 ? 2 : pct` gives 2% minimum width |
| A045 | The assertion ledger shows the first eight assertions with a toggle to reveal the rest | ✅ SATISFIED | `AssertionLedger.tsx:14-15`: `hasMore = assertions.length > 8`, shows `slice(0, 8)`. Lines 29,42: "show all →" / "collapse ↑" toggle |
| A046 | Finding cards display severity badges with correct colors for risk, debt, and observation | ✅ SATISFIED | `FindingsList.tsx:19-25`: `severityColor` returns `--fail`/`--warn`/`--info` vars. Line 57: badge rendered with class and inline color |
| A047 | Risk findings display with a red badge | ✅ SATISFIED | `FindingsList.tsx:21`: `case "risk": return { bg: "var(--fail-bg)", fg: "var(--fail)" }` |
| A048 | Debt findings display with an amber badge | ✅ SATISFIED | `FindingsList.tsx:22`: `case "debt": return { bg: "var(--warn-bg)", fg: "var(--warn)" }` |
| A049 | Observation findings display with a blue badge | ✅ SATISFIED | `FindingsList.tsx:23`: `default: return { bg: "var(--info-bg)", fg: "var(--info)" }` |
| A050 | The integrity seal displays all hash keys including phase-specific ones | ✅ SATISFIED | `IntegritySeal.tsx:18`: `Object.entries(hashes).map(([key, value])` — iterates all keys dynamically |
| A051 | Each proof detail page shows navigation links to the previous and next proof | ✅ SATISFIED | `[slug]/page.tsx:97-112`: conditional rendering of `prevSlug` and `nextSlug` links |
| A052 | The right rail on proof detail pages shows 'On this proof' instead of the standard label | ✅ SATISFIED | `RightRail.tsx:64`: `variant === "proof" ? "On this proof" : "On this page"`. `[slug]/page.tsx:119`: `variant="proof"` |
| A053 | Proof detail right rail shows proof-specific links instead of the standard Ask AI links | ✅ SATISFIED | `RightRail.tsx:149-154`: "View on GitHub ↗", "Download artifacts ↗", "Open in Claude ↗" when `variant === "proof"` |
| A054 | Duration formatting shows hours and minutes for durations over 60 minutes | ✅ SATISFIED | `[slug]/page.tsx:16-17`: `${Math.floor(minutes / 60)}h ${minutes % 60}m` for `>= 60`. Same in ProofExplorer.tsx:16-20, ProofHero.tsx:4-8 |
| A055 | Duration formatting shows only minutes for durations under 60 minutes | ✅ SATISFIED | `[slug]/page.tsx:19`: `${minutes}m` for `< 60`. Same in ProofExplorer.tsx:16-20, ProofHero.tsx:4-8 |
| A056 | The explorer table scrolls horizontally on mobile with a sticky first column | ✅ SATISFIED | `docs.css:443-458`: `overflow-x: auto` on wrap, `position: sticky; left: 0; z-index: 1; background: var(--bg-card); box-shadow: 4px 0 8px -2px rgba(0,0,0,0.08)` on first col |
| A057 | Proof components have className props for CSS targeting | ✅ SATISFIED | All 6 components accept `className` prop: ProofExplorer(:28), ProofHero(:20), PipelineGantt(:22), AssertionLedger(:12), FindingsList(:27), IntegritySeal(:7) |
| A058 | The full website build succeeds with all proof routes statically generated | ✅ SATISFIED | `pnpm build` exits 0. Build output shows 89 proof detail routes + explorer route |

## Independent Findings

**Prediction resolution:**

1. **Confirmed:** `formatDuration` in PipelineGantt.tsx is dead code. Defined at line 8 but never called — the duration column on line 99 uses `{value}m` directly. This means individual pipeline stages always display as raw minutes regardless of magnitude (e.g., a 90-minute build stage would show "90m" instead of "1h 30m"). Practically minor since few individual stages exceed 60 minutes, but inconsistent with the format used elsewhere.

2. **Not found:** AssertionLedger toggle works correctly. Threshold is 8, "show all →" flips to "collapse ↑", state is local `useState`.

3. **Not found:** "showing X of Y" counter uses `sorted.length` which reactively updates from all filter state dependencies.

4. **Partially confirmed:** "View on GitHub" uses `proofLinks?.githubUrl` (dynamic), but "Download artifacts" and "Open in Claude" hardcode `href="#"` — placeholder links.

5. **Not found:** IntegritySeal correctly uses `Object.entries(hashes)` for dynamic key rendering.

**Surprise findings:**

- PipelineGantt uses cumulative `left` offsets with `Math.round` per stage. Rounding errors can cause total to exceed 100%, potentially causing minor visual overflow. Latent — unlikely to be noticed at current data sizes.
- ProofExplorer has massive inline style duplication — the same 9-property style object is copied verbatim across 7 `<th>` elements. This matches the website's established pattern (inline styles everywhere), but it's particularly egregious here.

## AC Walkthrough

| AC | Description | Status | Evidence |
|----|-------------|--------|----------|
| AC18 | Proof explorer renders at `/docs/proof` as client component with filter chips and sorting | ✅ PASS | Build shows route. `ProofExplorer.tsx:1` has `"use client"`. Filter chips + sort headers present |
| AC19 | Filter chips computed from data — stage, findings, cycles. NOT hardcoded | ✅ PASS | `ProofExplorer.tsx:42`: `new Set(entries.map(e => e.stage))`. Finding filters: "≥5", "Any". Cycle filters: "First-try", "Rejected ≥1" |
| AC20 | Explorer table has 7 columns: Proof, Stage, Assertions, Findings, Duration, Shipped, Verdict | ✅ PASS | 7 `<th>` elements in thead. Last column is empty header (verdict pill rendered in body) |
| AC21 | Column headers for Assertions, Findings, Duration, Shipped are sortable | ✅ PASS | 4 `<th>` with `onClick={() => handleSort(...)}`. Sort arrow indicator updates |
| AC22 | Explorer hides right rail, uses `docs-content-full` without 120px right padding | ✅ PASS | No `<RightRail>` in page. Class applied. CSS overrides padding to 40px |
| AC23 | Detail pages at `/docs/proof/{slug}` via `generateStaticParams` | ✅ PASS | `[slug]/page.tsx:26-28`. Build: 89 routes generated |
| AC24 | Detail pages display ProofHero, PipelineGantt, AssertionLedger, FindingsList, IntegritySeal | ✅ PASS | All 5 components imported and rendered in `[slug]/page.tsx:63-86` |
| AC25 | Finding severity badges: risk (red/--fail), debt (amber/--warn), obs (blue/--info). Missing → obs | ✅ PASS | `severityColor` function returns correct vars. Default case handles missing/observation |
| AC26 | Adjacent proof navigation using pre-computed prevSlug/nextSlug | ✅ PASS | `[slug]/page.tsx:97-112` renders conditional links |
| AC27 | RightRail variant prop with "On this proof" and proof-specific links | ✅ PASS | `RightRail.tsx:64,147-154`. `[slug]/page.tsx:119`: `variant="proof"` with `proofLinks` |
| AC28 | Explorer mobile: horizontal scroll with sticky first column at ≤880px | ✅ PASS | `docs.css:442-458`: `overflow-x: auto`, `position: sticky`, `box-shadow` on first column |
| AC29 | All proof components have className props. Responsive rules for ≤1180px, ≤880px, ≤640px | ✅ PASS | All 6 components accept `className`. CSS has `@media (max-width: 1180px)`, `880px`, `640px` blocks |
| AC30 | `pnpm build` succeeds with all proof routes statically generated | ✅ PASS | Build exits 0. 89 proof routes + explorer route present |
| AC31 | Duration formatting: hours+minutes for >60, minutes-only otherwise | ✅ PASS | `formatDuration` in ProofExplorer, ProofHero, detail page. Correct formula |
| AC32 | Explorer table rows fully clickable — clicking anywhere navigates to detail | ✅ PASS | `<tr onClick={() => router.push(...)}>` on each row. `cursor: pointer` style |
| AC33 | Explorer filter bar displays "showing X of Y" that updates live | ✅ PASS | `ProofExplorer.tsx:182`: uses `sorted.length` which is reactive to all filter state |

## Blockers

No blockers. All 26 contract assertions (A033-A058) are SATISFIED. All 16 acceptance criteria pass. Build succeeds with zero errors. Tests show no regressions (2178 pass). Lint has 1 warning (unused variable) — not a blocker.

Checked for: unused exports in new files (all 6 component exports are imported in page files), unhandled error paths (detail page uses `notFound()` for missing slugs), sentinel test patterns (no tests — verification is build-based per spec), dead code blocks (PipelineGantt's unused `formatDuration` — noted in findings), external state assumptions (data loaded at build time via static loaders — no runtime assumptions).

## Findings

- **Code — Unused `formatDuration` in PipelineGantt:** `website/components/docs/proof/PipelineGantt.tsx:8` — function defined but never called. Duration column at line 99 uses `{value}m` directly instead. Lint flags this. Individual stage durations probably won't exceed 60 minutes, but the inconsistency means a 90-minute build stage would show "90m" instead of "1h 30m".

- **Code — `formatDuration` duplicated across 4 files:** `website/components/docs/proof/ProofExplorer.tsx:16`, `website/components/docs/proof/ProofHero.tsx:4`, `website/components/docs/proof/PipelineGantt.tsx:8`, `website/app/docs/proof/[slug]/page.tsx:15` — identical 5-line function copied into each file. Extract to a shared utility in `website/lib/` for maintainability.

- **Code — PipelineGantt cumulative rounding may overflow:** `website/components/docs/proof/PipelineGantt.tsx:54-59` — each stage's left offset uses `Math.round((v / total) * 100)`. Four rounded values can sum to 101-104%, causing the last bar to slightly exceed the container. Not visible at current data sizes but a latent issue for entries with evenly-split timing.

- **Code — Placeholder proof links:** `website/components/docs/layout/RightRail.tsx:152-153` — "Download artifacts" and "Open in Claude" link to `href="#"`. These are dead links in production. The spec describes them as part of the proof variant, but no endpoint exists yet. Future scope when artifact download and Claude deep links are available.

- **Code — IntegritySeal missing last-row border removal:** `website/components/docs/proof/IntegritySeal.tsx:24` — every hash row has `borderBottom: "1px solid var(--hairline)"` via inline style. The supermock has `.integ-row:last-child { border-bottom: 0 }` but since styles are inline, the CSS class isn't applied. The audit cmd row (outside the map) naturally has no border, so the last hash row shows a border before the audit row. Minor visual discrepancy.

- **Code — FindingsList truncates without expand toggle:** `website/components/docs/proof/FindingsList.tsx:28` — shows max 5 findings with a "+N more" indicator but no way to expand. AssertionLedger has expand/collapse, but findings are permanently truncated. Proofs with 10+ findings lose visibility into the tail.

- **Code — Extreme inline style duplication in ProofExplorer:** `website/components/docs/proof/ProofExplorer.tsx:194-278` — the same 9-property style object for `<th>` elements is repeated 7 times. This matches the website's established inline-style-heavy pattern but adds ~70 lines of redundant JSX. A shared style constant would cut this significantly.

## Deployer Handoff

1. **Lint warning to resolve:** PipelineGantt.tsx has an unused `formatDuration` import. Either use it for the duration column or remove the dead function. Low priority but will flag on every CI run.

2. **Placeholder links:** The proof detail right rail has 2 placeholder links ("Download artifacts", "Open in Claude") pointing to `#`. These are visible to users. Consider either removing them until the endpoints exist or adding a tooltip indicating "coming soon."

3. **No new tests:** This phase adds ~1,200 lines of component code with zero tests. This is by design (website has no test infrastructure), but all verification relies on `pnpm build` succeeding. If the build breaks in the future, there's no test to localize the failure to a specific component.

4. **Static data dependency:** All proof data is loaded at build time. If the data extraction script (`extract-docs-data.ts`) output format changes, proof pages will fail at build time — no runtime fallback.

## Verdict
**Shippable:** YES

All 26 contract assertions SATISFIED. All 16 acceptance criteria pass. Build succeeds with 89 proof routes. No test regressions. The lint warning and code duplication are debt, not blockers. The placeholder links are known scope gaps, not bugs. The implementation faithfully translates the supermock's design into React components with correct data flow, responsive behavior, and interactivity.
