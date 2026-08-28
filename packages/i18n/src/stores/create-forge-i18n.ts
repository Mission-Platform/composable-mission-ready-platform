// ─── @mission-platform/i18n ──────────────────────────────────────────────────
// Framework-neutral i18next instance factory plus the server-side request
// context store used by the framework adapters for SSR-safe resolution.

import i18next, { type i18n as I18nInstance, type InitOptions, type Resource } from 'i18next';

import { deepMergeLocales, mergeLocales } from '../utils/merge-locales';
import { FORGE_DEFAULT_NAMESPACE } from '../utils/namespace';

// Type-only import: fully erased at compile time, so it never reaches the
// browser bundle where Vite externalizes `node:async_hooks`.
import type {
  ForgeI18nInstance,
  ForgeLocaleModule,
  ForgeLocales,
  ForgeMessageObject,
  ForgeNamespaceLocales,
} from '../utils/types';
import type { AsyncLocalStorage as AsyncLocalStorageType } from 'node:async_hooks';

let serverI18nStorage: AsyncLocalStorageType<I18nInstance> | undefined;

/**
 * Lazily loads `node:async_hooks` on the server only.
 *
 * A static named import (`import { AsyncLocalStorage } from 'node:async_hooks'`)
 * makes bundlers such as Vite externalize the module for the browser and hoist
 * the property access above any guard, throwing at module load in client code.
 * Restricting the access to non-browser environments and using a dynamic import
 * keeps `node:async_hooks` out of the browser's module graph entirely, while the
 * server (Node, Cloudflare Workers with `nodejs_compat`) still gets real
 * request-scoped isolation via `AsyncLocalStorage`.
 */
async function initServerI18nStorage(): Promise<void> {
  if (globalThis.window !== undefined || serverI18nStorage) {
    return;
  }
  try {
    const { AsyncLocalStorage } = await import('node:async_hooks');
    serverI18nStorage = new AsyncLocalStorage<I18nInstance>();
  } catch {
    // Ignored in environments without node:async_hooks; the global fallback is used instead.
  }
}

// Kick off server-side storage initialisation. In the browser this returns
// immediately without touching `node:async_hooks`.
await initServerI18nStorage();

let globalServerI18n: I18nInstance | undefined;

/**
 * Configures the global fallback server-side i18n instance.
 */
export function setServerI18n(i18n: I18nInstance): void {
  globalServerI18n = i18n;
}

/**
 * Retrieves the current server-side i18n instance from request context (AsyncLocalStorage),
 * falling back to the configured global server instance if set.
 */
export function getServerI18n(): I18nInstance | undefined {
  return serverI18nStorage?.getStore() ?? globalServerI18n;
}

/**
 * Runs a callback within a request-scoped i18n context on the server.
 */
export function runWithI18n<T>(i18n: I18nInstance, callback: () => T): T {
  if (serverI18nStorage) {
    return serverI18nStorage.run(i18n, callback);
  }
  const previous = globalServerI18n;
  try {
    globalServerI18n = i18n;
    return callback();
  } finally {
    globalServerI18n = previous;
  }
}

/** Options accepted by {@link createForgeI18N}. */
export interface CreateForgeI18NOptions {
  /** Active locale. Defaults to `'en'`. */
  locale?: string;
  /** Fallback locale (or `false` to disable). Defaults to `'en'`. */
  fallbackLocale?: string | readonly string[] | false;
  /** Optional locale modules merged left-to-right into the default namespace. */
  modules?: ForgeLocaleModule[];
  /** Low-level per-locale overrides applied after all modules to the default namespace. */
  messages?: ForgeLocales;
  /**
   * The default namespace `modules`/`messages` are registered under and the one
   * `t()` resolves against first. Defaults to `'translation'`. Apps should pass
   * their own `forgeNamespace('<app-name>')`.
   */
  namespace?: string;
  /**
   * Per-namespace locale bundles, keyed by namespace (`mp.<workspace>`). Each
   * package/app's strings live under its own `mp.<name>` namespace; the default
   * namespace falls back to these so component code keeps resolving keys it
   * owns.
   */
  namespaces?: ForgeNamespaceLocales;
  /**
   * Per-namespace overrides, keyed by namespace (`mp.<workspace>`). Deep-merged
   * on top of the matching namespace's own strings, so an app can override just
   * the keys it needs (e.g. relabel a `@mission-platform/components` string)
   * while keeping the rest of the package's bundle.
   */
  overrides?: ForgeNamespaceLocales;
  /**
   * Resource bundles in i18next shape (`{ [locale]: { [namespace]: messages } }`),
   * e.g. imported directly from `virtual:i18n-resources`.
   */
  resources?: Resource;
  /** Escape hatch for any additional i18next `InitOptions`. */
  init?: Partial<InitOptions>;
}

/**
 * Creates a configured, framework-agnostic [i18next](https://www.i18next.com/)
 * instance for Mission Platform.
 *
 * The returned instance is plain i18next — it carries no framework binding, so
 * it can be paired with the Vue adapter (the `mp:vue` build of
 * `@mission-platform/i18n`), the React adapter (`mp:react`), or used directly.
 *
 * Interpolation is configured with single-brace delimiters (`{name}`) to match
 * the locale strings authored across the platform, and HTML escaping is left to
 * the rendering framework (`escapeValue: false`).
 *
 * Strings are grouped into i18next namespaces: each package and app owns a
 * `mp.<workspace>` namespace (see {@link forgeNamespace}). The default namespace
 * (an app's own `mp.<app>`) falls back to every other registered namespace, so
 * component code resolves keys it owns without spelling out a namespace, while
 * apps can deep-merge per-namespace `overrides` on top of a package's strings.
 *
 * @example
 * // Framework-neutral usage
 * import { createForgeI18N } from '@mission-platform/i18n'
 *
 * const i18n = createForgeI18N({ messages: { en: { hello: 'Hello {name}' } } })
 * i18n.t('hello', { name: 'World' }) // → 'Hello World'
 *
 * @example
 * // Namespaced usage with an app overriding a package's string
 * import { createForgeI18N, forgeNamespace } from '@mission-platform/i18n'
 *
 * const i18n = createForgeI18N({
 *   namespace: forgeNamespace('my-care-notes'),
 *   namespaces: {
 *     [forgeNamespace('my-care-notes')]: { en: { nav: { notes: 'Notes' } } },
 *     [forgeNamespace('breakpoints')]: { en: { breakpoint: 'breakpoint:' } },
 *   },
 *   overrides: {
 *     [forgeNamespace('breakpoints')]: { en: { breakpoint: 'Viewport:' } },
 *   },
 * })
 */
export function createForgeI18N(options: CreateForgeI18NOptions = {}): ForgeI18nInstance {
  const {
    locale = 'en',
    fallbackLocale = 'en',
    modules = [],
    messages = {},
    namespace = FORGE_DEFAULT_NAMESPACE,
    namespaces = {},
    overrides = {},
    resources: rawResources = {},
    init = {},
  } = options;

  // namespace → locale → messages, layered in priority order.
  const byNamespace: ForgeNamespaceLocales = {};
  const mergeInto = (ns: string, locales: ForgeLocales): void => {
    byNamespace[ns] = deepMergeLocales(byNamespace[ns] ?? {}, locales);
  };

  // 1. Explicit per-locale, per-namespace `resources` map (e.g. from `virtual:i18n-resources`).
  for (const [loc, nsMap] of Object.entries(rawResources)) {
    if (nsMap && typeof nsMap === 'object') {
      for (const [ns, msgs] of Object.entries(nsMap)) {
        if (msgs && typeof msgs === 'object') {
          mergeInto(ns, { [loc]: msgs as ForgeMessageObject });
        }
      }
    }
  }

  // 2. Explicit per-namespace bundles.
  for (const [ns, locales] of Object.entries(namespaces)) {
    mergeInto(ns, locales);
  }

  // 3. Legacy `modules` + `messages`, layered into the default namespace.
  const defaultMerged = mergeLocales(modules);
  for (const [loc, msgs] of Object.entries(messages)) {
    defaultMerged[loc] = { ...defaultMerged[loc], ...(msgs as ForgeMessageObject) };
  }
  if (Object.keys(defaultMerged).length > 0) {
    mergeInto(namespace, defaultMerged);
  }

  // 4. Per-namespace overrides, deep-merged on top so apps win key-by-key.
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

  if (!globalServerI18n) {
    setServerI18n(instance);
  }

  return instance as ForgeI18nInstance;
}
