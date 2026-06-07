---
'@mission-platform/postcss-config': patch
---

switch `@mission-platform/postcss-config` from `vite build` to pure `tsc`

Aligns with the new convention that all `configs/*` packages build with
`tsc`, and migrates its tsconfig to extend
`@mission-platform/typescript-config/library`.
