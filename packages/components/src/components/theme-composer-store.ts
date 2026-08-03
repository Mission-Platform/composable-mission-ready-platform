/**
 * Framework-neutral helpers for the write-once `BaseThemeComposer`.
 *
 * The original `@mission-platform/components` `BaseThemeComposer` shared a
 * reactive store via `provide`/`inject` and `v-model`. The neutral JSX dialect
 * has no provide/inject context primitive, so the migrated component is instead
 * a **controlled** component: it holds the composed configuration in a neutral
 * `useState` hook (seeded from `modelValue`), emits every change through an
 * `onUpdateModelValue` callback prop, and uses these pure helpers to resolve a
 * {@link ThemeComposerConfig} into the `--mp-*` custom properties / inline
 * `style` string it applies to its scope (or `document.documentElement` when
 * `global`).
 *
 * This module is a plain helper (no `@mission-platform/forge` import), so
 * `@mission-platform/vite-plugin-forge` copies it verbatim into both the React and
 * Vue generated trees.
 */

/**
 * A high-level, typed description of the theme attributes a consumer can compose
 * at runtime. Every attribute maps to one of the platform's `--mp-*`
 * design-token CSS custom properties (see {@link ATTRIBUTE_TO_CSS_VAR}).
 */
export interface ThemeComposerConfig {
  /** Brand colour — overrides `--mp-color-primary-default`. */
  primaryColor?: string;
  /** Brand hover colour — overrides `--mp-color-primary-hover`. */
  primaryHoverColor?: string;
  /** Brand active colour — overrides `--mp-color-primary-active`. */
  primaryActiveColor?: string;
  /** Accent colour — overrides `--mp-color-secondary-default`. */
  secondaryColor?: string;
  /** Primary text colour — overrides `--mp-color-text-primary`. */
  textColor?: string;
  /** Page background colour — overrides `--mp-color-bg-base`. */
  backgroundColor?: string;
  /** Raised/card surface colour — overrides `--mp-color-bg-surface`. */
  surfaceColor?: string;
  /** Default border colour — overrides `--mp-color-border-default`. */
  borderColor?: string;
  /** Focus-ring colour — overrides `--mp-color-border-focus`. */
  focusColor?: string;
  /** Sans-serif font stack — overrides `--mp-font-family-sans`. */
  fontFamily?: string;
  /** Monospace font stack — overrides `--mp-font-family-mono`. */
  monoFontFamily?: string;
  /** Base font size — overrides `--mp-font-size-md`. */
  baseFontSize?: string;
  /** Base corner radius — overrides `--mp-radius-md`. */
  radius?: string;
  /** Colour scheme applied via the CSS `color-scheme` property. */
  colorScheme?: 'light' | 'dark' | 'light dark' | 'normal';
  /** Escape hatch — arbitrary CSS custom-property overrides (keys may omit `--mp-`). */
  tokens?: Record<string, string>;
}

/** The friendly attribute keys that map to a `--mp-*` custom property. */
export type ThemeComposerAttribute = Exclude<keyof ThemeComposerConfig, 'tokens' | 'colorScheme'>;

/** Maps each friendly attribute to the `--mp-*` CSS custom property it overrides. */
export const ATTRIBUTE_TO_CSS_VAR: Record<ThemeComposerAttribute, string> = {
  primaryColor: '--mp-color-primary-default',
  primaryHoverColor: '--mp-color-primary-hover',
  primaryActiveColor: '--mp-color-primary-active',
  secondaryColor: '--mp-color-secondary-default',
  textColor: '--mp-color-text-primary',
  backgroundColor: '--mp-color-bg-base',
  surfaceColor: '--mp-color-bg-surface',
  borderColor: '--mp-color-border-default',
  focusColor: '--mp-color-border-focus',
  fontFamily: '--mp-font-family-sans',
  monoFontFamily: '--mp-font-family-mono',
  baseFontSize: '--mp-font-size-md',
  radius: '--mp-radius-md',
};

/** Normalises a token key to a CSS custom-property name. */
function normaliseTokenKey(key: string): string {
  return key.startsWith('--') ? key : `--mp-${key}`;
}

/**
 * Converts a {@link ThemeComposerConfig} into a flat map of CSS custom
 * properties (`--mp-*` → value). Attributes take precedence first, then the raw
 * `tokens` escape hatch is merged on top.
 */
export function configToCssVariables(config: ThemeComposerConfig): Record<string, string> {
  const variables: Record<string, string> = {};

  for (const attribute of Object.keys(ATTRIBUTE_TO_CSS_VAR) as ThemeComposerAttribute[]) {
    const value = config[attribute];
    if (typeof value === 'string' && value.length > 0) {
      variables[ATTRIBUTE_TO_CSS_VAR[attribute]] = value;
    }
  }

  if (config.tokens) {
    for (const [key, value] of Object.entries(config.tokens)) {
      if (typeof value === 'string' && value.length > 0) {
        variables[normaliseTokenKey(key)] = value;
      }
    }
  }

  return variables;
}

/** Serialises a CSS custom-property map into an inline `style` string. */
export function cssVariablesToString(variables: Record<string, string>): string {
  return Object.entries(variables)
    .map(([name, value]) => `${name}: ${value};`)
    .join(' ');
}

/** Resolve a config to the full inline `style` string (custom properties + `color-scheme`). */
export function configToStyleString(config: ThemeComposerConfig): string {
  const variables = cssVariablesToString(configToCssVariables(config));
  const { colorScheme } = config;
  if (!colorScheme) {
    return variables;
  }
  const scheme = `color-scheme: ${colorScheme};`;
  return variables ? `${variables} ${scheme}` : scheme;
}

/** Shallow-merge a partial configuration into the current one (clearing `undefined`/empty values). */
export function mergeConfig(config: ThemeComposerConfig, partial: ThemeComposerConfig): ThemeComposerConfig {
  return { ...config, ...partial };
}

/** Set a single friendly attribute (pass `undefined` to clear it). */
export function setConfigAttribute<K extends ThemeComposerAttribute>(
  config: ThemeComposerConfig,
  attribute: K,
  value: ThemeComposerConfig[K],
): ThemeComposerConfig {
  return { ...config, [attribute]: value };
}

/** Set a single raw token override. The key may omit the `--mp-` prefix. */
export function setConfigToken(config: ThemeComposerConfig, key: string, value: string): ThemeComposerConfig {
  return { ...config, tokens: { ...config.tokens, [key]: value } };
}

/** Remove a single raw token override. */
export function removeConfigToken(config: ThemeComposerConfig, key: string): ThemeComposerConfig {
  if (!config.tokens || !(key in config.tokens)) {
    return config;
  }
  const { [key]: _removed, ...rest } = config.tokens;
  return { ...config, tokens: rest };
}
