# @mission-platform/i18n

## 0.2.0

### Minor Changes

- ba565b3: refactor locale strategy to use SFC-local i18n blocks

  Remove file-based locale modules (`defineLocales`, `mergeLocales`, `MpMessages`, `MpLocales` types,
  `./locales` entry point, and `i18n:compile` script). Component locale strings now live directly in
  each SFC `<i18n>` block. `createMpI18n` still accepts optional `modules` and `messages` for app-level
  custom keys.

## 0.1.0

### Minor Changes

- feat: initial i18n package with locale definition helpers, merging utilities and Vue I18n integration
