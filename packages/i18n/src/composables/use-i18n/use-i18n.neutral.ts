// ─── @mission-platform/i18n (neutral build) ───────────────────────────────────
// Framework-neutral `useI18n` fallback for Solid, Svelte, and Web Components.

import defaultI18next from 'i18next';

import { getServerI18n } from '@/stores/create-forge-i18n';

import type { i18n as I18nInstance, TFunction } from 'i18next';

/** Return shape of the framework-neutral {@link useI18n} fallback. */
export interface UseI18nReturn {
  /** i18next translation function. */
  t: TFunction;
  /** The underlying i18next instance. */
  i18n: I18nInstance;
  /** Alias kept compatible with the Vue adapter's return shape. */
  i18next: I18nInstance;
  /** The active locale. */
  locale: string;
  /** Change the active locale (delegates to `i18next.changeLanguage`). */
  setLocale: (locale: string) => Promise<TFunction>;
}

/**
 * Provide i18next directly when no framework adapter is available. This keeps
 * generated Solid, Svelte, and Web Component artifacts compatible with the
 * same `useI18n()` import used by the React and Vue builds without pulling a
 * framework runtime into their neutral fallback.
 */
export function useI18n(namespace?: string): UseI18nReturn {
  const i18n = getServerI18n() ?? defaultI18next;
  // i18next uses null to select the active language for a fixed namespace.
  // eslint-disable-next-line unicorn/no-null
  const rawT = namespace ? i18n.getFixedT(null, namespace) : i18n.t.bind(i18n);
  const t = ((...arguments_: Parameters<TFunction>) => {
    const value = rawT(...arguments_);
    if (value !== undefined && value !== null) {
      return value;
    }
    const options = arguments_[1];
    if (typeof options === 'object' && options !== null && 'defaultValue' in options) {
      return options.defaultValue;
    }
    return typeof arguments_[0] === 'string' ? arguments_[0] : '';
  }) as TFunction;

  return {
    t,
    i18n,
    i18next: i18n,
    locale: i18n.language ?? 'en',
    setLocale: (next: string): Promise<TFunction> => i18n.changeLanguage(next),
  };
}
