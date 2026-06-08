import type { I18n } from 'vue-i18n';

// Lazy-loaded YAML locale bundles. The `@intlify/unplugin-vue-i18n` Vite
// plugin compiles `.yaml` resources at build time into modules whose default
// export is a locale-message object.
type LocaleLoader = () => Promise<{ default: Record<string, unknown> }>;

const localeLoaders: Record<string, LocaleLoader> = {
  fr: () => import('./fr.yaml'),
  es: () => import('./es.yaml'),
  nl: () => import('./nl.yaml'),
};

const loaded = new Set<string>(['en']);

export async function loadLocaleMessages(i18n: I18n, locale: string): Promise<void> {
  if (loaded.has(locale)) return;
  const loader = localeLoaders[locale];
  if (!loader) return;
  const mod = await loader();
  i18n.global.setLocaleMessage(locale, mod.default);
  loaded.add(locale);
}
