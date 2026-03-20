# Anatomia Website - Component Architecture Reference

**Purpose:** Component inventory for future copy changes and maintenance
**Created:** 2026-03-19
**Last Updated:** 2026-03-19
**Total Codebase:** 4,277 lines (excluding node_modules, .next)

---

## Component Inventory

### 1. Hero.tsx
**Lines:** 169
**Props:** None (standalone component)
**Renders:** Hero section with animated logo, headline, subtext, 2 CTAs, and green dot pattern background
**Hardcoded copy:** ✅ YES
- Headline: "Stop re-explaining your codebase" (lines 97-99)
- Subtext: "Auto-generated in 30 seconds. 7 modes..." (lines 110-112)
- CTA text: "Install Now", "View on GitHub" (lines 135, 151)
- Small print: "npm install -g anatomia • MIT License..." (line 163)

**Copy location:** All text hardcoded in JSX (lines 97-163)

---

### 2. BentoGrid.tsx
**Lines:** 394 (LARGEST COMPONENT)
**Props:** None (standalone component)
**Renders:** 6-cell bento grid with features, metrics, code examples, and scrolling ticker
**Hardcoded copy:** ✅ YES (MOST COPY IS HERE)

**Constants at top (easy to edit):**
- `analysisMetrics` (lines 7-12): SPEED, PATTERNS, MODES, SETUP metrics
- `generateFeatures` (lines 14-18): 4 bullet points for Generate cell
- `federationFeatures` (lines 21-28): 6 bullet points for Setup cell (formerly Federate)
- `compatibilityBullets` (lines 30-34): 3 bullet points for Compatibility cell

**Inline text:**
- Cell 1 headline: "30-second init. Deep understanding." (lines 77-79)
- Cell 1 description: "Drop ana init in your project..." (line 88)
- Cell 2 label: "STEP 0 - Analyze →" (lines 137-143)
- Cell 3 label: "STEP 1 - Generate" (lines 189-196)
- Cell 3 description: "Creates .ana/ with behavioral contracts..." (line 201)
- Cell 4 label: "STEP 2 - Use" (lines 233-240)
- Cell 4 description: "Reference modes in any AI tool..." (line 245)
- Cell 4 code block: 7 lines of terminal text (lines 251-256)
- Cell 5 label: "STEP 3 - Setup" (lines 273-288)
- Cell 6 label: "COMPATIBILITY" (lines 357-369)

**Copy location:** Mix of constants (lines 7-34) and inline JSX (throughout)

---

### 3. PricingSection.tsx
**Lines:** 264
**Props:** None (standalone component)
**Renders:** 3-column pricing grid with FREE, PRO, TEAM tiers
**Hardcoded copy:** ✅ YES

**Constant at top:**
- `pricingTiers` array (lines 7-53): All pricing text (tier names, prices, features, CTAs)

**Inline text:**
- Section headline: "Simple Pricing" (lines 131, 163)
- Subtext: "Free forever. Pro and Team tiers coming soon." (lines 136, 168)

**Copy location:** Mostly in `pricingTiers` constant (lines 7-53)

---

### 4. LandingNav.tsx
**Lines:** 188
**Props:** None (standalone component)
**Renders:** Fixed navigation bar with logo, links, theme toggle, CTA button, and mobile menu overlay
**Hardcoded copy:** ✅ YES (minimal)

**Constant at top:**
- `navLinks` array (lines 10-14): Features, Pricing, Docs links

**Inline text:**
- CTA button: "Get Started" (line 113)
- ARIA labels: "Close menu", "Open menu" (lines 125, 156)

**Copy location:** `navLinks` constant (lines 10-14), button text (line 113)

---

### 5. LandingFooter.tsx
**Lines:** 46 (SMALLEST COMPONENT)
**Props:** None (standalone component)
**Renders:** Minimal footer with logo, MIT license text, and 2 links
**Hardcoded copy:** ✅ YES (minimal)

**Constant at top:**
- `footerLinks` array (lines 3-6): Docs, GitHub links

**Inline text:**
- "MIT License" (line 28)

**Copy location:** `footerLinks` constant (lines 3-6)

---

### 6. IndustryTicker.tsx
**Lines:** 29
**Props:** None (standalone component)
**Renders:** Horizontally scrolling ticker of AI tool badges (Claude Code, Cursor, Windsurf, Any AI Tool)
**Hardcoded copy:** ✅ YES

**Constant at top:**
- `aiTools` array (lines 3-8): 4 AI tool names with colors

**Copy location:** `aiTools` constant (lines 3-8)

---

### 7. IndustryRotator.tsx
**Lines:** 47
**Props:** None (standalone component)
**Renders:** Rotating text showing different industries (HVAC, law, roofing, etc.) with fade transition
**Hardcoded copy:** ✅ YES

**Constant at top:**
- `industries` array (lines 5-14): 8 industries with colors

**Copy location:** `industries` constant (lines 5-14)

**Note:** This component is defined but NOT used anywhere on the current site. Dead code.

---

### 8. BracketRevealLogo.tsx
**Lines:** 39
**Props:** None (standalone component)
**Renders:** Animated [anatomia] logo with brackets sliding in and text fading with blur
**Hardcoded copy:** ✅ YES (one word)
- Text: "anatomia" (line 27)

**Copy location:** Line 27 (single word)

**Note:** Component exists but NOT used in current Hero (Hero renders its own bracket logo inline). Possible dead code or alternate version.

---

### 9. CounterBlur.tsx
**Lines:** 81
**Props:** ✅ YES
```typescript
interface CounterBlurProps {
  finalValue: number;      // Target number to count to
  duration?: number;        // Animation duration (default 1200ms)
  className?: string;
  style?: React.CSSProperties;
}
```
**Renders:** Animated number counter that blurs through random values before settling on final value
**Hardcoded copy:** ❌ NO (displays prop value)

**Usage:** Intended for metrics animation but NOT currently used (metrics use plain text). Possible dead code or planned feature.

---

### 10. TetrisCorner.tsx
**Lines:** 83
**Props:** ✅ YES
```typescript
interface TetrisCornerProps {
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  pointing?: "outward" | "inward";
  variant?: "aligned" | "catty-corner";
  className?: string;
}
```
**Renders:** L-shaped decorative bracket (SVG) positioned in corners of containers
**Hardcoded copy:** ❌ NO (pure decoration)

**Usage:** Used in Cell 1 (4 corners outward, catty-corner variant) and Pricing header (4 corners inward)

---

### 11. ThemeToggle.tsx
**Lines:** 49
**Props:** None (uses next-themes hook)
**Renders:** Sun/moon icon button that toggles dark/light theme
**Hardcoded copy:** ✅ YES (ARIA only)
- ARIA labels: "Switch to light mode" / "Switch to dark mode" (line 40)

**Copy location:** Line 40 (accessibility labels only)

---

### 12. Providers.tsx
**Lines:** 18
**Props:** ✅ YES (children: ReactNode from ThemeProviderProps)
**Renders:** ThemeProvider wrapper for next-themes (enables dark mode)
**Hardcoded copy:** ❌ NO (wrapper component)

**Configuration:**
- `attribute="data-theme"` (CSS selector for theme)
- `defaultTheme="light"`
- `enableSystem={false}` (no auto-detect from OS)
- `themes={["dark", "light"]}`

---

### 13. ui/Button.tsx
**Lines:** 210
**Props:** ✅ YES
```typescript
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
}

interface ButtonLinkProps {
  href: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
  className?: string;
  external?: boolean;
}
```
**Renders:** Two exports - `Button` (button element) and `ButtonLink` (anchor styled as button)
**Hardcoded copy:** ❌ NO (displays children prop)

**Features:**
- 6 button states (default, hover, focus, active, disabled, loading)
- 3 variants (primary, secondary, ghost)
- 3 sizes (sm, md, lg)
- Loading state with spinner
- Left/right icon slots

---

## Component Line Count Summary

| Component | Lines | Type | Has Copy |
|-----------|-------|------|----------|
| BentoGrid.tsx | 394 | Page section | ✅ MOST COPY |
| PricingSection.tsx | 264 | Page section | ✅ YES |
| ui/Button.tsx | 210 | UI primitive | ❌ NO |
| LandingNav.tsx | 188 | Layout | ✅ YES (minimal) |
| Hero.tsx | 169 | Page section | ✅ YES |
| TetrisCorner.tsx | 83 | Decoration | ❌ NO |
| CounterBlur.tsx | 81 | Animation | ❌ NO |
| ThemeToggle.tsx | 49 | UI primitive | ✅ ARIA only |
| IndustryRotator.tsx | 47 | Animation | ✅ YES (unused) |
| LandingFooter.tsx | 46 | Layout | ✅ YES (minimal) |
| BracketRevealLogo.tsx | 39 | Branding | ✅ YES (unused) |
| IndustryTicker.tsx | 29 | Animation | ✅ YES |
| Providers.tsx | 18 | Wrapper | ❌ NO |
| **TOTAL** | **1,617** | | |

---

## Where Copy Lives (Quick Reference)

### Primary Copy (User-facing text):
1. **Hero.tsx** - Headline, subtext, CTAs, small print (lines 97-163)
2. **BentoGrid.tsx** - All feature descriptions, constants at top (lines 7-34) + inline (throughout)
3. **PricingSection.tsx** - Pricing tiers constant (lines 7-53) + headlines (lines 131, 163)

### Secondary Copy (Navigation/UI):
4. **LandingNav.tsx** - Nav links constant (lines 10-14), CTA text (line 113)
5. **LandingFooter.tsx** - Footer links constant (lines 3-6), license text (line 28)
6. **IndustryTicker.tsx** - AI tool names (lines 3-8)

### Dead Code (Defined but unused):
7. **IndustryRotator.tsx** - 8 industry names with colors (lines 5-14) - NOT rendered on current site
8. **BracketRevealLogo.tsx** - "anatomia" text (line 27) - NOT used (Hero renders own version)
9. **CounterBlur.tsx** - No copy, but component unused (metrics are plain text)

---

## Total Website Codebase Statistics

**Total lines:** 4,277 (excluding node_modules, .next, .git)

**Breakdown by file type:**
- TypeScript/TSX: ~2,100 lines (components + app)
- CSS: 558 lines (globals.css)
- JSON: ~100 lines (package.json, tsconfig.json, etc.)
- Markdown: ~1,500 lines (VISUAL_DESCRIPTION.md + COPY_IMPROVEMENTS.md + README.md)

**Component code:** 1,617 lines (13 components)
**Page code:** ~50 lines (app/page.tsx + layout.tsx minimal)
**Styles:** 558 lines (globals.css with extensive theming)
**Config:** ~50 lines (next.config.ts, tsconfig.json, eslint, postcss)

---

## Copy Change Workflow

**To change copy, edit these files in priority order:**

### High-impact copy (most visible):
1. **Hero headline/subtext** → `components/Hero.tsx` lines 97-112
2. **Feature descriptions** → `components/BentoGrid.tsx` constants (lines 7-34)
3. **Pricing features** → `components/PricingSection.tsx` constant (lines 7-53)

### Medium-impact copy:
4. **Cell headlines** → `components/BentoGrid.tsx` inline (search for "STEP 0", "STEP 1", etc.)
5. **Code examples** → `components/BentoGrid.tsx` lines 251-256

### Low-impact copy:
6. **Nav links** → `components/LandingNav.tsx` lines 10-14
7. **Footer links** → `components/LandingFooter.tsx` lines 3-6
8. **AI tool badges** → `components/IndustryTicker.tsx` lines 3-8

**After editing:**
```bash
pnpm build          # Verify build succeeds
git add -A
git commit -m "copy: [description]"
git push
```

---

## Component Dependencies

### External Dependencies:
- `motion/react` (Framer Motion) - Used by: Hero, BentoGrid, PricingSection
- `lucide-react` - Used by: Hero (Download, Github), LandingNav (Menu, X), ThemeToggle (Sun, Moon), Button (Loader2)
- `next-themes` - Used by: Providers, ThemeToggle
- `next/link` - Used by: LandingNav, LandingFooter
- `react-dom` (createPortal) - Used by: LandingNav (mobile menu)

### Internal Dependencies:
- **Hero** → uses BracketRevealLogo component inline (code duplicated, not imported)
- **BentoGrid** → imports TetrisCorner, CounterBlur, IndustryTicker
- **PricingSection** → imports TetrisCorner, Button/ButtonLink
- **LandingNav** → imports ThemeToggle
- **All** → use CSS custom properties from globals.css

---

## Dead Code Detection

### Components defined but NOT used:
1. **IndustryRotator.tsx** (47 lines)
   - Rotating industry names with fade animation
   - NOT imported or rendered anywhere
   - Was likely replaced by IndustryTicker
   - **Recommendation:** Delete or document why kept

2. **BracketRevealLogo.tsx** (39 lines)
   - Animated [anatomia] logo component
   - NOT imported (Hero renders own version inline)
   - **Recommendation:** Delete or use consistently

3. **CounterBlur.tsx** (81 lines)
   - Number animation component
   - NOT used (metrics display static text)
   - **Recommendation:** Delete or activate for metrics

**Total dead code:** ~167 lines (10% of component code)

---

## CSS Architecture

**Location:** `app/globals.css` (558 lines)

**Structure:**
1. Tailwind import (line 1)
2. Custom variant for dark mode (line 4)
3. Theme color tokens (lines 7-35)
4. Light theme variables (lines 38-68)
5. Dark theme variables (lines 70-100)
6. Global base styles (lines 103-180)
7. Animation keyframes (lines 182-219)
8. Light theme specific variables (lines 221-269)
9. Dark theme specific variables (lines 271-317)
10. Industry colors (lines 319-337) - **UNUSED dead code**
11. Form field animations (lines 339-401)
12. Skeleton/loading animations (lines 403-451)
13. Accessibility AAA (lines 453-528)
14. Utility classes (lines 530-542)
15. Reduced motion support (lines 544-557)

**Dead CSS:**
- Industry colors (lines 319-337): 8 color definitions, never used
- Form field animations (lines 339-401): Email input animations, no forms on site
- Skeleton loaders (lines 403-451): Loading states, not used

**Total dead CSS:** ~130 lines (23% of stylesheet)

---

## Page Structure

**Main page:** `app/page.tsx` (16 lines)
```tsx
export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--bg-gradient)" }}>
      <Hero />
      <BentoGrid />
      <PricingSection />
    </div>
  );
}
```

**Layout:** `app/layout.tsx` (67 lines)
- Metadata (title, description, favicon)
- Font loading (Geist Sans, Geist Mono)
- Root HTML structure
- Providers wrapper
- LandingNav + main + LandingFooter

---

## Metadata & SEO

**Location:** `app/layout.tsx` lines 18-29

**Current metadata:**
```typescript
title: "Anatomia - AI that understands your codebase"
description: "Auto-generated context that stays current. Federated nodes for teams. Built for Claude Code, Cursor, and Windsurf."
```

**⚠️ Description needs update:** Still mentions "Federated nodes" (not built yet)

**Favicon:** `/public/favicon.svg` (green "A" logo, 101×101px)

---

## Quick Stats

**Components with copy:** 6 of 13 (46%)
**Components with props:** 4 of 13 (31%)
**Unused components:** 3 of 13 (23%)
**Dead CSS lines:** ~130 of 558 (23%)
**Dead component lines:** ~167 of 1,617 (10%)

**Total dead code:** ~297 lines (could be cleaned up)

---

## Future Maintenance Notes

### To add new feature section:
1. Create new component in `components/`
2. Add to `app/page.tsx` composition
3. Update this doc with component details

### To change copy:
1. Check "Component Inventory" above for file location
2. Edit constants at top of file (preferred) or inline JSX
3. Run `pnpm build` to verify
4. Commit with "copy:" prefix

### To clean up dead code:
1. Delete: IndustryRotator.tsx, BracketRevealLogo.tsx, CounterBlur.tsx
2. Remove unused CSS (industry colors, form animations, skeleton loaders)
3. Would save ~297 lines, improve maintainability

### To add new page:
1. Create `app/[route]/page.tsx`
2. Add to nav links in LandingNav.tsx
3. Reuse existing components (Hero, BentoGrid patterns)

---

**This document maps every component for easy copy updates. Refer to VISUAL_DESCRIPTION.md for visual design details.**
