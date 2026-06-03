// ─── @mission-platform/i18n ──────────────────────────────────────────────────
// Helper for packages to declare their own locale modules with correct typing.

import type { MpLocaleModule } from './types'

/**
 * Identity helper that returns its argument unchanged.
 *
 * Use it in every package that exposes its own translations so the result is
 * typed as `MpLocaleModule` without an explicit type annotation.
 *
 * @example
 * // packages/my-package/src/locales/index.ts
 * import { defineLocales } from '@mission-platform/i18n'
 *
 * export const locales = defineLocales({
 *   en: { greeting: 'Hello' },
 *   fr: { greeting: 'Bonjour' },
 * })
 *
 * @param module - Locale module object keyed by locale code.
 * @returns The same object, typed as `MpLocaleModule`.
 */
export function defineLocales(module: MpLocaleModule): MpLocaleModule {
  return module
}
