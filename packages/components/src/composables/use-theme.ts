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

/**
 * Creates a standalone, reactive theme store. The store applies the resolved
 * theme to `document.documentElement` via the `data-theme` attribute (matching
 * `BaseThemeToggle`), persists the preference, and tracks the system color
 * scheme. Prefer `BaseThemeProvider` / {@link useTheme} in components; use this
 * factory directly only when you need an independent store (e.g. in tests).
 */
export function createThemeStore(options: UseThemeOptions = {}): ThemeStore {
  const { defaultTheme = 'auto', storageKey = DEFAULT_STORAGE_KEY, persist = true } = options;

  const initial: Theme = (() => {
    if (typeof document !== 'undefined') {
      const attribute = document.documentElement.dataset.theme;
      if (attribute === 'light' || attribute === 'dark') return attribute;
    }
    if (persist) {
      const stored = readStoredTheme(storageKey);
      if (stored) return stored;
    }
    return defaultTheme;
  })();

  const theme = ref<Theme>(initial);
  const systemTheme = ref<ResolvedTheme>(systemPrefersDark() ? 'dark' : 'light');
  const resolvedTheme = computed<ResolvedTheme>(() => (theme.value === 'auto' ? systemTheme.value : theme.value));

  function applyToDocument(): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (theme.value === 'auto') {
      delete root.dataset.theme;
    } else {
      root.dataset.theme = theme.value;
    }
  }

  function persistTheme(): void {
    if (!persist || typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(storageKey, theme.value);
    } catch {
      /* Access to localStorage may be denied; ignore. */
    }
  }

  applyToDocument();
  persistTheme();

  const stopWatch = watch(theme, () => {
    applyToDocument();
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

  function dispose(): void {
    stopWatch();
    mediaQuery?.removeEventListener('change', onSystemChange);
    mediaQuery = undefined;
  }

  return { theme, systemTheme, resolvedTheme, setTheme, toggleTheme, cycleTheme, dispose };
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
