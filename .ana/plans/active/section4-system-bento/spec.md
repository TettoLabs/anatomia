# Spec: Section 4 — The System (replace Bento)

**Created by:** AnaPlan
**Date:** 2026-05-09
**Scope:** .ana/plans/active/section4-system-bento/scope.md

## Approach

Port the approved handoff HTML (`/Users/rsmith/Downloads/handoff-package 2/section-4-system/Section 4 - System.html`) into modular Next.js components following the ScanSlab/Hero patterns. All section-specific styles go in a CSS module. All user-visible strings go in `copy.ts` under a `system` key. Only the Drawer component uses `"use client"` — everything else is server-rendered.

**Key design decisions:**

1. **CLI version via JSON import.** The ManPage component imports `packages/cli/package.json` directly — server components can do this, it's type-safe, and avoids env var plumbing. Path from `website/components/system/SystemSection.tsx` is `../../../packages/cli/package.json`.

2. **Shared SectionThread component.** Extract the scan-to-system thread pattern into `components/ui/SectionThread.tsx`. Both the existing scan thread (ScanSlab lines 158–166) and the new system closer use the same shape: mono text, oxblood arrow, optional link, hairline border-top. The ScanSlab thread gets replaced with a `<SectionThread>` call. Future sections (proof, pricing) will reuse it.

3. **Drawer.tsx manages all 4 drawers.** One client component wraps the drawer stack, with `useState<Set<string>>` tracking which drawers are open (multiple can be open simultaneously). Each drawer's `<button>` has `aria-expanded` and `aria-controls`.

4. **Context file tree shows nested folders.** The handoff shows all 4 files flat under `.ana/` — that's factually wrong. The tree must show `.ana/context/` as a subfolder containing `project-context.md` and `design-principles.md`, with `scan.json` and `ana.json` at the `.ana/` root level.

5. **Pulse animation scoped to section root.** The handoff stamps `pulse-fire` on `<body>`. In Next.js, Drawer.tsx uses IntersectionObserver on the section root (via ref or prop) and toggles a CSS class on the section element instead. The pulse keyframes are wrapped in `@media (prefers-reduced-motion: no-preference)`.

6. **Bento directory left dead.** The import is removed from `page.tsx` but the `components/bento/` directory stays. Cleanup is a separate scope.

**Factual corrections from handoff → reality:**

| Handoff says | Spec says | Notes |
|---|---|---|
| `v1.1.2` | Dynamic from `packages/cli/package.json` (currently `v1.0.2`) | Man page header + footer |
| `23 commands` | `25 commands` | Spec strip + drawer 04 meta |
| `+ 17 more` | `+ 19 more` | Man page +more line |
| `setup, check, index, verify, proof, agents` | `init, setup, verify, proof, agents` | +more trailing names |
| `2026-04` | `2026-05` | Man page footer |
| `install: 3.2s` | `install: ~3s` | Softened — exact timing unverified |
| Context files flat under `.ana/` | Nested `.ana/context/` subfolder | File tree in drawer 03 |

## Output Mockups

### Section header (two-column at ≥900px)

```
• The system

Scan reads. init|   ←  "init" in italic Fraunces with blinking cursor

                    ana init takes the scan and ships a complete
                    development system into your repo. Agents that
                    follow your conventions. Skills matched to your
                    stack. A CLI they use as a toolbelt.
```

### Spec strip (horizontal at desktop, vertical at ≤480px)

```
format: markdown  lock-in: zero  ships: 5 agents  skills: 8 matched  context: 4 files  cli: 25 commands  install: ~3s
```

### Drawer (collapsed)

```
─────────────────────────────────────────────────────────
01   Agents    five sealed roles · markdown agents in your repo    5 agents    +
─────────────────────────────────────────────────────────
```

### Drawer (expanded — agents example)

Left column (copy):
> Init ships **five specialized agents** as markdown templates in your repo. Each has a role, a toolset, and an independence guarantee.
> Think doesn't implement. Build doesn't verify. **Verify never reads Build's self-report.** Two agents, two accounts of the same work.

Right column (file tree):
```
your-repo/
  .claude/agents/                                    5 files  ▾
    ana.md                          scopes work, surfaces tradeoffs
    ana-plan.md                     writes spec + sealed contract
    ana-build.md                    implements, tags every test
    ana-verify.md                   fault-finds independently
    ana-learn.md                    tends quality between cycles
```

### Context drawer file tree (corrected from handoff)

```
your-repo/
  .ana/                                              4 files  ▾
    context/
      project-context.md                   architecture, decisions
      design-principles.md                   craft convictions
    scan.json                          structured scan output
    ana.json                             CLI configuration
```

### Man page (drawer 04, corrected)

```
ANATOMIA(1)              User Commands              v1.0.2
───────────────────────────────────────────────────────────
NAME
    ana — anatomia command-line interface

SYNOPSIS
    ana <command> [options]

COMMANDS
    scan              read the repo, write scan.json
    work start        claim work, start the clock
    work status       track in-flight work
    artifact save     record, hash, sign
    pr create         package the run
    proof health      quality trajectory across runs

    + 19 more · init, setup, verify, proof, agents
───────────────────────────────────────────────────────────
anatomia 1.0.2           2026-05                ANATOMIA(1)
```

### Section closer

```
───────────────────────────────────────────────────────────
↓  That's the system. Next: the proof.
```

The ↓ arrow has a subtle opacity breathe animation (~3s cycle, 0.4→1→0.4). The word "the proof" is bold. Links to `#proof`.

### ScanSlab thread (updated text)

```
───────────────────────────────────────────────────────────
What Ana finds  →  feeds the system.  See how ↓
```

Changed from "feeds the pipeline" to "feeds the system". `href` changed from `#pipeline` to `#system`.

## File Changes

### `website/lib/copy.ts` (modify)
**What changes:** Add a `system` key containing all strings for the section (eyebrow, title, lede, spec strip items, drawer data for all 4 drawers including copy text and file tree/man page data, and the closer text). Also update all orphaned `#pipeline` and `#agents` anchors to `#system`:
- `nav.links[0]`: `href: "/#agents"` → `href: "/#system"`
- `hero.ctas.secondary`: `href: "#agents"` → `href: "#system"`
- `footer.columns[0].links` "Pipeline" and "Agents": `href: "/#agents"` → `href: "/#system"`
- `manifesto.outbound[0]`: `href: "/#pipeline"` → `href: "/#system"`

Also add `sectionThread` entries for the scan and system threads under the `scan` and `system` keys respectively, so thread text lives in copy.ts.

**Pattern to follow:** The `scan` key structure in copy.ts — flat object with typed string fields.
**Why:** Without centralizing strings, copy changes require hunting through components.

### `website/components/ui/SectionThread.tsx` (create)
**What changes:** A small server component that renders the section-to-section thread: hairline border-top, mono text, oxblood arrow glyph, text/link. Props: `segments` (array of text spans), `arrow` (glyph character), `link` (optional href + label). The breathe animation class is applied conditionally via a prop.
**Pattern to follow:** The inline thread at ScanSlab.tsx lines 158–166 — same Tailwind classes, same style props.
**Why:** Without extraction, the thread pattern is duplicated between ScanSlab and SystemSection, and will be duplicated again for future sections.

### `website/components/system/SystemSection.tsx` (create)
**What changes:** Server component. The main section wrapper: eyebrow, two-column header with title + lede, SpecStrip, Drawer stack (client), and SectionThread closer. Imports from copy.ts, uses Container. Has `id="system"` and `data-component="system"`. Uses `reveal` class for scroll-driven animation. Imports CLI version from `packages/cli/package.json` and passes it to ManPage data.
**Pattern to follow:** ScanSlab.tsx — server component structure with Container, eyebrow pattern, copy.ts imports.
**Why:** This is the primary composition component that replaces Bento in the page.

### `website/components/system/Drawer.tsx` (create)
**What changes:** Client component (`"use client"`). Manages the 4-drawer accordion. Uses `useState<Set<string>>` for open drawer tracking. Each drawer renders a `<button>` head (with `aria-expanded`, `aria-controls`) and a grid-animated body (`grid-template-rows: 0fr→1fr`). The drawer content (copy text, visuals) is passed as children or structured data. Also handles the IntersectionObserver pulse animation — observes the section root, toggles a CSS class on the section ref for the one-shot disclosure pulse.
**Pattern to follow:** CopyButton.tsx — minimal client component with useState.
**Why:** Drawer toggle is the only client-side interaction in this section.

### `website/components/system/FileTree.tsx` (create)
**What changes:** Server component. Renders the Finder-style file tree used in drawers 01–03. Takes structured data (folder name, files with name/ext/annotation, nested groups). Supports the root row, folder rows with disclosure indicators, file rows with annotations, and nested subfolder groups (needed for the `.ana/context/` nesting in drawer 03).
**Pattern to follow:** The `.tree` markup in the handoff HTML (lines 860–879).
**Why:** Reused across 3 drawers with different data.

### `website/components/system/ManPage.tsx` (create)
**What changes:** Server component. Renders the man-page mock for drawer 04. Takes version string, commands array, and `+more` data as props. Renders the header/footer chrome, NAME, SYNOPSIS, and COMMANDS sections. All values come from copy.ts data passed via SystemSection.
**Pattern to follow:** The `.man` markup in the handoff HTML (lines 988–1019).
**Why:** Isolates the man-page visual from the drawer plumbing.

### `website/components/system/SpecStrip.tsx` (create)
**What changes:** Server component. Renders the horizontal stat strip below the header (format, lock-in, ships, skills, context, cli, install). Takes an array of `{label, value}` from copy.ts. Responsive: horizontal at desktop, vertical list at ≤480px.
**Pattern to follow:** The `.spec-strip` markup in the handoff HTML (lines 830–838).
**Why:** Isolates the spec strip from the main section component.

### `website/components/system/system.module.css` (create)
**What changes:** All section-specific CSS. Ported from the handoff's `<style>` block, minus the `:root` token definitions (already in globals.css). Includes: section layout, header grid, section-title with Fraunces italic + blinking cursor, lede, spec-strip responsive, drawer mechanics (head grid, body animation, toggle rotation), file tree styles, man page styles, closer, and all 5 responsive breakpoints (1024, 860, 720, 480). The pulse animation keyframes are wrapped in `@media (prefers-reduced-motion: no-preference)`. The cursor blink is wrapped similarly. All class names are CSS-module-scoped — no collision risk.
**Pattern to follow:** `hero.module.css` — complex responsive styles with multiple breakpoints, var() token references.
**Why:** ~500+ lines of responsive CSS with grid-area reflows at 5 breakpoints. CSS module is the right tool; Tailwind would be unreadable.

### `website/app/(marketing)/page.tsx` (modify)
**What changes:** Replace `import { Bento }` with `import { SystemSection }` from `@/components/system/SystemSection`. Replace `<Bento />` with `<SystemSection />` in the JSX. Update the file's doc comment to reflect new section order: Hero → CompatMarquee → ScanSlab → SystemSection → DeepDive → Pricing → ProofFeed.
**Pattern to follow:** Existing import/composition pattern in the file.
**Why:** This is the composition root — the swap point.

### `website/components/scan/ScanSlab.tsx` (modify)
**What changes:** Replace the inline thread div (lines 158–166) with a `<SectionThread>` component call. Update the thread text from "feeds the pipeline" to "feeds the system" and the href from `#pipeline` to `#system`. The text and href values come from copy.ts.
**Pattern to follow:** The new SectionThread component's API.
**Why:** AC15 requires the text/href update. Extraction to SectionThread avoids duplication.

### `website/components/hero/ScrollHint.tsx` (modify)
**What changes:** Change `href="#pipeline"` to `href="#system"` (line 24). Change `aria-label="Scroll to pipeline"` to `aria-label="Scroll to system"`.
**Pattern to follow:** Existing code in the file.
**Why:** AC16 — orphaned `#pipeline` anchor.

## Acceptance Criteria

- [x] AC1: The Bento section is replaced by the System section on the landing page
- [x] AC2: Page order is Hero → CompatMarquee → ScanSlab → SystemSection → DeepDive → Pricing → ProofFeed
- [x] AC3: All four drawers open/close with animation (grid-template-rows 0fr→1fr)
- [x] AC4: The CLI version in the man page reads dynamically from `packages/cli/package.json` at build time
- [x] AC5: Command count is 25 (not 23), and `+ N more` is derived (25 - 6 shown = `+ 19 more`)
- [x] AC6: The `+ more` trailing list names only real commands (no `check`, no `index`; include `init`)
- [x] AC7: Context drawer file tree shows `.ana/context/` subfolder containing project-context.md and design-principles.md, with scan.json and ana.json at `.ana/` root
- [x] AC8: Agent count is 5 (setup intentionally omitted — pipeline agents only)
- [x] AC9: All strings live in `copy.ts` under a `system` key
- [x] AC10: Responsive behavior matches handoff at 375px, 768px, and 1280px viewports
- [x] AC11: Dark theme works via existing CSS custom properties (no hardcoded colors)
- [x] AC12: Drawers use `<button>` with `aria-expanded` and `aria-controls` for accessibility
- [x] AC13: The website builds without errors
- [x] AC14: Section closer uses mono text, oxblood arrow with breathe animation (~3s, 0.4→1→0.4), links to `#proof`, honors `prefers-reduced-motion`
- [x] AC15: Scan section thread updated: "feeds the system", `href="#system"`
- [x] AC16: All orphaned `#pipeline` and `#agents` anchors updated to `#system`
- [x] AC17: SectionThread extracted as shared component in `components/ui/`
- [x] AC18: No build errors (`pnpm --filter demo-site build`)

## Testing Strategy

- **Unit tests:** None — the website has no component test infrastructure (scan.json confirms `test: 0` for website). AC13/AC18 (build succeeds) is the primary automated check.
- **Visual verification:** Open the site at 375px, 768px, and 1280px. Compare against the standalone handoff HTML at the same viewports. Drawers open/close smoothly. Dark mode renders correctly.
- **Interaction verification:** Each drawer toggles independently. Multiple drawers can be open. `aria-expanded` updates on toggle. Breathe animation runs on the closer arrow. Blinking cursor on "init" in the title. Both animations stop under `prefers-reduced-motion`.
- **Link verification:** All `#system` anchors scroll to the section. The closer's `#proof` anchor scrolls correctly (even if the target section doesn't exist yet — the link should still be present).

## Dependencies

- The handoff HTML file at `/Users/rsmith/Downloads/handoff-package 2/section-4-system/Section 4 - System.html` is the visual source of truth.
- `packages/cli/package.json` must be accessible from the website build (monorepo path resolution).
- Fraunces font is already loaded site-wide (`--font-serif`).
- All CSS custom properties referenced by the section already exist in `globals.css`.

## Constraints

- No hardcoded colors — all colors via CSS custom properties from globals.css.
- No `@apply` in CSS modules — Tailwind v4 doesn't resolve `@apply` in modules.
- No `body` class manipulation from section components — scope animations to section root.
- The `system` copy key structure must be `as const` typed, matching the existing copy.ts pattern.

## Gotchas

- **CSS module class names:** The handoff uses generic names (`.section`, `.container`, `.header`, `.lede`). These will collide with globals if not in a CSS module. The module scopes them automatically — but the builder must use `styles.section` etc., not raw class strings.
- **`grid-template-rows: 0fr→1fr` animation:** Requires a wrapper div with `overflow: hidden` between the grid parent and the content. Without `drawer-body-wrap`, content flashes during animation. The handoff has this structure — preserve it.
- **Fraunces `font-variation-settings`:** The section title's `<em>` uses `font-variation-settings: "opsz" 144` for optical sizing. This must be set explicitly — the CSS module won't inherit it from a class name.
- **JSON import path:** From `website/components/system/SystemSection.tsx`, the path to CLI package.json is `../../../packages/cli/package.json`. TypeScript may need a type assertion or a `resolveJsonModule` config (likely already enabled — verify `tsconfig.json`).
- **`--spacing-section` overrides at breakpoints:** The handoff overrides `--spacing-section` at 3 breakpoints via `:root`. In the CSS module, scope these overrides to the section element, not `:root`, to avoid affecting other sections.
- **The `+` toggle glyph:** The handoff uses a `+` character that rotates 45° to become `×`. This is a CSS transform on the toggle span, not a character swap. The rotation uses `cubic-bezier(.2,.85,.2,1)`.
- **Dark theme for man page:** `--terminal-bg` and `--terminal-fg` already flip in dark mode (globals.css lines 98–99 and 127–128). The man page doesn't use terminal colors — it uses `--ink-*` and `--fg-*` tokens which also flip. Should work without dark-specific overrides.

## Build Brief

### Rules That Apply
- No `@apply` in CSS modules — Tailwind v4 doesn't resolve in modules. Use raw CSS properties with `var()` tokens.
- Prefer named exports. No default exports.
- `"use client"` only on Drawer.tsx — everything else is a server component.
- All user-visible strings in copy.ts, accessed via `copy.system.*`.
- `data-component="system"` on the section root for debugging (follows ScanSlab pattern).
- Use `<Container>` for max-width wrapper (follows all existing sections).
- Add `reveal` class to the section element for scroll-driven animation (follows ScanSlab, DeepDive).

### Pattern Extracts

**ScanSlab thread (lines 158–166) — the pattern SectionThread replaces:**
```tsx
{/* Thread */}
<div className="mt-7 flex flex-wrap items-baseline gap-3 border-t pt-5 font-mono text-xs" style={{ borderColor: "var(--hairline)", color: "var(--ink-60)" }}>
  <span>What Ana finds</span>
  <span style={{ color: "var(--color-brand)" }}>→</span>
  <span>feeds the pipeline.</span>
  <a href="#pipeline" className="border-b font-semibold" style={{ color: "var(--fg-strong)", borderColor: "var(--fg-strong)" }}>
    See how ↓
  </a>
</div>
```

**Bento section root (lines 16–21) — the pattern SystemSection replaces in page.tsx:**
```tsx
export function Bento() {
  return (
    <section
      data-component="bento"
      className={styles.section}
    >
      <Container>
```

**CopyButton (lines 1–3) — the "use client" pattern Drawer.tsx follows:**
```tsx
"use client";

import { useCallback, useState } from "react";
```

**ScanSlab eyebrow (lines 119–122) — the eyebrow pattern SystemSection follows:**
```tsx
<div className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--ink-60)" }}>
  <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--color-brand)" }} />
  <Formatted text={copy.scan.eyebrow} />
</div>
```

### Proof Context

No active proof findings for affected files.

### Checkpoint Commands

- After SystemSection + Drawer + CSS module created: `cd website && npx next build` — Expected: build succeeds
- After all changes (copy.ts, page.tsx, ScanSlab, ScrollHint, SectionThread): `cd website && npx next build` — Expected: build succeeds with no errors
- Final: `cd website && npx next dev` — Expected: section renders at localhost, drawers toggle, responsive behavior matches handoff

### Build Baseline
- Current website build: succeeds (verified this session)
- No website tests exist — build success is the primary automated check
- Command used: `cd website && npx next build`
- After build: build should still succeed with 0 errors
- Regression focus: `page.tsx` (composition), `copy.ts` (type safety — adding system key must not break existing typed references), `ScanSlab.tsx` (thread replacement must not break existing section)
