// ─── @mission-platform/i18n ──────────────────────────────────────────────────
// Framework-agnostic i18next integration for Mission Platform.
//
// The root entry is framework-neutral: it builds and returns a plain i18next
// instance. Pair it with a framework adapter:
//   • Vue 3 → `@mission-platform/i18n/vue`
//   • React → `@mission-platform/i18n/react`

export { createForgeI18N, getServerI18n, runWithI18n, setServerI18n } from './stores/create-forge-i18n';
export type { CreateForgeI18NOptions } from './stores/create-forge-i18n';
export { FORGE_DEFAULT_NAMESPACE, FORGE_NAMESPACE_PREFIX, forgeNamespace, localeNamespaces } from './utils/namespace';
export { deepMergeLocales, deepMergeMessages, mergeLocales } from './utils/merge-locales';
export type {
  ForgeLocaleModule,
  ForgeLocales,
  ForgeMessageObject,
  ForgeMessageValue,
  ForgeNamespaceLocales,
} from './utils/types';

// Re-export the i18next instance type so consumers can type the wrapper's
// return value without depending on i18next directly.
export type { i18n as ForgeI18N } from 'i18next';
