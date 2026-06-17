---
'@mission-platform/tokens': major
'@mission-platform/components': patch
'@mission-platform/map': patch
'@mission-platform/icons': patch
---

generate one SCSS partial and TS module per token source, with barrels

- The generated token output is now split per DTCG source: every
  `tokens/<file>.tokens.json` produces `src/generated/scss/_<file>.scss` (a
  self-contained partial with its `$`-variables, `--mp-*` custom properties, and
  `@property` registrations whose `initial-value`s resolve to the matching local
  `$`-variables) and `src/generated/ts/<file>.ts` (a single nested `as const`
  object). The aggregate `src/generated/_tokens.scss` (`@forward` barrel) and
  `src/generated/tokens.ts` (re-export barrel) replace the previous
  `_structural.scss`, `flat.ts`, and `tokens.css` artefacts.
- **BREAKING:** the TypeScript API is now a flat set of per-source nested objects
  (`palette`, `size`, `font`, `typography`, `borderWidth`, `breakpoint`, `motion`,
  `opacity`, `radius`, `shadow`, `spacing`, `zIndex`, `themeLight`, `themeDark`),
  replacing the previous bespoke exports (`colors`, `spacing`, `fontFamilies`,
  `sizeIcons`, `radii`, `shadows`, …). The standalone `@mission-platform/tokens/css`
  bundle export is removed; consume the SCSS entry points instead.
- `@mission-platform/components`, `@mission-platform/map`, and
  `@mission-platform/icons` are updated to the new token exports (`font.font.family`,
  `palette.color`, and `size.icon` respectively).
