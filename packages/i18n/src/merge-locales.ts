// ─── @mission-platform/i18n ──────────────────────────────────────────────────
// Utility for merging locale modules contributed by multiple packages / apps.

import type { MpLocaleModule } from './types';

/**
 * Deep-merges an array of locale modules into a single messages map.
 *
 * Modules are processed left-to-right; later entries override earlier ones for
 * duplicate keys within the same locale.  The function is safe to call with an
 * empty array — it returns an empty object in that case.
 *
 * @example
 * import { mergeLocales } from '@mission-platform/i18n'
 * import { locales as uiLocales }  from '@mission-platform/components/locales'
 * import { locales as mapLocales }  from '@mission-platform/map/locales'
 *
 * const messages = mergeLocales([uiLocales, mapLocales, { fr: { close: 'Fermer' } }])
 * // → { en: { required: 'required', … }, fr: { close: 'Fermer', … }, … }
 *
 * @param modules - Ordered list of locale modules to merge.
 * @returns A single flat locale map ready to pass to `createI18n({ messages })`.
 */
export function mergeLocales(modules: MpLocaleModule[]): Record<string, Record<string, string>> {
  const result: Record<string, Record<string, string>> = {};

  for (const module_ of modules) {
    for (const [locale, msgs] of Object.entries(module_)) {
      result[locale] = { ...result[locale], ...msgs };
    }
  }

  return result;
}
