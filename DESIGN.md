---
version: alpha
name: Mission Platform
description: >-
  The Mission Platform design system — a calm, rounded, accessible identity for
  composable Vue/React/Solid/Web Components apps. Tokens are authored in the DTCG format
  (OKLab colour space) in `@mission-platform/tokens`; the values below mirror the
  light colour scheme. Every semantic colour is scheme-aware at runtime via
  `light-dark(...)`, and dimension scales are `rem` relative to a 14px root so the
  UI honours the user's font size.
colors:
  primary: "oklab(0.4099 0.07598 -0.1812)"
  secondary: "oklab(0.3367 -0.0541 -0.00893)"
  tertiary: "oklab(0.5135 0.01717 -0.02411)"
  neutral: "oklab(0.9572 -0.0013 -0.00318)"
  surface: "#ffffff"
  on-surface: "oklab(0.1297 0.00828 -0.01499)"
  border: "oklab(0.3367 -0.0541 -0.00893)"
  success: "oklab(0.3176 -0.06872 0.03678)"
  warning: "oklab(0.4061 0.08673 0.07426)"
  error: "oklab(0.4546 0.1664 0.04056)"
  info: "oklab(0.3982 -0.04496 -0.04888)"
typography:
  display:
    fontFamily: Comfortaa
    fontSize: 3rem
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: -0.025em
  h1:
    fontFamily: Comfortaa
    fontSize: 2.25rem
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.025em
  h2:
    fontFamily: Comfortaa
    fontSize: 1.875rem
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.025em
  h3:
    fontFamily: Comfortaa
    fontSize: 1.5rem
    fontWeight: 500
    lineHeight: 1.45
    letterSpacing: -0.025em
  h4:
    fontFamily: Comfortaa
    fontSize: 1.25rem
    fontWeight: 500
    lineHeight: 1.45
    letterSpacing: -0.025em
  body-lg:
    fontFamily: Comfortaa
    fontSize: 1.125rem
    fontWeight: 400
    lineHeight: 1.75
  body-md:
    fontFamily: Comfortaa
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.6
  body-sm:
    fontFamily: Comfortaa
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: Comfortaa
    fontSize: 0.875rem
    fontWeight: 500
    lineHeight: 1.45
  caption:
    fontFamily: Comfortaa
    fontSize: 0.75rem
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: 0.025em
  code:
    fontFamily: Datatype
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.45
spacing:
  base: 1rem
  xs: 0.571rem
  sm: 0.857rem
  md: 1.143rem
  lg: 1.714rem
  xl: 2.286rem
  gutter: 1.143rem
  margin: 1.714rem
rounded:
  none: 0
  sm: 0.286rem
  md: 0.429rem
  lg: 0.571rem
  xl: 0.857rem
  full: 9999px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm}"
    typography: "{typography.label}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm}"
    typography: "{typography.label}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm}"
    typography: "{typography.body-md}"
  app-shell:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-surface}"
    padding: "{spacing.lg}"
  divider:
    backgroundColor: "{colors.border}"
    height: 1px
  badge-success:
    backgroundColor: "{colors.success}"
    textColor: "{colors.surface}"
    rounded: "{rounded.full}"
    padding: "{spacing.xs}"
    typography: "{typography.caption}"
  badge-warning:
    backgroundColor: "{colors.warning}"
    textColor: "{colors.surface}"
    rounded: "{rounded.full}"
    padding: "{spacing.xs}"
    typography: "{typography.caption}"
  badge-danger:
    backgroundColor: "{colors.error}"
    textColor: "{colors.surface}"
    rounded: "{rounded.full}"
    padding: "{spacing.xs}"
    typography: "{typography.caption}"
  badge-info:
    backgroundColor: "{colors.info}"
    textColor: "{colors.surface}"
    rounded: "{rounded.full}"
    padding: "{spacing.xs}"
    typography: "{typography.caption}"
---

# Mission Platform Design System

## Overview

Mission Platform is a **composable, multi-framework component platform**. Its
visual identity is **calm, soft, and trustworthy** — approachable without being
playful, dense enough for data-heavy admin and monitoring surfaces yet never
cramped. The design language favours **generous rounding, gentle elevation, and
high-contrast text** so that interfaces feel modern and legible across long work
sessions.

The system is **accessibility-first and scheme-aware by default**: every UI
follows the user's `prefers-color-scheme` unless an ancestor pins a theme, and
all semantic colours ship as `light-dark(...)` pairs. When a specific rule or
token is not defined, prefer the calmer, lower-contrast option and lean on
semantic tokens (e.g. `primary`, `surface`) rather than raw palette steps.

## Colors

The palette is rooted in a **periwinkle-violet primary** and a **cool teal
secondary**, balanced by warm-neutral surfaces and text. Colour values are
expressed in the **OKLab** colour space (the source of truth in
`@mission-platform/tokens`); the values here describe the light scheme, and each
token resolves to a scheme-aware `light-dark(light, dark)` pair at runtime.

- **Primary (periwinkle-violet):** The single brand accent, reserved for the one
  most important action on a screen, active states, and focus affordances.
- **Secondary (deep teal):** Supporting emphasis and default borders — quieter
  than primary, used for structure rather than calls to action.
- **Tertiary (mid neutral):** Utilitarian slate for metadata, muted labels, and
  low-priority controls.
- **Neutral (forge-light):** The warm off-white page background that anchors all
  screens and softens the overall feel versus pure white.
- **Surface (white):** Cards, panels, and popovers that sit above the neutral
  background.
- **On-surface (near-black):** Primary text and icons, tuned for maximum
  legibility against `surface`.
- **Status — success / warning / error / info:** Semantic feedback colours for
  positive, cautionary, destructive, and informational messaging respectively.

Maintain WCAG AA contrast (4.5:1 for body text, 3:1 for large text and UI
boundaries). Because colours are scheme-aware, verify contrast in **both** the
light and dark schemes.

## Typography

Two families carry the system. **Comfortaa** — a rounded geometric sans — is the
primary voice for everything from display headlines to body copy and labels, so
the rounded letterforms echo the soft corner radii. **Datatype** (a monospace)
is reserved for `code`, technical identifiers, and tabular numerals.

- **Display & Headings (`display`, `h1`–`h6`):** Comfortaa Semi-Bold/Bold with
  tightened tracking (`-0.025em`) and compact line height for a confident,
  institutional voice.
- **Body (`body-lg` / `body-md` / `body-sm`):** Comfortaa Regular with relaxed
  line height (1.6–1.75) for comfortable long-form reading. `body-md` (1rem) is
  the default.
- **Labels & Captions (`label`, `caption`):** Smaller, medium-weight text for
  form labels, chips, and metadata.
- **Code (`code`):** Datatype monospace for inline and block code.

All sizes are `rem`-relative to a **14px** root, so the type scale respects the
user's browser font-size preference. Avoid using more than two weights on a
single screen.

## Layout

The layout uses a **fluid, containment-based model**: related content is grouped
into cards and panels with generous internal padding, separated by consistent
rhythm rather than heavy dividers.

Spacing follows a **4px forge-unit scale** expressed in `rem` (`spacing.1` ≈ 4px,
`spacing.4` ≈ 16px, …) plus a named `xs → 2xl` t-shirt scale consumed by the
component `padding` / `margin` / `gap` props. Use `md` (≈16px) as the default gap
and `lg` (≈24px) for card padding to preserve the airy, approachable feel.
Constrain long-form content to a comfortable measure and centre it within a
fixed max-width container on wide viewports.

## Elevation & Depth

Depth is conveyed through **soft, tightly-scaled shadows layered over tonal
surfaces**, not heavy drop shadows. The neutral page background sits beneath
white `surface` cards; raised elements (dropdowns, popovers, modals, toasts) step
up through a graduated `shadow` scale (`2xs → 2xl`) with small offsets and low
blur. Focus is always communicated with a **primary-tinted focus ring** rather
than by removing the outline. In dense flat regions, prefer borders and
background-tone contrast over shadow.

## Shapes

The shape language is **soft and rounded**, mirroring the Comfortaa letterforms.
Interactive elements and containers use the `rounded` scale — `sm` (≈4px) for
small controls and chips, `md` (≈6px) as the default control/card radius, and
`lg`–`xl` for larger cards and surfaces. `rounded.full` (`9999px`) is the pill
sentinel for avatars, badges, and toggles. Keep corner treatment consistent
within a view; do not mix sharp and rounded corners on peer elements.

## Components

Components compose the tokens above. Buttons, inputs, and cards share the `md`/`lg`
radius family and the `sm`/`lg` padding steps so the library feels cohesive.

- **Buttons:** `button-primary` is a filled periwinkle action with `surface`
  (white) text; `button-secondary` is a bordered, low-emphasis variant on a
  `surface` background. Reserve the primary variant for the single most important
  action per screen. Define related states (`-hover`, `-active`, `-disabled`) as
  sibling keys.
- **Inputs:** Text inputs use a `surface` background, `md` radius, `sm` padding,
  and `body-md` typography, with the `border` colour for the resting edge and the
  focus ring for the focused state.
- **Cards:** Containers on a `surface` background with `lg` radius and `lg`
  padding, relying on soft elevation to separate from the neutral page.
- **Badges (`badge-success` / `-warning` / `-danger` / `-info`):** Pill-shaped
  (`rounded.full`) status chips filled with the matching semantic colour and
  `surface` text, used for state and severity labelling.
- **App shell & divider:** The `app-shell` paints the `neutral` page background
  behind all content; `divider` is a 1px rule in the `border` colour for quiet
  separation where a shadow or card would be too heavy.

Component property tokens follow the DESIGN.md set — `backgroundColor`,
`textColor`, `typography`, `rounded`, `padding`, `size`, `height`, `width` — and
reference the frontmatter tokens with `{path.to.token}` so a change propagates
everywhere.

## Do's and Don'ts

- **Do** reserve `primary` for the single most important action per screen; use
  `secondary`/`tertiary` for supporting controls.
- **Do** override semantic tokens (`--mp-color-primary-default`, `--mp-radius-md`)
  rather than primitives when re-skinning, so the whole library follows.
- **Do** maintain WCAG AA contrast (4.5:1 for normal text) in both light and dark
  schemes.
- **Don't** mix sharp and rounded corners on peer elements in the same view.
- **Don't** use more than two font weights on a single screen.
- **Don't** convey elevation with heavy, high-blur shadows — prefer the tight
  `shadow` scale plus tonal surfaces.
- **Don't** fork `@mission-platform/tokens`; override the generated `--mp-*`
  custom properties instead (see the token-override JSON Schema and the
  `design-token-overrides` MCP guide).
