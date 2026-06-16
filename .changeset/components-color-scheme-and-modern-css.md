---
"@mission-platform/components": minor
---

drive `color-scheme` from the theme APIs and adopt modern CSS in components

- `BaseThemeProvider` / `useTheme` now set the CSS `color-scheme` on
  `document.documentElement`: an explicit `'light'`/`'dark'` preference pins the
  scheme, while `'auto'` applies `color-scheme: light dark` so the root follows
  the OS `prefers-color-scheme` (and the tokens' `light-dark()` values switch
  with it).
- `BaseThemeComposer` / `useThemeComposer` gain a `colorScheme` config attribute
  (`'light' | 'dark' | 'light dark' | 'normal'`) emitted as a real `color-scheme`
  declaration (scoped style string in local mode, inline property in global mode)
  rather than a `--mp-*` custom property.
- Began adopting modern CSS where it makes sense: `BaseDialog` animates its native
  `<dialog>` and `::backdrop` in/out with `@starting-style` + `transition-behavior:
allow-discrete` (honouring `prefers-reduced-motion`), and `BaseCard` becomes an
  `inline-size` container and switches its internal padding to `@container` queries.
- Every component now wraps its SFC `<style>` rules in the `@layer mp.components`
  cascade layer (any leading `@use` stays outside the layer), so unlayered
  application styles win over component styles without specificity battles.
