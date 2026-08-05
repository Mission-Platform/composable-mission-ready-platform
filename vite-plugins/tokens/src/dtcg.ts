// DTCG (https://www.designtokens.org/) parsing primitives shared by the SCSS and
// TypeScript emitters: type guards, the token flattener, naming helpers, value
// formatters, and alias resolution. No external CLI or schema library is used.

/** A DTCG colour value (`{ colorSpace, components, alpha? }`). */
export interface DtcgColorValue {
  colorSpace: string;
  components: number[];
  alpha?: number;
  hex?: string;
}

/** A DTCG leaf token (`{ $value, $type?, $description? }`). */
export interface DtcgToken {
  $value: unknown;
  $type?: string;
  $description?: string;
}

/** A DTCG group node (an object of nested groups/tokens plus `$`-metadata). */
export type DtcgGroup = Record<string, unknown>;

/** Type guard: is `value` a DTCG colour value (`{ colorSpace, components, … }`)? */
export const isColorValue = (value: unknown): value is DtcgColorValue =>
  typeof value === 'object' &&
  value !== null &&
  'colorSpace' in (value as Record<string, unknown>) &&
  'components' in (value as Record<string, unknown>);

/** Type guard: is `value` a DTCG leaf token (an object carrying a `$value`)? */
export const isToken = (value: unknown): value is DtcgToken =>
  typeof value === 'object' && value !== null && '$value' in (value as Record<string, unknown>);

/** A single resolved DTCG token, flattened out of its nested group. */
export interface TokenRecord {
  /** Token path segments, e.g. `['color', 'alert', '100']`. */
  path: string[];
  /** Top-level DTCG group key, e.g. `'color'`, `'font'`, `'border-width'`. */
  group: string;
  /** Resolved DTCG `$type` (inherited from the nearest ancestor group). */
  type?: string;
  /** Raw DTCG `$value`. */
  value: unknown;
  /** Optional DTCG `$description`. */
  description?: string;
}

/** Dashed token name (`color-alert-100`) used for SCSS/CSS variable names + sorting. */
export const dashedName = (record: TokenRecord): string => record.path.join('-');

/** Stable ASCII comparison of two tokens by their dashed name. */
export const compareTokens = (a: TokenRecord, b: TokenRecord): number => {
  const left = dashedName(a);
  const right = dashedName(b);
  return left < right ? -1 : left > right ? 1 : 0;
};

/** Title-case a group key for SCSS section headers (`border-width` → `Border Width`). */
export const groupLabel = (key: string): string =>
  key
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

/** camelCase a dashed string (`border-width` → `borderWidth`, `z-index` → `zIndex`). */
export function camelCase(dashed: string): string {
  const [first, ...rest] = dashed.split('-');
  return [first, ...rest.map((part) => part.charAt(0).toUpperCase() + part.slice(1))].join('');
}

/** camelCase identifier for a token (`border-width-heavy` → `borderWidthHeavy`). */
export const camelCaseName = (record: TokenRecord): string => camelCase(dashedName(record));

/**
 * Deep merge two DTCG groups. Objects are merged recursively; scalar values
 * (including leaf `$value`s) are overwritten by the override; arrays are
 * replaced. Returns a new object (does not mutate `base`).
 */
export function deepMergeTokens(base: DtcgGroup, override: DtcgGroup): DtcgGroup {
  const result: DtcgGroup = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const baseValue = result[key];
    result[key] =
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      baseValue !== null &&
      typeof baseValue === 'object' &&
      !Array.isArray(baseValue)
        ? deepMergeTokens(baseValue as DtcgGroup, value as DtcgGroup)
        : value;
  }
  return result;
}

/**
 * Recursively flatten a DTCG document into {@link TokenRecord}s, carrying the
 * nearest ancestor `$type` down to each leaf token.
 */
export function flattenTokens(document_: DtcgGroup): TokenRecord[] {
  const records: TokenRecord[] = [];
  /** Build a {@link TokenRecord} for a single resolved leaf token. */
  const toRecord = (childPath: string[], token: DtcgToken, groupType?: string): TokenRecord => ({
    path: childPath,
    group: childPath[0],
    type: (token.$type as string | undefined) ?? groupType,
    value: token.$value,
    description: token.$description,
  });
  // `visit` and `walk` are mutually recursive, so they are written as hoisted
  // function declarations (rather than `const` arrows) to avoid referencing
  // either before its definition.
  /** Handle a single group entry: push a leaf record or recurse into a nested group. */
  function visit(childPath: string[], child: unknown, groupType?: string): void {
    if (isToken(child)) {
      records.push(toRecord(childPath, child, groupType));
    } else if (typeof child === 'object' && child !== null) {
      walk(child as DtcgGroup, childPath, groupType);
    }
  }
  /** Recursively descend a group, carrying the nearest ancestor `$type` down. */
  function walk(node: DtcgGroup, segments: string[], inheritedType?: string): void {
    const groupType = (node.$type as string | undefined) ?? inheritedType;
    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith('$')) continue;
      visit([...segments, key], child, groupType);
    }
  }
  walk(document_, []);
  return records;
}

/** Format a DTCG colour value as a CSS `oklab()` (or other color-space) string, unrounded. */
export function formatColorValue(value: DtcgColorValue): string {
  const components = value.components.join(' ');
  const function_ = `${value.colorSpace}(${components}`;
  return value.alpha === undefined ? `${function_})` : `${function_} / ${value.alpha})`;
}

/** Round an OKLab/other color-space value to four significant figures per component. */
export function formatCssColor(value: DtcgColorValue): string {
  const components = value.components.map((component) => Number(component.toPrecision(4))).join(' ');
  const function_ = `${value.colorSpace}(${components}`;
  return value.alpha === undefined ? `${function_})` : `${function_} / ${value.alpha})`;
}

/** Format a token `$value` as a CSS/SCSS literal (colours rounded; everything else verbatim). */
export function formatCssValue(value: unknown): string {
  if (isColorValue(value)) return formatCssColor(value);
  return String(value);
}

/**
 * Resolve a DTCG `$value` to the literal JavaScript value used in the generated
 * TypeScript module: colours become their `oklab(...)` string, numbers stay
 * numbers, and everything else (dimensions, font-family stacks, …) stays a string.
 */
export function resolveTsValue(value: unknown): string | number {
  if (isColorValue(value)) return formatColorValue(value);
  if (typeof value === 'number') return value;
  return String(value);
}

/** Is `key` a purely-numeric object key (e.g. a `500` palette step)? */
const isNumericKey = (key: string): boolean => /^[0-9]+$/.test(key);

/** Quote a DTCG object key unless it is purely numeric (`500` → `500`, `mono` → `'mono'`). */
export const formatKey = (key: string): string => (isNumericKey(key) ? key : `'${key}'`);

/** Type guard: is `value` a DTCG alias reference (a `{group.token}` string)? */
export const isAlias = (value: unknown): value is string =>
  typeof value === 'string' && value.startsWith('{') && value.endsWith('}');

/** Convert a DTCG alias (`{font.size.4xl}`) to a `var(--<prefix>-font-size-4xl)` reference. */
export function aliasToCssVariable(alias: string, prefix: string): string {
  const path_ = alias.slice(1, -1).replaceAll('.', '-');
  return `var(--${prefix}-${path_})`;
}

/** Resolve a DTCG alias (`{font.size.4xl}`) to its literal `$value` in a document. */
export function resolveAlias(alias: string, document_: DtcgGroup): unknown {
  const segments = alias.slice(1, -1).split('.');
  let node: unknown = document_;
  for (const segment of segments) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as DtcgGroup)[segment];
  }
  return isToken(node) ? node.$value : undefined;
}
