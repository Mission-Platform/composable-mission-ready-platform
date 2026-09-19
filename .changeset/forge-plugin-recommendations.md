---
"@mission-platform/forge-cst": minor
"@mission-platform/forge-plugin-api": minor
"@mission-platform/forge-router-plugin-api": minor
"@mission-platform/vite-plugin-forge": minor
"@mission-platform/forge-cms-plugin-api": patch
"@mission-platform/forge-plugin-react": patch
"@mission-platform/forge-plugin-solid": patch
"@mission-platform/forge-plugin-svelte": patch
"@mission-platform/forge-plugin-vue": patch
"@mission-platform/forge-plugin-web-components": patch
---

feat(forge): implement forge plugin recommendations and CST rewrites

- Introduce @mission-platform/forge-cst for robust AST/CST-based import rewrites
- Add declarative intention validation schemas in @mission-platform/forge-plugin-api
- Unify Forge build adapter contracts across React, Vue, Solid, Svelte, and Web Components
- Move path normalization into Tsdown and simplify artifact staging in @mission-platform/vite-plugin-forge
- Resolve DeepSource code quality findings across compiler plugins and tooling
