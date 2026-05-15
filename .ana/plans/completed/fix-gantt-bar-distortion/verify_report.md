# Verify Report: Fix Gantt Bar Distortion and Document Timing

**Result:** PASS
**Created by:** AnaVerify
**Date:** 2026-05-15
**Spec:** .ana/plans/active/fix-gantt-bar-distortion/spec.md
**Branch:** feature/fix-gantt-bar-distortion

## Pre-Check Results
```
=== CONTRACT COMPLIANCE ===
  Contract: .ana/plans/active/fix-gantt-bar-distortion/contract.yaml
  Seal: INTACT (hash sha256:502a340637ce184a564f36bb64c0afd685301617645d49d02dd15271b240795b)
```

Seal status: **INTACT**

Tests: 2297 passed, 0 failed, 2 skipped. Build: success (cached turbo). Lint: 1 pre-existing warning (unused eslint-disable in git-operations.ts).

## Contract Compliance
| ID   | Says                                                                  | Status        | Evidence |
|------|-----------------------------------------------------------------------|---------------|----------|
| A001 | Gantt bars show time proportional to each phase, not inflated by idle gaps | ✅ SATISFIED | `website/components/docs/proof/PipelineGantt.tsx:43,73` — denominator is `segments.reduce(sum + Math.max(0, seg.minutes))` and `STAGES.reduce(sum + Math.max(0, timing[stage.key]))`, not `totalMinutes` |
| A002 | The sentinel that forced the last bar to 100% is removed              | ✅ SATISFIED | `website/components/docs/proof/PipelineGantt.tsx` — grep for `lefts.push(100)` returns no matches. Diff confirms removal from segment path. |
| A003 | The sentinel is also removed from the flat 4-bar path                 | ✅ SATISFIED | Same grep — no `lefts.push(100)` anywhere in file. Diff confirms removal from flat path (former line ~89). |
| A004 | A proof with 13m/2m/3m/3m shows Verify at roughly 14%, not 86%       | ✅ SATISFIED | Source inspection: 3/21 * 100 = 14.285714285714286. Line 84: `widthPct = value === 0 ? 2 : (value / total) * 100` with total=21, value=3 yields 14.285714285714286. |
| A005 | The same proof shows Think at roughly 62%                             | ✅ SATISFIED | Source inspection: 13/21 * 100 = 61.904761904761905. Same formula, total=21, value=13. |
| A006 | Multi-phase proofs render last segment proportionally, not inflated   | ✅ SATISFIED | `website/components/docs/proof/PipelineGantt.tsx:56` — last segment width is `(value / total) * 100`, same formula as all others. No sentinel to force 100%. |
| A007 | Zero-duration phases still get a minimum visible width                | ✅ SATISFIED | `website/components/docs/proof/PipelineGantt.tsx:56,84` — `value === 0 ? 2 : ...` yields 2 for zero-duration phases. |
| A008 | When all phases are zero, no bars are rendered regardless of wall-clock time | ✅ SATISFIED | `website/components/docs/proof/PipelineGantt.tsx:44,74` — `Math.max(0, ...)` sum yields 0, `if (total === 0) return []`. |
| A009 | Negative phase values are clamped to zero so bars never go backwards  | ✅ SATISFIED | `website/components/docs/proof/PipelineGantt.tsx:51,81` — `Math.max(0, seg.minutes)` and `Math.max(0, timing[stage.key])` clamp before accumulation. widthPct computed from clamped value, always ≥ 0 > -1. |
| A010 | The timeline docs explain what each pipeline phase measures           | ✅ SATISFIED | `website/content/docs/guides/reading-a-proof.mdx:60` — contains "session start to artifact save", "session open to artifact save". |
| A011 | The timeline docs explain why duration exceeds the sum of phases      | ✅ SATISFIED | `website/content/docs/guides/reading-a-proof.mdx:62` — contains "Idle time between sessions" and "idle time between sessions". |
| A012 | The dynamic marker for median timings is preserved                    | ✅ SATISFIED | `website/content/docs/guides/reading-a-proof.mdx:66` — `{/* ana:dynamic medianTimings */}` present, unchanged. |
| A013 | The search index is regenerated after docs changes                    | ✅ SATISFIED | `website/public/search-index.json` exists, modified 2026-05-15 00:57, contains "idle" content from new docs. |
| A014 | The LLM context file is regenerated after docs changes                | ✅ SATISFIED | `website/public/llms-full.txt` exists, modified 2026-05-15 00:57, contains "idle time between sessions" from new docs. |
| A015 | The website builds without errors                                     | ✅ SATISFIED | `pnpm build` succeeded (turbo cached, 2 tasks successful). All proof pages generated including SSG routes. |

## Independent Findings

**Prediction resolution:** All 5 predictions investigated — none confirmed. The builder addressed both paths, both sentinels, the zero guard, the marker, and the heading style correctly. No surprises in the implementation logic.

**Production risk resolution:** Division by zero handled by `if (total === 0) return []` after clamping. NaN cannot occur — if all values are negative, clamped sum is 0, early return fires.

**Over-building check:** No new exports, no new functions, no new parameters beyond what the spec requires. The builder added `Math.max(0, ...)` clamping which was explicitly called for in the spec. No YAGNI violations.

**Code quality:** Clean implementation. Both paths (segment and flat) follow the same pattern: compute clamped sum → early return on zero → cumulative positioning with clamped values. The old two-pass approach (compute lefts array, then derive widths from adjacent positions) is replaced with a single-pass approach computing leftPct and widthPct directly. Simpler and correct.

**One subtle behavior:** On line 61 (segment path) and line 88 (flat path), `bar.minutes` preserves the raw value (potentially negative) for the display label, while `widthPct` uses the clamped value. A negative phase would display as "-3m" in the label but render with correct (clamped) bar width. This is defensible — showing the actual data in the label while clamping only the visual — but worth knowing.

**Zero-width minimum overflow:** When `value === 0`, widthPct is set to 2 (minimum visible width). This minimum is added regardless of the cumulative position, meaning if many zero-duration phases exist, bars could extend past 100% total width. In practice this is unlikely (would require all phases to be 0, which triggers the early return) but the edge case of "some phases zero, some non-zero" would have bars summing to >100%. Pre-existing behavior — the old code had the same `value === 0 ? 2 :` guard.

## AC Walkthrough

- **AC1:** ✅ PASS — Both paths compute `(value / total) * 100` where total is sum of phase values. Verified by source inspection of lines 43, 55-56, 73, 82-84.
- **AC2:** ✅ PASS — `grep -n "lefts.push(100)" PipelineGantt.tsx` returns no matches. The `lefts` array is completely removed from both paths.
- **AC3:** ✅ PASS — For 13m/2m/3m/3m: total=21, verify=3/21*100=14.29%. Traced through flat path at lines 73-84.
- **AC4:** ✅ PASS — Segment path (lines 43-68): last segment uses `(value / total) * 100`, same formula as all segments. No sentinel forces it to fill remaining space.
- **AC5:** ✅ PASS — `value === 0 ? 2 : ...` guard present at lines 56 and 84. Minimum 2% width preserved.
- **AC6:** ✅ PASS — `reading-a-proof.mdx` lines 60-64 explain: what each phase measures (line 60, "session start to artifact save"), what `_started_at` timestamps are (line 62, "first `_started_at` timestamp"), why duration exceeds the sum (line 62, "Idle time between sessions"), and multi-phase timing (line 64, "Each phase gets its own bar").
- **AC7:** ✅ PASS — `llms-full.txt` (72k, May 15) and `search-index.json` (78k, May 15) both exist and contain new docs content.
- **AC8:** ⚠️ PARTIAL — `pnpm build` succeeds. The scope AC says `pnpm --filter anatomia-website check`, but the spec gotchas section notes this has a pre-existing tsc error and to use `pnpm build` instead. Build succeeds; typecheck not run due to pre-existing failures.
- **AC9:** ✅ PASS — `Math.max(0, ...)` applied at lines 43, 51, 73, 81. Negative values clamped before accumulation and before width computation. Division by zero guarded by `if (total === 0) return []`.
- **AC10:** ✅ PASS — Both paths: `Math.max(0, ...)` ensures clamped sum = 0 when all phases ≤ 0. `if (total === 0) return []` fires regardless of `timing.totalMinutes`.

## Blockers

None. All 15 contract assertions satisfied. All 10 ACs pass (one partial due to pre-existing tsc issue documented in spec). No regressions — CLI tests all pass (2297/2297). No unused exports added by this build. No unhandled error paths in new code. No assumptions about external state beyond the existing `ProofTiming` interface.

## Findings

- **Code — Negative phase values display raw in label:** `website/components/docs/proof/PipelineGantt.tsx:61,88` — `bar.minutes` preserves the original (potentially negative) value for the display label while `widthPct` uses the clamped value. A phase with -3 minutes would show "-3m" in the label but render a correct 0-width (minimum 2%) bar. Defensible design choice — the label shows truth, the bar shows rendering — but could confuse users if negative values ever appear in production.

- **Code — Zero-duration minimum width can exceed 100% cumulative:** `website/components/docs/proof/PipelineGantt.tsx:56,84` — When `value === 0`, widthPct is hardcoded to 2%. If multiple phases are zero alongside non-zero phases, cumulative width + minimums can exceed 100%. Pre-existing behavior (same guard existed before), and in practice benign because CSS overflow:hidden on the container clips it. But the math isn't self-consistent — cumulative leftPct from actual values won't account for the injected 2% widths.

- **Code — `buildGanttBars` and `GanttBar` exported but only consumed internally:** `website/components/docs/proof/PipelineGantt.tsx:21,38` — Both are exported but never imported outside this file. Pre-existing — the scope notes this. Not introduced by this build.

- **Upstream — `formatDuration` defined but unused in PipelineGantt:** Pre-existing proof chain finding, still present. The function exists in the file but no caller references it. The spec explicitly marks this as out of scope.

## Deployer Handoff

Straightforward merge. The change touches one React component (`PipelineGantt.tsx`) and one MDX docs file. No data schema changes, no CLI changes, no new dependencies. The website build is cached — all 103 proof detail pages render correctly. The `llms-full.txt` and `search-index.json` are regenerated and committed.

The scope AC8 says to verify with `pnpm --filter anatomia-website check` but the spec notes this has a pre-existing tsc error unrelated to this work — `pnpm build` is the correct verification command and it passes.

## Verdict
**Shippable:** YES

All 15 contract assertions satisfied by source inspection. The denominator change is mathematically correct — verified manually for the `findings-expand-collapse` timing values. Both sentinel removals confirmed. Negative clamping and zero-guard both present in both paths. Docs expansion follows existing style conventions (bold subsections, no H3s, inline styles with design tokens). Dynamic marker preserved. Generated assets refreshed. Build clean. No over-building, no YAGNI, no scope creep.
