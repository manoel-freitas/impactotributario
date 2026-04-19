# Design System Strategy: The Institutional Precision Framework

## 1. Overview & Creative North Star: "The Architectural Ledger"
The goal of this design system is to transform complex tax reform data into a transparent, navigable landscape. We are moving away from the "cluttered government portal" toward **The Architectural Ledger**: a creative vision that treats information as a structured, physical space. 

Instead of rigid grids and heavy borders, we use **intentional asymmetry** and **tonal depth**. By layering clean, high-contrast typography over soft, "glass-like" surfaces, we establish an environment of absolute authority and modern transparency. The layout should feel like a premium financial dashboard—spacious, precise, and sophisticated.

---

## 2. Colors & Tonal Architecture
The palette is anchored in the deep stability of `primary` (#001E40) and the optimistic neutrality of `secondary` (#006C4B).

### The "No-Line" Rule
**Traditional 1px borders are strictly prohibited for sectioning.** 
Hierarchy must be defined through background shifts. For example, a `surface-container-low` component should sit on a `surface` background to create a boundary through contrast rather than lines. This creates a more cohesive, high-end "editorial" feel.

### Surface Hierarchy & Nesting
Treat the UI as a series of stacked architectural planes.
- **Base Layer:** `surface` (#FBF9F9)
- **Lower Priority/Backgrounds:** `surface-container-low` (#F5F3F3)
- **Primary Content Cards:** `surface-container-lowest` (#FFFFFF)
- **Interactive/Nested Elements:** `surface-container-high` (#E9E8E7)

### The "Glass & Gradient" Rule
To avoid a flat, "out-of-the-box" look, use **Glassmorphism** for floating elements (like tax calculation summaries). Use semi-transparent versions of `surface-container-lowest` with a `backdrop-blur` of 12px–20px. 
**Signature Texture:** Main CTA buttons and Hero sections should utilize a subtle linear gradient: `primary` (#001E40) to `primary-container` (#003366) at a 135° angle to provide a sense of "visual soul."

---

## 3. Typography: The Voice of Precision
We use a dual-font strategy to balance institutional authority with modern readability.

*   **Display & Headlines (Public Sans):** Chosen for its geometric stability. Use `display-lg` (3.5rem) with tight letter-spacing (-0.02em) for hero tax figures to convey "unshakable facts."
*   **Body & Labels (Inter):** The workhorse for legibility. Its high x-height ensures that "non-accountants" can read fine print and complex reform clauses without eye strain.
*   **Numerical Data:** All numbers must use `Inter` with **tabular lining** settings to ensure that columns of figures in the tax calculator align perfectly, maintaining the "ledger" aesthetic.

---

## 4. Elevation & Depth
We reject the heavy drop-shadows of the early web. Depth in this system is organic and atmospheric.

*   **The Layering Principle:** Place a `surface-container-lowest` card on a `surface-container-low` section. This "Tonal Lift" provides enough contrast for the eye to distinguish sections without visual noise.
*   **Ambient Shadows:** For floating calculators or tooltips, use a "Cloud Shadow": `Y: 8px, Blur: 24px, Color: on-surface (4% opacity)`. It should look like a soft glow, not a dark smudge.
*   **The "Ghost Border":** If a boundary is required for accessibility in complex forms, use the `outline-variant` token (#C3C6D1) at **15% opacity**. It must be felt, not seen.

---

## 5. Components & Interaction

### Buttons (The "Precision Trigger")
- **Primary:** Gradient from `primary` to `primary-container`. `xl` (0.75rem) roundedness. No border.
- **Secondary:** `surface-container-highest` background with `on-surface` text.
- **Interaction:** On hover, apply a subtle `inner-shadow` to simulate the button being physically pressed into the "glass" surface.

### Input Fields (The "Data Entry")
- **Style:** Use `surface-container-lowest` as the fill. 
- **States:** Focus state uses a 2px "Ghost Border" of `primary` at 40% opacity. 
- **Forced Spacing:** Labels must use `label-md` and be positioned exactly 8px above the input field to maintain the architectural rhythm.

### Cards & Data Lists
- **No Dividers:** Lists in the tax transparency portal must not use horizontal lines. Use alternating background shifts between `surface` and `surface-container-low`, or simply utilize the **Spacing Scale** (32px vertical gap) to let whitespace act as the separator.

### Specialized Component: The "Reform Impact" Chip
- **Status:** Use `secondary-container` (#9AF5CA) for positive tax impacts and `error-container` (#FFDAD6) for increases.
- **Shape:** `full` (9999px) roundedness to contrast against the architectural squareness of the rest of the UI.

---

## 6. Do’s and Don’ts

### Do
- **Use Whitespace as a Tool:** Give numerical data "room to breathe." A calculator with 40px of padding feels more trustworthy than a cramped one.
- **Leverage Tonal Transitions:** Use background colors to guide the user's eye from the summary (top) to the details (bottom).
- **Prioritize Accessibility:** Ensure text on `secondary` backgrounds always meets WCAG AA standards by using the `on-secondary` token.

### Don't
- **Don't use 100% Black:** Use `on-background` (#1B1C1C) for text to reduce harsh contrast and maintain a premium, editorial feel.
- **Don't use Rounded Corners on Everything:** Use `none` (0px) or `sm` (0.125rem) for large structural containers to maintain the "Institutional" look; reserve `xl` and `full` for interactive elements only.
- **Don't use Flat Blue Boxes:** Always look for opportunities to use a subtle tonal shift or a glass effect to add depth.