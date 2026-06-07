---
'@mission-platform/typescript-config': minor
---

add shared `@mission-platform/typescript-config` workspace

Introduces a new shared tooling workspace under `configs/` that exposes
`base`, `app`, `library`, `node`, and `test` tsconfig presets (extending
`@vue/tsconfig`) so every package and app extends a single source of
truth for the project's TypeScript standards.
