---
'@mission-platform/hunspell': patch
---

include `vitest.config.ts` in `tsconfig.node.json` so ESLint's TypeScript project service can parse it, and reorder worker imports to satisfy `import/order`
