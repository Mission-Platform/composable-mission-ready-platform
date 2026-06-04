import { createI18n } from 'vue-i18n';

import { en as enMessages } from './locales/en';
import { mergeLocales } from './merge-locales';

import type { MpLocaleModule, MpLocales, MpMessages } from './types';

/**
 * Creates a configured vue-i18n instance for Mission Platform.
 *
 * Each package or app can contribute its own locale strings by exporting a
 * `MpLocaleModule` (`Record<locale, Record<key, string>>`) and passing it via
 * the `modules` array.  Modules are deep-merged per locale; later entries
 * override earlier ones for duplicate keys.
 *
 * @example
 * // main.ts (app entry)
 * import { createMpI18n } from '@mission-platform/i18n'
 * import { locales as uiLocales } from '@mission-platform/components/locales'
 *
 * app.use(createMpI18n({
 *   locale: 'fr',
 *   modules: [uiLocales, { fr: { required: 'requis' } }],
 * }))
 */
export function createMpI18n(
  options: {
    locale?: string;
    /** Locale modules contributed by packages / apps.  Merged left-to-right. */
    modules?: MpLocaleModule[];
    /** Low-level per-locale overrides applied after all modules. */
    messages?: MpLocales;
  } = {},
) {
  const { locale = 'en', modules = [], messages = {} } = options;

  // Merge the built-in base locale with all package / app modules.
  const merged = mergeLocales([{ en: enMessages as unknown as Record<string, string> }, ...modules]);

  // Apply top-level per-locale overrides last.
  for (const [loc, msgs] of Object.entries(messages)) {
    merged[loc] = { ...merged[loc], ...(msgs as Record<string, string>) };
  }

  return createI18n<[MpMessages], string>({
    legacy: false,
    locale,
    fallbackLocale: 'en',
    messages: merged as unknown as Record<string, MpMessages>,
  });
}
