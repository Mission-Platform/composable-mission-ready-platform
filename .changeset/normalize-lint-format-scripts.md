---
'@mission-platform/eslint-config': patch
'@mission-platform/postcss-config': patch
'@mission-platform/prettier-config': patch
'@mission-platform/stylelint-config': patch
'@mission-platform/typescript-config': patch
'@mission-platform/vite-config': patch
'@mission-platform/breakpoints': patch
'@mission-platform/components': patch
'@mission-platform/harper': patch
'@mission-platform/hunspell': patch
'@mission-platform/i18n': patch
'@mission-platform/icons': patch
'@mission-platform/map': patch
'@mission-platform/tokens': patch
---

normalize lint and format scripts across all workspaces

Add consistent `lint:fix`, `lint:style:fix`, and `format:write` scripts to every workspace, and make `format` run `prettier --check` instead of `prettier --write` so it can be used as a non-mutating verification step.
