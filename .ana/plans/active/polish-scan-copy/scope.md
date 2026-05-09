# Scope: Polish scan section copy

**Created by:** Ana
**Date:** 2026-05-08

## Intent
The scan section is the top-of-funnel on-ramp on the landing page. The install command is broken (`npx anatomia scan` resolves to an unrelated npm package), the checkmarks describe the tool instead of what the user gets, and the lede repeats a trust signal already covered by the eyebrow and checkmarks. Fix the command, sharpen the asserts, trim the lede.

## Complexity Assessment
- **Kind:** fix
- **Size:** small — 1 file, 4 string edits
- **Files affected:** `website/lib/copy.ts`
- **Blast radius:** None. Copy changes only. No component, layout, or style changes.
- **Estimated effort:** < 10 minutes
- **Multi-phase:** no

## Approach
Edit the `scan` object in `copy.ts`. Fix the install command string, rewrite the three assert strings, and trim one sentence from the lede. No structural changes to components — `ScanSlab.tsx` already reads these strings dynamically.

## Acceptance Criteria
- AC1: `copy.scan.install` is `npx anatomia-cli scan` (resolves to the correct npm package)
- AC2: `copy.scan.lede` no longer contains "No account, no API key, nothing leaves your machine"
- AC3: All three `copy.scan.asserts` entries are rewritten to benefit-oriented copy
- AC4: No other keys in the `copy` object are modified
- AC5: The website builds without errors

## Edge Cases & Risks
- The `CopyButton` component copies `copy.scan.install` verbatim — the command fix flows through automatically.
- The hero CTA also has the wrong package name (`npx anatomia init` → should be `npx anatomia-cli init`). Out of scope for this item but should be addressed next.

## Rejected Approaches
- **Rewriting the terminal mock** — verified against real Papermark scan output. The mock is accurate and illustrative. No changes needed.
- **Changing the title or eyebrow** — both tested well. "Before you install anything" lowers commitment. "2–5s" verified at 3.3s on a real scan.
- **Changing the thread/transition text** — "Scan reads. → Init ships." was considered but rejected. Init doesn't ship — the pipeline does. Current version has a scroll CTA that pulls the eye down the page, which is what a transition element should do.

## Open Questions
None.

## Exploration Findings

### Patterns Discovered
- All user-visible strings live in `website/lib/copy.ts` — components read from this single source of truth.
- `ScanSlab.tsx` renders `copy.scan.install`, `copy.scan.lede`, and `copy.scan.asserts` directly. No transformation or mapping.

### Constraints Discovered
- [TYPE-VERIFIED] copy.ts is `as const` (copy.ts:455) — all strings are literal types. No runtime concerns with edits.
- [VERIFIED] CopyButton copies `copy.scan.install` — command fix propagates automatically.

### Test Infrastructure
- No unit tests for copy strings. AC5 (build succeeds) is the verification.

## For AnaPlan

### Structural Analog
Any previous string edit in `website/lib/copy.ts` — this is a direct content change, no structural complexity.

### Relevant Code Paths
- `website/lib/copy.ts` lines 69–79 — the `scan` object with `install`, `lede`, and `asserts`
- `website/components/scan/ScanSlab.tsx` — consumes these strings, no changes needed

### Patterns to Follow
- Keep `as const` assertion at end of `copy` object
- Use format conventions from copy.ts header: `*word*` for emphasis, `**word**` for strong

### Known Gotchas
- None. This is a 4-string edit in one file.

### Things to Investigate
- None.
