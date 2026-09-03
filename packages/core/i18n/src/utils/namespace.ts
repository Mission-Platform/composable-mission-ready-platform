// ─── @mission-platform/i18n ──────────────────────────────────────────────────
// Namespace helpers for the Mission Platform i18next integration.

import type { ForgeMessageObject, ForgeNamespaceLocales } from './types';

/**
 * Default i18next namespace messages are registered under when no explicit
 * `namespace` is given. Standalone usage (`createForgeI18N({ messages })`) keeps
 * resolving nested keys (`nav.notes`) without spelling out a namespace.
 */
export const FORGE_DEFAULT_NAMESPACE = 'translation';

/**
 * The reserved prefix for every Mission Platform i18next namespace. Packages
 * live under `mp.<package_name>` and apps under `mp.<app_name>`.
 */
export const FORGE_NAMESPACE_PREFIX = 'mp';

/**
 * Builds a Mission Platform i18next namespace for a workspace, e.g.
 * `forgeNamespace('breakpoints')` → `'mp.breakpoints'`,
 * `forgeNamespace('my-care-notes')` → `'mp.my-care-notes'`.
 *
 * The `name` is the workspace's unscoped package name (the directory under
 * `apps/`, `packages/`, …), without the `@mission-platform/` scope.
 */
export function forgeNamespace(name: string): string {
  return `${FORGE_NAMESPACE_PREFIX}.${name}`;
}

/**
 * Converts a single-locale, namespace-keyed bundle map — the shape the i18n
 * extractor emits into each app's runtime `src/locales/<locale>.yaml`
 * (`{ 'mp.<workspace>': messages }`) — into the per-namespace, per-locale shape
 * the {@link CreateForgeI18NOptions.namespaces} (and `overrides`) option expects
 * (`{ 'mp.<workspace>': { [locale]: messages } }`).
 *
 * @example
 * const enBundles = yaml.load(enLocaleSource) // { 'mp.breakpoints': {...}, 'mp.my-care-notes': {...} }
 * createForgeI18N({
 *   namespace: forgeNamespace('my-care-notes'),
 *   namespaces: localeNamespaces('en', enBundles),
 * })
 */
export function localeNamespaces(locale: string, bundles: Record<string, ForgeMessageObject>): ForgeNamespaceLocales {
  return Object.fromEntries(Object.entries(bundles).map(([ns, msgs]) => [ns, { [locale]: msgs }]));
}
