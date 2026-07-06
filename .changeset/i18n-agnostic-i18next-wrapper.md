---
'@mission-platform/i18n': major
'@mission-platform/breakpoints': patch
---

rebuild i18n as a framework-agnostic i18next wrapper

`@mission-platform/i18n` is now built on [i18next](https://www.i18next.com/)
instead of vue-i18n. The root entry is framework-neutral — `createMpI18n()`
returns a plain, synchronously-initialised i18next instance with single-brace
interpolation (`{name}`) and HTML escaping left to the framework — and two thin
adapter subpaths are added: `@mission-platform/i18n/vue` (built on `i18next-vue`,
exporting `createMpI18nVue` + a reactive `useI18n`) and `@mission-platform/i18n/react`
(built on `react-i18next`, exporting `MpI18nProvider` + `useI18n`).

BREAKING CHANGE: the root export no longer installs a Vue plugin or exposes a
Vue `useI18n`. Install the instance with `app.use(createMpI18nVue(createMpI18n(...)))`
and import `useI18n` from `@mission-platform/i18n/vue` (or `/react`). `createMpI18n`
now returns an i18next instance (`i18n.t`, `i18n.changeLanguage`, `i18n.language`)
rather than a vue-i18n instance with `i18n.global`. Consumers of the Vue adapter
must provide `vue` + `i18next-vue` (React consumers: `react`/`react-dom` +
`react-i18next`) as they are optional peer dependencies.
