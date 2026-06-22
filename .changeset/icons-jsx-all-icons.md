---
'@mission-platform/icons': minor
---

populate the package with the full Mission Platform icon set

Every `icon-*` from `@mission-platform/icons` is now ported to a framework-neutral
JSX component (89 icons) and compiled straight to both the `./react` and `./vue`
subpaths by the two-stage compiler. The icons are generated from the Vue SFC
sources by `scripts/generate-icons.js`; `IconArrow`/`IconChevron` keep their
`direction` prop and `IconSort` its `active`/`direction` props. The package's
build/test tooling (vite, vitest, tsconfig, eslint/prettier configs) was fixed so
the two-stage build, declarations, and tests run cleanly.
