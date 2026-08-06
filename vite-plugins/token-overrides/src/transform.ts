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

/** Type guard: is `value` a scheme-aware `{ light, dark }` pair? */
function isLightDarkValue(value: unknown): value is LightDarkValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    'light' in (value as Record<string, unknown>) &&
    'dark' in (value as Record<string, unknown>)
  );
}

/** Type guard: is `value` an override leaf token (carries a `$value`)? */
function isOverrideToken(value: unknown): value is OverrideToken {
  return typeof value === 'object' && value !== null && '$value' in (value as Record<string, unknown>);
}

/** Format an override `$value` as a CSS literal. */
function formatOverrideValue(value: OverrideValue): string {
  if (isLightDarkValue(value)) return `light-dark(${value.light}, ${value.dark})`;
  return String(value);
}

/**
 * Recursively flatten an override document into {@link FlatOverride}s. Keys that
 * start with `$` (DTCG metadata) are skipped; every remaining leaf becomes a
 * `--<prefix>-<path-joined-by-dashes>` custom property.
 */
export function flattenOverrides(document_: OverrideGroup, prefix = 'mp'): FlatOverride[] {
  const overrides: FlatOverride[] = [];
  const walk = (node: OverrideGroup, segments: string[]): void => {
    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith('$')) continue;
      const path = [...segments, key];
      if (isOverrideToken(child)) {
        overrides.push({
          name: `--${prefix}-${path.join('-')}`,
          value: formatOverrideValue(child.$value),
          description: child.$description,
        });
      } else if (typeof child === 'object' && child !== null) {
        walk(child as OverrideGroup, path);
      }
    }
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
  const declarations = flattenOverrides(document_, prefix).flatMap((override) => {
    const line = `  ${override.name}: ${override.value};`;
    return override.description ? [`  /* ${override.description} */`, line] : [line];
  });
  return `${header}\n\n:root {\n${declarations.join('\n')}\n}\n`;
}
