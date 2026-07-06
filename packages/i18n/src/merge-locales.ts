// ─── @mission-platform/i18n ──────────────────────────────────────────────────
// Internal utility used by createMpI18n to merge optional locale modules.

import type { MpLocaleModule, MpLocales, MpMessageObject, MpMessageValue } from './types';

/**
 * Deep-merges an array of locale modules into a single messages map.
 * Modules are processed left-to-right; later entries override earlier ones.
 */
export function mergeLocales(modules: MpLocaleModule[]): Record<string, MpMessageObject> {
  const result: Record<string, MpMessageObject> = {};

  for (const module_ of modules) {
    for (const [locale, msgs] of Object.entries(module_)) {
      result[locale] = { ...result[locale], ...msgs };
    }
  }

  return result;
}

const isPlainMessageObject = (value: MpMessageValue | undefined): value is MpMessageObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Recursively deep-merges two message objects, returning a new object. Plain
 * (non-array) nested objects are merged key-by-key; every other value
 * (strings, arrays, …) from `source` replaces the matching value in `target`.
 *
 * This is the merge strategy used to layer per-namespace app `overrides` on top
 * of a package's own strings, where only the handful of overridden keys should
 * win and the rest of the package bundle is preserved.
 */
export function deepMergeMessages(target: MpMessageObject, source: MpMessageObject): MpMessageObject {
  const result: MpMessageObject = { ...target };

  for (const [key, sourceValue] of Object.entries(source)) {
    const targetValue = result[key];
    result[key] =
      isPlainMessageObject(targetValue) && isPlainMessageObject(sourceValue)
        ? deepMergeMessages(targetValue, sourceValue)
        : sourceValue;
  }

  return result;
}

/**
 * Deep-merges the per-locale message objects of `source` into `target`,
 * returning a new {@link MpLocales} map. Used to layer namespace bundles and
 * overrides locale-by-locale.
 */
export function deepMergeLocales(target: MpLocales, source: MpLocales): MpLocales {
  const result: MpLocales = { ...target };

  for (const [locale, msgs] of Object.entries(source)) {
    result[locale] = deepMergeMessages(result[locale] ?? {}, msgs);
  }

  return result;
}
