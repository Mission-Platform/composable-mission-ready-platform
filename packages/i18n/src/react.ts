// ─── @mission-platform/i18n/react ────────────────────────────────────────────
// React adapter for the framework-agnostic i18next wrapper, built on `react-i18next`.

import { createElement, type ReactElement, type ReactNode } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';

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

/** Props for {@link MpI18nProvider}. */
export interface MpI18nProviderProperties {
  /** The i18next instance created with `createMpI18n`. */
  i18n: I18nInstance;
  children?: ReactNode;
}

/**
 * Provides an i18next instance to the React tree (delegating to
 * `react-i18next`'s `I18nextProvider`) so descendants can call {@link useI18n}.
 *
 * @example
 * import { createMpI18n } from '@mission-platform/i18n'
 * import { MpI18nProvider } from '@mission-platform/i18n/react'
 *
 * const i18n = createMpI18n({ messages: { en: { hello: 'Hello' } } })
 * root.render(<MpI18nProvider i18n={i18n}><App /></MpI18nProvider>)
 */
export function MpI18nProvider(properties: MpI18nProviderProperties): ReactElement {
  return createElement(I18nextProvider, { i18n: properties.i18n }, properties.children);
}

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
 * Pass a `namespace` (e.g. `mpNamespace('breakpoints')`) to bind `t` to a
 * specific `mp.<workspace>` namespace; omit it to use the instance's default
 * namespace (an app's own `mp.<app>`, which falls back to every other one).
 */
export function useI18n(namespace?: string): UseI18nReturn {
  const { t, i18n } = useTranslation(namespace);

  return {
    t,
    i18n,
    locale: i18n.language,
    setLocale: (next: string): Promise<TFunction> => i18n.changeLanguage(next),
  };
}
