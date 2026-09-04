---
'@mission-platform/forge-adapters': minor
'@mission-platform/forge-jsx': major
---

split the Forge JSX runtime from its framework adapters

BREAKING CHANGE: replace `@mission-platform/forge` imports with `@mission-platform/forge-jsx` for neutral runtime APIs and `@mission-platform/forge-adapters/<framework>` for framework adapters.