---
"@mission-platform/i18n": minor
---

refactor locale strategy to use SFC-local i18n blocks

Remove file-based locale modules (`defineLocales`, `mergeLocales`, `MpMessages`, `MpLocales` types,
`./locales` entry point, and `i18n:compile` script). Component locale strings now live directly in
each SFC `<i18n>` block. `createMpI18n` still accepts optional `modules` and `messages` for app-level
custom keys.
