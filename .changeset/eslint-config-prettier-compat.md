---
'@mission-platform/eslint-config': minor
---

integrate eslint-config-prettier to stop ESLint from enforcing formatting rules that conflict with Prettier (notably `eslint-plugin-vue`'s recommended formatting rules); Prettier is now the single source of truth for formatting
