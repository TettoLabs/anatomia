# Verify Report: Ship log proof linking

**Result:** PASS
**Created by:** AnaVerify
**Date:** 2026-05-16
**Spec:** .ana/plans/active/ship-log-proof-links/spec.md
**Branch:** feature/ship-log-proof-links

## Pre-Check Results
```
=== CONTRACT COMPLIANCE ===
  Contract: .ana/plans/active/ship-log-proof-links/contract.yaml
  Seal: INTACT (hash sha256:1a7e998d17e895665f423cc9c612aff61ffcf32233cba5bd4d043e08cceec9c8)
```

Seal status: **INTACT**

Build: `(cd website && pnpm build)` — ✅ success, 113 static proof pages + dynamic `[slug]` route with 1h revalidate.
Lint: `pnpm run lint` — ✅ clean (2/2 packages cached).
Tests: N/A — no website test suite. CLI tests not relevant to this build.

## Contract Compliance
| ID | Says | Status | Evidence |
|----|------|--------|----------|
| A001 | Ship log rows include the slug from the proof chain | ✅ SATISFIED | `website/lib/proof-feed.ts:173` — `mapEntry` passes `slug: entry.slug`. Interface at line 34 declares `slug?: string`. |
| A002 | Clicking a ship log row navigates to the proof detail page | ✅ SATISFIED | `website/components/proof-feed/ProofFeed.tsx:121` — `href={`/docs/proof/${e.slug}`}` on `<Link>` element. |
| A003 | Rows without a slug render as plain divs, not broken links | ✅ SATISFIED | `website/components/proof-feed/ProofFeed.tsx:131-138` — conditional renders `<div>` when `!e.slug`. Element is a div, not an anchor. |
| A004 | Mock feed entries use slugs that exist in the static build | ✅ SATISFIED | `website/lib/proof-feed.ts:45-51` — 6 mock slugs: `proof-list-view`, `add-project-kind-detection`, `fix-skill-template-gaps`, `monorepo-primary-agents-md`, `find-project-root`, `add-hook-detection`. All 6 confirmed present in `.next/server/app/docs/proof/` as static HTML files. |
| A005 | The proof page accepts slugs not in the static build | ✅ SATISFIED | `website/app/docs/proof/[slug]/page.tsx:15` — `export const dynamicParams = true;` |
| A006 | A new proof entry renders a fallback page instead of a 404 | ✅ SATISFIED | `website/app/docs/proof/[slug]/page.tsx:146` — renders "Full verification details will appear on the next site build." Contains "next site build". |
| A007 | The fallback page shows the feature name from proof chain | ✅ SATISFIED | `website/app/docs/proof/[slug]/page.tsx:130` — `{rawEntry.feature}` in `<h1>`. |
| A008 | The fallback page shows the verification result | ✅ SATISFIED | `website/app/docs/proof/[slug]/page.tsx:133` — `{resultLabel}` derived from `rawEntry.result`. |
| A009 | The fallback page shows the assertion count | ✅ SATISFIED | `website/app/docs/proof/[slug]/page.tsx:133` — `{rawEntry.contract.satisfied}/{rawEntry.contract.total} assertions`. |
| A010 | The fallback page shows the completion date | ✅ SATISFIED | `website/app/docs/proof/[slug]/page.tsx:113-117` — formats `rawEntry.completed_at` into locale date, renders at line 133. |
| A011 | An invalid slug still returns a 404 | ✅ SATISFIED | `website/app/docs/proof/[slug]/page.tsx:111` — `if (!rawEntry) notFound();` after GitHub fetch returns null for unknown slug. |
| A012 | Collapsed summary bar dots remain non-interactive spans | ✅ SATISFIED | `website/components/proof-feed/ProofFeed.tsx:61-69` — dots are `<span>` elements inside `<span className={styles.shipDots}>`. No Link or anchor wrapper. |
| A013 | The fallback page caches for one hour before revalidating | ✅ SATISFIED | `website/app/docs/proof/[slug]/page.tsx:16` — `export const revalidate = 3600;` |
| A014 | Page metadata works for dynamically rendered proof entries | ✅ SATISFIED | `website/app/docs/proof/[slug]/page.tsx:94-99` — `generateMetadata` calls `fetchProofChainEntry(slug)` for dynamic slugs, returns title `${rawEntry.feature} — Proof`. Contains "Proof". |

**14/14 assertions SATISFIED.**

## Independent Findings

**Predictions resolved:**
1. Mock slugs not in static build — **Not found.** All 6 confirmed present.
2. Fallback text mismatch — **Not found.** Exact text "next site build" at line 146.
3. GitHub outage degrades valid slugs to 404 — **Confirmed.** See finding below.
4. Duplicate fetch in metadata + page — **Confirmed.** Acceptable via Next.js dedup.
5. Summary dots inheriting link — **Not found.** Completely separate DOM subtree.

**What I didn't predict:** The mock feed maps slugs positionally (first mock entry gets first listed slug) rather than semantically. The mock entry "Worktree isolation" maps to slug `proof-list-view`. This is cosmetically misleading in dev but functionally harmless — mock data is only used when GitHub is unreachable.

## AC Walkthrough
- **AC1:** Each expanded ship log row links to `/docs/proof/{slug}` — ✅ PASS. `ProofFeed.tsx:118-128`, conditional Link wrapping with correct href pattern.
- **AC2:** Rows without slug render without link — ✅ PASS. `ProofFeed.tsx:130-138`, `<div>` fallback. Currently all mock + real entries have slugs, but the guard is correct.
- **AC3:** Visiting `/docs/proof/{new-slug}` for proof_chain entry returns valid page — ✅ PASS. `dynamicParams = true` + `fetchProofChainEntry` fallback renders summary. Build output confirms `● /docs/proof/[slug] 1h 1y` (SSG with dynamic).
- **AC4:** Fallback page shows feature, result, assertions, date, "next build" note — ✅ PASS. All five elements present at lines 130-157.
- **AC5:** Mobile tap target — ⚠️ PARTIAL. The `<Link>` wraps the full row (entire grid becomes tap target). CSS already has `display: grid` → `display: flex; flex-wrap: wrap` at mobile. Both work on anchors. Not tested live at 760px breakpoint — verified by source inspection only.
- **AC6:** Collapsed summary dots are `<span>` — ✅ PASS. Confirmed at lines 61-69.
- **AC7:** Hover state unchanged — ✅ PASS. `.proofRow:hover` at CSS line 275-278 applies to any element with that class, including `<a>`. No additional CSS changes needed or made.
- **AC8:** No TypeScript errors — ✅ PASS. `pnpm build` completed successfully (includes tsc).
- **AC9:** `generateMetadata` handles dynamic paths — ✅ PASS. Falls back to GitHub fetch at line 94, returns valid metadata with "Proof" in title.

## Blockers

No blockers. All 14 contract assertions satisfied. All 9 ACs pass (one partial — source-only mobile verification). Build clean, lint clean. Checked: no unused exports in new code (the `fetchProofChainEntry` helper is used twice — metadata and page), no unhandled error paths beyond the acceptable GitHub degradation, no dead code in the conditional rendering logic.

## Findings

- **Code — GitHub outage degrades valid new slugs to 404:** `website/app/docs/proof/[slug]/page.tsx:111` — `fetchProofChainEntry` returns null on any fetch failure (network error, rate limit, non-200 response). A legitimate new slug that exists in proof_chain.json would show 404 during a GitHub outage. Acceptable degradation for a marketing site — no user action lost — but the failure mode is invisible (no logging, no error page explaining the cause). Severity: risk. Suggested action: monitor.

- **Code — Duplicate GitHub fetch for dynamic slugs:** `website/app/docs/proof/[slug]/page.tsx:94,110` — Both `generateMetadata` and `ProofDetailPage` call `fetchProofChainEntry(slug)` independently. Next.js deduplicates `fetch()` calls with identical URLs during a single request, so this is functionally equivalent to one call. But if the helper were refactored to use a non-fetch data source (e.g., direct file read), the deduplication would break. Severity: observation. Suggested action: accept.

- **Code — Mock feed slug-to-entry mapping is positional:** `website/lib/proof-feed.ts:45-51` — Mock entry "Worktree isolation" maps to slug `proof-list-view`, "Rejection artifact preservation" to `add-project-kind-detection`, etc. The mock content and slugs describe different features. Anyone debugging locally with mock data would see misleading navigation. Severity: debt. Suggested action: accept (mock data is placeholder by nature).

- **Upstream — All website assertions verified by source inspection only:** No test infrastructure for website components (spec explicitly notes this). All 14 assertions rely on build success + code reading, not mechanical test execution. A future refactor could silently break linking behavior without any test catching it. Severity: observation. Suggested action: monitor.

## Deployer Handoff

- **What ships:** Ship log rows in the proof feed now link to `/docs/proof/{slug}`. New proof entries that haven't been statically built get a minimal fallback page via GitHub API fetch.
- **Deployment dependency:** The `PROOF_CHAIN_URL` must remain publicly accessible. If the repo goes private, the fallback path breaks silently (returns 404 for new slugs).
- **Cache behavior:** Fallback pages revalidate every 3600s. A newly shipped proof entry will show the fallback for up to 1 hour after the next Vercel build deploys the full static page.
- **No environment changes needed.** No new env vars. `GITHUB_TOKEN` is optional (for rate limit headroom).

## Verdict
**Shippable:** YES

Clean implementation. The builder threaded slug through exactly where needed, added conditional Link wrapping with proper fallback, and implemented the dynamic proof page with appropriate degradation. No over-building — CSS untouched because it already handled anchors. The only real risk (GitHub outage → false 404) is inherent to the architecture choice of using GitHub as the dynamic data source, and acceptable for a marketing site.
