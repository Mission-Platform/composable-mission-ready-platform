import { computed, inject, ref, watch } from 'vue';

import type { ComputedRef, InjectionKey, Ref } from 'vue';

/**
 * Theme preference. `'auto'` follows the operating system's
 * `prefers-color-scheme` setting.
 */
export type Theme = 'light' | 'dark' | 'auto';

/** The concrete theme actually applied to the UI (never `'auto'`). */
export type ResolvedTheme = 'light' | 'dark';

/** Options accepted by {@link createThemeStore} / {@link useTheme}. */
export interface UseThemeOptions {
  /** Initial theme used when nothing is persisted / present in the DOM. Defaults to `'auto'`. */
  defaultTheme?: Theme;
  /** `localStorage` key used to persist the preference. Defaults to `'mp-theme'`. */
  storageKey?: string;
  /** Persist the preference to `localStorage`. Defaults to `true`. */
  persist?: boolean;
  /**
   * Scope the theme to a single subtree element instead of the document root.
   * When `true`, the `data-theme`/`color-scheme` attributes are written to the
   * element passed via {@link UseThemeOptions.target} / {@link ThemeStore.setTarget}
   * (and that element and its descendants are re-themed — `light-dark()` resolves
   * against the used `color-scheme`), enabling nested providers. When `false`
   * (default) the document root (`<html>`) is themed. Defaults to `false`.
   */
  scoped?: boolean;
  /**
   * The subtree element to theme when {@link UseThemeOptions.scoped} is `true`.
   * May be omitted at creation and assigned later via {@link ThemeStore.setTarget}
   * (e.g. once a component's template ref is available).
   */
  target?: HTMLElement;
  /**
   * Keep a `<meta name="color-scheme">` element in sync with the resolved scheme
   * so the user-agent chrome (scrollbars, form controls, the address bar) tracks
   * the active theme even before component styles load. Only applied when
   * theming the document root (ignored in {@link UseThemeOptions.scoped} mode).
   * Defaults to `true`.
   */
  syncMeta?: boolean;
}

/** The reactive theme store returned by {@link useTheme}. */
export interface ThemeStore {
  /** The current theme preference (`'light' | 'dark' | 'auto'`). */
  theme: Ref<Theme>;
  /** The current system color scheme. */
  systemTheme: Ref<ResolvedTheme>;
  /** The concrete theme applied to the UI, resolving `'auto'` against the system. */
  resolvedTheme: ComputedRef<ResolvedTheme>;
  /** Set the theme preference explicitly. */
  setTheme: (theme: Theme) => void;
  /** Toggle between light and dark, based on the currently resolved theme. */
  toggleTheme: () => void;
  /** Cycle through `light → dark → auto → light`. */
  cycleTheme: () => void;
  /**
   * Assign (or clear, with `undefined`) the subtree element the theme is applied
   * to. Only meaningful when the store was created with `scoped: true`;
   * reassigning clears the `data-theme`/`color-scheme` attributes from the
   * previous element.
   */
  setTarget: (element: HTMLElement | undefined) => void;
  /** Tear down listeners / watchers created by the store. */
  dispose: () => void;
}

/** Injection key used by `BaseThemeProvider` to share its {@link ThemeStore}. */
export const ThemeStoreKey: InjectionKey<ThemeStore> = Symbol('mp-theme-store');

const DEFAULT_STORAGE_KEY = 'mp-theme';

function systemPrefersDark(): boolean {
  return (
    globalThis.window !== undefined &&
    typeof globalThis.matchMedia === 'function' &&
    globalThis.matchMedia('(prefers-color-scheme: dark)').matches
  );
}

function readStoredTheme(storageKey: string): Theme | undefined {
  if (typeof localStorage === 'undefined') return undefined;
  try {
    const value = localStorage.getItem(storageKey);
    if (value === 'light' || value === 'dark' || value === 'auto') return value;
  } catch {
    /* Access to localStorage may be denied; ignore. */
  }
  return undefined;
}

/** Find or create the `<meta name="color-scheme">` element in the document head. */
function ensureColorSchemeMeta(): HTMLMetaElement {
  const existing = document.head.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
  if (existing) return existing;
  const created = document.createElement('meta');
  created.setAttribute('name', 'color-scheme');
  document.head.append(created);
  return created;
}

/**
 * Creates a standalone, reactive theme store. By default the store applies the
 * resolved theme to `document.documentElement` (the `data-theme` attribute,
 * matching `BaseThemeToggle`, plus the `color-scheme` property and a synced
 * `<meta name="color-scheme">`), persists the preference, and tracks the system
 * color scheme. Pass `scoped: true` (with a `target` element, or assigned later
 * via {@link ThemeStore.setTarget}) to scope the theme to a subtree instead,
 * which enables nested providers. Prefer `BaseThemeProvider` / {@link useTheme}
 * in components; use this factory directly only when you need an independent
 * store (e.g. in tests).
 */
export function createThemeStore(options: UseThemeOptions = {}): ThemeStore {
  const {
    defaultTheme = 'auto',
    storageKey = DEFAULT_STORAGE_KEY,
    persist = true,
    scoped = false,
    target = undefined,
    syncMeta = true,
  } = options;

  // The element currently themed in `scoped` mode (the document root is used in
  // global mode and is resolved lazily so SSR stays safe).
  let targetElement: HTMLElement | undefined = target;

  // Honour an attribute already on the root (e.g. set by the pre-paint init
  // script) so the store doesn't fight a server/inline-rendered preference.
  // Skipped in `scoped` mode, where the subtree element drives nothing global.
  /** Read a `'light'`/`'dark'` preference already pinned on the document root (global mode only). */
  function themeFromRootAttribute(): Theme | undefined {
    if (scoped || typeof document === 'undefined') return undefined;
    const attribute = document.documentElement.dataset.theme;
    return attribute === 'light' || attribute === 'dark' ? attribute : undefined;
  }

  /** Resolve the initial theme: root attribute, then the persisted value, then the default. */
  function resolveInitialTheme(): Theme {
    return themeFromRootAttribute() ?? (persist ? readStoredTheme(storageKey) : undefined) ?? defaultTheme;
  }

  const initial: Theme = resolveInitialTheme();

  const theme = ref<Theme>(initial);
  const systemTheme = ref<ResolvedTheme>(systemPrefersDark() ? 'dark' : 'light');
  const resolvedTheme = computed<ResolvedTheme>(() => (theme.value === 'auto' ? systemTheme.value : theme.value));

  /** Resolve the element the theme should be written to (or `undefined`). */
  function resolveTarget(): HTMLElement | undefined {
    if (scoped) return targetElement;
    if (typeof document === 'undefined') return undefined;
    return document.documentElement;
  }

  /** Write the `data-theme`/`color-scheme` attributes onto an element. */
  function applyToElement(element: HTMLElement): void {
    if (theme.value === 'auto') {
      // `'auto'` removes the explicit attribute and lets the element follow the
      // OS: `color-scheme: light dark` makes the tokens' `light-dark()` values
      // (and native UA widgets) track `prefers-color-scheme`.
      delete element.dataset.theme;
      element.style.colorScheme = 'light dark';
    } else {
      // An explicit preference pins both the `data-theme` styling hook and the
      // `color-scheme` property, so the `light-dark()` colour tokens resolve to
      // the chosen scheme regardless of the OS setting.
      element.dataset.theme = theme.value;
      element.style.colorScheme = theme.value;
    }
  }

  /**
   * Keep a `<meta name="color-scheme">` element in sync with the preference so
   * the user-agent chrome follows the theme. Only used when theming the root.
   */
  function syncMetaColorScheme(): void {
    if (!syncMeta || typeof document === 'undefined' || !document.head) return;
    ensureColorSchemeMeta().setAttribute('content', theme.value === 'auto' ? 'light dark' : theme.value);
  }

  /** Apply the resolved theme to the target element and (in global mode) the `<meta>`. */
  function applyTheme(): void {
    const element = resolveTarget();
    if (element) applyToElement(element);
    if (!scoped) syncMetaColorScheme();
  }

  function persistTheme(): void {
    if (!persist || typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(storageKey, theme.value);
    } catch {
      /* Access to localStorage may be denied; ignore. */
    }
  }

  applyTheme();
  persistTheme();

  const stopWatch = watch([theme, systemTheme], () => {
    applyTheme();
    persistTheme();
  });

  let mediaQuery: MediaQueryList | undefined;
  function onSystemChange(event: MediaQueryListEvent): void {
    systemTheme.value = event.matches ? 'dark' : 'light';
  }
  if (globalThis.window !== undefined && typeof globalThis.matchMedia === 'function') {
    mediaQuery = globalThis.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', onSystemChange);
  }

  function setTheme(next: Theme): void {
    theme.value = next;
  }

  function toggleTheme(): void {
    theme.value = resolvedTheme.value === 'dark' ? 'light' : 'dark';
  }

  function cycleTheme(): void {
    theme.value = theme.value === 'light' ? 'dark' : theme.value === 'dark' ? 'auto' : 'light';
  }

  function setTarget(element: HTMLElement | undefined): void {
    // Clear the previous scoped element's attributes when reassigning so a
    // stale subtree isn't left pinned to an old scheme.
    if (scoped && targetElement && targetElement !== element) {
      delete targetElement.dataset.theme;
      targetElement.style.removeProperty('color-scheme');
    }
    targetElement = element;
    applyTheme();
  }

  function dispose(): void {
    stopWatch();
    mediaQuery?.removeEventListener('change', onSystemChange);
    mediaQuery = undefined;
    // Release the scoped element's attributes so disposing a subtree provider
    // doesn't leave it pinned.
    if (scoped && targetElement) {
      delete targetElement.dataset.theme;
      targetElement.style.removeProperty('color-scheme');
      targetElement = undefined;
    }
  }

  return { theme, systemTheme, resolvedTheme, setTheme, toggleTheme, cycleTheme, setTarget, dispose };
}

let fallbackStore: ThemeStore | undefined;

/**
 * Returns the theme store provided by the nearest `BaseThemeProvider`. When no
 * provider is present, a lazily-created shared (singleton) store is returned so
 * the composable works standalone.
 *
 * @param options Options used only when creating the standalone fallback store.
 */
export function useTheme(options?: UseThemeOptions): ThemeStore {
  const injected = inject(ThemeStoreKey);
  if (injected) return injected;
  if (!fallbackStore) {
    fallbackStore = createThemeStore(options);
  }
  return fallbackStore;
}

/** Disposes and clears the standalone fallback store. Intended for tests. */
export function resetThemeStore(): void {
  fallbackStore?.dispose();
  fallbackStore = undefined;
}

/** Options accepted by {@link themeInitScript}. */
export interface ThemeInitScriptOptions {
  /** `localStorage` key the preference is read from. Defaults to `'mp-theme'`. */
  storageKey?: string;
  /** Theme used when nothing is persisted. Defaults to `'auto'`. */
  defaultTheme?: Theme;
}

/**
 * Returns a tiny, self-contained JavaScript snippet that resolves the stored
 * theme preference and applies the matching `data-theme`/`color-scheme` to
 * `document.documentElement` **synchronously**.
 *
 * Inline it as a blocking `<script>` in the document `<head>` (before any
 * stylesheet) so the first paint already matches the persisted preference —
 * this eliminates the flash of the wrong colour scheme that happens when the
 * theme is only applied once the app bundle has executed. The snippet mirrors
 * {@link createThemeStore}'s own logic (`'light'`/`'dark'` pin the scheme,
 * anything else \u2192 `color-scheme: light dark` so the OS preference is followed),
 * so the store does not have to re-apply anything on hydration.
 *
 * @example
 * ```html
 * <script>__INIT__</script> <!-- where __INIT__ is themeInitScript() -->
 * ```
 */
export function themeInitScript(options: ThemeInitScriptOptions = {}): string {
  const { storageKey = DEFAULT_STORAGE_KEY, defaultTheme = 'auto' } = options;
  const key = JSON.stringify(storageKey);
  const fallback = JSON.stringify(defaultTheme);
  return (
    '(function(){try{' +
    'var d=document.documentElement;' +
    `var t=localStorage.getItem(${key})||${fallback};` +
    "if(t==='light'||t==='dark'){d.setAttribute('data-theme',t);d.style.colorScheme=t;}" +
    "else{d.removeAttribute('data-theme');d.style.colorScheme='light dark';}" +
    '}catch(e){}})();'
  );
}
