import { type MpI18n, type MpMessageObject } from '@mission-platform/i18n';
import yaml from 'js-yaml';


// Lazy-loaded YAML locale bundles. Each `.yaml` is imported as a raw string
// (`?raw`) and parsed with js-yaml on demand, then registered with i18next.
type LocaleLoader = () => Promise<string>;

const localeLoaders: Record<string, LocaleLoader> = {
  fr: () => import('./fr.yaml?raw').then((m) => m.default),
  es: () => import('./es.yaml?raw').then((m) => m.default),
  nl: () => import('./nl.yaml?raw').then((m) => m.default),
  it: () => import('./it.yaml?raw').then((m) => m.default),
  de: () => import('./de.yaml?raw').then((m) => m.default),
  ko: () => import('./ko.yaml?raw').then((m) => m.default),
  ja: () => import('./ja.yaml?raw').then((m) => m.default),
  zh: () => import('./zh.yaml?raw').then((m) => m.default),
  ar: () => import('./ar.yaml?raw').then((m) => m.default),
  he: () => import('./he.yaml?raw').then((m) => m.default),
};

const loaded = new Set<string>(['en']);

export async function loadLocaleMessages(i18n: MpI18n, locale: string): Promise<void> {
  if (loaded.has(locale)) return;
  const loader = localeLoaders[locale];
  if (!loader) return;
  const source = await loader();
  // The bundle is grouped by `mp.<workspace>` namespace; register each namespace
  // separately so the lazily-loaded locale layers onto the matching namespace.
  const bundles = (yaml.load(source) ?? {}) as Record<string, MpMessageObject>;
  for (const [namespace, messages] of Object.entries(bundles)) {
    // Deep-merge so nested keys (e.g. `faq.items.*`) register correctly.
    i18n.addResourceBundle(locale, namespace, messages, true, true);
  }
  loaded.add(locale);
}
