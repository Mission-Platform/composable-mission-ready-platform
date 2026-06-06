// ─── @mission-platform/i18n ──────────────────────────────────────────────────
// Internal utility used by createMpI18n to merge optional locale modules.

import type { MpLocaleModule, MpMessageObject } from './types';

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
