// ─── @mission-platform/i18n (mp:react build) ─────────────────────────────────
// React adapter for the framework-agnostic i18next wrapper, built on `react-i18next`.
// Consumers import the bare `@mission-platform/i18n`; the `mp:react` export
// condition selects this build.

// Framework-neutral core surface (re-exported for convenience).
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
export type { i18n as ForgeI18N } from 'i18next';

// React adapter (provider + hook).
export { ForgeI18NProvider } from './components/forge-i18n-provider';
export type { ForgeI18NProviderProperties } from './components/forge-i18n-provider';
export { useI18n } from './composables/use-i18n/use-i18n.react';
export type { UseI18nReturn } from './composables/use-i18n/use-i18n.react';
