---
"@mission-platform/map": patch
---

remove empty locales placeholder and ./locales export

The map package had a placeholder `src/locales/index.ts` that depended on
`defineLocales` from `@mission-platform/i18n`. Since that API has been removed
and the map package has no translated strings, the file and its `./locales`
package export are dropped.
