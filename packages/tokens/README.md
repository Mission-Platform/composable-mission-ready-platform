# `@mission-platform/tokens`

Design tokens, SCSS theme variables, and font assets for Mission Platform applications.

---

## Overview

`@mission-platform/tokens` provides design token exports and SCSS style entry points:

- **JS/TS Tokens**: Default export providing JS/TS design token objects.
- **SCSS Tokens & Themes**: Light and dark theme definitions, responsive breakpoint mixins, accessibility utilities, and
  SCSS variables.
- **Fonts**: Font assets (Comfortaa, Datatype, etc.).

---

## Installation

```bash
pnpm add @mission-platform/tokens
```

---

## Exports

- **`.`**: TS design tokens object (`import tokens from '@mission-platform/tokens'`).
- **`./scss/tokens`**: Core SCSS design tokens (`@use '@mission-platform/tokens/scss/tokens'`).
- **`./scss/themes/light`**: Light theme styles (`@use '@mission-platform/tokens/scss/themes/light'`).
- **`./scss/themes/dark`**: Dark theme styles (`@use '@mission-platform/tokens/scss/themes/dark'`).
- **`./scss/mixins`**: Common SCSS mixins (`@use '@mission-platform/tokens/scss/mixins'`).
- **`./scss/breakpoints-mixins`**: Breakpoint media query mixins.
- **`./scss/breakpoints-utilities`**: Utility classes for responsive breakpoints.
- **`./scss/size`**: Size utilities.
- **`./scss/a11y`**: Accessibility helper styles (screen-reader only, focus outlines).

### Compatibility note

The generated TypeScript export surface was intentionally reduced by the token reachability audit: 189 unreachable
leaves were removed (185 reviewed candidates plus 4 net second-order palette leaves, after restoring 2 reachable `.500` leaves). Retained `component.*` paths,
layer-based CSS/SCSS names, aliases, and override selectors are unchanged; consumers importing a removed primitive,
semantic, typography, or structural leaf must update that import.

---

## Usage Example

```scss
@use '@mission-platform/tokens/scss/tokens' as tokens;
@use '@mission-platform/tokens/scss/mixins' as mixins;

.custom-card {
  padding: tokens.$spacing-4;
  border-radius: tokens.$radius-md;
  background-color: var(--mp-color-bg-primary);
}
```
