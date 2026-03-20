# Anatomia Website - Visual Description for Non-Visual Review

**Purpose:** Describe anatomia.dev's visual design, layout, and UI quality for reviewers who cannot see the rendered site.
**Audience:** WebClaude, accessibility reviewers, blind collaborators
**Created:** 2026-03-19
**Site URL:** https://anatomia.dev

---

## Overall Aesthetic & Quality Level

**Design System:** Blueprint/architectural drawing meets modern SaaS - think technical documentation with polish.

**Quality tier:** **7.5/10** - Professionally executed but derivative. Not groundbreaking, not amateurish. Feels like a well-done Vercel/Supabase clone with green accent instead of blue/purple.

**Emotional tone:** Clean, technical, trustworthy. "Engineering tool for engineers" not "exciting consumer app."

**Standout features:**
- Accessibility commitment (WCAG AAA focus indicators, skip links, reduced motion support)
- Professional animation timing (Framer Motion with bezier easing)
- Dark mode thoughtfully implemented (separate color tokens, smooth transitions)
- Typography polish (text-wrap: balance, OpenType features, widow prevention)

**Weak spots:**
- Generic bento grid layout (everyone uses this now)
- No unique visual identity (could be any developer tool)
- "Tetris corners" decoration is gimmicky (low-value visual flair)
- No photography/illustrations (all text and geometric shapes)

---

## Color Scheme

### Brand Identity Color
**Primary:** `#10B981` (Emerald/Supabase green)
- **Exact hex:** rgb(16, 185, 129)
- **Named color:** Tailwind Emerald-500
- **Usage:** Logo fill, primary buttons, accent elements, dot pattern background
- **Quality note:** Good choice - distinct from Claude (orange), Cursor (blue), but VERY similar to Supabase. Lacks uniqueness.

### Light Theme (Default)
**Background:** `#fafafa` (almost-white gray)
**Foreground:** `#0a0a14` (almost-black navy)
**Cards:** `#ffffff` (pure white)
**Borders:** `rgba(0, 0, 0, 0.1)` (10% black, subtle grid lines)

**Characteristic:** High contrast, clean, "clean report" aesthetic. Feels medical/technical.

### Dark Theme
**Background:** `#0a0a14` (deep navy-black, "Blade Runner" naming in code)
**Foreground:** `#ffffff` (pure white)
**Cards:** `#1a1a2e` (slightly lighter navy for layering)
**Borders:** `rgba(255, 255, 255, 0.1)` (10% white)

**Characteristic:** Not pure black (easier on eyes), subtle blue undertone, premium feel.

### Text Hierarchy (Opacity-Based)
- **75% opacity:** Primary body text
- **65% opacity:** Subheadings
- **60% opacity:** Secondary text
- **50-40% opacity:** Muted labels, placeholders
- **35% opacity:** Tertiary labels (STEP 0, STEP 1 labels)

**Quality note:** WCAG AA compliant throughout (contrast ratios manually adjusted, documented in CSS comments). This is HIGH QUALITY accessibility work.

### Button Colors
**Primary CTA:** White text on `#10B981` green background
**Secondary CTA:** Foreground color on transparent with subtle border
**Hover:** 90% opacity (subtle, not jarring)

---

## Typography

### Fonts
- **Sans:** Geist (Vercel's house font - modern, neutral, professional)
- **Mono:** Geist Mono (for code snippets)
- **Fallback:** System fonts (no FOUT)

**Quality note:** Geist is HIGH QUALITY (designed by Vercel, excellent kerning). Not unique, but excellent choice.

### Type Scale
- **Hero headline:** 48px mobile / 72px desktop (-0.04em tracking, 0.95 line-height = very tight)
- **Section headlines:** 38px mobile / 72px desktop
- **Subsection:** 24px / 40px
- **Body:** 15px / 17px
- **Small print:** 12px / 13px

**Quality note:** Tight tracking on headlines (-0.04em) is PROFESSIONAL polish. Shows attention to detail.

### Typographic Features Enabled
```css
font-feature-settings: "liga" 1, "calt" 1, "kern" 1;
text-wrap: balance; /* Headlines */
text-wrap: pretty;  /* Body text */
font-variant-numeric: tabular-nums; /* Metrics alignment */
```

**Quality note:** This is PREMIUM typography work. Enabling OpenType features, widow/orphan prevention, tabular nums for metrics - these are expert-level decisions. **9/10 typography quality.**

---

## Logo

**Visual description:**
- **Shape:** Square with rounded corners (101×101px)
- **Background:** `#12B981` (emerald green, solid fill)
- **Foreground:** Letter "A" in bold geometric sans-serif
- **Color:** `#F5F5F5` (off-white, not pure white - subtle)
- **Style:** Minimalist, single letter, high contrast

**Placement:**
- Nav: 32×32px (mobile), 36×36px (desktop)
- Footer: 28×28px
- Hero: Animated text "[anatomia]" with brackets, not icon

**Animation in hero:**
- Left bracket slides in from left (opacity 0→1, x -5→0)
- "anatomia" text fades in with blur (blur 4px→0px)
- Right bracket slides in from right (x 5→0)
- Gradient applied to text: `linear-gradient(135deg, #10B981, #10B981)` (solid green, no actual gradient despite code)

**Quality note:** Logo is FUNCTIONAL but GENERIC. "A" in a square is unimaginative. No visual metaphor for "anatomy" or "structure." 5/10 - does the job, forgettable.

---

## Layout Structure

### Page Architecture
```
┌─────────────────────────────────────┐
│ Fixed Navigation (backdrop blur)   │ ← Always visible
├─────────────────────────────────────┤
│                                     │
│         Hero (full viewport)        │ ← First impression
│         - Headline                  │
│         - Subtext                   │
│         - 2 CTAs                    │
│                                     │
├─────────────────────────────────────┤
│                                     │
│    BentoGrid (6 cells, 4 visual)   │ ← Feature showcase
│    ┌──────────────────────────┐    │
│    │ Cell 1: Head (full width)│    │
│    ├──────────────────────────┤    │
│    │ Cell 2: Analysis (full)  │    │
│    ├──────────┬───────────────┤    │
│    │ Cell 3:  │ Cell 4:       │    │
│    │ Generate │ Use           │    │
│    ├──────────┴───────────────┤    │
│    │ Cell 5: Federate (full)  │    │
│    ├──────────────────────────┤    │
│    │ Cell 6: Compatibility    │    │
│    └──────────────────────────┘    │
│                                     │
├─────────────────────────────────────┤
│                                     │
│   Pricing (3-column grid)          │ ← FREE, PRO, TEAM
│   ┌─────┬─────┬─────┐              │
│   │ FREE│ PRO │TEAM │              │
│   └─────┴─────┴─────┘              │
│                                     │
├─────────────────────────────────────┤
│ Footer (minimal)                    │ ← Logo + 3 links
└─────────────────────────────────────┘
```

### Grid System
**Container widths:**
- Mobile: 90vw (90% of viewport)
- Desktop: 80vw (80% of viewport, max centered)

**Vertical blueprint lines:**
- Two 1px lines at 10vw from left edge and 10vw from right edge
- Color: `rgba(0,0,0,0.1)` light mode, `rgba(255,255,255,0.1)` dark mode
- Run full page height with gradient masks at top/bottom (fade in/out)
- **Purpose:** Architectural drawing aesthetic, creates vertical rhythm

**Quality note:** Blueprint lines are POLISHED visual detail. Creates cohesion. 8/10 execution.

---

## Navigation Bar

**Position:** Fixed to top, backdrop-blur (10px), semi-transparent
**Background:** `rgba(255,255,255,0.95)` light / `rgba(10,10,20,0.98)` dark
**Border:** 1px bottom border, subtle
**Height:** ~60px (inferred from padding)
**Z-index:** 150 (stays above everything)

**Layout:**
```
┌─────────────────────────────────────────────┐
│ [Logo]              [Links] [Theme] [CTA]  │
└─────────────────────────────────────────────┘
```

**Desktop nav contents (left to right):**
1. Logo icon (SVG, green "A")
2. Features link (hover: opacity change)
3. Pricing link
4. Docs link (BROKEN - anchors to #docs which doesn't exist)
5. Theme toggle (sun/moon icon)
6. "Get Started" button (green, white text)

**Mobile nav:**
- Logo + theme toggle + hamburger (3-line menu icon)
- Hamburger opens full-screen overlay with large text links

**Quality notes:**
- ✅ Backdrop blur is MODERN polish (requires fallback for old browsers)
- ✅ Fixed position works well (always accessible)
- ❌ Broken #docs link is SLOPPY (should be caught in QA)
- ✅ Mobile menu is CLEAN (full-screen overlay, not cramped dropdown)

---

## Hero Section

**Visual layout:**
- Full viewport height (min-h-screen)
- Centered content, max-width 900px
- Vertical alignment: top-aligned (pt-[90px] mobile, pt-[145px] desktop) - not center
- Green dot pattern background (radial gradient dots, masked with bezier curve)

**Dot pattern details:**
- **Dot size:** 1.25px circles
- **Spacing:** 12px grid
- **Color:** `#10B981` (emerald green)
- **Opacity:** 40% (subtle, not distracting)
- **Mask:** Custom PNG mask (dots-mask.png) creates curved fade pattern
- **Effect:** Creates depth, technical aesthetic without being busy

**Quality note:** Dot pattern is POLISHED. Not overdone. 7/10 - nice touch but now overused in SaaS sites.

**Text hierarchy:**
1. **[anatomia] logo** - 24px / 32px, animated entry with brackets
2. **Headline** - 48px / 72px, bold, tight leading, black text
   - Line 1: "Stop re-explaining"
   - Line 2: "your codebase"
   - **Quality:** Strong, pain-focused, memorable. 8/10 copywriting.
3. **Subtext** - 17px / 20px, medium gray (65% opacity)
   - 2 lines describing value prop
   - **Quality:** Clear but contains inaccuracies (federation claims)
4. **CTA buttons** - 2 side-by-side
   - Primary: "Install Now" (green, white text, download icon)
   - Secondary: "View on GitHub" (transparent, border, GitHub icon)
5. **Small print** - 12px / 13px, very muted (40% opacity)
   - "npm install -g anatomia • MIT License • Works with..."

**Animation sequence:**
1. Logo fades in (0.5s, starts immediately)
2. Brackets slide in from sides (0.3s, delay 0.2s)
3. "anatomia" text fades with blur (0.4s, delay 0.3s)
4. Headline rises up (0.6s, delay 0.5s, translateY 20px→0)
5. Subtext rises up (0.6s, delay 0.7s, translateY 15px→0)
6. CTAs rise up (0.7s, delay 1.0s, translateY 20px→0)
7. Small print fades in (0.5s, delay 1.2s)

**Easing:** All use `cubic-bezier(0.22, 1, 0.36, 1)` - premium easing curve (not linear)

**Quality note:** Animation choreography is PROFESSIONAL. Staggered delays, smooth easing, not overdone. 9/10 - this shows craft.

---

## BentoGrid Section

**Layout system:** CSS Grid, 12 columns on desktop
**Cell structure:** 6 logical cells, arranged in 4 visual sections

### Cell 1: HEAD (Full width, 12 columns)
**Visual:**
- Split horizontally: Left 55% (headline), Right 45% (description + CTAs)
- 4 "Tetris corner" decorations (L-shaped brackets at each corner, pointing outward)
- Padding: 60px mobile / 80px desktop
- Background: Transparent (shows page background)
- Border: Bottom only

**Tetris corners:**
- **What they are:** Small L-shaped SVG brackets (like coding bracket characters)
- **Color:** Same as logo fill (#10B981 green)
- **Position:** Corners of cell, pointing outward (top-left points up-left, etc.)
- **Size:** ~20-30px
- **Quality note:** GIMMICKY. Adds visual interest but feels tacked-on. 4/10 - distracting decoration without purpose.

**Content:**
- Headline: "30-second init. Deep understanding." (38px / 72px)
- Description: Explains what `ana init` does
- 2 CTAs: "Get started" (green) + "See how it works" (transparent)

**Quality note:** Good hierarchy, clean layout. CTAs could be more compelling. 7/10.

### Cell 2: ANALYSIS (Full width, 12 columns)
**Visual:**
- Two-part vertical: Top (description) + Bottom (4-metric grid)
- Label: "STEP 0" in tiny uppercase (10px, 0.15em letter-spacing, 35% opacity)
- Headline: "Analyze →" with arrow
- 4 metrics in equal-width columns: SPEED 30s, PATTERNS 18+, MODES 5, SETUP 0

**Metrics display:**
- **Enormous numbers:** 40px / 56px font size
- **Tiny labels:** 10px / 12px uppercase above numbers
- **Alignment:** Center-aligned in columns
- **Borders:** Vertical 1px borders between columns (except after last)
- **Effect:** Dashboard/analytics aesthetic

**Quality note:** Metrics are EFFECTIVE visual hook. Large numbers = credibility. Clean execution. 8/10.

### Cell 3: GENERATE (Left half, 6 columns)
**Visual:**
- Left-aligned content
- Border: Bottom + right
- Padding: 48px / 72px
- Label: "STEP 1" (uppercase, muted)
- Headline: "Generate" (24px / 40px)
- Description paragraph
- Bulleted list (4 features, custom "→" bullets)

**Custom bullets:**
- Arrow character "→" instead of • or ■
- Positioned absolute left: 0
- Text indented with padding-left
- **Quality note:** Custom bullets are NICE TOUCH. Shows attention to detail. 7/10.

### Cell 4: USE (Right half, 6 columns)
**Visual:**
- Right-aligned content (pairs with Cell 3)
- Border: Bottom only (no right border - last column)
- Same padding and label structure as Cell 3
- **Code block:** Fake terminal with syntax highlighting
  - Background: `#1a1a2e` (dark navy, even in light mode)
  - Text: White with color-coded syntax (cyan for commands, green for paths, gray for comments)
  - Font: Geist Mono
  - Padding: 20px / 24px
  - Border radius: 8px

**Code block colors:**
- Comments: `#888` gray
- Commands: `#06b6d4` cyan
- Paths: `#10b981` green
- Code: `#ffffff` white

**Quality note:** Syntax highlighting is POLISHED. Code block feels like real terminal. 8/10.

### Cell 5: FEDERATE (Full width, 12 columns)
**Visual:**
- Horizontal split: Left 28% (text) + Right 72% (feature grid)
- Label + headline + description on left
- 6 features in 3-column grid on right
- Grid has 1px dividers (table-like)

**Feature grid:**
- 3 columns × 2 rows
- Each cell: Icon (symbol) + text
- Symbols: →, ◆, ✓, ○, ▲, ● (geometric characters, not emojis)
- Background: `--bg-card` (white in light, navy in dark)
- 1px borders creating grid: `background: var(--border-light)` with `gap: 1px` trick

**Quality note:** Grid-with-gaps technique is CLEVER (uses background color as divider). 8/10 execution. But content is WRONG (describes non-existent features).

### Cell 6: COMPATIBILITY (Full width, 12 columns)
**Visual:**
- Card-like appearance (has background color, stands out from transparent cells)
- Chevron decoration (top-right, SVG, green)
- Left-aligned content (max-width 65%)
- Bottom: Scrolling ticker of AI tool badges

**AI tool ticker:**
- Horizontal scroll animation (35s linear loop)
- Badges: Pill-shaped, colored backgrounds
  - Claude Code: Orange tint (#f97316)
  - Cursor: Blue tint (#3b82f6)
  - Windsurf: Purple tint (#a855f7)
  - Any AI Tool: Violet tint (#7c3aed)
- Animation: Seamless loop (content duplicated)
- **Will-change: transform** optimization hint

**Quality note:** Ticker is TRENDY (everyone has these now) but well-executed. Smooth animation, good color choices. 7/10.

**Chevron decoration:**
- Same as Tetris corners - geometric decoration
- Green fill
- **Quality note:** Inconsistent decoration pattern (corners in Cell 1, chevron here). Feels arbitrary. 4/10.

---

## Pricing Section

**Layout:**
- Full-width decorative grid borders (12 square cells at top and bottom, 1px lines, aspect-ratio: 1)
- Header centered with "Tetris corner" decorations pointing inward
- 3 pricing cards in equal columns

**Header decoration:**
- 4 corner decorations pointing INWARD (opposite of Cell 1)
- Creates framed effect
- **Quality note:** Decoration overuse. If every section has decorations, none stand out. 5/10.

**Pricing cards:**
- Equal height (min-height 400px desktop, auto mobile)
- Vertical borders between (1px)
- Bottom border below all three
- Opacity: 60% for "Coming Soon" cards (disabled state)

**Card structure (top to bottom):**
1. **Tier name:** 14px uppercase, 50% opacity, tight letter-spacing
2. **Price:** 40px / 56px huge bold, tracking -0.03em
3. **Period:** 14px, 50% opacity ("per month" or "Forever")
4. **Features list:** 5 items, arrow bullets, 14px / 15px
5. **CTA button:** Full width, primary or secondary style

**Quality note:** Pricing cards are CLEAN, standard SaaS pattern. Nothing innovative but well-executed. 7/10.

---

## Navigation Bar Details

**Structure:**
- Fixed to viewport top
- Backdrop blur: 10px (frosted glass effect)
- Border: 1px bottom
- Semi-transparent background (95% opacity light, 98% opacity dark)

**Desktop nav items:**
- Logo (32×32px clickable icon)
- 3 text links (Features, Pricing, Docs)
- Theme toggle button (sun/moon icon swap)
- Primary CTA button ("Get Started", green)

**Link styling:**
- Inactive: 60% opacity, 500 font-weight
- Active: 100% opacity, 600 font-weight, underline indicator (absolute positioned bar below)
- Hover: 100% opacity, 200ms transition
- Focus: 2px ring (accessibility)

**Mobile navigation:**
- Hamburger icon (3-line menu)
- Opens full-screen overlay (z-index 9999, rendered via React portal)
- Overlay covers entire viewport
- Header: Logo + theme toggle + X close button
- Links: Huge 3xl text, top-aligned (not centered)
- Background: Solid color (not transparent)

**Quality note:**
- ✅ Backdrop blur is MODERN (requires -webkit prefix for Safari, code handles this)
- ✅ Portal rendering for mobile menu is CORRECT technique (avoids z-index hell)
- ✅ Active state indicators are POLISHED
- ❌ Broken anchor links (#docs) are SLOPPY
- **Overall:** 7/10 - technically sound, one content error.

---

## Footer

**Visual:**
- Single row, centered content, max-width 1400px
- Padding: 48px / 80px vertical
- Background: `#f5f5f5` light / gradient dark
- Border: 1px top

**Layout:**
```
[Logo + "MIT License"]                    [Docs | GitHub | Twitter]
      ← Left                                        Right →
```

**Quality note:** MINIMAL footer (intentionally sparse). Modern trend. But broken links are UNACCEPTABLE. 5/10 - would be 8/10 if links worked.

---

## Animation & Interaction Mechanics

### Page Load Animations
**Technique:** Framer Motion with orchestrated sequence
**Timing function:** `cubic-bezier(0.22, 1, 0.36, 1)` - custom ease-out (premium feel)

**Sequence choreography:**
1. Elements start with `opacity: 0` and vertical offset (`y: 15-20px`)
2. Animate to `opacity: 1` and `y: 0`
3. Staggered delays create waterfall effect (0.2s → 0.3s → 0.5s → 0.7s → 1.0s → 1.2s)
4. Total sequence duration: ~1.7 seconds

**Quality note:** This is PROFESSIONAL motion design. Not too fast, not too slow. Easing curve is premium. 9/10 - shows expertise.

### Scroll Animations
**Technique:** Framer Motion `whileInView` with `viewport: { once: true }`
**Effect:** Elements fade in + rise up as they enter viewport
**Timing:** 0.6s duration, staggered by 0.1s per item

**Quality note:** Standard pattern, well-executed. Doesn't re-trigger (once: true) which prevents annoyance. 7/10.

### Hover Animations
**Buttons:** Scale 1.02, translateY -2px (subtle lift), 200ms duration
**Links:** Opacity 80% → 100%, underline thickens
**Tap:** Scale 0.98 (press-down effect)

**Quality note:** Micro-interactions are THOUGHTFUL. Scale + translateY creates 3D lift feel. 8/10.

### Ticker Animation
**Technique:** CSS keyframes, infinite loop
**Duration:** 35 seconds (slow enough to read, fast enough to show loop)
**Transform:** `translateX(0)` → `translateX(-50%)`
**Content duplication:** Array doubled `[...items, ...items]` for seamless loop

**Quality note:** Standard ticker implementation. Works. Nothing special. 6/10.

### Theme Transition
**Technique:** CSS transitions on all color properties
**Duration:** 200ms
**Easing:** `cubic-bezier(0.4, 0, 0.2, 1)` (ease-in-out)
**Anti-flash:** `[data-theme-changing]` attribute disables transitions during swap (prevents flicker)

**Quality note:** Theme transition is EXPERTLY implemented. Anti-flash technique is advanced. 9/10 - shows mastery.

---

## Accessibility Features

### WCAG Compliance Level
**Target:** AAA (highest standard)
**Actually achieved:** Mostly AA with some AAA features

**AAA features present:**
- Focus indicators: 3px outline + 5px shadow (exceeds 2.4.13 AAA requirement of 2px)
- Text contrast: Manually adjusted opacity values to meet 4.5:1 minimum (documented in CSS)
- Skip links: 2 skip links (main content, pricing) keyboard-accessible
- Reduced motion: Complete animation disabling via `prefers-reduced-motion` media query
- Touch targets: Minimum 44×44px enforced (WCAG 2.5.5 AAA)

**AA features present:**
- Color contrast: All text meets 4.5:1 (body) or 3:1 (large text)
- Focus visible: All interactive elements have focus states
- Semantic HTML: Proper landmarks (nav, main, footer, section, header)
- Alt text: Logo has alt="Anatomia"

**Missing for full AAA:**
- No ARIA labels on some decorative elements
- Some color contrast ratios at minimum, not exceeding

**Quality note:** Accessibility is TAKEN SERIOUSLY. Code comments reference WCAG standards. This is RARE in modern SaaS sites. 9/10 - exceptional commitment.

---

## Responsive Design

### Breakpoint Strategy
**Mobile-first approach** with single breakpoint:
- Mobile: < 1024px (default styles)
- Desktop: ≥ 1024px (`lg:` prefix in Tailwind)

**No tablet breakpoint** - this is intentional simplification. Modern approach.

**Layout changes:**
- **Nav:** Hamburger menu → horizontal links + CTA
- **Hero:** Same layout, larger text
- **BentoGrid:** Stacked cells → side-by-side where appropriate
- **Pricing:** 1 column → 3 columns
- **Footer:** Stacked → horizontal

**Text scaling:**
- Headlines: 48px → 72px (+50%)
- Body: 15px → 17px (+13%)
- Small: 12px → 13px (+8%)

**Quality note:** Consistent scaling ratios, clean breakpoint strategy. Modern single-breakpoint approach works well. 8/10.

### Mobile Optimizations
- Touch targets minimum 44×44px
- Tap effects (scale 0.98 on press)
- Full-screen mobile menu (not cramped dropdown)
- Readable text sizes (nothing below 12px)
- Adequate padding (no cramped spacing)

**Quality note:** Mobile experience is WELL CONSIDERED. Not an afterthought. 8/10.

---

## Technical Quality Assessment

### Code Organization: 8/10 (HIGH)
- ✅ Proper component separation (Hero, BentoGrid, Pricing all separate)
- ✅ Shared UI components (Button, ThemeToggle)
- ✅ Constants extracted (pricingTiers, navLinks, features arrays)
- ✅ TypeScript throughout
- ❌ Some inline styles (should be utility classes)

### Performance: 7/10 (GOOD)
- ✅ `will-change: transform` on ticker (GPU acceleration hint)
- ✅ `backdrop-filter` with fallback considerations
- ✅ Fonts preloaded (Geist from next/font, optimized)
- ✅ SVG for logo (scalable, small file size)
- ⚠️ Framer Motion is heavy (adds ~50KB) - could use CSS for simple animations
- ❌ dots-mask.png not optimized (should be SVG)

### Accessibility: 9/10 (EXCEPTIONAL)
- ✅ WCAG AAA focus indicators
- ✅ Skip links implemented
- ✅ Semantic HTML throughout
- ✅ ARIA labels on interactive elements
- ✅ Contrast ratios documented and enforced
- ✅ Reduced motion support
- ✅ Touch target sizes enforced
- ✅ Keyboard navigation works
- ✅ Screen reader text for icons
- ❌ Missing some ARIA landmarks

### Animation Quality: 9/10 (PROFESSIONAL)
- ✅ Custom bezier curves (not ease/linear defaults)
- ✅ Staggered delays create polish
- ✅ Reasonable durations (not too fast/slow)
- ✅ Respects prefers-reduced-motion
- ✅ No animation jank (will-change optimizations)
- ❌ Slightly overused (almost everything animates)

### Typography: 9/10 (EXCELLENT)
- ✅ OpenType features enabled (ligatures, kerning)
- ✅ Text-wrap balance/pretty (modern CSS)
- ✅ Tabular nums for metrics
- ✅ Widow/orphan prevention
- ✅ Font smoothing (antialiased)
- ✅ Tight tracking on headlines (-0.04em is professional)
- ✅ Premium type scale (clear hierarchy)

### Theming: 8/10 (HIGH)
- ✅ CSS custom properties throughout
- ✅ Smooth transitions (200ms)
- ✅ Anti-flash technique
- ✅ Separate color tokens per theme
- ✅ next-themes integration
- ❌ Some hardcoded colors (could use tokens everywhere)

---

## Visual Hierarchy & Information Architecture

### Page Flow (Top to Bottom)
1. **Hero:** Pain + promise (stop re-explaining, 30-second init)
2. **Features:** What it does (analyze, generate, use, federate, compatible)
3. **Pricing:** What it costs (free forever, pro/team coming)
4. **Footer:** Links + legal

**Quality note:** Standard SaaS page flow. No surprises. Clear. 7/10 - functional but unimaginative.

### Visual Weight Distribution
**Heaviest:** Hero headline (72px, bold, black)
**Second:** Metrics in Cell 2 (56px numbers)
**Third:** Section headlines (40px, "Generate", "Use", etc.)
**Fourth:** Body text (17px)
**Lightest:** Labels and small print (10-13px)

**Quality note:** Clear hierarchy. No visual competition. Easy to scan. 8/10.

### Whitespace Usage
**Generous:** 60-80px between major sections
**Adequate:** 20-40px between subsections
**Tight:** 8-12px between related items (labels + headlines)

**Quality note:** Whitespace is PROFESSIONAL. Not cramped, not excessive. 8/10.

---

## Design Patterns & Conventions

### Patterns Used (Common in 2025-2026 SaaS)
1. **Bento grid layout** - Apple-inspired cell grid (TRENDY, overused)
2. **Blueprint aesthetic** - Grid lines, technical vibe (TRENDY)
3. **Backdrop blur nav** - Frosted glass effect (TRENDY)
4. **Dot pattern background** - Radial gradient dots (TRENDY, was fresh in 2024)
5. **Ticker animation** - Scrolling badges (TRENDY, becoming tired)
6. **Dark mode toggle** - Sun/moon icon (EXPECTED, not innovative)
7. **Huge metrics** - Dashboard-style numbers (EFFECTIVE, not novel)

**Quality note:** Site uses ALL the 2025 SaaS trends. Professionally executed but DERIVATIVE. Zero unique visual identity. Could be Vercel, Supabase, Railway, or any YC startup. 6/10 originality.

### What's Missing (Common SaaS Elements)
- ❌ Product screenshot/demo
- ❌ Video embed
- ❌ Customer logos
- ❌ Testimonials
- ❌ Feature comparison table
- ❌ FAQ section
- ❌ Use case examples

**Quality note:** Intentionally minimal (MVP site) or overlooked? Feels incomplete. 6/10 completeness.

---

## Component-Level Quality

### Hero.tsx: 8/10 (POLISHED)
- ✅ Animation choreography excellent
- ✅ Text hierarchy clear
- ✅ Responsive scaling thoughtful
- ✅ Dot pattern adds depth
- ❌ Subtext contains inaccurate claims (federation)

### BentoGrid.tsx: 6/10 (MIXED)
- ✅ Grid layout clean and responsive
- ✅ Cell content well-organized
- ✅ Code block syntax highlighting professional
- ❌ Tetris corner decorations feel gimmicky
- ❌ Entire Cell 5 (Federate) describes non-existent features
- ❌ Cell 4 code example shows non-existent `ana query` command

### PricingSection.tsx: 7/10 (SOLID)
- ✅ Clear three-tier structure
- ✅ Disabled state handled (opacity 60%)
- ✅ Feature lists descriptive
- ❌ FREE tier contains non-existent features (evolve, health)
- ❌ PRO/TEAM tiers describe STEP 5/6 features (not built)
- ❌ Decorative grid borders are excessive

### LandingNav.tsx: 7/10 (GOOD)
- ✅ Fixed positioning with backdrop blur professional
- ✅ Active state indicators polished
- ✅ Mobile menu uses React portal (correct technique)
- ✅ Accessibility features (focus states, ARIA labels)
- ❌ Broken #docs link embarrassing
- ❌ Theme toggle could be more prominent

### LandingFooter.tsx: 4/10 (POOR)
- ✅ Minimal design appropriate
- ❌ ALL THREE LINKS BROKEN (anchor to non-existent sections)
- ❌ No social media actual URLs
- ❌ No copyright year
- ❌ No additional information (company, support, etc.)

**This is the lowest quality component.** Footer links don't work. Inexcusable.

---

## CSS Architecture Quality

### Strengths: 9/10 (EXCEPTIONAL)
- ✅ Tailwind v4 with CSS custom properties (modern approach)
- ✅ Theme tokens well-organized (semantic naming)
- ✅ Accessibility considerations documented in comments
- ✅ OpenType features enabled globally
- ✅ Smooth theme transitions with anti-flash
- ✅ Widow/orphan prevention
- ✅ Prefers-reduced-motion respected
- ✅ High contrast mode support

### Weaknesses:
- ❌ Some hardcoded colors (should use tokens consistently)
- ❌ Inline styles in components (breaks separation of concerns)
- ❌ Industry colors defined but unused (dead code: --industry-hvac, --industry-law, etc.)

**Quality note:** CSS is WELL-ARCHITECTED. Shows professional frontend expertise. Dead industry colors suggest pivoted direction (was this multi-industry tool originally?).

---

## Deployment & Infrastructure

**Platform:** Vercel (Next.js default, no custom config detected)
**Build:** `next build` (standard)
**Config:** Minimal next.config.ts (no custom settings)
**Optimizations:** Default Next.js (image optimization, code splitting, route prefetching)

**Quality note:** Zero custom deployment config is GOOD (leverages platform defaults). Vercel deployment is trivial for Next.js. 8/10 - appropriate simplicity.

---

## Overall Site Quality: 7/10

**Breakdown:**
- **Technical execution:** 8.5/10 (professional code, accessibility, animations)
- **Visual design:** 6.5/10 (polished but derivative, no unique identity)
- **Content accuracy:** 4/10 (multiple sections describe non-existent features)
- **Completeness:** 6/10 (missing demos, examples, FAQ, working footer links)

**What's GOOD:**
- Accessibility commitment (AAA focus, reduced motion, contrast)
- Typography polish (OpenType, text-wrap, tight tracking)
- Animation craft (bezier curves, choreography, anti-patterns avoided)
- Theme implementation (smooth, well-architected)
- Code organization (component separation, TypeScript, constants)

**What's BAD:**
- Footer links completely broken (all 3 are dead anchors)
- Federation cell describes STEP 5 features (doesn't exist, won't exist for months)
- Code example shows `ana query` command (not implemented)
- Pricing features list non-existent commands (evolve, health)
- Zero unique visual identity (could be any SaaS tool)
- Decoration overuse (Tetris corners everywhere, feels gimmicky)

**What's MEDIOCRE:**
- Bento grid layout (trendy but overdone)
- Color scheme (Supabase green clone, not distinctive)
- Logo (functional "A" in square, forgettable)
- No product demo (just text descriptions)

---

## Specific Elements Exhibiting High/Low Standards

### HIGH STANDARD (9-10/10):
1. **Typography system** - OpenType features, text-wrap, tabular nums, widow prevention
2. **Accessibility features** - WCAG AAA focus indicators, skip links, contrast enforcement
3. **Animation timing** - Custom bezier curves, staggered delays, respects reduced motion
4. **Theme architecture** - CSS custom properties, smooth transitions, anti-flash technique
5. **Mobile menu** - React portal rendering, full-screen overlay, proper z-index handling

### MEDIUM STANDARD (6-7/10):
6. **Grid system** - Clean 12-column with blueprint lines, but derivative
7. **Component organization** - Proper separation, TypeScript, but some inline styles
8. **Responsive strategy** - Single breakpoint works, but could be more nuanced
9. **Button interactions** - Scale + translateY is nice, but standard pattern
10. **Code block styling** - Syntax highlighting good, but static (not interactive)

### LOW STANDARD (3-5/10):
11. **Footer implementation** - All links broken, minimal content, no actual value
12. **Decorative elements** - Tetris corners and chevrons feel arbitrary and overused
13. **Logo design** - Generic "A" in square, no visual metaphor, forgettable
14. **Content accuracy** - Multiple sections describe features that don't exist
15. **Visual identity** - No unique design language, could be any SaaS startup

---

## File Organization

```
website/
├── app/
│   ├── page.tsx           ← Main landing (composition)
│   ├── layout.tsx         ← Root layout + metadata
│   └── globals.css        ← Theme tokens + animations (558 lines, MEATY)
├── components/
│   ├── Hero.tsx           ← Hero section (170 lines)
│   ├── BentoGrid.tsx      ← 6-cell feature grid (397 lines, LARGEST COMPONENT)
│   ├── PricingSection.tsx ← 3 pricing tiers (265 lines)
│   ├── LandingNav.tsx     ← Navigation (189 lines)
│   ├── LandingFooter.tsx  ← Footer (48 lines, SMALLEST)
│   ├── IndustryTicker.tsx ← Scrolling AI tool badges (30 lines)
│   ├── BracketRevealLogo.tsx ← Animated [anatomia] logo
│   ├── TetrisCorner.tsx   ← L-shaped decorative brackets
│   ├── CounterBlur.tsx    ← Number blur-in animation
│   ├── ThemeToggle.tsx    ← Dark/light mode toggle
│   ├── Providers.tsx      ← Theme provider wrapper
│   └── ui/Button.tsx      ← Button components
└── public/
    ├── favicon.svg        ← Logo (green "A", 101×101px)
    └── dots-mask.png      ← Dot pattern mask (bezier curve)
```

**Largest file:** BentoGrid.tsx (397 lines) - contains all 6 feature cells
**Most complex:** LandingNav.tsx (189 lines) - handles mobile overlay, portal rendering, theme sync
**Simplest:** LandingFooter.tsx (48 lines) - just logo + broken links

---

## Brand Color Analysis

**Primary brand color:** `#10B981` (RGB 16, 185, 129)
- **Hue:** 160° (cyan-green, cool)
- **Saturation:** 84% (vivid, not pastel)
- **Lightness:** 39% (medium, readable on white or black)
- **Name:** Emerald-500 / Supabase green

**Comparison to competitors:**
- Claude Code: `#f97316` (orange) - DISTINCT
- Cursor: `#3b82f6` (blue) - DISTINCT
- Supabase: `#10B981` (IDENTICAL)
- Vercel: `#000000` (black) - DISTINCT
- Railway: `#8b5cf6` (purple) - DISTINCT

**Assessment:** Color choice is SAFE and PROFESSIONAL but UNORIGINAL. Copying Supabase's green signals "we're in the same category" but also "we lack brand identity." 6/10 - functional but derivative.

---

## Animation Budget

**Total animations on page:**
- Hero: 7 staggered elements (logo, headline, subtext, CTAs, small print)
- BentoGrid: 6 cells with reveal animation
- Pricing: 3 cards with scroll-triggered fade-in
- Ticker: Infinite scroll
- All hover states (buttons, links, nav items)
- Theme transition (all elements)

**Total animated elements:** ~30+ on initial load

**Quality assessment:**
- ✅ Not overdone (some sites animate 100+ elements)
- ✅ Subtle (translateY 12-20px, not 50px)
- ✅ Performance conscious (will-change hints)
- ⚠️ Approaching upper limit of "feels polished" before crossing into "feels gimmicky"

---

## What WebClaude Needs to Know for Copy Edits

### To edit Hero headline:
**File:** `components/Hero.tsx`
**Lines:** 97-99
**Format:** Text split across two lines with `<br />` tag
**Styling:** Uses inline style `color: var(--foreground-color)`

### To edit Hero subtext:
**File:** `components/Hero.tsx`
**Lines:** 110-112
**Format:** Two lines with `<br />` tag
**Styling:** 17px/20px, 65% opacity

### To edit feature lists:
**File:** `components/BentoGrid.tsx`
**Constants at top:**
- Line 14-19: `generateFeatures` array (Cell 3)
- Line 21-28: `federationFeatures` array (Cell 5)
- Line 30-34: `compatibilityBullets` array (Cell 6)

### To edit code example:
**File:** `components/BentoGrid.tsx`
**Lines:** 251-256
**Format:** Hardcoded text with inline color styles
**Note:** Remove or rewrite lines mentioning `ana query`

### To edit pricing:
**File:** `components/PricingSection.tsx`
**Constant:** Lines 7-53 (`pricingTiers` array)
**Structure:** Array of objects with name, price, period, features[], cta, disabled

### To fix footer links:
**File:** `components/LandingFooter.tsx`
**Constant:** Lines 3-7 (`footerLinks` array)
**Change:** Replace `#docs`, `#github`, `#twitter` with actual URLs

### To fix nav links:
**File:** `components/LandingNav.tsx`
**Constant:** Lines 10-14 (`navLinks` array)
**Change:** Replace or remove `#docs` link

---

## Critical Issues for Immediate Fix

### Priority 1: FEDERATION VAPORWARE (EMBARRASSING)
**Location:** Cell 5 entire section (BentoGrid.tsx lines 260-321)
**Problem:** Describes `ana query`, auto-generated exports, node coordination - NONE of it exists
**Severity:** CRITICAL - this is lying to users
**Fix:** Delete cell or completely rewrite to describe what exists today

### Priority 2: CODE EXAMPLE SHOWS FAKE COMMAND
**Location:** Cell 4 code block (BentoGrid.tsx line 255)
**Problem:** Shows `ana query auth-api "JWT pattern"` - command doesn't exist
**Severity:** HIGH - developers will try this and it will fail
**Fix:** Remove `ana query` lines, show simple mode reference only

### Priority 3: BROKEN FOOTER LINKS
**Location:** Footer (LandingFooter.tsx lines 3-7)
**Problem:** All 3 links are dead anchors (#docs, #github, #twitter)
**Severity:** MEDIUM - unprofessional, but less visible than hero/features
**Fix:** Replace with actual URLs or remove

### Priority 4: FALSE FEATURE CLAIMS IN PRICING
**Location:** FREE tier (PricingSection.tsx lines 15-16)
**Problem:** Lists "Manual evolve" and "Health check" - neither command exists
**Severity:** MEDIUM - users expect these, won't find them
**Fix:** Remove or replace with accurate features

### Priority 5: OUTDATED METRICS
**Location:** Cell 2 metrics (BentoGrid.tsx lines 7-12)
**Problem:** MODES: 5 (should be 6 or 7), SETUP: 0 (should be 1 if counting setup mode)
**Severity:** LOW - minor inaccuracy
**Fix:** Update numbers to current reality

---

## Recommendations for WebClaude

**When rewriting copy:**
1. **Verify features exist** - Check against STEP 2 completion status (2.1 Patterns ✅, 2.2 Conventions ✅, 2.3 Templates ✅, 2.4 Setup ✅, 2.5 CLI ⏸️, STEP 3-5 not started)
2. **Remove federation claims** - All `ana query`, `ana broadcast`, auto-exports are STEP 5 (Week 16, not built)
3. **Focus on what works today** - Auto-detection, framework recognition, pattern inference, mode files, scaffolds with analyzer data
4. **Keep strong headline** - "Stop re-explaining your codebase" is GOOD, don't change
5. **Maintain design system** - Don't alter visual structure, just swap text content

**Safe to change:**
- All text content in arrays (features, pricing, nav links)
- Description paragraphs
- Code example content
- Metrics values

**DO NOT change:**
- Component structure
- Animation timings
- Color variables
- Layout classes
- File organization

---

**This site is professionally built with embarrassing content. Fix the content, ship immediately.**
