# Proof Chain Dashboard

90 runs · 272 active · 111 lessons · 0 promoted · 161 closed

## Hot Modules

| File | Active | Entries |
|------|--------|--------|
| packages/cli/src/commands/work.ts | 22 | 12 |
| packages/cli/tests/commands/work.test.ts | 20 | 15 |
| packages/cli/tests/commands/proof.test.ts | 11 | 5 |
| website/lib/proof-feed.ts | 10 | 3 |
| packages/cli/tests/commands/artifact.test.ts | 9 | 5 |

## Promoted Rules

*No promoted rules yet.*

## Active Findings (30 shown of 272 total)

### website/app/docs/[...slug]/page.tsx

- **code:** Catch-all route renamed from [[...slug]] to [...slug] — not specified in spec but necessary — *Content Pages — 16 editorial docs pages with bug fixes and sidebar ordering*

### website/app/docs/docs.css

- **code:** docs-content-full CSS class added in Phase 1 but only used by Phase 2 explorer — harmless dead code until Phase 2 ships — *Dynamic Pages — Reference & Proof Chain*
- **code:** Reference grid responsive collapse only at 660px — no intermediate 2-col→1-col at 880px. Supermock shows collapse at 660px so this matches, but the spec text mentions 1180px and 880px rules — *Dynamic Pages — Reference & Proof Chain*

### website/app/docs/page.tsx

- **code:** Stats strip has 5 items (added MIT/free forever) vs spec mockup showing 4 — *Content Pages — 16 editorial docs pages with bug fixes and sidebar ordering*

### website/app/docs/reference/cli/page.tsx

- **code:** Hardcoded 'Last reviewed · 2026-05-11' in CLI reference page will become stale — *Dynamic Pages — Reference & Proof Chain*

### website/app/globals.css

- **code:** globals.css modified to add --brand-light and --info CSS variables — not in spec file_changes — *Content Pages — 16 editorial docs pages with bug fixes and sidebar ordering*

### website/components/docs/content/Callout.tsx

- **code:** Callout label stores titlecase (Rule/Note), relies on CSS text-transform for uppercase display — *Content Pages — 16 editorial docs pages with bug fixes and sidebar ordering*
- **code:** Callout label renders 'Rule' with CSS uppercase — contract A020 expects literal 'RULE'. Visually correct but DOM text differs from contract value. — *Content Pages — 16 editorial docs pages with bug fixes and sidebar ordering*

### website/components/docs/content/DocsGrid.tsx

- **code:** DocsGrid component created but not in spec file_changes — *Content Pages — 16 editorial docs pages with bug fixes and sidebar ordering*

### website/components/docs/content/ResourceStrip.tsx

- **code:** ResourceStrip uses <a> for Manifesto link (internal anatomia.dev URL) instead of Next.js Link — *Content Pages — 16 editorial docs pages with bug fixes and sidebar ordering*

### website/components/docs/content/TroubleCard.tsx

- **code:** TroubleCard has no aria/role attribute for accessibility — Callout uses role=note — *Content Pages — 16 editorial docs pages with bug fixes and sidebar ordering*
- **test:** No unit tests for TroubleCard component — only verified via build compilation — *Content Pages — 16 editorial docs pages with bug fixes and sidebar ordering*

### website/components/docs/layout/DocsErrorBoundary.tsx

- **code:** Lint error: DocsErrorBoundary uses <a> tag instead of Next.js <Link> for /docs/ navigation — *Docs Shell (Layout + Shared Components)*

### website/components/docs/layout/RightRail.tsx

- **code:** RightRail 'Download artifacts' and 'Open in Claude' links point to '#' — placeholder hrefs with no target — *Dynamic Pages — Reference & Proof Chain*
- **code:** Right rail responsive breakpoint mismatch — hidden from 1181-1279px where spec says visible above 1180px — *Docs Shell (Layout + Shared Components)*

### website/components/docs/proof/FindingsList.tsx

- **code:** FindingsList shows max 5 findings with no toggle to expand — AssertionLedger has expand/collapse but FindingsList truncates permanently — *Dynamic Pages — Reference & Proof Chain*

### website/components/docs/proof/IntegritySeal.tsx

- **code:** IntegritySeal last hash row retains bottom border — CSS rule `.integ-row:last-child { border-bottom: 0 }` from supermock not applied since rows use inline styles — *Dynamic Pages — Reference & Proof Chain*

### website/components/docs/proof/PipelineGantt.tsx

- **code:** formatDuration defined but unused in PipelineGantt — duration column uses raw `{value}m` instead — *Dynamic Pages — Reference & Proof Chain*
- **code:** PipelineGantt left-offset uses Math.round per-stage — cumulative rounding can exceed 100% and cause visual overflow on entries with many small stages — *Dynamic Pages — Reference & Proof Chain*

### website/components/docs/proof/ProofExplorer.tsx

- **code:** formatDuration duplicated in 4 files (ProofExplorer, ProofHero, PipelineGantt, detail page) — extract to shared utility — *Dynamic Pages — Reference & Proof Chain*
- **code:** ProofExplorer inline styles heavily duplicated across 7 column headers — same 9-property object repeated per th element — *Dynamic Pages — Reference & Proof Chain*

### website/components/docs/providers/PlatformProvider.tsx

- **code:** Lint error: PlatformProvider calls setState synchronously inside useEffect — violates react-hooks/set-state-in-effect rule — *Docs Shell (Layout + Shared Components)*

### website/content/docs/concepts/context.mdx

- **code:** Context page links to /docs/reference/context twice — page doesn't exist and isn't scoped — *Content Pages — 16 editorial docs pages with bug fixes and sidebar ordering*

### website/content/docs/concepts/pipeline.mdx

- **code:** Dynamic value comments use {/* Dynamic: update on data change */} but there's no grep-friendly tag to find them at update time — *Content Pages — 16 editorial docs pages with bug fixes and sidebar ordering*

### website/content/docs/concepts/skills.mdx

- **code:** Skills page inline-links 8 individual skill reference pages that don't exist and aren't scoped in any phase — *Content Pages — 16 editorial docs pages with bug fixes and sidebar ordering*

### website/content/docs/guides/using-ana-setup.mdx

- **code:** NextCards link to unbuilt reference/proof pages — will 404 until Scope 5 — *Content Pages — 16 editorial docs pages with bug fixes and sidebar ordering*

### website/content/docs/guides/verifying-changes.mdx

- **code:** Stale dynamic-value comment in verifying-changes and troubleshooting — says 17 of 78 proofs but real count may differ — *Content Pages — 16 editorial docs pages with bug fixes and sidebar ordering*

### website/scripts/extract-docs-data.ts

- **code:** Variable shadowing in extractSkillTemplates — inner 'content' (line 584) shadows outer 'content' (line 566), latent confusion risk — *Dynamic Pages — Reference & Proof Chain*

### General

- **test:** No unit tests for any new components — build verification is pnpm build only — *Content Pages — 16 editorial docs pages with bug fixes and sidebar ordering*
- **code:** NextCards link to 6 pages that don't exist yet (guides, reference, proof) — *Content Pages — 16 editorial docs pages with bug fixes and sidebar ordering*

