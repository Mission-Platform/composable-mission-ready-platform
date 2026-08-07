// ─── @mission-platform/i18n (mp:vue build) ───────────────────────────────────
// Vue 3 `useI18n` composable, built on `i18next-vue`.

import defaultI18next from 'i18next';
import { useTranslation } from 'i18next-vue';
import { getCurrentScope, markRaw, onScopeDispose, ref, type Ref } from 'vue';

import { getServerI18n } from '../../stores/create-forge-i18n';

import type { i18n as I18nInstance, TFunction } from 'i18next';

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
 * Pass a `namespace` (e.g. `forgeNamespace('breakpoints')`) to bind `t` to a
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
