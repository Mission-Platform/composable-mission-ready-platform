import { computed, inject, ref, watch } from 'vue';

import type { ComputedRef, InjectionKey, Ref } from 'vue';

/**
 * A high-level, typed description of the theme attributes a consumer can
 * compose at runtime. Every attribute maps to one of the platform's `--mp-*`
 * design-token CSS custom properties (see {@link ATTRIBUTE_TO_CSS_VAR}). Any
 * attribute left `undefined` is not overridden, so the underlying theme value
 * (from `@mission-platform/tokens`) shows through.
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
  /**
   * Colour scheme applied to the composed scope via the CSS `color-scheme`
   * property. Drives the tokens' `light-dark()` values (and native UA widgets):
   * `'light dark'` follows the OS `prefers-color-scheme`, while `'light'` /
   * `'dark'` pin the scope. Unlike the other attributes this is *not* a `--mp-*`
   * custom property — it is emitted as a real `color-scheme` declaration.
   */
  colorScheme?: 'light' | 'dark' | 'light dark' | 'normal';
  /**
   * Escape hatch — arbitrary CSS custom-property overrides. Keys may be given
   * with or without the leading `--mp-` prefix (e.g. `'spacing-4'`,
   * `'--mp-spacing-4'`, or a fully custom `'--my-var'`). These are merged on
   * top of the attribute-derived variables and win on conflict.
   */
  tokens?: Record<string, string>;
}

/**
 * The friendly attribute keys of {@link ThemeComposerConfig} that map to a
 * `--mp-*` custom property (excludes the raw `tokens` escape hatch and
 * `colorScheme`, which is emitted as a real `color-scheme` declaration).
 */
export type ThemeComposerAttribute = Exclude<keyof ThemeComposerConfig, 'tokens' | 'colorScheme'>;

/**
 * Maps each friendly {@link ThemeComposerConfig} attribute to the `--mp-*` CSS
 * custom property it overrides.
 */
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
  if (key.startsWith('--')) return key;
  return `--mp-${key}`;
}

/**
 * Converts a {@link ThemeComposerConfig} into a flat map of CSS custom
 * properties (`--mp-*` → value). Attributes take precedence first, then the
 * raw `tokens` escape hatch is merged on top.
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

/** Options accepted by {@link createThemeComposer} / {@link useThemeComposer}. */
export interface UseThemeComposerOptions {
  /** Initial composed configuration. Defaults to an empty config. */
  initialConfig?: ThemeComposerConfig;
  /**
   * Apply the composed variables to `document.documentElement` so they affect
   * the whole document. When `false` (default) the variables are only exposed
   * via the store and are applied by `BaseThemeComposer` to its own element.
   */
  global?: boolean;
  /** Persist the configuration to `localStorage`. Defaults to `false`. */
  persist?: boolean;
  /** `localStorage` key used to persist the configuration. Defaults to `'mp-theme-composer'`. */
  storageKey?: string;
}

/** The reactive theme-composer store returned by {@link useThemeComposer}. */
export interface ThemeComposerStore {
  /** The current composed configuration. */
  config: Ref<ThemeComposerConfig>;
  /** The composed configuration resolved to a `--mp-*` custom-property map. */
  cssVariables: ComputedRef<Record<string, string>>;
  /** The composed configuration serialised as an inline `style` string. */
  styleString: ComputedRef<string>;
  /** Shallow-merge a partial configuration into the current one. */
  setConfig: (partial: ThemeComposerConfig) => void;
  /** Replace the entire configuration. */
  replaceConfig: (next: ThemeComposerConfig) => void;
  /** Set a single friendly attribute (pass `undefined` to clear it). */
  setAttribute: <K extends ThemeComposerAttribute>(attribute: K, value: ThemeComposerConfig[K]) => void;
  /** Set a single raw token override. The key may omit the `--mp-` prefix. */
  setToken: (key: string, value: string) => void;
  /** Remove a single raw token override. */
  removeToken: (key: string) => void;
  /** Reset the configuration back to its initial value. */
  reset: () => void;
  /** Tear down watchers and remove any globally-applied variables. */
  dispose: () => void;
}

const DEFAULT_STORAGE_KEY = 'mp-theme-composer';

function readStoredConfig(storageKey: string): ThemeComposerConfig | undefined {
  if (typeof localStorage === 'undefined') return undefined;
  try {
    const value = localStorage.getItem(storageKey);
    if (!value) return undefined;
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === 'object') return parsed as ThemeComposerConfig;
  } catch {
    /* Access to localStorage may be denied or the value malformed; ignore. */
  }
  return undefined;
}

/**
 * Creates a standalone, reactive theme-composer store. The store resolves a
 * {@link ThemeComposerConfig} of friendly attributes (plus a raw `tokens`
 * escape hatch) into `--mp-*` CSS custom properties, optionally applying them
 * to `document.documentElement` and persisting them to `localStorage`. Prefer
 * `BaseThemeComposer` / {@link useThemeComposer} in components; use this factory
 * directly only when you need an independent store (e.g. in tests).
 */
export function createThemeComposer(options: UseThemeComposerOptions = {}): ThemeComposerStore {
  const { initialConfig = {}, global = false, persist = false, storageKey = DEFAULT_STORAGE_KEY } = options;

  const seed: ThemeComposerConfig = persist ? (readStoredConfig(storageKey) ?? initialConfig) : initialConfig;

  const config = ref<ThemeComposerConfig>({ ...seed });
  const cssVariables = computed<Record<string, string>>(() => configToCssVariables(config.value));
  const styleString = computed<string>(() => {
    const variables = cssVariablesToString(cssVariables.value);
    const { colorScheme } = config.value;
    if (!colorScheme) return variables;
    const scheme = `color-scheme: ${colorScheme};`;
    return variables ? `${variables} ${scheme}` : scheme;
  });

  let applied: string[] = [];
  let appliedColorScheme = false;

  /** Sync the `--mp-*` custom properties on `root`, removing any that are no longer present. */
  function syncCssVariables(root: HTMLElement, next: Record<string, string>): void {
    for (const name of applied) {
      if (!(name in next)) root.style.removeProperty(name);
    }
    for (const [name, value] of Object.entries(next)) {
      root.style.setProperty(name, value);
    }
    applied = Object.keys(next);
  }

  /** Apply (or clear) the `color-scheme` property — drives `light-dark()` + native UA widgets. */
  function syncColorScheme(root: HTMLElement): void {
    const { colorScheme } = config.value;
    if (colorScheme) {
      root.style.colorScheme = colorScheme;
      appliedColorScheme = true;
    } else if (appliedColorScheme) {
      root.style.removeProperty('color-scheme');
      appliedColorScheme = false;
    }
  }

  /** Write the resolved CSS variables and `color-scheme` onto `document.documentElement` (global mode). */
  function applyToDocument(): void {
    if (!global || typeof document === 'undefined') return;
    const root = document.documentElement;
    syncCssVariables(root, cssVariables.value);
    syncColorScheme(root);
  }

  function persistConfig(): void {
    if (!persist || typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(config.value));
    } catch {
      /* Access to localStorage may be denied; ignore. */
    }
  }

  applyToDocument();
  persistConfig();

  const stopWatch = watch(
    cssVariables,
    () => {
      applyToDocument();
      persistConfig();
    },
    { deep: true },
  );

  function setConfig(partial: ThemeComposerConfig): void {
    config.value = { ...config.value, ...partial };
  }

  function replaceConfig(next: ThemeComposerConfig): void {
    config.value = { ...next };
  }

  function setAttribute<K extends ThemeComposerAttribute>(attribute: K, value: ThemeComposerConfig[K]): void {
    config.value = { ...config.value, [attribute]: value };
  }

  function setToken(key: string, value: string): void {
    config.value = { ...config.value, tokens: { ...config.value.tokens, [key]: value } };
  }

  function removeToken(key: string): void {
    if (!config.value.tokens || !(key in config.value.tokens)) return;
    const { [key]: _removed, ...rest } = config.value.tokens;
    config.value = { ...config.value, tokens: rest };
  }

  function reset(): void {
    config.value = { ...seed };
  }

  function dispose(): void {
    stopWatch();
    if (global && typeof document !== 'undefined') {
      for (const name of applied) document.documentElement.style.removeProperty(name);
      if (appliedColorScheme) document.documentElement.style.removeProperty('color-scheme');
    }
    applied = [];
    appliedColorScheme = false;
  }

  return {
    config,
    cssVariables,
    styleString,
    setConfig,
    replaceConfig,
    setAttribute,
    setToken,
    removeToken,
    reset,
    dispose,
  };
}

/** Injection key used by `BaseThemeComposer` to share its {@link ThemeComposerStore}. */
export const ThemeComposerKey: InjectionKey<ThemeComposerStore> = Symbol('mp-theme-composer-store');

let fallbackStore: ThemeComposerStore | undefined;

/**
 * Returns the theme-composer store provided by the nearest `BaseThemeComposer`.
 * When no provider is present, a lazily-created shared (singleton) store is
 * returned so the composable works standalone.
 *
 * @param options Options used only when creating the standalone fallback store.
 */
export function useThemeComposer(options?: UseThemeComposerOptions): ThemeComposerStore {
  const injected = inject(ThemeComposerKey);
  if (injected) return injected;
  if (!fallbackStore) {
    fallbackStore = createThemeComposer(options);
  }
  return fallbackStore;
}

/** Disposes and clears the standalone fallback store. Intended for tests. */
export function resetThemeComposer(): void {
  fallbackStore?.dispose();
  fallbackStore = undefined;
}
