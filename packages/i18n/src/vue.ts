// ─── @mission-platform/i18n/vue ──────────────────────────────────────────────
// Vue 3 adapter for the framework-agnostic i18next wrapper, built on `i18next-vue`.

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

// Vue 3 adapter (plugin + composable).
export { createForgeI18NVue } from './components/forge-i18n-vue';
export { useI18n } from './composables/use-i18n.vue';
export type { UseI18nReturn } from './composables/use-i18n.vue';
