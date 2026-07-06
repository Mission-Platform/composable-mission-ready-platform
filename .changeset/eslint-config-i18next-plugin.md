---
'@mission-platform/eslint-config': major
---

swap the vue-i18n ESLint plugin for eslint-plugin-i18next

The shared flat config now registers [`eslint-plugin-i18next`](https://github.com/edvardchen/eslint-plugin-i18next)
(its `i18next/no-literal-string` rule registered but disabled by default, leaving
it available for opt-in per workspace) instead of `@intlify/eslint-plugin-vue-i18n`.

BREAKING CHANGE: the `@intlify/vue-i18n/*` rules (`no-raw-text`, `no-missing-keys`,
…) and the `vue-i18n` settings block are removed. Workspaces relying on those
rules should switch to `eslint-plugin-i18next`'s `i18next/no-literal-string`.
