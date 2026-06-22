// ─── @mission-platform/i18n/vue ──────────────────────────────────────────────
// Vue 3 adapter for the framework-agnostic i18next wrapper, built on `i18next-vue`.

import I18NextVue, { useTranslation } from 'i18next-vue';
import { getCurrentScope, onScopeDispose, ref, type App, type Plugin, type Ref } from 'vue';

import type { i18n as I18nInstance, TFunction } from 'i18next';

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
export type { i18n as MpI18n } from 'i18next';

/**
 * Wraps an i18next instance in a Vue plugin (delegating to `i18next-vue`) so it
 * can be installed with `app.use(...)`. Components then resolve translations via
 * the `$t` template helper or the {@link useI18n} composable.
 *
 * @example
 * import { createMpI18n } from '@mission-platform/i18n'
 * import { createMpI18nVue } from '@mission-platform/i18n/vue'
 *
 * const i18n = createMpI18n({ messages: { en: { hello: 'Hello' } } })
 * app.use(createMpI18nVue(i18n))
 */
export function createMpI18nVue(i18next: I18nInstance): Plugin {
  return {
    install(app: App) {
      // Use `<<slot>>` delimiters for the `<i18next>` component-interpolation
      // slots. They avoid the single-brace (`{name}`) value-interpolation the
      // platform's locale strings use, and are regex-safe (i18next-vue builds
      // its slot matcher from these delimiters without escaping them, so
      // bracket/paren delimiters like `[[`/`]]` would form an invalid RegExp).
      app.use(I18NextVue, { i18next, slotStart: '<<', slotEnd: '>>' });
    },
  };
}

/** Return shape of {@link useI18n}. */
export interface UseI18nReturn {
  /** Reactive i18next translation function. */
  t: TFunction;
  /** The underlying i18next instance. */
  i18next: I18nInstance;
  /** Reactive current locale, kept in sync with i18next's `languageChanged` event. */
  locale: Ref<string>;
  /** Change the active locale (delegates to `i18next.changeLanguage`). */
  setLocale: (locale: string) => Promise<TFunction>;
}

/**
 * Composition helper exposing the reactive translation function, the active
 * locale (as a writable ref synchronised with i18next), and a `setLocale`
 * action. A thin, framework-friendly wrapper over `i18next-vue`'s
 * `useTranslation`.
 *
 * Pass a `namespace` (e.g. `mpNamespace('breakpoints')`) to bind `t` to a
 * specific `mp.<workspace>` namespace; omit it to use the instance's default
 * namespace (an app's own `mp.<app>`, which falls back to every other one).
 */
export function useI18n(namespace?: string): UseI18nReturn {
  const { t, i18next } = useTranslation(namespace);

  const locale = ref(i18next.language);
  const onLanguageChanged = (next: string): void => {
    locale.value = next;
  };
  i18next.on('languageChanged', onLanguageChanged);
  if (getCurrentScope()) {
    onScopeDispose(() => i18next.off('languageChanged', onLanguageChanged));
  }

  const setLocale = (next: string): Promise<TFunction> => i18next.changeLanguage(next);

  return { t, i18next, locale, setLocale };
}
