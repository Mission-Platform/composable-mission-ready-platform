---
'@mission-platform/vite-config': major
---

drop the bundled vue-i18n plugin and add an i18n-block ignore plugin

`defineLibraryConfig`, `defineAppConfig`, and `defineVitestConfig` no longer
bundle `@intlify/unplugin-vue-i18n`, and `vue-i18n` is removed from
`DEFAULT_LIBRARY_EXTERNALS`. A new `ignoreVueI18nBlocksPlugin` export turns Vue
SFC `<i18n>` custom blocks into inert no-op modules (those blocks are now only
consumed by `scripts/i18n-extract.ts`; translations load from the generated
`src/locales/*.yaml` bundles via i18next).

BREAKING CHANGE: Vue SFC `<i18n>` YAML blocks are no longer compiled into
vue-i18n message modules, and `vue-i18n` is no longer treated as an external by
library builds. Load translations through `@mission-platform/i18n` (i18next)
instead; apps that build their own Vite config can add `ignoreVueI18nBlocksPlugin()`
to keep `<i18n>` blocks inert.
