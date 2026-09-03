// ─── @mission-platform/i18n ──────────────────────────────────────────────────
// Internal types for locale message maps used by createForgeI18N.

import type { i18n as I18nInstance, TFunction, TOptions } from 'i18next';

/** A single message value: a string, a nested object, or an array of values. */
export type ForgeMessageValue = string | ForgeMessageObject | ForgeMessageValue[];

/** Recursive source type used by i18next's selector callback API. */
export type ForgeTranslationSource = { readonly [key: string]: ForgeTranslationSource };

/** Translation function type that remains selector-capable across package boundaries. */
export type ForgeTranslationFunction = TFunction & {
  <Result>(selector: (source: ForgeTranslationSource) => Result, options?: TOptions): string;
};

/** i18next instance type with the selector-capable translation function. */
export type ForgeI18nInstance = Omit<I18nInstance, 't'> & { t: ForgeTranslationFunction };

/** A recursive message object supporting arbitrarily nested keys. */
export type ForgeMessageObject = { [key: string]: ForgeMessageValue };

/** A locale module: keys are locale codes, values are message objects. */
export type ForgeLocaleModule = Record<string, ForgeMessageObject>;

/** Per-locale message overrides passed directly to createForgeI18N. */
export type ForgeLocales = Record<string, ForgeMessageObject>;

/**
 * A map of i18next namespaces (`mp.<workspace>`) to their per-locale messages.
 * Used by both the `namespaces` and `overrides` options of `createForgeI18N`.
 */
export type ForgeNamespaceLocales = Record<string, ForgeLocales>;
