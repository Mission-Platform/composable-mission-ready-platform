---
'@mission-platform/storybook-framework': patch
---

load nested Storybook locale bundles

Point the shared `i18nPlugin` at `localesDir: 'locales'` so Storybook's translations under `locales/<code>/mp.storybook.yaml` actually load. Previously the plugin defaulted to `src/locales`, which only holds the generated `.d.ts` shims, so `virtual:i18n-resources` resolved to the English defaults only.
