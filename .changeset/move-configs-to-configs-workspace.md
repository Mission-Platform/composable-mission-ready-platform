---
'@mission-platform/eslint-config': patch
'@mission-platform/postcss-config': patch
'@mission-platform/prettier-config': patch
'@mission-platform/stylelint-config': patch
---
Move shared tooling configs from `packages/` into a dedicated `configs/` workspace directory. Package names and public entry points are unchanged; consumers continue to import via `@mission-platform/<config-name>`.
