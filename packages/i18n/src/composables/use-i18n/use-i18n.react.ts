'use client';

// ─── @mission-platform/i18n (mp:react build) ──────────────────────────────────
// React `useI18n` hook, built on `react-i18next`.

import i18next from 'i18next';
import { useTranslation } from 'react-i18next';

import { getServerI18n } from '../../stores/create-forge-i18n';

import type { i18n as I18nInstance, TFunction } from 'i18next';

/** Return shape of {@link useI18n}. */
export interface UseI18nReturn {
  /** i18next translation function. */
  t: TFunction;
  /** The underlying i18next instance. */
  i18n: I18nInstance;
  /** The active locale. */
  locale: string;
  /** Change the active locale (delegates to `i18next.changeLanguage`). */
  setLocale: (locale: string) => Promise<TFunction>;
}

/**
 * Hook exposing the translation function, the underlying i18next instance, the
 * active locale, and a `setLocale` action. A thin wrapper over `react-i18next`'s
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
    // Fallback when outside I18nextProvider or on server before provider mount
  }

  const serverI18n = getServerI18n();
  const i18n = translationResult?.i18n ?? serverI18n ?? i18next;
  const rawT = translationResult?.t ?? i18n.t.bind(i18n);
  const t = rawT as TFunction;

  return {
    t,
    i18n,
    locale: i18n.language ?? 'en',
    setLocale: (next: string): Promise<TFunction> => i18n.changeLanguage(next),
  };
}
