// ─── @mission-platform/i18n/vue ──────────────────────────────────────────────
// Vue 3 adapter for the framework-agnostic i18next wrapper, built on `i18next-vue`.

import defaultI18next from 'i18next';
import I18NextVue, { useTranslation } from 'i18next-vue';
import { type App, getCurrentScope, markRaw, onScopeDispose, type Plugin, ref, type Ref } from 'vue';

import { getServerI18n, setServerI18n } from '../../core/create-mp-i18n';

import type { i18n as I18nInstance, TFunction } from 'i18next';

export {
  createMpI18n,
  getServerI18n,
  localeNamespaces,
  MP_DEFAULT_NAMESPACE,
  MP_NAMESPACE_PREFIX,
  mpNamespace,
  runWithI18n,
  setServerI18n,
} from '../../core/create-mp-i18n';
export type { CreateMpI18nOptions } from '../../core/create-mp-i18n';
export { deepMergeLocales, deepMergeMessages, mergeLocales } from '../../core/merge-locales';
export type { MpLocaleModule, MpLocales, MpMessageObject, MpMessageValue, MpNamespaceLocales } from '../../core/types';

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
  setServerI18n(i18next);
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
  let translationResult;
  try {
    translationResult = useTranslation(namespace);
  } catch {
    // Fallback when outside Vue inject context
  }

  const serverI18n = getServerI18n();
  const i18nextInstance = translationResult?.i18next ?? serverI18n ?? defaultI18next;
  const rawT = translationResult?.t ?? i18nextInstance.t.bind(i18nextInstance);
  const t = rawT as TFunction;

  const locale = ref(i18nextInstance.language ?? 'en');
  const onLanguageChanged = (next: string): void => {
    locale.value = next;
  };
  i18nextInstance.on('languageChanged', onLanguageChanged);
  if (getCurrentScope()) {
    onScopeDispose(() => i18nextInstance.off('languageChanged', onLanguageChanged));
  }

  const setLocale = (next: string): Promise<TFunction> => i18nextInstance.changeLanguage(next);

  return { t, i18next: markRaw(i18nextInstance), locale, setLocale };
}
