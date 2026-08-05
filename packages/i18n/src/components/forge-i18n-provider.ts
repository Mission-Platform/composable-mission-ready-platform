'use client';

// ─── @mission-platform/i18n/react ─────────────────────────────────────────────
// React provider supplying an i18next instance to the tree, built on `react-i18next`.

import { createElement, type ReactElement, type ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';

import { setServerI18n } from '../stores/create-forge-i18n';

import type { i18n as I18nInstance } from 'i18next';

/** Props for {@link ForgeI18NProvider}. */
export interface ForgeI18NProviderProperties {
  /** The i18next instance created with `createForgeI18N`. */
  i18n: I18nInstance;
  children?: ReactNode;
}

/**
 * Provides an i18next instance to the React tree (delegating to
 * `react-i18next`'s `I18nextProvider`) so descendants can call `useI18n`.
 *
 * @example
 * import { createForgeI18N } from '@mission-platform/i18n'
 * import { ForgeI18NProvider } from '@mission-platform/i18n/react'
 *
 * const i18n = createForgeI18N({ messages: { en: { hello: 'Hello' } } })
 * root.render(<ForgeI18NProvider i18n={i18n}><App /></ForgeI18NProvider>)
 */
export function ForgeI18NProvider(properties: ForgeI18NProviderProperties): ReactElement {
  setServerI18n(properties.i18n);
  return createElement(I18nextProvider, { i18n: properties.i18n }, properties.children);
}
