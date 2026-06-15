import { createI18n } from 'vue-i18n';

import { mergeLocales } from './merge-locales';

import type { MpLocaleModule, MpLocales } from './types';

/**
 * Creates a configured vue-i18n instance for Mission Platform.
 *
 * All locale strings are defined directly in each component's `<i18n>` block
 * (SFC-local scope). The `modules` and `messages` options are available for
 * apps that need to seed global messages for custom keys.
 *
 * @example
 * // main.ts (app entry) — no locale modules needed for built-in components
 * import { createMpI18n } from '@mission-platform/i18n'
 *
 * app.use(createMpI18n())
 */
export function createMpI18n(
  options: {
    locale?: string;
    /** Optional locale modules merged left-to-right into the global messages. */
    modules?: MpLocaleModule[];
    /** Low-level per-locale overrides applied after all modules. */
    messages?: MpLocales;
  } = {},
) {
  const { locale = 'en', modules = [], messages = {} } = options;

  const merged = mergeLocales(modules);

  // Apply top-level per-locale overrides last.
  for (const [loc, msgs] of Object.entries(messages)) {
    merged[loc] = { ...merged[loc], ...(msgs as Record<string, string>) };
  }

  return createI18n({
    // Composition API mode: every consumer uses `useI18n()` and
    // `i18n.global.locale` is a `WritableComputedRef` (accessed via `.value`).
    legacy: false,
    locale,
    fallbackLocale: 'en',
    messages: merged,
  });
}
