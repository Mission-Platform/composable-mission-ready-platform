/**
 * Design-token *override* transform.
 *
 * Turns a DTCG-style override document (a nested tree of `{ $value, $description? }`
 * leaves grouped by category) into an SCSS/CSS `:root { --<prefix>-*: <value>; }`
 * partial that can be imported *after* `@mission-platform/tokens` to re-skin an
 * app without touching the shared token package.
 *
 * This is intentionally lightweight and override-focused: unlike the full
 * `@mission-platform/vite-plugin-tokens` generator it does **not** resolve palette
 * aliases, emit `$`-variables, or register `@property` rules (the base tokens
 * package already does all of that). It only flattens the override leaves to
 * custom-property declarations that win the cascade.
 *
 * Value handling:
 *   - a `{ light, dark }` object → `light-dark(<light>, <dark>)` (scheme-aware, like
 *     the base semantic colour tokens);
 *   - any other scalar (hex, rem, a shadow list, a font-family stack, a number) →
 *     emitted verbatim.
 */

/** A colour (or any value) that differs between the light and dark colour schemes. */
export interface LightDarkValue {
  light: string;
  dark: string;
}

/** A single override `$value` — a scalar or a scheme-aware `{ light, dark }` pair. */
export type OverrideValue = string | number | LightDarkValue;

/** A DTCG-style override leaf token. */
export interface OverrideToken {
  $value: OverrideValue;
  $description?: string;
}

/** A DTCG-style override group node (nested groups/tokens plus optional `$`-metadata). */
export type OverrideGroup = Record<string, unknown>;

/** A flattened override ready to emit as a single custom-property declaration. */
export interface FlatOverride {
  /** Full custom-property name, e.g. `--mp-color-primary-default`. */
  name: string;
  /** Formatted CSS value, e.g. `light-dark(#8b7ff0, #a99cf5)` or `2px`. */
  value: string;
  /** Optional DTCG `$description`, emitted as a comment. */
  description?: string;
}

type RuntimeRecord = Record<string, unknown>;

function isRuntimeRecord(value: unknown): value is RuntimeRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/** Type guard: is `value` an override leaf token (carries a `$value`)? */
function isOverrideToken(value: unknown): value is OverrideToken & RuntimeRecord {
  return isRuntimeRecord(value) && Object.hasOwn(value, '$value');
}

function invalid(path: string, reason: string): never {
  throw new Error(`Invalid token override${path ? ` at ${path}` : ''}: ${reason}.`);
}

const SAFE_PROPERTY_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const UNSAFE_CSS_FRAGMENT = /[\u0000-\u001F\u007F-\u009F;{}]|\/\*|\*\//u;
const UNSAFE_CSS_COMMENT = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]|\/\*|\*\//u;

function validatePropertySegment(value: unknown, path: string): asserts value is string {
  if (typeof value !== 'string' || !SAFE_PROPERTY_SEGMENT.test(value)) {
    invalid(
      path,
      'expected a non-empty CSS identifier segment containing only letters, numbers, underscores, and hyphens',
    );
  }
}

function validateCssFragment(value: unknown, path: string, allowEmpty = false): asserts value is string {
  if (typeof value !== 'string' || (!allowEmpty && value.trim() === '')) {
    invalid(path, 'expected a non-empty CSS fragment');
  }
  if (UNSAFE_CSS_FRAGMENT.test(value)) {
    invalid(path, 'contains a control character or CSS comment, block, or declaration delimiter');
  }
}

function validateCssComment(value: unknown, path: string): asserts value is string {
  if (typeof value !== 'string') invalid(path, 'expected a string');
  if (UNSAFE_CSS_COMMENT.test(value)) {
    invalid(path, 'contains a control character or CSS comment delimiter');
  }
}

function formatOverrideValue(value: unknown, path: string): string {
  if (isRuntimeRecord(value)) {
    const keys = Object.keys(value);
    if (
      !Object.hasOwn(value, 'light') ||
      !Object.hasOwn(value, 'dark') ||
      keys.some((key) => key !== 'light' && key !== 'dark')
    ) {
      invalid(path, 'expected a scalar or an object containing only string `light` and `dark` values');
    }
    validateCssFragment(value.light, `${path}.light`);
    validateCssFragment(value.dark, `${path}.dark`);
    return `light-dark(${value.light}, ${value.dark})`;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) invalid(path, 'expected a finite number');
    return String(value);
  }
  validateCssFragment(value, path);
  return value;
}

function validateHeader(header: unknown): asserts header is string {
  if (typeof header !== 'string') invalid('header', 'expected a string');
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/u.test(header)) {
    invalid('header', 'contains a control character');
  }
  // Headers are intentionally limited to whitespace and complete CSS block
  // comments so they cannot add declarations or at-rules before :root.
  if (!/^(?:[\t\n\r ]|\/\*(?:(?!\/\*|\*\/)[\s\S])*\*\/)*$/.test(header)) {
    invalid('header', 'must contain only whitespace and complete CSS block comments');
  }
}

/**
 * Recursively flatten an override document into {@link FlatOverride}s. Keys that
 * start with `$` (DTCG metadata) are skipped; every remaining leaf becomes a
 * `--<prefix>-<path-joined-by-dashes>` custom property. Component override
 * paths retain their `component.*` DTCG wrapper, but generated CSS omits that
 * wrapper (`component.button.*` becomes `--<prefix>-button-*`).
 */
export function flattenOverrides(document_: OverrideGroup, prefix = 'mp'): FlatOverride[] {
  validatePropertySegment(prefix, 'prefix');
  if (!isRuntimeRecord(document_)) invalid('', 'expected a JSON object at the document root');

  const overrides: FlatOverride[] = [];
  const ancestors = new Set<RuntimeRecord>();
  const walk = (node: OverrideGroup, segments: string[]): void => {
    if (ancestors.has(node)) invalid(segments.join('.'), 'circular group references are not supported');
    const nodePath = segments.join('.') || 'document';
    if (Object.hasOwn(node, '$value')) invalid(nodePath, '`$value` is only valid on a token leaf');
    for (const metadataKey of ['$description', '$schema']) {
      const metadataValue = node[metadataKey];
      if (metadataValue !== undefined && typeof metadataValue !== 'string') {
        invalid(`${nodePath}.${metadataKey}`, 'metadata must be a string');
      }
    }
    ancestors.add(node);
    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith('$')) continue;
      validatePropertySegment(key, [...segments, key].join('.'));
      const path = [...segments, key];
      if (isOverrideToken(child)) {
        const tokenPath = path.join('.');
        if (Object.keys(child).some((tokenKey) => !tokenKey.startsWith('$'))) {
          invalid(tokenPath, 'a token may contain only `$value` and `$` metadata properties');
        }
        const description = child.$description;
        if (description !== undefined) validateCssComment(description, `${tokenPath}.$description`);
        const cssPath = path[0] === 'component' ? path.slice(1) : path;
        if (cssPath.length === 0) invalid(tokenPath, 'component must contain a token path');
        overrides.push({
          name: `--${prefix}-${cssPath.join('-')}`,
          value: formatOverrideValue(child.$value, `${tokenPath}.$value`),
          description,
        });
      } else if (isRuntimeRecord(child)) {
        walk(child, path);
      } else {
        invalid(path.join('.'), 'expected a token or group object');
      }
    }
    ancestors.delete(node);
  };
  walk(document_, []);
  return overrides;
}

/** Options for {@link buildTokenOverrideScss}. */
export interface TokenOverrideScssOptions {
  /** Custom-property prefix (defaults to `mp`, matching `@mission-platform/tokens`). */
  prefix?: string;
  /** Leading comment header (a sensible "do not edit" banner is used when omitted). */
  header?: string;
}

const DEFAULT_HEADER = `/* Generated design-token override — do not edit by hand.
   Edit the source \`*.tokens.json\` and re-run the token-override transform. */`;

/**
 * Build an SCSS/CSS override partial: a single `:root { … }` block of
 * `--<prefix>-*` custom properties flattened from `document_`. Import it *after*
 * the base `@mission-platform/tokens` so the declarations win the cascade.
 */
export function buildTokenOverrideScss(document_: OverrideGroup, options: TokenOverrideScssOptions = {}): string {
  const { prefix = 'mp', header = DEFAULT_HEADER } = options;
  validateHeader(header);
  const declarations = flattenOverrides(document_, prefix).flatMap((override) => {
    const line = `  ${override.name}: ${override.value};`;
    return override.description ? [`  /* ${override.description} */`, line] : [line];
  });
  return `${header}\n\n:root {\n${declarations.join('\n')}\n}\n`;
}
