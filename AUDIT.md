# UI/UX Audit Report — Simulador da Reforma Tributária

**Date:** 2026-04-16  
**Auditor:** OpenCode (frontend-design skill)  
**Scope:** Full codebase — accessibility, performance, theming, responsive design, anti-patterns

---

## Anti-Patterns Verdict: ⚠️ PARTIAL FAIL

The project avoids the worst AI-slop aesthetics (no confetti, no neon gradients, no fake testimonials). The "Civic Fintech" direction is correct and legible. However, **three structural AI anti-patterns are present**:

1. **Identical card grid repetition** — the same icon+heading+paragraph card pattern appears in 3+ independent sections without visual variation.
2. **Cards nested inside cards** — hero section and result section wrap cards inside cards, creating double-shadow / double-border visual noise.
3. **Hero metrics strip** — four `border-l-2` + bold number + small label units in a row is the canonical AI dashboard anti-pattern.

These are fixable with `/arrange`, `/distill`, and `/critique`.

---

## Executive Summary

| Severity | Count |
|----------|-------|
| Critical | 4     |
| High     | 8     |
| Medium   | 12    |
| Low      | 5     |
| **Total**| **29**|

**Overall Design Quality Score: 58 / 100**

| Pillar | Score |
|--------|-------|
| Accessibility (A11y) | 42 / 100 |
| Performance | 65 / 100 |
| Theming / Design System | 50 / 100 |
| Responsive Design | 70 / 100 |
| Anti-Pattern Cleanliness | 55 / 100 |
| Typography & Hierarchy | 60 / 100 |

### Top 5 Issues to Fix First

1. **[CRITICAL]** `font-headline` / `font-body` utility classes undefined — broken design system, wrong font rendering everywhere.
2. **[CRITICAL]** `data-theme="light"` hardcoded — dark mode OS preference completely ignored.
3. **[CRITICAL]** Simulator selection cards have no ARIA roles or `aria-selected` — core interactive widget is inaccessible.
4. **[HIGH]** No skip-to-main-content link — keyboard users must tab through entire nav on every page.
5. **[HIGH]** Revenue step buttons below 44px touch target — mobile primary action is frustrating for João.

### Recommended Next Commands

```
/normalize   — fix design token system (fonts, colors)
/harden      — ARIA roles, keyboard access, touch targets
/adapt       — dark mode, responsive padding
/arrange     — break up identical card grids
/distill     — remove cards-in-cards nesting
/optimize    — animation properties, wasted font load
/polish      — static date, emoji alt text, toast aria-live
```

---

## Detailed Findings

---

### CRITICAL

---

#### C-01 — Font utility classes undefined in design system

| Field | Detail |
|-------|--------|
| **Location** | `src/styles/global.css` — `@theme` block; used throughout all `.astro` and `.vue` files |
| **Category** | Theming / Design System |
| **WCAG / Standard** | — |
| **Impact** | `font-headline` and `font-body` Tailwind utilities are applied across headings, body copy, and UI labels, but neither `--font-headline` nor `--font-body` CSS variables are defined in `@theme`. All text silently falls back to the browser default (Times New Roman / system-ui depending on browser). Public Sans is never actually applied to the page. |
| **Recommendation** | Add to `@theme` in `global.css`: `--font-headline: 'Public Sans', sans-serif;` and `--font-body: 'Public Sans', sans-serif;`. Confirm Public Sans is loaded (it is, via Google Fonts in BaseLayout). Then verify `font-headline` and `font-body` resolve via Tailwind v4's CSS variable convention. |
| **Suggested command** | `/normalize` |

---

#### C-02 — Dark mode OS preference ignored

| Field | Detail |
|-------|--------|
| **Location** | `src/layouts/BaseLayout.astro` — `<html data-theme="light">` (line ~10) |
| **Category** | Theming / Accessibility |
| **WCAG / Standard** | WCAG 1.4.3 Contrast (AA), user preference |
| **Impact** | The `CLAUDE.md` design context explicitly states "Dark mode supported as OS-preference variant." The hardcoded `data-theme="light"` on `<html>` overrides `prefers-color-scheme: dark` entirely. Users on dark OS themes get no dark experience. DaisyUI's dark theme tokens are never applied. |
| **Recommendation** | Use a small inline script in `<head>` (before DaisyUI CSS loads) to read `window.matchMedia('(prefers-color-scheme: dark)')` and set `data-theme` dynamically. Alternatively, use CSS: `@media (prefers-color-scheme: dark) { :root { --color-scheme: dark; } }` and drive DaisyUI via that. |
| **Suggested command** | `/adapt` |

---

#### C-03 — Simulator selection cards: no ARIA roles or state

| Field | Detail |
|-------|--------|
| **Location** | `src/components/Simulator.vue` — regime selection (step 1) and sector selection (step 2) |
| **Category** | Accessibility |
| **WCAG / Standard** | WCAG 1.3.1 Info and Relationships (A), 4.1.2 Name, Role, Value (A) |
| **Impact** | The regime and sector selection cards are the **core interactive widget** of the entire application. They are `<div>` elements with click handlers. They have no `role="radio"` or `role="option"`, no `aria-selected`, no `aria-checked`, no keyboard event handlers (`Enter`/`Space`). A screen reader user or keyboard-only user cannot operate the simulator at all. |
| **Recommendation** | Wrap each group in `role="radiogroup"` with an `aria-labelledby` pointing to the step heading. Each card should be `role="radio"` with `aria-checked="true/false"` and `tabindex="0"`. Add `@keydown.enter` and `@keydown.space` handlers that call the same select function as the click handler. |
| **Suggested command** | `/harden` |

---

#### C-04 — Nav hamburger: no accessible name, wrong element

| Field | Detail |
|-------|--------|
| **Location** | `src/layouts/BaseLayout.astro` — mobile hamburger toggle (~line 101) |
| **Category** | Accessibility |
| **WCAG / Standard** | WCAG 4.1.2 Name, Role, Value (A) |
| **Impact** | The hamburger control uses `<div tabindex="0" role="button">` instead of a native `<button>`. It has no `aria-label`, no `aria-expanded`, and no `aria-controls`. Screen reader announces it as an unnamed button. Keyboard users on some browsers cannot activate `role="button"` on a `<div>` with `Enter` without manual keydown handler. |
| **Recommendation** | Replace with `<button type="button" aria-label="Abrir menu de navegação" aria-expanded="false" aria-controls="nav-menu">`. Toggle `aria-expanded` on click via Alpine or vanilla JS. Add `id="nav-menu"` to the nav menu element. |
| **Suggested command** | `/harden` |

---

### HIGH

---

#### H-01 — No skip-to-main-content link

| Field | Detail |
|-------|--------|
| **Location** | `src/layouts/BaseLayout.astro` — `<body>` opening |
| **Category** | Accessibility |
| **WCAG / Standard** | WCAG 2.4.1 Bypass Blocks (A) |
| **Impact** | Keyboard and screen reader users must tab through the entire navigation bar on every page load before reaching content. On pages with many nav items, this is severe. |
| **Recommendation** | Add as first child of `<body>`: `<a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded focus:text-navy">Ir para o conteúdo principal</a>`. Add `id="main-content"` to the `<main>` element. |
| **Suggested command** | `/harden` |

---

#### H-02 — Revenue step buttons below minimum touch target

| Field | Detail |
|-------|--------|
| **Location** | `src/components/Simulator.vue` — step 3 revenue amount buttons (`btn-sm`) |
| **Category** | Accessibility / Mobile UX |
| **WCAG / Standard** | WCAG 2.5.5 Target Size (AAA), Apple HIG 44pt minimum, Google Material 48dp minimum |
| **Impact** | DaisyUI `btn-sm` renders at ~32px height. João's primary action — selecting a revenue range — uses buttons that are 25% below the 44px touch target minimum. On a phone, the mis-tap rate for 32px buttons is significant. This is the single most-used interaction on mobile. |
| **Recommendation** | Use `btn` (default size) instead of `btn-sm` for all revenue range buttons. If space is a concern, reduce to 2 columns on mobile and ensure each button is at minimum 44px tall with `min-h-[44px]`. |
| **Suggested command** | `/harden` |

---

#### H-03 — Inter font loaded but never used

| Field | Detail |
|-------|--------|
| **Location** | `src/layouts/BaseLayout.astro` — `<head>` Google Fonts link (~line 69) |
| **Category** | Performance |
| **WCAG / Standard** | — |
| **Impact** | Inter is imported via Google Fonts (network request + render-blocking potential) but no element in the codebase applies Inter. The design spec uses Public Sans. This is a wasted ~30–80KB font download on every page load. |
| **Recommendation** | Remove the Inter import from BaseLayout. Verify Public Sans covers all required weights (400, 600, 800 at minimum). |
| **Suggested command** | `/optimize` |

---

#### H-04 — TypeScript error in NewsSection: `item.imageUrl` does not exist

| Field | Detail |
|-------|--------|
| **Location** | `src/components/NewsSection.astro` — lines 84, 86 |
| **Category** | Code Quality / Type Safety |
| **WCAG / Standard** | — |
| **Impact** | The `NewsItem` type does not include an `imageUrl` property, but the template accesses `item.imageUrl` in two places. This will throw a TypeScript error at build time in strict mode and may render `undefined` or cause runtime errors. |
| **Recommendation** | Add `imageUrl?: string` to the `NewsItem` type in `src/lib/types.ts`, or remove the image rendering logic if images are not actually provided by the RSS feeds. Guard with `item.imageUrl &&` before rendering. |
| **Suggested command** | `/harden` |

---

#### H-05 — SVG chart data points: no keyboard access

| Field | Detail |
|-------|--------|
| **Location** | `src/components/SimulatorResult.vue` — SVG chart circles |
| **Category** | Accessibility |
| **WCAG / Standard** | WCAG 1.1.1 Non-text Content (A), 2.1.1 Keyboard (A) |
| **Impact** | The projection chart is the primary data visualization of the result. Its data points (SVG `<circle>` elements) have no `tabindex`, no `role`, no `aria-label`. Keyboard users and screen readers receive no information about the chart data. |
| **Recommendation** | Add a visually hidden `<table>` below the SVG with the same data (year, current tax, new tax, delta %). This serves as the accessible alternative. For the circles, add `tabindex="0"` + `role="img"` + `aria-label="Ano {year}: carga atual {x}%, nova carga {y}%"` and show a tooltip on `:focus`. |
| **Suggested command** | `/harden` |

---

#### H-06 — No `aria-live` region for simulator step transitions

| Field | Detail |
|-------|--------|
| **Location** | `src/components/Simulator.vue` — step navigation |
| **Category** | Accessibility |
| **WCAG / Standard** | WCAG 4.1.3 Status Messages (AA) |
| **Impact** | When the user advances to a new step, the DOM changes but no `aria-live` announcement is made. Screen reader users do not know that the content has changed or which step they are on. |
| **Recommendation** | Add a visually hidden `<div aria-live="polite" aria-atomic="true">` that announces step changes: "Passo 2 de 3: Selecione seu setor." Update its text content on each step transition. |
| **Suggested command** | `/harden` |

---

#### H-07 — Schema `dateModified` is hardcoded static date

| Field | Detail |
|-------|--------|
| **Location** | `src/layouts/BaseLayout.astro` or page-level schema — `dateModified: "2025-01-01"` |
| **Category** | SEO / Data Quality |
| **WCAG / Standard** | Schema.org WebPage |
| **Impact** | Google uses `dateModified` for crawl prioritization and freshness signals. A hardcoded 2025-01-01 that never changes will eventually signal stale content, harming search visibility for a site that rebuilds daily with fresh news. |
| **Recommendation** | Replace the static string with a build-time value: `new Date().toISOString().split('T')[0]` evaluated at Astro build time. |
| **Suggested command** | `/polish` |

---

#### H-08 — Massive hardcoded color values outside token system

| Field | Detail |
|-------|--------|
| **Location** | `src/styles/global.css`, `src/components/SimulatorResult.vue`, `src/components/Simulator.vue`, multiple `.astro` files |
| **Category** | Theming / Design System |
| **WCAG / Standard** | — |
| **Impact** | Colors like `#F5F3F3`, `#43474F`, `#1B1C1C`, `#C3C6D1`, `#E3E2E2`, `#9AF5CA`, `#057351`, `text-gray-600`, SVG `stroke="#d1d5db"`, SVG `fill="#94a3b8"` appear hardcoded throughout the codebase rather than via `@theme` CSS variables. Dark mode cannot be implemented correctly, and theme changes require grep-replacing hex values. |
| **Recommendation** | Audit all hex/rgb values in the codebase. Move each to a named token in `@theme` (e.g., `--color-surface: #F5F3F3`, `--color-border: #C3C6D1`). Replace all inline usages with Tailwind utility classes backed by those tokens. |
| **Suggested command** | `/normalize` |

---

### MEDIUM

---

#### M-01 — `.timeline-bar` animates `width` (layout property)

| Field | Detail |
|-------|--------|
| **Location** | `src/styles/global.css` — `.timeline-bar` animation |
| **Category** | Performance |
| **WCAG / Standard** | — |
| **Impact** | Animating `width` triggers layout + paint on every frame. On lower-end Android devices (João's likely device), this can cause jank. The visual intent (bar "filling in") can be achieved without layout cost. |
| **Recommendation** | Use `transform: scaleX()` with `transform-origin: left`. Set `width: 100%` statically and animate `scaleX(0) → scaleX(1)`. This confines the animation to the compositor thread. |
| **Suggested command** | `/optimize` |

---

#### M-02 — Step transition can cause horizontal overflow flash

| Field | Detail |
|-------|--------|
| **Location** | `src/components/Simulator.vue` — step enter/leave transition using `translateX(100%)` |
| **Category** | Performance / UX |
| **WCAG / Standard** | — |
| **Impact** | Translating 100vw outward without `overflow: hidden` on the parent container briefly creates a horizontal scrollbar or layout shift, particularly on mobile. |
| **Recommendation** | Ensure the Simulator container has `overflow: hidden`. Consider `overflow: clip` (non-scrollable) which is safer than `overflow: hidden` for this use case. Alternatively use `opacity` + `translateX(16px)` (subtle shift) instead of full-width translation. |
| **Suggested command** | `/optimize` |

---

#### M-03 — News article images use `alt=""`

| Field | Detail |
|-------|--------|
| **Location** | `src/components/NewsSection.astro` — article image `<img>` elements |
| **Category** | Accessibility |
| **WCAG / Standard** | WCAG 1.1.1 Non-text Content (A) |
| **Impact** | News article images are meaningful content (they represent editorial photos for the article). Using `alt=""` marks them as decorative, meaning screen reader users receive no context about what the image shows. |
| **Recommendation** | Use the article title as fallback alt text: `alt={item.title}`. If a more descriptive alt is available from the RSS feed, prefer that. |
| **Suggested command** | `/harden` |

---

#### M-04 — Emoji in headings (`📰 Últimas notícias`)

| Field | Detail |
|-------|--------|
| **Location** | `src/components/NewsSection.astro` — section heading |
| **Category** | Accessibility |
| **WCAG / Standard** | WCAG 1.1.1 Non-text Content (A) |
| **Impact** | Screen readers announce emoji by their Unicode name: "newspaper emoji Últimas notícias." This is verbose and disrupts reading flow. The brand direction ("Civic Fintech — Honest, Direct") also argues against decorative emoji in structural headings. |
| **Recommendation** | Remove emoji from headings. If a visual icon is desired, use an SVG icon with `aria-hidden="true"` beside the text. |
| **Suggested command** | `/distill` |

---

#### M-05 — Toast has no `aria-live` announcement

| Field | Detail |
|-------|--------|
| **Location** | `src/components/SimulatorResult.vue` — `showCopiedToast` logic |
| **Category** | Accessibility |
| **WCAG / Standard** | WCAG 4.1.3 Status Messages (AA) |
| **Impact** | When the user copies a share link, a toast appears visually but no screen reader announcement is triggered. The user with a screen reader does not know the action succeeded. |
| **Recommendation** | Add `aria-live="polite"` and `aria-atomic="true"` to the toast container, or use a visually hidden live region that receives the "Link copiado!" message on trigger. |
| **Suggested command** | `/harden` |

---

#### M-06 — Emoji slicing `action.slice(0,2)` is fragile

| Field | Detail |
|-------|--------|
| **Location** | `src/components/SimulatorResult.vue` — recommended actions list |
| **Category** | Code Quality |
| **WCAG / Standard** | — |
| **Impact** | Multi-codepoint emoji (e.g., flag emoji, skin tone modifiers, ZWJ sequences) are longer than 2 JS string characters. `slice(0,2)` will corrupt these emoji, rendering broken characters. |
| **Recommendation** | Use `[...action][0]` (spread into array to correctly handle Unicode code points) or the `Intl.Segmenter` API for robust grapheme cluster extraction. Better: store the emoji and text as separate fields in the data structure. |
| **Suggested command** | `/harden` |

---

#### M-07 — FAQ collapse missing accessible label

| Field | Detail |
|-------|--------|
| **Location** | `src/components/SimulatorResult.vue` — DaisyUI collapse FAQ items |
| **Category** | Accessibility |
| **WCAG / Standard** | WCAG 4.1.2 Name, Role, Value (A) |
| **Impact** | DaisyUI's collapse component uses `<input type="radio">` + `<label>` pattern. If the `<input>` lacks a proper `id`/`for` pairing with the label, or if `aria-controls` is absent, screen readers cannot announce the expand/collapse state. |
| **Recommendation** | Verify each collapse `<input>` has a unique `id` and the corresponding `<label>` has `for` matching that `id`. Add `aria-expanded` state updates if using custom JS, or verify DaisyUI's default implementation handles this. |
| **Suggested command** | `/harden` |

---

#### M-08 — `apple-touch-icon` points to OG image

| Field | Detail |
|-------|--------|
| **Location** | `src/layouts/BaseLayout.astro` — `<head>` |
| **Category** | Progressive Web / UX |
| **WCAG / Standard** | Apple Web App guidelines |
| **Impact** | When users add the site to their iOS home screen, the OG image (typically 1200×630, landscape) is used as the app icon. iOS crops and scales this awkwardly, producing a poor icon. |
| **Recommendation** | Create a dedicated `public/apple-touch-icon.png` at 180×180px with the brand mark centered on navy background. Update `<link rel="apple-touch-icon">` to point to it. |
| **Suggested command** | `/polish` |

---

#### M-09 — Inconsistent container strategy

| Field | Detail |
|-------|--------|
| **Location** | `src/pages/index.astro` (`max-w-7xl px-8`), `src/pages/mei.astro` (`max-w-3xl px-4`), `src/pages/cronograma.astro` |
| **Category** | Responsive Design / Design System |
| **WCAG / Standard** | — |
| **Impact** | Different pages use different max-widths and horizontal padding, creating an inconsistent reading experience. Users who navigate between pages notice the layout "jump." |
| **Recommendation** | Define a single container component or utility class (e.g., `.container-page`) with consistent `max-w`, `mx-auto`, and responsive `px` values. Apply it uniformly across all pages. |
| **Suggested command** | `/normalize` |

---

#### M-10 — `px-8` on mobile leaves only 256px content width

| Field | Detail |
|-------|--------|
| **Location** | `src/pages/index.astro` — sections using `px-8` without mobile override |
| **Category** | Responsive Design |
| **WCAG / Standard** | — |
| **Impact** | On a 320px-wide viewport (iPhone SE, budget Android), `px-8` (32px each side) leaves 256px for content. Some content sections have nested padding, reducing this further. Text becomes cramped and multi-column layouts break. |
| **Recommendation** | Use `px-4 sm:px-6 lg:px-8` pattern for progressive horizontal padding. Never use `px-8` as the base (mobile-first) value. |
| **Suggested command** | `/adapt` |

---

#### M-11 — Hero metric strip: AI dashboard anti-pattern

| Field | Detail |
|-------|--------|
| **Location** | `src/pages/index.astro` — hero section key data card |
| **Category** | Anti-Pattern |
| **WCAG / Standard** | — |
| **Impact** | Four `border-l-2` + large bold number + small label units in a horizontal row is the most recognizable AI-generated UI pattern. It reads as generic fintech dashboard rather than the "Civic Fintech" brand direction. |
| **Recommendation** | Redesign the key data display. Options: staggered grid with larger visual weight differences, icon-led cards with varied sizes, or a compact inline stat strip that doesn't rely on left-border dividers. |
| **Suggested command** | `/critique` then `/arrange` |

---

#### M-12 — Identical card grid repetition (AI slop pattern)

| Field | Detail |
|-------|--------|
| **Location** | `src/pages/index.astro` — explainer section (3 cards), timeline section (4 cards); `src/pages/mei.astro` — cross-link cards |
| **Category** | Anti-Pattern |
| **WCAG / Standard** | — |
| **Impact** | Three independent sections use structurally identical icon+heading+paragraph cards in a uniform grid. This is the #1 tell of AI-generated interfaces. It suggests the layout was not designed — it was generated. It also creates poor visual hierarchy; sections don't feel distinct. |
| **Recommendation** | Introduce visual variation between sections. The explainer section could use a numbered flow. The timeline section could use an actual timeline layout (zigzag or vertical). Cross-link cards can be horizontal CTAs with arrows. Each section should have its own compositional identity. |
| **Suggested command** | `/arrange` |

---

### LOW

---

#### L-01 — Cards nested inside cards

| Field | Detail |
|-------|--------|
| **Location** | `src/pages/index.astro` — hero right column (chart card inside a card); `src/components/SimulatorResult.vue` — result cards inside wrapper card |
| **Category** | Anti-Pattern / Visual Design |
| **WCAG / Standard** | — |
| **Impact** | Double card nesting creates visual noise: double border, double background, double shadow. It looks accidental rather than designed. |
| **Recommendation** | Flatten the hierarchy. The outer wrapper should be a layout container (no card styling), with inner elements as the actual cards. |
| **Suggested command** | `/distill` |

---

#### L-02 — No `preconnect` for Google Fonts

| Field | Detail |
|-------|--------|
| **Location** | `src/layouts/BaseLayout.astro` — `<head>` |
| **Category** | Performance |
| **WCAG / Standard** | — |
| **Impact** | Google Fonts requires two connections (fonts.googleapis.com + fonts.gstatic.com). Without `<link rel="preconnect">` hints, the browser discovers these connections only when parsing the stylesheet, adding ~100–300ms latency on first load. |
| **Recommendation** | Add before the fonts stylesheet link: `<link rel="preconnect" href="https://fonts.googleapis.com">` and `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`. |
| **Suggested command** | `/optimize` |

---

#### L-03 — No `font-display: swap` in font loading

| Field | Detail |
|-------|--------|
| **Location** | `src/layouts/BaseLayout.astro` — Google Fonts URL |
| **Category** | Performance |
| **WCAG / Standard** | — |
| **Impact** | Without `&display=swap` in the Google Fonts URL, the default behavior is `font-display: auto` which may cause FOIT (Flash of Invisible Text) on slow connections. João on a 3G connection may see blank text during font load. |
| **Recommendation** | Append `&display=swap` to the Google Fonts URL query string. |
| **Suggested command** | `/optimize` |

---

#### L-04 — `aria-label` missing on social share buttons

| Field | Detail |
|-------|--------|
| **Location** | `src/components/SimulatorResult.vue` — share buttons (WhatsApp, Twitter/X, copy link) |
| **Category** | Accessibility |
| **WCAG / Standard** | WCAG 4.1.2 Name, Role, Value (A) |
| **Impact** | If share buttons use icon-only SVGs without `aria-label`, screen readers announce them as unlabeled buttons. |
| **Recommendation** | Add `aria-label="Compartilhar no WhatsApp"`, `aria-label="Compartilhar no X (Twitter)"`, `aria-label="Copiar link"` to each button. |
| **Suggested command** | `/harden` |

---

#### L-05 — Missing `<meta name="theme-color">` for mobile browsers

| Field | Detail |
|-------|--------|
| **Location** | `src/layouts/BaseLayout.astro` — `<head>` |
| **Category** | Progressive Web / Mobile UX |
| **WCAG / Standard** | — |
| **Impact** | Without `theme-color`, Chrome on Android uses a default grey for the browser chrome/status bar instead of the brand navy, missing an easy brand reinforcement touchpoint. |
| **Recommendation** | Add `<meta name="theme-color" content="#001E40">` (navy) for light mode. Optionally add a dark mode variant with `media="(prefers-color-scheme: dark)"`. |
| **Suggested command** | `/polish` |

---

## Patterns & Systemic Issues

### 1. Design Token System is Incomplete
The `@theme` block in `global.css` defines some colors but is missing font variables, spacing tokens are not used consistently, and many components reach outside the system with hardcoded hex values. This is a systemic issue that makes theming, dark mode, and brand updates difficult.

**Fix sequence:** `/normalize` → `/adapt` (dark mode)

### 2. Accessibility Was Afterthought, Not Foundation
The simulator — the core feature — has zero ARIA instrumentation. Selection state, step progression, loading states, and result announcements are all visual-only. This suggests accessibility was not part of the initial development specification.

**Fix sequence:** `/harden` across `Simulator.vue` and `SimulatorResult.vue`

### 3. Anti-Pattern Accumulation in Layout
Three separate anti-patterns (identical grids, metric strips, card nesting) co-exist in `index.astro`. These are the compositional defaults of AI-assisted code generation and require intentional redesign, not just CSS fixes.

**Fix sequence:** `/distill` → `/arrange` → `/critique`

---

## Positive Findings

- **Color palette is correct** — Navy/Emerald/Warm Off-white/Slate Blue is a strong, civic-appropriate palette. The choices are defensible.
- **Public Sans font choice is excellent** — High legibility, professional, appropriate for civic use.
- **No dark patterns** — No fake urgency, no hidden CTAs, no lead gen forms. The honest, data-first approach is preserved.
- **Astro SSR + static prerender is correct architecture** — Performance-first approach, no unnecessary JavaScript.
- **Simulator wizard UX logic is sound** — Three-step regime → sector → revenue flow is well-reasoned for the João persona.
- **Disclaimer language exists** — "Estimativa" framing and methodology disclaimers are present and appropriately positioned.
- **Semantic HTML structure** — Pages use appropriate heading hierarchy (`h1` → `h2` → `h3`) without skipping levels.

---

## Recommendations by Priority

### Immediate (blocking quality / accessibility)
1. Fix `font-headline` / `font-body` token definitions — users are seeing the wrong font
2. Add `role="radio"` + `aria-checked` to simulator selection cards
3. Fix hamburger to be a real `<button>` with `aria-label` and `aria-expanded`
4. Add skip-to-main-content link
5. Remove hardcoded `data-theme="light"` and implement OS preference detection

### Short-term (high impact, low effort)
6. Fix TypeScript error in `NewsSection.astro`
7. Upgrade revenue buttons from `btn-sm` to `btn` (44px touch targets)
8. Add `aria-live` to step transitions and toast
9. Remove Inter font import, add `preconnect` + `display=swap` to Public Sans
10. Add `aria-label` to share buttons and fix `alt=""` on news images

### Medium-term (design quality)
11. Centralize all hardcoded colors into `@theme` tokens
12. Implement dark mode properly using OS preference
13. Add accessible data table as alternative to SVG chart
14. Fix `px-8` mobile padding to `px-4 sm:px-6 lg:px-8`
15. Fix `width` animation to `transform: scaleX()`

### Long-term (anti-pattern removal)
16. Break up identical card grids with section-specific layouts
17. Remove card nesting in hero and result sections
18. Redesign hero metric strip away from dashboard anti-pattern
19. Define and enforce consistent container strategy across all pages
20. Create dedicated `apple-touch-icon.png` and add `theme-color` meta

---

## Command Reference

| Command | Targets |
|---------|---------|
| `/normalize` | C-01 (fonts), H-08 (color tokens), M-09 (containers) |
| `/harden` | C-03, C-04, H-01, H-02, H-04, H-05, H-06, M-03, M-05, M-06, M-07, L-04 |
| `/adapt` | C-02 (dark mode), M-10 (mobile padding) |
| `/optimize` | H-03 (Inter font), M-01 (animation), M-02 (overflow), L-02 (preconnect), L-03 (font-display) |
| `/distill` | M-04 (emoji headings), L-01 (card nesting) |
| `/arrange` | M-11 (metric strip), M-12 (identical grids) |
| `/critique` | M-11, M-12 — design quality assessment before rework |
| `/polish` | H-07 (static date), M-08 (apple-touch-icon), L-05 (theme-color) |

---

*Report generated by OpenCode audit pass. 29 findings across 5 quality pillars.*
