// ─── @mission-platform/router ────────────────────────────────────────────────
// Framework-neutral path pattern compilation, matching, and building.
//
// Patterns use a small, portable grammar shared by every adapter:
//   • `:name`  — a required dynamic segment (matches a single path segment)
//   • `:name?` — an optional dynamic segment
//   • `:name*` — zero or more segments (repeatable / catch-all)
//   • `:name+` — one or more segments (repeatable / catch-all)
//   • `*`      — a standalone catch-all, captured under the `pathMatch` key

import type { MpParameterValue, MpRouteParameters } from './types';

/** Matches a `:name`, constrained `:name(pattern)`, and its modifier. */
const SEGMENT_PARAMETER = /^:([A-Za-z0-9_]+)(?:\((.*)\))?([?*+]?)$/;

/** The key a standalone `*` catch-all segment is captured under. */
export const WILDCARD_PARAM_KEY = 'pathMatch';

/** A single parameter key extracted from a compiled path pattern. */
export interface MpPathParameterKey {
  /** The parameter name (without the leading `:`). */
  name: string;
  /** Whether the segment may be omitted (`:name?` / `:name*`). */
  optional: boolean;
  /** Whether the segment captures one or more path segments (`:name*` / `:name+` / `*`). */
  repeatable: boolean;
  /** Optional inline regular-expression constraint for this parameter. */
  pattern?: string;
}

/** The result of compiling a path pattern into a matcher. */
export interface MpCompiledPath {
  /** The normalised source pattern (always with a leading `/`). */
  pattern: string;
  /** The ordered parameter keys captured by {@link MpCompiledPath.regexp}. */
  keys: MpPathParameterKey[];
  /** A regular expression matching a pathname against the pattern. */
  regexp: RegExp;
}

/** Escape a literal path segment for safe inclusion in a RegExp. */
function escapeRegExp(value: string): string {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

/**
 * Normalise a path pattern (or pathname) to a canonical, leading-slash form
 * with no trailing slash (except the root, which stays `/`).
 */
export function normalizePath(path: string): string {
  const withLeading = path.startsWith('/') ? path : `/${path}`;
  if (withLeading === '/') {
    return '/';
  }
  return withLeading.replaceAll(/\/+$/g, '') || '/';
}

/**
 * Compile a path pattern into a {@link MpCompiledPath} with the ordered
 * parameter keys and a matching regular expression.
 *
 * @example
 * compilePath('/users/:id').regexp.test('/users/42') // → true
 */
export function compilePath(pattern: string): MpCompiledPath {
  const normalized = normalizePath(pattern);
  const segments = normalized.split('/').filter((segment) => segment.length > 0);
  const keys: MpPathParameterKey[] = [];

  let source = '^';
  for (const segment of segments) {
    if (segment === '*') {
      keys.push({ name: WILDCARD_PARAM_KEY, optional: true, repeatable: true });
      source += '(?:/(.*))?';
      continue;
    }

    const match = SEGMENT_PARAMETER.exec(segment);
    if (match) {
      const [, name, pattern, modifier] = match;
      const optional = modifier === '?' || modifier === '*';
      const repeatable = modifier === '*' || modifier === '+';
      keys.push({ name, optional, repeatable, ...(pattern === undefined ? {} : { pattern }) });
      const segmentPattern = pattern ?? (repeatable ? '.+' : '[^/]+');
      if (repeatable) {
        source += optional ? `(?:/(${segmentPattern}))?` : `/(${segmentPattern})`;
      } else {
        source += optional ? `(?:/(${segmentPattern}))?` : `/(${segmentPattern})`;
      }
      continue;
    }

    source += `/${escapeRegExp(segment)}`;
  }
  source += '/?$';

  return { pattern: normalized, keys, regexp: new RegExp(source) };
}

/** Decode a captured value, falling back to the raw value on malformed input. */
function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Match a pathname against a pattern, returning the extracted parameters or
 * `undefined` if the pathname does not match.
 *
 * @example
 * matchPath('/users/:id', '/users/42') // → { id: '42' }
 * matchPath('/users/:id', '/posts/42') // → undefined
 */
export function matchPath(pattern: string, pathname: string): MpRouteParameters | undefined {
  const { keys, regexp } = compilePath(pattern);
  const cleaned = normalizePath(pathname.split('#')[0].split('?')[0]);
  const match = regexp.exec(cleaned);
  if (!match) {
    return undefined;
  }

  const parameters: MpRouteParameters = {};
  for (const [index, key] of keys.entries()) {
    const raw = match[index + 1];
    if (raw === undefined) {
      continue;
    }
    parameters[key.name] = key.repeatable ? raw.split('/').map((part) => safeDecode(part)) : safeDecode(raw);
  }
  return parameters;
}

/** Encode a single, non-repeatable path segment value. */
function encodeSegment(value: MpParameterValue): string {
  return encodeURIComponent(String(value));
}

/** Encode a repeatable (catch-all) value, preserving its `/` separators. */
function encodeRepeatable(value: MpParameterValue | readonly MpParameterValue[]): string {
  const parts = Array.isArray(value) ? value : String(value).split('/');
  return parts
    .filter((part) => (part ?? undefined) !== undefined && part !== '')
    .map((part) => encodeURIComponent(String(part)))
    .join('/');
}

/** Whether a parameter value should be treated as absent. */
function isEmpty(value: MpParameterValue | readonly MpParameterValue[]): boolean {
  return (value ?? undefined) === undefined || value === '' || (Array.isArray(value) && value.length === 0);
}

/**
 * Build a concrete pathname from a pattern and a set of parameters, encoding
 * each value. Optional segments are dropped when their value is absent; a
 * missing required parameter throws.
 *
 * @example
 * buildPath('/users/:id', { id: 42 })            // → '/users/42'
 * buildPath('/users/:id?', {})                   // → '/users'
 * buildPath('/files/:rest*', { rest: ['a', 'b'] }) // → '/files/a/b'
 */
export function buildPath(
  pattern: string,
  parameters: Record<string, MpParameterValue | readonly MpParameterValue[]> = {},
): string {
  const normalized = normalizePath(pattern);
  const segments = normalized.split('/').filter((segment) => segment.length > 0);
  const out: string[] = [];

  for (const segment of segments) {
    if (segment === '*') {
      const value = parameters[WILDCARD_PARAM_KEY];
      if (!isEmpty(value)) {
        out.push(encodeRepeatable(value));
      }
      continue;
    }

    const match = SEGMENT_PARAMETER.exec(segment);
    if (!match) {
      out.push(segment);
      continue;
    }

    const [, name, , modifier] = match;
    const optional = modifier === '?' || modifier === '*';
    const repeatable = modifier === '*' || modifier === '+';
    const value = parameters[name];

    if (isEmpty(value)) {
      if (optional) {
        continue;
      }
      throw new Error(`Missing required route parameter "${name}" for path "${pattern}"`);
    }

    out.push(repeatable ? encodeRepeatable(value) : encodeSegment(value as MpParameterValue));
  }

  return `/${out.join('/')}`;
}
