// ─── @mission-platform/i18n ──────────────────────────────────────────────────
// Framework-agnostic i18next integration for Mission Platform.
//
// The root entry is framework-neutral: it builds and returns a plain i18next
// instance. Pair it with a framework adapter:
//   • Vue 3 → `@mission-platform/i18n/vue`
//   • React → `@mission-platform/i18n/react`

export {
  createMpI18n,
  localeNamespaces,
  MP_DEFAULT_NAMESPACE,
  MP_NAMESPACE_PREFIX,
  mpNamespace,
} from './create-mp-i18n';
export type { CreateMpI18nOptions } from './create-mp-i18n';
export { deepMergeLocales, deepMergeMessages, mergeLocales } from './merge-locales';
export type { MpLocaleModule, MpLocales, MpMessageObject, MpMessageValue, MpNamespaceLocales } from './types';

// Re-export the i18next instance type so consumers can type the wrapper's
// return value without depending on i18next directly.
export type { i18n as MpI18n } from 'i18next';
