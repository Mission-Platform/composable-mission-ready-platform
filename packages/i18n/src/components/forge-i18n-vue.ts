// ─── @mission-platform/i18n (mp:vue condition) ───────────────────────────────
// Vue 3 plugin wiring an i18next instance into the app, built on `i18next-vue`.

import I18NextVue from 'i18next-vue';

import { setServerI18n } from '../stores/create-forge-i18n';

import type { ForgeI18nInstance } from '../utils/types';
import type { i18n as I18nInstance } from 'i18next';
import type { App, Plugin } from 'vue';

/**
 * Wraps an i18next instance in a Vue plugin (delegating to `i18next-vue`) so it
 * can be installed with `app.use(...)`. Components then resolve translations via
 * the `$t` template helper or the `useI18n` composable.
 *
 * @example
 * import { createForgeI18N, createForgeI18NVue } from '@mission-platform/i18n'
 *
 * const i18n = createForgeI18N({ messages: { en: { hello: 'Hello' } } })
 * app.use(createForgeI18NVue(i18n))
 */
export function createForgeI18NVue(i18next: ForgeI18nInstance): Plugin {
  setServerI18n(i18next);
  return {
    install(app: App) {
      // Use `<<slot>>` delimiters for the `<i18next>` component-interpolation
      // slots. They avoid the single-brace (`{name}`) value-interpolation the
      // platform's locale strings use, and are regex-safe (i18next-vue builds
      // its slot matcher from these delimiters without escaping them, so
      // bracket/paren delimiters like `[[`/`]]` would form an invalid RegExp).
      app.use(I18NextVue, {
        i18next: i18next as unknown as I18nInstance,
        slotStart: '<<',
        slotEnd: '>>',
      });
    },
  };
}
