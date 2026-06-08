import '@mission-platform/tokens/scss/tokens';
import '@mission-platform/tokens/scss/themes/light';
import '@mission-platform/tokens/scss/themes/dark';
import '@mission-platform/components/styles';

import { createMpI18n } from '@mission-platform/i18n';
import { createApp } from 'vue';
import { RouterView } from 'vue-router';

import enMessages from './locales/en.yaml';
import { loadLocaleMessages } from './locales/load-locale';
import router from './router';

import './styles/global.scss';

// Restore persisted theme (set by BaseThemeToggle) before the app mounts so
// there is no flash of the wrong colour scheme.
try {
  const stored = localStorage.getItem('mp-theme');
  if (stored === 'light' || stored === 'dark') {
    document.documentElement.setAttribute('data-theme', stored);
  } else if (stored === 'auto') {
    // Explicit auto — let the UA's `prefers-color-scheme` drive the theme by
    // leaving `data-theme` unset.
    document.documentElement.removeAttribute('data-theme');
  }
} catch {
  // Ignore (private mode etc.)
}

// Restore persisted locale (set by the in-app language toggle).
let initialLocale = 'en';
try {
  const storedLocale = localStorage.getItem('mp-locale');
  if (storedLocale && ['en', 'fr', 'es', 'nl'].includes(storedLocale)) {
    initialLocale = storedLocale;
    document.documentElement.setAttribute('lang', storedLocale);
  }
} catch {
  // Ignore (private mode etc.)
}

// Seed English (source-of-truth) messages on the global scope at creation
// time so `<i18n-t scope="global">` and `useI18n({ useScope: 'global' })`
// resolve them on first paint.
const i18n = createMpI18n({
  locale: initialLocale,
  messages: { en: enMessages as Record<string, string> },
});

async function bootstrap(): Promise<void> {
  // On-demand load the persisted non-English locale before mount so first paint
  // shows the user's chosen language without an English flash.
  if (initialLocale !== 'en') {
    await loadLocaleMessages(i18n, initialLocale);
  }
  createApp(RouterView).use(router).use(i18n).mount('#app');
}

void bootstrap();

export { i18n };
