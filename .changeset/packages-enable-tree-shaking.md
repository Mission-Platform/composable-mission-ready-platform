---
'@mission-platform/breakpoints': patch
'@mission-platform/components': patch
'@mission-platform/harper': patch
'@mission-platform/hunspell': patch
'@mission-platform/i18n': patch
'@mission-platform/icons': patch
'@mission-platform/map': patch
'@mission-platform/tokens': patch
---
enable tree shaking support when consumed by apps

Declares `"sideEffects"` in each package's `package.json` so app bundlers
(Vite/Rollup) can safely drop unused exports. Pure-TypeScript packages
(`harper`, `hunspell`, `i18n`) opt out of side effects entirely with
`"sideEffects": false`. Packages that ship styles and/or Vue SFCs
(`breakpoints`, `components`, `icons`, `map`, `tokens`) keep `*.css`,
`*.scss`, and `*.vue` files marked as side-effectful so component
styles and SCSS entrypoints are preserved.
