---
'@mission-platform/i18n': minor
'@mission-platform/breakpoints': patch
---

add `mp.<workspace>` i18next namespaces with per-namespace app overrides

`@mission-platform/i18n` now groups strings into i18next namespaces: every
package lives under `mp.<package_name>` and every app under `mp.<app_name>`. New
exports `mpNamespace('<workspace>')` (e.g. `mp.breakpoints`) and
`localeNamespaces(locale, bundles)` (turns the extractor's namespace-keyed
runtime `src/locales/<locale>.yaml` into the option shape) join the existing
core API, alongside the `namespaces` and `overrides` options on `createMpI18n`
and the `deepMergeMessages`/`deepMergeLocales` helpers.

Apps set their own `namespace: mpNamespace('<app>')` as the default (which falls
back to every other namespace, so component code keeps resolving keys it owns)
and can deep-merge per-namespace `overrides` on top of a package's strings to
relabel just the keys they need. The Vue/React `useI18n(namespace?)` accepts an
optional namespace, and `breakpoint-debug` now resolves its own `mp.breakpoints`
namespace.
