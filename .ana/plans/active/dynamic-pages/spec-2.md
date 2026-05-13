# Spec: Dynamic Pages — Phase 2 (Proof Explorer + Proof Detail Pages)

**Created by:** AnaPlan
**Date:** 2026-05-13
**Scope:** .ana/plans/active/dynamic-pages/scope.md

## Approach

Two page types, each with distinct complexity.

**Proof explorer** (`/docs/proof`) is the site's first client component with filter/sort state. It renders a full-width table with 15 filter chips (computed from data, not hardcoded), 4 sortable columns, and clickable rows. The right rail is hidden. Filter state is local React state — no URL params (closed decision).

**Proof detail pages** (`/docs/proof/{slug}`) are statically generated for all 89+ entries via `generateStaticParams`. Each page has 5 sections: ProofHero, PipelineGantt, AssertionLedger, FindingsList, IntegritySeal. The RightRail shows a variant with "On this proof" label and proof-specific links instead of the standard "Ask AI" links.

Phase 1 extended the extraction pipeline — all proof data (assertions array, findings array, timing, hashes, severity counts, adjacent slugs) is available from the `getProofEntries()` and `getProofBySlug()` loaders.

**Key design decisions:**

- **Filter chips computed from data.** Stage chips come from the unique `stage` values in the proof entries. If a stage has zero entries, the chip still appears (filters to empty). The "All" chip is always first.
- **RightRail variant prop.** Add an optional `variant` prop: `"proof"`. When `variant="proof"`, the TOC label changes to "On this proof", the "Ask AI" section is replaced with proof-specific links ("View on GitHub", "Download artifacts", "Open in Claude"), and the section label changes to "This proof, elsewhere". Default behavior unchanged — zero existing page changes.
- **PipelineGantt handles zero-width stages.** 7 entries have incomplete timing (5 missing verify, 2 missing both build and verify). Stages with 0 minutes get a minimum-width sliver (2% or 2px) so the bar is visible as a gap indicator, not invisible. If totalMinutes is 0, skip the chart entirely.
- **AssertionLedger shows first 8 rows with "show all →" toggle** for proofs with 30+ assertions. Client-side toggle via local state. The toggle is inline text, not a button.
- **Explorer table rows are fully clickable.** Each `<tr>` wraps navigation via `onClick` + `router.push`. Not just a link in the slug column.
- **Adjacent proof navigation uses pre-computed `prevSlug`/`nextSlug`.** No index lookup at render time.

## Output Mockups

### Proof Explorer (`/docs/proof`)

```
Docs / Proof Chain

Proof Chain Explorer
────────────────────────────────────────
89 verified    1,247 assertions    532 findings    all pass
════════════════════════════════════════

Stage [All] [Engine] [Pipeline] [Templates] [CLI] [Infra] [Website]
         Findings [≥5] [Any]
         Cycles [First-try] [Rejected ≥1]
                                                    showing 89 of 89

┌─────────┬────────┬───────────┬──────────┬─────────┬──────────┬────────┐
│ Proof   │ Stage  │Assertions │ Findings │Duration │ Shipped  │        │
├─────────┼────────┼───────────┼──────────┼─────────┼──────────┼────────┤
│ content │        │           │          │         │          │ ┌────┐ │
│ -pages  │Pipeline│  32/32    │    14    │  3h 22m │ may 12   │ │pass│ │
│ Content │        │           │          │         │          │ └────┘ │
│ Pages   │        │           │          │         │          │        │
│ [pipeline][2 rej]│           │          │         │          │        │
├─────────┼────────┼───────────┼──────────┼─────────┼──────────┼────────┤
│ ...     │        │           │          │         │          │        │
└─────────┴────────┴───────────┴──────────┴─────────┴──────────┴────────┘
```

### Proof Detail Page (`/docs/proof/{slug}`)

```
Docs / Proof Chain / security-hardening

proof / security-hardening

Security Hardening
────────────────────────────────────────
Slugs with shell injection characters are rejected...

verdict [pass]  score 27/27  findings 10 (0 risk · 3 debt · 7 obs)
duration 1h 14m  rejection cycles 0  shipped may 4

## Pipeline timeline
Intent to proven code in 1h 14m across four stages.

Think  ████░░░░░░░░░░░░░░░░  2m
Plan   ░░░░████████░░░░░░░░  15m
Build  ░░░░░░░░░░░░████████  53m
Verify ░░░░░░░░░░░░░░░░░░██  5m

## Assertion ledger
27 claims, each independently verified. Showing 8 — show all →

┌──────┬────────────────────────────────────┬──────────┬──────┐
│ ID   │ Says                               │ Matcher  │      │
├──────┼────────────────────────────────────┼──────────┼──────┤
│ A001 │ Slugs with shell injection...      │ verified │  ok  │
│ A002 │ Valid kebab-case slugs pass...     │ verified │  ok  │
│ ...  │                                    │          │      │
└──────┴────────────────────────────────────┴──────────┴──────┘

## Findings (10 total)
┌───────────────────────────────────────────────┐
│ [debt] src/utils/git.ts          → scope      │
│ No dedicated integration tests for...          │
├───────────────────────────────────────────────┤
│ [obs]  src/utils/git.ts          → monitor    │
│ getCurrentBranch still uses execSync           │
├───────────────────────────────────────────────┤
│ ... +8 more findings                           │
└───────────────────────────────────────────────┘

## Integrity seal
┌──────────────────────────────────────────────────┐
│ scope         │ a1b2c3d4e5f6g7h8i9j0...          │
│ contract      │ b2c3d4e5f6g7h8i9j0k1...          │
│ build-report  │ c3d4e5f6g7h8i9j0k1l2...          │
│ audit cmd     │ $ ana proof audit security-h... │
│               │   → all hashes match              │
└──────────────────────────────────────────────────┘

Adjacent proofs: ← proof-promote    worktree-isolation →
```

**Right rail on proof detail (variant="proof"):**
```
On this proof
  ● Pipeline timeline
  ● Assertion ledger
  ● Findings
  ● Integrity seal

This proof, elsewhere
  [View on GitHub ↗]
  [Download artifacts ↗]
  [Open in Claude ↗]

Generated 2026-05-13
commit 1b5d669
```

## File Changes

### `website/app/docs/proof/page.tsx` (create)
**What changes:** Proof explorer page. Client component (`'use client'`). Imports proof entries from data loaders (passed as props from a server wrapper or loaded directly). Renders ProofExplorer with filter bar and sortable table. Hides the right rail — uses `docs-content-full` class instead of `docs-content-area`.
**Pattern to follow:** No structural analog — this is the first client component with filter/sort state. Supermock `renderProofExplorer()` (pages.js:1317–1410) is the behavioral spec. Supermock CSS `.explorer`, `.exp-head`, `.exp-filters`, `.fchip`, `.exp-tbl`, `.pass-pill` (styles.css:487–565) for styling. Supermock CSS `.proof-stats-row` (styles.css:772–777) for the stats row.
**Why:** AC18, AC22, AC30.

### `website/app/docs/proof/[slug]/page.tsx` (create)
**What changes:** Proof detail pages. Server component with `generateStaticParams` for all proof entries. Renders ProofHero, PipelineGantt, AssertionLedger, FindingsList, IntegritySeal. Renders RightRail with `variant="proof"`. Adjacent proof navigation at bottom.
**Pattern to follow:** `website/app/docs/[...slug]/page.tsx` for page structure (flex layout, RightRail alongside content). Supermock `renderProofDetail()` (pages.js:1462–1544) for content.
**Why:** AC23, AC24, AC26, AC27.

### `website/components/docs/proof/ProofExplorer.tsx` (create)
**What changes:** Client component. Contains all filter/sort state, filter bar with computed chips, sortable table, "showing X of Y" text, clickable rows. This is the most complex component in the scope.
**Pattern to follow:** Supermock `renderProofExplorer()` (pages.js:1317–1410) for behavior. Supermock CSS `.explorer`, `.exp-head`, `.exp-filters`, `.fchip`, `.fchip.on`, `.fchip-label`, `.exp-stats`, `.exp-tbl` (styles.css:487–565) for styling. Supermock `app.js:262–264` for row click behavior (`tr[data-route]` click handler).
**Why:** AC18, AC19, AC20, AC21, AC32, AC33.

### `website/components/docs/proof/ProofHero.tsx` (create)
**What changes:** Hero section for proof detail pages. Shows slug trail ("proof / {slug}"), feature title, scope summary, and a meta row with verdict pill, score, findings breakdown, duration, rejection cycles, shipped date.
**Pattern to follow:** Supermock `renderProofDetail()` hero section (pages.js:1499–1511). Supermock CSS `.proof-hero`, `.proof-slug`, `.proof-meta`, `.verdict` (styles.css:691–705) for styling.
**Why:** AC24.

### `website/components/docs/proof/PipelineGantt.tsx` (create)
**What changes:** 4-bar timing chart. Each bar shows stage label, proportional fill width, and duration text. Handles entries where some stages are zero — zero-width stages render as a 2% minimum-width sliver so the gap is visible, not invisible. If totalMinutes is 0, renders a "No timing data" message instead of the chart.
**Pattern to follow:** Supermock `renderProofDetail()` gantt section (pages.js:1515–1520). Supermock CSS `.gantt`, `.gantt-row`, `.bar`, `.fill` (styles.css:708–713) for styling.
**Why:** AC24, AC31.

### `website/components/docs/proof/AssertionLedger.tsx` (create)
**What changes:** Table with id/says/matcher/status columns. Shows first 8 assertions with a "show all →" toggle for proofs with >8. Client component (`'use client'`) for the toggle state.
**Pattern to follow:** Supermock `renderProofDetail()` assertion section (pages.js:1522–1527). Supermock CSS `.assn-tbl` (styles.css:716–726) for styling.
**Why:** AC24.

### `website/components/docs/proof/FindingsList.tsx` (create)
**What changes:** Finding cards with severity badge (risk=red/`--fail`, debt=amber/`--warn`, obs=blue/`--info`), file location, summary, suggested action. Shows first 5 findings with "+N more" indicator for longer lists. Findings without severity display as `obs`.
**Pattern to follow:** Supermock `renderProofDetail()` findings section (pages.js:1478–1490). Supermock CSS `.fnd-list`, `.fnd`, `.fnd-head`, `.fnd-sev`, `.fnd-sev.risk`, `.fnd-sev.debt`, `.fnd-sev.obs`, `.fnd-loc`, `.fnd-act`, `.fnd-body` (styles.css:729–742) for styling.
**Why:** AC24, AC25.

### `website/components/docs/proof/IntegritySeal.tsx` (create)
**What changes:** Hash display in a bordered card. Renders whatever hash keys exist (handles both `build-report` and `build-report-1`, `build-report-2` phase-specific shapes). Last row shows audit command with "→ all hashes match" hint.
**Pattern to follow:** Supermock `renderProofDetail()` integrity section (pages.js:1492–1536). Supermock CSS `.integ`, `.integ-row` (styles.css:744–756) for styling.
**Why:** AC24.

### `website/components/docs/layout/RightRail.tsx` (modify)
**What changes:** Add optional `variant` prop. When `variant="proof"`: TOC label changes to "On this proof", "Ask AI" section label changes to "This proof, elsewhere", link set changes to "View on GitHub ↗" / "Download artifacts ↗" / "Open in Claude ↗". Add optional `proofLinks` prop with `githubUrl` for the "View on GitHub" href. Default behavior completely unchanged.
**Pattern to follow:** Supermock `app.js:148–195` — the `renderRight()` function shows the exact behavioral difference between content and proof right rails. Existing RightRail code (same file) for the unchanged portions.
**Why:** AC27.

### `website/app/docs/docs.css` (modify)
**What changes:** Add proof explorer styles (`.docs-explorer`, `.docs-exp-tbl`, `.docs-fchip`, `.docs-pass-pill`, `.docs-proof-stats-row`), proof detail styles (`.docs-proof-hero`, `.docs-gantt`, `.docs-assn-tbl`, `.docs-fnd`, `.docs-integ`, `.docs-verdict`), hover states for explorer rows and filter chips, `docs-content-full` class, responsive rules for ≤1180px (explorer stays full-width when rail is hidden), ≤880px (explorer table gets horizontal scroll with sticky first column), ≤640px (further compression).
**Pattern to follow:** Existing responsive breakpoint blocks in the same file. Single-dash kebab naming (not BEM). All new classes prefixed with `docs-` to scope under `.docs-layout`.
**Why:** AC22, AC28, AC29.

## Acceptance Criteria

- [ ] AC18: Proof explorer renders at `/docs/proof` as a client component with filter chips and column sorting.
- [ ] AC19: Filter chips computed from proof data — stage categories (All + each unique stage), finding filters (≥5, Any), cycle filters (First-try, Rejected ≥1). Categories NOT hardcoded.
- [ ] AC20: Explorer table has 7 columns: Proof (slug + feature + tags), Stage, Assertions, Findings, Duration, Shipped, Verdict.
- [ ] AC21: Column headers for Assertions, Findings, Duration, and Shipped are sortable.
- [ ] AC22: Proof explorer hides right rail. Content uses `docs-content-full` class without 120px right padding.
- [ ] AC23: Proof detail pages render at `/docs/proof/{slug}` via `generateStaticParams` for all proof entries.
- [ ] AC24: Detail pages display: ProofHero, PipelineGantt, AssertionLedger, FindingsList, IntegritySeal.
- [ ] AC25: Finding severity badges: `risk` (red/`--fail`), `debt` (amber/`--warn`), `obs` (blue/`--info`). Missing severity → `obs`.
- [ ] AC26: Adjacent proof navigation using pre-computed `prevSlug`/`nextSlug`.
- [ ] AC27: RightRail variant prop on proof detail pages with "On this proof" label and proof-specific links.
- [ ] AC28: Explorer mobile: horizontal scroll on table with sticky first column at ≤880px.
- [ ] AC29: All proof components have className props. Responsive rules in `docs.css` for ≤1180px, ≤880px, ≤640px.
- [ ] AC30: `pnpm build` succeeds with all proof routes statically generated.
- [ ] AC31: Duration formatting: `${Math.floor(m/60)}h ${m%60}m` for >60 minutes, `${m}m` otherwise.
- [ ] AC32: Explorer table rows fully clickable — clicking anywhere on a row navigates to detail page.
- [ ] AC33: Explorer filter bar displays "showing X of Y" that updates live as filters change.
- [ ] No build errors.

## Testing Strategy

- **Build validation:** `pnpm build` in `website/` must succeed with all 89+ proof routes statically generated. This is the primary test surface.
- **Client component verification:** The ProofExplorer is a `'use client'` component — `pnpm build` validates that it compiles, but filter/sort behavior requires manual testing in the Vercel preview.
- **No unit tests.** Matches existing website patterns (zero test files). Verification via build success + visual inspection.

## Dependencies

- **Phase 1 must be complete.** The extended extraction pipeline produces the data this phase consumes. Specifically: `getProofEntries()` must return entries with `assertions`, `findings`, `timing`, `hashes`, `findingSeverity`, `duration`, `prevSlug`, `nextSlug` fields. `getProofBySlug()` must exist.
- Existing components from Phase 1: ReferenceGrid (for CSS patterns), AgentCard/SkillCard (for inline style conventions).
- Existing components: Breadcrumb, CodeBlock, RightRail.

## Constraints

- Token isolation: all CSS in `docs.css`. Never `globals.css`.
- Named exports only.
- ProofExplorer filter state is local React state — no URL params (closed decision from scope).
- Explorer page hides right rail entirely — uses `docs-content-full` class.
- Proof detail pages use right rail with variant prop — same 220px rail width, different content.
- All CSS classes use single-dash kebab naming (e.g., `docs-content-full`, not `docs-content--full`).

## Gotchas

- **ProofExplorer is a client component, but proof data is static.** The entries are loaded at build time and passed as props. The client component only manages filter/sort state — it doesn't fetch data. Use a thin server component wrapper (`page.tsx`) that loads the data and passes it to the client component.
- **`generateStaticParams` for proof detail pages.** Return `{ slug: entry.slug }` for each entry. The dynamic segment is `[slug]`, so the param key must be `slug`.
- **Explorer filter chips — "All" is not a stage value.** It's a meta-filter that clears the stage filter. When "All" is active, no stage filtering is applied. The stage chips (Engine, Pipeline, etc.) come from `new Set(entries.map(e => e.stage))`.
- **Sorting default.** Default sort is by `completedAt` descending (newest first). This matches the supermock's initial render.
- **Multi-phase hashes.** Some entries have `build-report-1`, `build-report-2`, `build-report-3` instead of `build-report`. IntegritySeal must iterate `Object.entries(hashes)` and render whatever keys exist. Don't hardcode expected key names.
- **PipelineGantt with zero stages.** 7 entries have incomplete timing. Default missing stages to 0 (done in Phase 1 extraction). The Gantt renders all 4 bars always — zero-minute stages get a 2% minimum width so the user sees the gap. If `totalMinutes` is 0, skip the Gantt and show a "No timing data" message.
- **AssertionLedger toggle is client state.** The ledger is inside a client component (`'use client'`). The toggle uses `useState` to show/hide the extra rows. The "show all →" text becomes "collapse ↑" when expanded.
- **Explorer row click — use Next.js router.** Import `useRouter` from `next/navigation`. Each row has an `onClick` that calls `router.push(\`/docs/proof/${entry.slug}\`)`. Don't use an `<a>` tag wrapping the entire row — it breaks table semantics.
- **Proof detail page breadcrumb.** Build breadcrumb segments manually: `[{ name: "Proof Chain", url: "/docs/proof" }, { name: slug }]`.
- **"View on GitHub" link on proof detail.** Points to `.ana/plans/completed/{slug}/` in the repo. URL: `https://github.com/TettoLabs/anatomia/tree/main/.ana/plans/completed/{slug}`.
- **Duration formatting consistency.** Use the same `formatDuration` function across explorer table and detail pages. Input is always `timing.totalMinutes` (integer). For entries with `totalMinutes: 0`, display "0m".
- **Finding card severity normalization.** Findings without `severity` were defaulted to `"observation"` in Phase 1 extraction. The component receives normalized data — render `"observation"` as the `obs` badge (blue/`--info`).
- **Sticky first column on mobile.** Use `position: sticky; left: 0; z-index: 1; background: var(--bg-card);` on the first `<td>` and first `<th>`. Add a left shadow when scrolled: `box-shadow: 4px 0 8px -2px rgba(0,0,0,0.08)` via CSS.

## Build Brief

### Rules That Apply
- Token isolation: all CSS scoped to `docs.css` under `.docs-layout`, never in `globals.css` (D22).
- RightRail renders in page.tsx (D13 learning).
- Content translation: read supermock render functions and translate content VERBATIM.
- Named exports only.
- Website components use inline styles matching supermock, with CSS classes for hover states, pseudo-elements, and responsive rules.
- `'use client'` directive on ProofExplorer and AssertionLedger components.
- CSS naming: single-dash kebab (`docs-content-full`, not `docs-content--full`).
- `generateStaticParams` return must match dynamic segment name.

### Pattern Extracts

**Catch-all page layout** (`website/app/docs/[...slug]/page.tsx:95–142`) — follow this flex layout for proof detail pages:
```tsx
return (
  <div style={{ display: "flex" }}>
    <article className="docs-prose docs-content-area min-w-0 flex-1" style={{ padding: "32px 120px 96px 40px" }}>
      <Breadcrumb segments={segments} />
      {/* content */}
    </article>
    <RightRail toc={tocItems} commitSha={meta.commitSha} buildTimestamp={meta.buildTimestamp} />
  </div>
);
```

**RightRail variant behavior** (supermock `app.js:148–195`):
```javascript
// Explorer: hide rail entirely
if (currentRoute === '/proof') {
  right.style.display = 'none';
  appEl.style.gridTemplateColumns = 'var(--sidebar-w) 1fr';
  return;
}
// Proof detail: different labels and links
const isProof = currentRoute.startsWith('/proof/');
const tocLabel = isProof ? 'On this proof' : 'On this page';
const askLabel = isProof ? 'This proof, elsewhere' : 'Ask AI about this page';
const askLinks = isProof ? `
  View on GitHub ↗
  Download artifacts ↗
  Open in Claude ↗
` : `Copy as Markdown ⌘C / Open in Claude ↗ / Open in ChatGPT ↗`;
```

**Explorer filter chip CSS** (supermock `styles.css:509–521`):
```css
.fchip {
  padding: 4px 9px; border: 1px solid var(--border); border-radius: 3px;
  color: var(--ink-60); background: transparent; letter-spacing: 0.02em; cursor: pointer;
}
.fchip:hover { border-color: var(--ink-25); color: var(--ink); }
.fchip.on { border-color: var(--brand); background: var(--brand-soft); color: var(--brand-light); }
.fchip-label {
  color: var(--ink-40); margin-right: 6px; text-transform: uppercase;
  letter-spacing: 0.06em; font-size: 10px;
}
.exp-stats { margin-left: auto; font-family: var(--font-mono); font-size: 11px; color: var(--ink-60); }
.exp-stats b { color: var(--ink); font-weight: 500; }
```

**Explorer table CSS** (supermock `styles.css:523–565`):
```css
.exp-tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.exp-tbl thead th {
  font-size: 10.5px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--ink-40); text-align: left;
  padding: 11px 16px; background: var(--bg-elev); border-bottom: 1px solid var(--border);
  cursor: pointer; user-select: none;
}
.exp-tbl thead th:hover { color: var(--ink-60); }
.exp-tbl thead th.r { text-align: right; }
.exp-tbl tbody tr {
  border-bottom: 1px solid var(--hairline); cursor: pointer; transition: background .12s;
}
.exp-tbl tbody tr:hover { background: var(--code-bg); }
.exp-tbl td { padding: 13px 16px; vertical-align: middle; }
.exp-tbl .slug { font-family: var(--font-mono); font-size: 11.5px; color: var(--ink-60); white-space: nowrap; }
.exp-tbl .name { color: var(--ink); font-weight: 500; font-size: 13.5px; }
.exp-tbl .tag {
  display: inline-block; font-family: var(--font-mono); font-size: 10px;
  padding: 2px 6px; border-radius: 3px; border: 1px solid var(--hairline);
  color: var(--ink-60); letter-spacing: 0.02em; margin-right: 4px;
}
.exp-tbl .num { font-family: var(--font-mono); font-size: 11.5px; color: var(--ink-80); text-align: right; }
.exp-tbl .num .frac { color: var(--ink-40); }
.exp-tbl .date { font-family: var(--font-mono); font-size: 11px; color: var(--ink-40); text-align: right; }
.pass-pill {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: var(--font-mono); font-size: 10px; color: var(--pass);
  background: var(--pass-bg); border: 1px solid var(--pass-border);
  padding: 2px 7px; border-radius: 3px; letter-spacing: 0.04em; text-transform: uppercase;
}
.pass-pill::before { content: ''; width: 5px; height: 5px; border-radius: 50%; background: var(--pass); }
```

**Proof hero + meta CSS** (supermock `styles.css:691–705`):
```css
.proof-hero { margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid var(--hairline); }
.proof-slug { font-family: var(--font-mono); font-size: 11.5px; color: var(--ink-60); margin-bottom: 8px; }
.proof-meta {
  display: flex; flex-wrap: wrap; gap: 20px;
  font-family: var(--font-mono); font-size: 11.5px; color: var(--ink-60); margin-top: 18px;
}
.proof-meta b { color: var(--ink); font-weight: 500; }
.verdict {
  display: inline-flex; align-items: center; gap: 7px;
  font-family: var(--font-mono); font-size: 11px;
  background: var(--pass-bg); border: 1px solid var(--pass-border);
  color: var(--pass); padding: 3px 10px; border-radius: 3px;
  text-transform: uppercase; letter-spacing: 0.06em;
}
.verdict::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--pass); }
```

**Gantt CSS** (supermock `styles.css:708–713`):
```css
.gantt { display: flex; flex-direction: column; gap: 8px; margin: 14px 0 8px; font-family: var(--font-mono); font-size: 11.5px; }
.gantt-row { display: grid; grid-template-columns: 60px 1fr 50px; gap: 14px; align-items: center; }
.gantt-row .lbl { color: var(--ink-60); text-transform: uppercase; letter-spacing: 0.06em; font-size: 10.5px; }
.gantt-row .bar { height: 8px; background: var(--code-bg); border-radius: 4px; position: relative; overflow: hidden; }
.gantt-row .bar .fill { position: absolute; top: 0; bottom: 0; background: var(--brand); border-radius: 4px; }
.gantt-row .dur { color: var(--ink-60); text-align: right; }
```

**Assertion table CSS** (supermock `styles.css:716–726`):
```css
.assn-tbl { width: 100%; border-collapse: collapse; margin-top: 12px; font-family: var(--font-mono); font-size: 12px; }
.assn-tbl th {
  font-family: var(--font-sans); font-size: 10.5px; font-weight: 600; color: var(--ink-60);
  text-transform: uppercase; letter-spacing: 0.06em; text-align: left;
  padding: 8px 10px; border-bottom: 1px solid var(--border);
}
.assn-tbl td { padding: 9px 10px; border-bottom: 1px solid var(--hairline); vertical-align: top; color: var(--ink-80); line-height: 1.5; }
.assn-tbl .id { color: var(--ink-40); width: 54px; }
.assn-tbl .mtr { color: var(--info); width: 90px; font-size: 11px; text-transform: lowercase; }
.assn-tbl .ok { text-align: right; width: 36px; color: var(--pass); font-size: 11px; text-transform: uppercase; }
.assn-tbl tr:hover td { background: var(--code-bg); }
```

**Finding cards CSS** (supermock `styles.css:729–742`):
```css
.fnd-list { display: flex; flex-direction: column; gap: 10px; margin-top: 14px; }
.fnd { border: 1px solid var(--border); border-radius: var(--r-md); padding: 13px 16px; background: var(--bg-card); }
.fnd-head {
  display: flex; align-items: center; gap: 10px; margin-bottom: 6px;
  font-family: var(--font-mono); font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.06em;
}
.fnd-sev { padding: 2px 7px; border-radius: 3px; font-weight: 500; letter-spacing: 0.06em; }
.fnd-sev.risk { background: var(--fail-bg); color: var(--fail); }
.fnd-sev.debt { background: var(--warn-bg); color: var(--warn); }
.fnd-sev.obs, .fnd-sev.observation { background: var(--info-bg); color: var(--info); }
.fnd-loc { color: var(--ink-60); font-size: 11px; text-transform: none; letter-spacing: 0; }
.fnd-act { margin-left: auto; color: var(--ink-40); font-size: 10.5px; }
.fnd-body { font-size: 13px; line-height: 1.55; color: var(--ink-80); }
```

**Integrity seal CSS** (supermock `styles.css:744–756`):
```css
.integ {
  border: 1px solid var(--border); border-radius: var(--r-md);
  padding: 14px 18px; background: var(--bg-card);
  font-family: var(--font-mono); font-size: 11.5px; margin-top: 14px;
}
.integ-row {
  display: grid; grid-template-columns: 140px 1fr; gap: 14px;
  padding: 6px 0; border-bottom: 1px solid var(--hairline);
}
.integ-row:last-child { border-bottom: 0; }
.integ-row .k { color: var(--ink-60); }
.integ-row .v { color: var(--ink); overflow-x: auto; white-space: nowrap; }
```

**Proof stats row CSS** (supermock `styles.css:772–777`):
```css
.proof-stats-row {
  display: flex; align-items: center; gap: 24px;
  font-family: var(--font-mono); font-size: 13px; color: var(--ink-60);
  margin-bottom: 28px; padding-bottom: 20px; border-bottom: 1px solid var(--hairline);
}
.proof-stats-row b { color: var(--ink); font-weight: 500; }
```

### Supermock Source References

Read these and translate content VERBATIM:

| Component | Render function | Lines | CSS classes | CSS lines |
|-----------|----------------|-------|-------------|-----------|
| ProofExplorer | `renderProofExplorer()` | pages.js:1317–1410 | `.explorer`, `.exp-head`, `.exp-filters`, `.fchip`, `.exp-tbl`, `.pass-pill`, `.exp-foot`, `.proof-stats-row` | styles.css:487–565, 772–777 |
| ProofHero | `renderProofDetail()` hero section | pages.js:1499–1511 | `.proof-hero`, `.proof-slug`, `.proof-meta`, `.verdict` | styles.css:691–705 |
| PipelineGantt | `renderProofDetail()` gantt section | pages.js:1515–1520 | `.gantt`, `.gantt-row`, `.bar`, `.fill` | styles.css:708–713 |
| AssertionLedger | `renderProofDetail()` assertion section | pages.js:1522–1527 | `.assn-tbl` | styles.css:716–726 |
| FindingsList | `renderProofDetail()` findings section | pages.js:1478–1490 | `.fnd-list`, `.fnd`, `.fnd-head`, `.fnd-sev`, `.fnd-body` | styles.css:729–742 |
| IntegritySeal | `renderProofDetail()` integrity section | pages.js:1532–1536 | `.integ`, `.integ-row` | styles.css:744–756 |
| RightRail variant | `renderRight()` | app.js:148–195 | (existing rail classes) | (existing rail CSS) |

Supermock location: `/Users/rsmith/Projects/anatomia_project/anatomia_reference/docs-research/supermock/`

### JSX Pattern Examples

Study these existing Scope 4 files BEFORE writing any component:

- **`website/content/docs/guides/reading-a-proof.mdx`** — severity badges, finding cards, integrity seal patterns. **Closest analog to this phase's proof components.** Study the inline style objects, CSS variable usage, `<div style={{...}}>` pattern for translating supermock HTML.
- **`website/content/docs/guides/verifying-changes.mdx`** — PASS/FAIL cards, verdict styling (directly relevant to the `.verdict` and `.pass-pill` components).
- **`website/content/docs/guides/using-ana-setup.mdx`** — colored terminal output, styled cards.

### Proof Context
- No active proof findings for the new files being created in this phase.
- `RightRail.tsx`: No active findings relevant to the variant prop addition.
- `docs.css`: No active findings — extend existing responsive patterns.

### Checkpoint Commands

- After ProofExplorer + proof page route: `(cd website && pnpm build)` — Expected: build succeeds with `/docs/proof` route.
- After all proof detail pages: `(cd website && pnpm build)` — Expected: build succeeds with 89+ `/docs/proof/{slug}` routes statically generated.
- After RightRail variant: `(cd website && pnpm build)` — Expected: build succeeds, existing pages unaffected.
- CLI tests: `(cd packages/cli && pnpm vitest run)` — Expected: 2178 tests pass (no regression).
- Lint: `pnpm run lint`

### Build Baseline
- Current tests: 2178 passed, 2 skipped (100 test files)
- Command used: `(cd packages/cli && pnpm vitest run)`
- After build: 2178 tests (no new test files — website has no test infrastructure)
- Regression focus: No CLI tests should break. `pnpm build` in website/ is the website test.
