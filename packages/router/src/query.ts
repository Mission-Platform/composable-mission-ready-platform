// ─── @mission-platform/router ────────────────────────────────────────────────
// Framework-neutral query-string parsing and serialisation.

import type { MpQueryInput, MpQueryParameters } from './types';

/** Decode a query key or value, treating `+` as a space. */
function decode(value: string): string {
  try {
    return decodeURIComponent(value.replaceAll('+', ' '));
  } catch {
    return value;
  }
}

/** Encode a query key or value. */
function encode(value: string): string {
  return encodeURIComponent(value);
}

/**
 * Parse a query string into a {@link MpQueryParameters} map. A leading `?` is
 * optional. Repeated keys collapse into an array of values, in order.
 *
 * @example
 * parseQuery('?tag=a&tag=b&page=2') // → { tag: ['a', 'b'], page: '2' }
 */
export function parseQuery(search: string): MpQueryParameters {
  const query: MpQueryParameters = {};
  const trimmed = search.startsWith('?') ? search.slice(1) : search;
  if (trimmed === '') {
    return query;
  }

  for (const pair of trimmed.split('&')) {
    if (pair === '') {
      continue;
    }
    const equals = pair.indexOf('=');
    const key = decode(equals === -1 ? pair : pair.slice(0, equals));
    const value = equals === -1 ? '' : decode(pair.slice(equals + 1));

    const existing = query[key];
    if (existing === undefined) {
      query[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      query[key] = [existing, value];
    }
  }

  return query;
}

/**
 * Serialise a {@link MpQueryInput} map into a query string with a leading `?`,
 * or an empty string when there is nothing to serialise. `null`/`undefined`
 * values (and array items) are dropped; arrays emit one `key=value` pair each.
 *
 * @example
 * stringifyQuery({ tag: ['a', 'b'], page: 2 }) // → '?tag=a&tag=b&page=2'
 * stringifyQuery({})                            // → ''
 */
export function stringifyQuery(query: MpQueryInput): string {
  const parts: string[] = [];

  for (const key of Object.keys(query)) {
    const value = query[key];
    if ((value ?? undefined) === undefined) {
      continue;
    }
    const encodedKey = encode(key);
    const values = Array.isArray(value) ? value : [value];
    for (const item of values) {
      if ((item ?? undefined) === undefined) {
        continue;
      }
      parts.push(`${encodedKey}=${encode(String(item))}`);
    }
  }

  return parts.length > 0 ? `?${parts.join('&')}` : '';
}
