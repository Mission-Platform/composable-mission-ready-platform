import i18next, { type i18n as I18nInstance, type InitOptions, type Resource } from 'i18next';

import { deepMergeLocales, mergeLocales } from './merge-locales';

import type { MpLocaleModule, MpLocales, MpMessageObject, MpNamespaceLocales } from './types';

/**
 * Default i18next namespace messages are registered under when no explicit
 * `namespace` is given. Standalone usage (`createMpI18n({ messages })`) keeps
 * resolving nested keys (`nav.notes`) without spelling out a namespace.
 */
export const MP_DEFAULT_NAMESPACE = 'translation';

/**
 * The reserved prefix for every Mission Platform i18next namespace. Packages
 * live under `mp.<package_name>` and apps under `mp.<app_name>`.
 */
export const MP_NAMESPACE_PREFIX = 'mp';

/**
 * Builds a Mission Platform i18next namespace for a workspace, e.g.
 * `mpNamespace('breakpoints')` → `'mp.breakpoints'`,
 * `mpNamespace('my-care-notes')` → `'mp.my-care-notes'`.
 *
 * The `name` is the workspace's unscoped package name (the directory under
 * `apps/`, `packages/`, …), without the `@mission-platform/` scope.
 */
export function mpNamespace(name: string): string {
  return `${MP_NAMESPACE_PREFIX}.${name}`;
}

/**
 * Converts a single-locale, namespace-keyed bundle map — the shape the i18n
 * extractor emits into each app's runtime `src/locales/<locale>.yaml`
 * (`{ 'mp.<workspace>': messages }`) — into the per-namespace, per-locale shape
 * the {@link CreateMpI18nOptions.namespaces} (and `overrides`) option expects
 * (`{ 'mp.<workspace>': { [locale]: messages } }`).
 *
 * @example
 * const enBundles = yaml.load(enLocaleSource) // { 'mp.breakpoints': {...}, 'mp.my-care-notes': {...} }
 * createMpI18n({
 *   namespace: mpNamespace('my-care-notes'),
 *   namespaces: localeNamespaces('en', enBundles),
 * })
 */
export function localeNamespaces(locale: string, bundles: Record<string, MpMessageObject>): MpNamespaceLocales {
  return Object.fromEntries(Object.entries(bundles).map(([ns, msgs]) => [ns, { [locale]: msgs }]));
}

/** Options accepted by {@link createMpI18n}. */
export interface CreateMpI18nOptions {
  /** Active locale. Defaults to `'en'`. */
  locale?: string;
  /** Fallback locale (or `false` to disable). Defaults to `'en'`. */
  fallbackLocale?: string | readonly string[] | false;
  /** Optional locale modules merged left-to-right into the default namespace. */
  modules?: MpLocaleModule[];
  /** Low-level per-locale overrides applied after all modules to the default namespace. */
  messages?: MpLocales;
  /**
   * The default namespace `modules`/`messages` are registered under and the one
   * `t()` resolves against first. Defaults to `'translation'`. Apps should pass
   * their own `mpNamespace('<app-name>')`.
   */
  namespace?: string;
  /**
   * Per-namespace locale bundles, keyed by namespace (`mp.<workspace>`). Each
   * package/app's strings live under its own `mp.<name>` namespace; the default
   * namespace falls back to these so component code keeps resolving keys it
   * owns.
   */
  namespaces?: MpNamespaceLocales;
  /**
   * Per-namespace overrides, keyed by namespace (`mp.<workspace>`). Deep-merged
   * on top of the matching namespace's own strings, so an app can override just
   * the keys it needs (e.g. relabel a `@mission-platform/components` string)
   * while keeping the rest of the package's bundle.
   */
  overrides?: MpNamespaceLocales;
  /** Escape hatch for any additional i18next `InitOptions`. */
  init?: Partial<InitOptions>;
}

/**
 * Creates a configured, framework-agnostic [i18next](https://www.i18next.com/)
 * instance for Mission Platform.
 *
 * The returned instance is plain i18next — it carries no framework binding, so
 * it can be paired with the Vue adapter (`@mission-platform/i18n/vue`), the
 * React adapter (`@mission-platform/i18n/react`), or used directly.
 *
 * Interpolation is configured with single-brace delimiters (`{name}`) to match
 * the locale strings authored across the platform, and HTML escaping is left to
 * the rendering framework (`escapeValue: false`).
 *
 * Strings are grouped into i18next namespaces: each package and app owns a
 * `mp.<workspace>` namespace (see {@link mpNamespace}). The default namespace
 * (an app's own `mp.<app>`) falls back to every other registered namespace, so
 * component code resolves keys it owns without spelling out a namespace, while
 * apps can deep-merge per-namespace `overrides` on top of a package's strings.
 *
 * @example
 * // Framework-neutral usage
 * import { createMpI18n } from '@mission-platform/i18n'
 *
 * const i18n = createMpI18n({ messages: { en: { hello: 'Hello {name}' } } })
 * i18n.t('hello', { name: 'World' }) // → 'Hello World'
 *
 * @example
 * // Namespaced usage with an app overriding a package's string
 * import { createMpI18n, mpNamespace } from '@mission-platform/i18n'
 *
 * const i18n = createMpI18n({
 *   namespace: mpNamespace('my-care-notes'),
 *   namespaces: {
 *     [mpNamespace('my-care-notes')]: { en: { nav: { notes: 'Notes' } } },
 *     [mpNamespace('breakpoints')]: { en: { breakpoint: 'breakpoint:' } },
 *   },
 *   overrides: {
 *     [mpNamespace('breakpoints')]: { en: { breakpoint: 'Viewport:' } },
 *   },
 * })
 */
export function createMpI18n(options: CreateMpI18nOptions = {}): I18nInstance {
  const {
    locale = 'en',
    fallbackLocale = 'en',
    modules = [],
    messages = {},
    namespace = MP_DEFAULT_NAMESPACE,
    namespaces = {},
    overrides = {},
    init = {},
  } = options;

  // namespace → locale → messages, layered in priority order.
  const byNamespace: MpNamespaceLocales = {};
  const mergeInto = (ns: string, locales: MpLocales): void => {
    byNamespace[ns] = deepMergeLocales(byNamespace[ns] ?? {}, locales);
  };

  // 1. Explicit per-namespace bundles.
  for (const [ns, locales] of Object.entries(namespaces)) {
    mergeInto(ns, locales);
  }

  // 2. Legacy `modules` + `messages`, layered into the default namespace.
  const defaultMerged = mergeLocales(modules);
  for (const [loc, msgs] of Object.entries(messages)) {
    defaultMerged[loc] = { ...defaultMerged[loc], ...(msgs as MpMessageObject) };
  }
  if (Object.keys(defaultMerged).length > 0) {
    mergeInto(namespace, defaultMerged);
  }

  // 3. Per-namespace overrides, deep-merged on top so apps win key-by-key.
  for (const [ns, locales] of Object.entries(overrides)) {
    mergeInto(ns, locales);
  }

  // Always register the default namespace, even if it has no strings yet.
  byNamespace[namespace] ??= {};

  // i18next groups messages per locale under a namespace.
  const resources: Resource = {};
  for (const [ns, locales] of Object.entries(byNamespace)) {
    for (const [loc, msgs] of Object.entries(locales)) {
      (resources[loc] ??= {})[ns] = msgs;
    }
  }

  const allNamespaces = Object.keys(byNamespace);
  // The default namespace falls back to every other namespace so an app's
  // `t('breakpoint')` still resolves a `mp.breakpoints` key it doesn't own.
  const fallbackNamespaces = allNamespaces.filter((ns) => ns !== namespace);

  const instance = i18next.createInstance();

  // Inline resources initialise synchronously, so `t()` is usable immediately
  // (important for SSR/SSG). Any backend/async plugin is opt-in via `init`.
  void instance.init({
    lng: locale,
    fallbackLng: fallbackLocale,
    defaultNS: namespace,
    ns: allNamespaces,
    fallbackNS: fallbackNamespaces.length > 0 ? fallbackNamespaces : undefined,
    resources,
    interpolation: { prefix: '{', suffix: '}', escapeValue: false },
    returnNull: false,
    ...init,
  });

  return instance;
}
