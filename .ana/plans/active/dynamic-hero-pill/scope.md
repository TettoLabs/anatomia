# Scope: Dynamic hero pill

**Created by:** Ana
**Date:** 2026-05-12

## Intent

The hero eyebrow pill on anatomia.dev says "*Proof chains* are live — every change now ships with receipts." This is hardcoded in `copy.ts`. The timestamp next to it already updates dynamically (pulled from the proof feed), but the text describing what shipped is static. When a significant capability ships, someone has to manually edit `copy.ts` to update the pill. This scope makes the pill text update automatically from the proof chain — specifically, from the latest `milestone`-kind entry.

## Complexity Assessment
- **Kind:** feature
- **Size:** small — 3 files changed in the website, no CLI changes
- **Files affected:**
  - `website/lib/proof-feed.ts` (new helper: find latest milestone entry)
  - `website/components/hero/Hero.tsx` (read pill text from feed instead of copy)
  - `website/lib/copy.ts` (eyebrow fields become fallback defaults)
- **Blast radius:** Low. The change is entirely within the website. No CLI code changes. The proof feed data layer is already wired to the Hero component. The `ProofEntry` shape is unchanged — we're filtering existing data, not adding fields.
- **Estimated effort:** ~30 minutes
- **Multi-phase:** no

## Approach

The Hero component already fetches the proof feed via `getProofFeed()`. The proof feed already includes `kind`, `feat` (feature name), and `feature_em` (emphasis substring) for each entry. The change: find the latest entry with `kind === "milestone"` in the feed, and use its `feat` text for the pill. If no milestone entry exists, fall back to the static `copy.ts` text.

The `copy.ts` eyebrow fields (`tag` and `feature`) become fallback defaults, not primary sources. This preserves the current behavior until the first milestone ships — the pill shows "Proof chains are live" until a milestone entry appears in the proof chain, then it auto-updates.

No new API calls. No new data fields. No new components. The data is already there — we're just reading from a different source.

## Acceptance Criteria

- AC1: When the proof feed contains an entry with `kind: "milestone"`, the hero eyebrow pill displays that entry's `feat` text instead of the static `copy.ts` text
- AC2: The `feature_em` substring from the milestone entry is emphasized (bold or italic) in the pill, using the same `Formatted` component already used for the static text
- AC3: When no milestone entry exists in the feed, the pill displays the static `copy.ts` fallback text ("Proof chains are live")
- AC4: When the proof feed fetch fails (GitHub API down), the pill falls back to `copy.ts` text (existing fallback behavior via `mockFeed()`)
- AC5: The pill timestamp (`formatAge(latest.ts)`) continues to show the age of the most recent proof entry (any kind), not the age of the milestone entry
- AC6: The `tag` field in the pill (currently "New") updates to reflect the milestone — either a static "Latest" or derived from the entry. AnaPlan should decide.
- AC7: The `aria-label` on the eyebrow span updates to reflect the dynamic text
- AC8: No layout shift when pill text changes length — the eyebrow styling handles variable-length text
- AC9: The `MAINTENANCE_MANUAL.md` documents the new data source for the eyebrow pill

## Edge Cases & Risks

- **No milestone entries yet.** The proof chain has zero milestone entries today (the `milestone` kind doesn't exist until Scope 1 ships). The fallback to `copy.ts` handles this. The pill works identically to today until the first milestone ships.
- **Milestone entry with no `feat` text.** Theoretically possible if `contract.yaml` lacks a `feature` field. `feat` would be empty string. The fallback should activate when `feat` is falsy, not just when no milestone exists.
- **Very long milestone descriptions.** The `feat` field from the proof chain can be arbitrarily long (e.g., "work complete --merge flag for structured PR merging"). The eyebrow pill has a fixed layout. The text needs to be truncated or the scope description needs to be kept short. The `feature_em` field (first 3 words before the dash) is the concise version — consider using that instead of the full `feat`.
- **Mock feed vs real feed.** The mock feed in `proof-feed.ts` doesn't include milestone entries. For development/preview, the fallback to `copy.ts` kicks in. This is correct behavior — the mock feed is for visual testing, not for testing milestone logic.
- **`Formatted` component compatibility.** The static `copy.ts` text uses `*Proof chains*` markdown formatting for emphasis. The proof feed's `feat` field is plain text (no markdown). If the pill switches to feed data, the emphasis would come from `feature_em` (a substring to wrap in emphasis), not from inline markdown. The Hero component already handles both — `Formatted` parses `*word*` from copy, while `feature_em` from the feed provides the emphasis substring. AnaPlan should decide which approach to use for the dynamic case.

## Rejected Approaches

- **Adding a `pill_text` field to the proof chain entry.** Would require CLI changes to capture pill-worthy text during `work complete`. Rejected because: the data already exists (`feat` and `feature_em` are populated for every entry). Adding a field for one website consumer violates the principle that the proof chain is a general-purpose verification record, not a marketing data source.
- **Hardcoding milestone descriptions in `copy.ts` as a lookup table.** Defeats the purpose — still requires manual updates. The whole point is automation.
- **Using `scope_summary` instead of `feat`.** `scope_summary` is the first paragraph of the Intent section — often a full sentence or more. Too long for a pill. `feat` (from `contract.yaml`'s `feature` field) is the concise name. `feature_em` is the 3-word emphasis substring.

## Open Questions

- **Should the `tag` field change?** Currently "New." With a dynamic milestone, should it say "Latest," "Shipped," or remain "New"? "New" implies freshness. "Latest" implies recency. "Shipped" implies completion. AnaPlan should decide based on tone.
- **Should the `feature_em` formatting use bold or italic?** The static version uses `*Proof chains*` (italic via `Formatted`). The proof feed's `feature_em` is a plain substring. The Hero would need to wrap it in markdown-style markers for `Formatted`, or apply emphasis directly. AnaPlan should decide.

## Exploration Findings

### Patterns Discovered
- `proof-feed.ts:162-173`: `mapEntry()` already computes `feature_em` from `feat` — takes text before the `" — "` dash, then first 3 words. This is the concise version suitable for pill emphasis.
- `proof-feed.ts:154-160`: `resolveKind()` already filters by kind. Adding a `"milestone"` check is one line.
- `Hero.tsx:15-37`: The Hero already fetches `getProofFeed()` and uses `entries[0]` for the timestamp. Filtering for milestone entries is a one-liner: `entries.find(e => e.kind === "milestone")`.
- `copy.ts:48-53`: The eyebrow config has `tag` and `feature` as separate fields. Both are consumed independently by the Hero. Replacing `feature` with feed data doesn't affect `tag`.
- `Formatted.tsx:12-49`: Parses `*italic*`, `**bold**`, and `` `code` `` from plain strings. The dynamic pill text would need emphasis applied either via markdown markers in the string or via a wrapper element.

### Constraints Discovered
- [OBSERVED] `getProofFeed()` returns max 6 entries sorted by most recent. If the latest milestone is older than the 6th entry, it won't appear. For early usage (few milestones), this is fine. Long-term, the feed limit may need adjustment or a separate milestone query.
- [OBSERVED] The proof feed is fetched with ISR (60-second revalidation at `proof-feed.ts:187`). The pill updates within 60 seconds of a new milestone appearing in the proof chain on GitHub. Acceptable latency.
- [OBSERVED] `feature_em` is computed by `extractFeatureEm()` at `proof-feed.ts:149-152` — splits on `" — "`, takes first 3 words. This works for names like "Worktree isolation — concurrent agents..." → "Worktree isolation". It may produce odd results for names without a dash separator.
- [TYPE-VERIFIED] `ProofKind` type is `"feature" | "fix" | "chore"` — Scope 1 adds `"milestone"`. This scope depends on that.

### Test Infrastructure
- No tests exist for the Hero component (it's a server component). Visual testing only. The proof feed has no unit tests either — it's data-fetching with fetch mocks in the Next.js layer. New tests would be for the milestone filter logic if extracted to a helper.

## For AnaPlan

### Structural Analog
`website/components/hero/Hero.tsx:15-16` — the existing pattern of reading `entries[0]` for the timestamp. The milestone lookup follows the same pattern: `entries.find(e => e.kind === "milestone")`.

### Relevant Code Paths
- `website/lib/proof-feed.ts:21,154-160,162-173,182-201` — type, kind resolution, entry mapping, feed fetcher
- `website/components/hero/Hero.tsx:15-37` — Hero component, eyebrow rendering
- `website/lib/copy.ts:48-53` — static eyebrow config (becomes fallback)
- `website/components/ui/Formatted.tsx` — text formatting component
- `website/MAINTENANCE_MANUAL.md:63-84` — data source documentation

### Patterns to Follow
- `Hero.tsx:31-33` for conditional rendering based on feed data (the timestamp already does this)
- `proof-feed.ts:154-160` for kind-based filtering
- `copy.ts` fallback pattern — the rest of the page uses `copy.*` with no dynamic override; the eyebrow is the first to have a dynamic source with static fallback

### Known Gotchas
- `getProofFeed()` returns max 6 entries. If milestone entries are rare and old, they may not be in the feed. Either increase the limit or add a separate query for the latest milestone.
- The `aria-label` at `Hero.tsx:27` is hardcoded: `"Latest proof: Proof chains are live"`. It must be updated dynamically alongside the pill text for accessibility.
- The `FRONT_PAGE_GUIDE.md:80` describes the eyebrow as showing "Proof chains are live." This description becomes outdated when the pill is dynamic. Update the guide or note that the pill is now data-driven.

### Things to Investigate
- Whether the 6-entry feed limit is sufficient or whether a dedicated `getLatestMilestone()` query should be added to `proof-feed.ts`. The tradeoff: a separate query is more reliable but adds a second fetch; filtering the existing feed is simpler but misses old milestones.

### Dependencies
- **Scope 1 (add-milestone-kind):** Must ship first. Without `"milestone"` in `ProofKind`, there's nothing to filter for.
- **Scope 2 (kind-aware-branch-prefixes):** No dependency. This scope is independent of branch prefix behavior.
