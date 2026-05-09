# Investigation: Visual/UX Change Gate in the Pipeline

**From:** Ana Think (session 2026-05-09)
**For:** Next Ana Think session — scope this
**Priority:** Before shipping more UX-heavy scopes through the pipeline
**Type:** Design investigation → single code change in `pr.ts`

---

## The Disease

**The disease is NOT "no visual gate in the pipeline."**

The disease is: **the pipeline's PASS result doesn't distinguish between what it verified and what it can't.** A PASS on a CLI refactor and a PASS on a UI redesign carry identical weight, but they have fundamentally different confidence levels. The developer sees PASS, merges, and discovers the site looks wrong. The pipeline created false confidence by omitting what it didn't check.

The symptom is "UI changes look wrong after merge." The disease is that PASS is undifferentiated — it doesn't surface its own blind spots.

---

## The Fix

**One change to `pr.ts`. Add a disclosure to the PR body when the scope touches visual output.**

When `applicationShape` is `web-app` (or similar) and the scope content signals visual work, append a section to the PR body:

```markdown
## Visual Verification
⚠ This scope touches visual output. Mechanical verification confirmed
tests and assertions pass, but cannot verify visual quality.
Check the preview deployment or dev server before merging.
```

### Why this works

- **Uses data already available.** `applicationShape` from scan.json, scope content already loaded at `pr.ts` line 252. No new data sources.
- **Lives in the PR body** — the existing human gate. The developer sees it at merge time, which is exactly when it matters.
- **Extends the existing pattern.** The PR body already has structured sections for proof, verification, and artifacts (lines 268-282). This is one more section.
- **Zero new abstractions.** No CLI commands, no config fields, no template changes, no agent behavior modifications.
- **Foundation, not scaffolding.** Future enhancements (preview URLs, viewport checklists, screenshot diff results) extend this section rather than replacing it.

### What's available at PR creation time

From reading `pr.ts`:
- Slug, scope content (line 248-253), plan, build report, verify report
- Full project root → can read `scan.json` for `applicationShape`, `stack.framework`, `deployment.platform`
- Current branch name → can construct preview URL pattern for known platforms
- `commands.dev` from `ana.json` → can suggest the dev command

### Implementation sketch (~30 lines in `pr.ts`)

After the Verification section (around line 280):
1. Read `scan.json` → check `applicationShape`
2. If web-app/full-stack: check scope content for visual signals (UI, component, layout, style, page, CSS, design, responsive)
3. If both match: append `## Visual Verification` section
4. Optionally: if `deployment.platform` is known (Vercel, Netlify), hint at the preview URL pattern. If not, suggest `commands.dev`.

---

## What We Explored and Rejected

### Option 1: Plan template annotation
Plan adds a "Visual Checkpoint" to the spec. **Rejected:** advisory only, invisible at merge time, unenforceable.

### Option 2: Build template checkpoint
Build prompts developer to check dev server. **Rejected:** breaks CI-only workflows where no human is watching. Advisory prompt that gets ignored.

### Option 3: Think + Plan + Build template changes
Three agents each have a visual-gate role. **Rejected:** three files to maintain, three places where visual logic lives, behavioral guidance agents may not follow consistently. A 10-person startup engineer would say: "Don't add three template sections that tell me to do what I'm doing."

### Option 4: `ana preview` CLI command
Surfaces dev server or preview URL, records confirmation timestamp. **Rejected for v1:** process management complexity (starting dev servers, port detection) for marginal value. Scaffolding — would be replaced by proper CI integration.

### Option 5: `visualGate` in ana.json
Configuration-driven gate with viewports and themes. **Rejected for v1:** premature abstraction for an unvalidated problem. Config surface area not justified yet.

---

## Ideas Worth Exploring Later

### Preview URL construction
At PR creation time, if `deployment.platform` is Vercel and we know the branch name, the preview URL is predictable: `{project}-git-{branch-slug}-{vercel-user}.vercel.app`. We could include a direct link in the Visual Verification section. Same for Netlify (`deploy-preview-{pr-number}--{site}.netlify.app`). This turns the disclosure from "go find the preview" into "click here."

**When to explore:** after the basic disclosure ships and we see whether developers actually click through.

### Scope classification: `visual: true`
Think could explicitly flag scopes as having visual impact. This metadata travels through the pipeline — Plan knows to include viewport requirements, Build knows to prompt for local checks, and `pr.ts` uses it as a definitive signal instead of keyword-matching the scope content.

**When to explore:** if keyword matching on scope content produces too many false positives/negatives. The explicit flag is more reliable but requires Think to always remember to set it.

### Visual evidence in the proof chain
If a team uses Percy/Chromatic/Playwright screenshots, those results could be recorded as evidence in the proof chain. The `## Visual Verification` section could report: "Visual regression: 0 changes detected (via Chromatic)" instead of "⚠ cannot verify visual quality." Same gate, automated evidence.

**When to explore:** when a customer asks for it. Don't build the integration speculatively.

### Risk-scaled disclosure
Not all UI changes are equal. Changing a color token is low risk. Rebuilding a responsive section with 5 breakpoints is high risk. The disclosure could scale: "⚠ High visual risk — 3 breakpoint-sensitive files modified" vs just "⚠ Visual output changed." File-path heuristics (touches `*.module.css` + responsive components = high risk) are cheap.

**When to explore:** after basic disclosure, if developers report fatigue from the warning on low-risk changes.

### Verify agent urges visual review on UX-related scopes
When Verify passes a scope that touches visual output, the verify report itself could include a note: "PASS — mechanical assertions satisfied. This scope has visual impact. Ensure preview deployment or dev server output gets human eyes before merge." This costs nothing — it's a line in the verify report template, gated by the same `applicationShape` + scope-content check. The developer reads the verify report before merging. If it says "visual quality was not verified — confirm before merge," that's a direct nudge at exactly the right moment. This pairs with the PR body disclosure: the PR says it, the verify report says it, the developer sees it twice from two independent sources.

**When to explore:** alongside the `pr.ts` change. Could be a small addition to the `ana-verify.md` template — "if the scope signals visual impact, note in your report that visual quality is outside mechanical verification and should be confirmed via preview."

### Verify confidence levels
Broader than visual: Verify's PASS could carry a confidence qualifier. "PASS (full mechanical coverage)" vs "PASS (partial — visual quality unverified)." This extends beyond UI to any domain where mechanical verification has blind spots (accessibility, performance, security posture). The visual gate is the first instance of a general pattern.

**When to explore:** after the visual disclosure proves the pattern. This is the v3 version of the idea.

---

## Customer Reality Check

### Sniper customer (2-4 engineers, Next.js startup)
Almost certainly on Vercel. Their visual QA today: push, click the Vercel bot comment, eyeball it, maybe screenshot in Slack. No Percy, no Chromatic. A UX gate that costs zero configuration and appears in the PR body is perfect for them. They already have previews — the gap is nobody tells them PASS doesn't cover visual quality.

### Shotgun customer (10-person team)
Might have Storybook, maybe Chromatic. Visual review happens in PR comments — a designer or frontend lead checks the preview. Their problem isn't the absence of a gate, it's inconsistency: some PRs get visual review, some don't. The PR body disclosure ensures every UI-touching PR flags itself. Their existing review tooling stays intact.

---

## Recommendation

**Scope this as a small fix.** One file (`pr.ts`), ~30 lines, uses existing scan data, extends the existing PR body pattern. Ship it, run a few cycles, see if developers find the disclosure useful. If they still merge without looking, the disease is different (developer behavior, not pipeline confidence) and the fix is different too.

Design principles alignment:
- **Name the disease:** false confidence, not missing gate ✓
- **Remove over add:** removes false confidence instead of adding pipeline stages ✓
- **Foundation not scaffolding:** future enhancements extend this section ✓
- **Every character earns its place:** one section, shown only when relevant ✓
