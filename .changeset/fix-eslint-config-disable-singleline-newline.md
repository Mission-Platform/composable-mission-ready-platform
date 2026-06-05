---
"@mission-platform/eslint-config": patch
---

disable vue/singleline-html-element-content-newline rule

The rule conflicts with Prettier's `htmlWhitespaceSensitivity: 'ignore'` setting,
which collapses short single-line elements. Prettier is the source of truth for
HTML formatting.
