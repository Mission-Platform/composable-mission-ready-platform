// ─── @mission-platform/router ────────────────────────────────────────────────
// Framework-neutral URL <-> location-parts helpers.

import { normalizePath } from './path';
import { parseQuery, stringifyQuery } from './query';

import type { MpQueryInput, MpQueryParameters } from './types';

/** The decomposed parts of a URL: pathname, query, and hash. */
export interface MpLocationParts {
  /** The normalised pathname (always leading-slash, no trailing slash). */
  path: string;
  /** The parsed query parameters. */
  query: MpQueryParameters;
  /** The hash fragment including the leading `#`, or an empty string. */
  hash: string;
}

/** Normalise a hash fragment to include a single leading `#`, or be empty. */
export function normalizeHash(hash: string): string {
  if (hash === '' || hash === '#') {
    return '';
  }
  return hash.startsWith('#') ? hash : `#${hash}`;
}

/**
 * Split an app-relative URL into its {@link MpLocationParts}.
 *
 * @example
 * parseLocation('/users/42?tab=info#bio')
 * // → { path: '/users/42', query: { tab: 'info' }, hash: '#bio' }
 */
export function parseLocation(url: string): MpLocationParts {
  let rest = url;

  let hash = '';
  const hashIndex = rest.indexOf('#');
  if (hashIndex !== -1) {
    hash = rest.slice(hashIndex);
    rest = rest.slice(0, hashIndex);
  }

  let search = '';
  const queryIndex = rest.indexOf('?');
  if (queryIndex !== -1) {
    search = rest.slice(queryIndex);
    rest = rest.slice(0, queryIndex);
  }

  return {
    path: normalizePath(rest),
    query: parseQuery(search),
    hash,
  };
}

/** A location described by its parts, with query/hash optional. */
export interface MpLocationInput {
  path: string;
  query?: MpQueryInput;
  hash?: string;
}

/**
 * Assemble an app-relative URL string from location parts. The pathname is
 * normalised, the query serialised (with a leading `?` when non-empty), and the
 * hash prefixed with `#` when non-empty.
 *
 * @example
 * stringifyLocation({ path: '/users/42', query: { tab: 'info' }, hash: 'bio' })
 * // → '/users/42?tab=info#bio'
 */
export function stringifyLocation(location: MpLocationInput): string {
  const path = normalizePath(location.path);
  const search = location.query ? stringifyQuery(location.query) : '';
  const hash = normalizeHash(location.hash ?? '');
  return `${path}${search}${hash}`;
}
