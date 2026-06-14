---
'@mission-platform/prettier-config': patch
---

stop adding trailing commas in JSONC files

The `**/*.jsonc` override used `trailingComma: 'es5'`, which made Prettier
append a trailing comma before every closing `}`/`]`. JSONC consumers such as
Wrangler's config reject those commas, so the override now uses
`trailingComma: 'none'` while keeping the `jsonc` parser (so comments are still
supported).
