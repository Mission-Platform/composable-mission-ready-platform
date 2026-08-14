// ─── @mission-platform/i18n ──────────────────────────────────────────────────
// Framework-agnostic i18next integration for Mission Platform.
//
// Without a framework condition this entry is framework-neutral: it builds and
// returns a plain i18next instance. A consumer that selects a framework — via
// Vite `resolve.conditions` / TypeScript `customConditions` — resolves the same
// bare specifier to the matching adapter build instead:
//   • Vue 3 → `mp:vue`
//   • React → `mp:react`

export { createForgeI18N, getServerI18n, runWithI18n, setServerI18n } from './stores/create-forge-i18n';
export type { CreateForgeI18NOptions } from './stores/create-forge-i18n';
export { FORGE_DEFAULT_NAMESPACE, FORGE_NAMESPACE_PREFIX, forgeNamespace, localeNamespaces } from './utils/namespace';
export { deepMergeLocales, deepMergeMessages, mergeLocales } from './utils/merge-locales';
export { useI18n } from './composables/use-i18n/use-i18n.neutral';
export type { UseI18nReturn } from './composables/use-i18n/use-i18n.neutral';
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
