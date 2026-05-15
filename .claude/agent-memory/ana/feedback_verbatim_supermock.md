---
name: verbatim-supermock-copy
description: All docs content must be verbatim from the supermock — translate HTML to MDX, don't rewrite. The supermock took a week of editorial sessions.
type: feedback
---

All editorial content in the anaDocs production build must be **verbatim from the supermock** — translated from HTML to MDX syntax, never rewritten or paraphrased. The supermock copy was produced across ~35 hours of editorial sessions (3 sessions, 2026-05-10 through 2026-05-12) with dual-agent audits, section-by-section editing, and Ryan's direct review.

**Why:** Build agents without supermock access will "write from the spec description" and produce structurally correct but editorially wrong content. The spec says "translate from supermock" but Build interpreted this as "write content matching the spec's description." The difference is the entire editorial investment.

**How to apply:** Every scope, spec, and prompt that involves content pages must:
1. Explicitly state that content is translated verbatim from the supermock, not authored fresh
2. Include the absolute path to the supermock: `/Users/rsmith/Projects/anatomia_project/anatomia_reference/docs-research/supermock/pages.js`
3. Reference specific line numbers for each page's render function
4. Include the translation rules: `callout()` → `<Callout>`, `code()` → fenced blocks, `nextCards()` → `<NextCards>`, strip `<span class="tk-*">` tags, convert HTML formatting to markdown
5. Make clear that editorial descriptions, prose, voice, and flow are NOT the builder's to decide — they're locked in the supermock
