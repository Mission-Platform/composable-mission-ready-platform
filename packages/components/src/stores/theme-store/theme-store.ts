/**
 * Framework-neutral, observable theme store shared by the write-once theme
 * components (`ForgeThemeProvider`, `ForgeThemeToggle`).
 *
 * The original `@mission-platform/components` theme components shared a reactive
 * Vue store via `provide`/`inject`. The neutral JSX dialect (and the two-stage
 * compiler) has no provide/inject context primitive, so cross-component sharing
 * is modelled instead with a single **observable singleton** store: a plain
 * module (no framework reactivity) holding the current theme, applying it to the
 * document root (`data-theme`/`color-scheme` + a synced `<meta>`), persisting it
 * to `localStorage`, tracking the system colour scheme, and notifying
 * subscribers on every change.
 *
 * Each component subscribes to the store from its body with the neutral
 * `useState`/`useEffect` hooks (`const [snapshot, setSnapshot] = useState(getThemeSnapshot());
 * useEffect(() => subscribeTheme(() => setSnapshot(getThemeSnapshot())), [])`),
 * which the compiler translates to a `ref` + lifecycle on Vue and keeps as React
 * hooks — so a single authored source stays reactive on both frameworks.
 *
 * This module is a plain helper (no `@mission-platform/forge` import), so
 * `@mission-platform/vite-plugin-forge` copies it verbatim into both the React and
 * Vue generated trees.
 */

/** Theme preference. `'auto'` follows the operating system's `prefers-color-scheme`. */
export type Theme = 'light' | 'dark' | 'auto';

/** The concrete theme actually applied to the UI (never `'auto'`). */
export type ResolvedTheme = 'light' | 'dark';

/** An immutable snapshot of the store's current state, returned by {@link getThemeSnapshot}. */
export interface ThemeSnapshot {
  /** The current theme preference (`'light' | 'dark' | 'auto'`). */
  theme: Theme;
  /** The concrete theme applied to the UI, resolving `'auto'` against the system. */
  resolvedTheme: ResolvedTheme;
  /** The current system colour scheme. */
  systemTheme: ResolvedTheme;
}

/** Configuration accepted by {@link configureTheme}. */
export interface ThemeConfig {
  /** Initial theme used when nothing is persisted / present in the DOM. */
  defaultTheme?: Theme;
  /** `localStorage` key used to persist the preference. Defaults to `'mp-theme'`. */
  storageKey?: string;
  /** Persist the preference to `localStorage`. Defaults to `true`. */
  persist?: boolean;
}

const DEFAULT_STORAGE_KEY = 'mp-theme';

let storageKey = DEFAULT_STORAGE_KEY;
let persist = true;
let initialised = false;

const listeners = new Set<() => void>();

function systemPrefersDark(): boolean {
  return typeof globalThis.matchMedia === 'function' && globalThis.matchMedia('(prefers-color-scheme: dark)').matches;
}

function readStoredTheme(key: string): Theme | undefined {
  if (typeof localStorage === 'undefined') {
    return undefined;
  }
  try {
    const value = localStorage.getItem(key);
    if (value === 'light' || value === 'dark' || value === 'auto') {
      return value;
    }
  } catch {
    /* Access to localStorage may be denied; ignore. */
  }
  return undefined;
}

/** Read a `'light'`/`'dark'` preference already pinned on the document root. */
function themeFromRootAttribute(): Theme | undefined {
  if (typeof document === 'undefined') {
    return undefined;
  }
  const attribute = document.documentElement.dataset.theme;
  return attribute === 'light' || attribute === 'dark' ? attribute : undefined;
}

function resolveInitialTheme(): Theme {
  return themeFromRootAttribute() ?? (persist ? readStoredTheme(storageKey) : undefined) ?? 'auto';
}

let theme: Theme = resolveInitialTheme();
let systemTheme: ResolvedTheme = systemPrefersDark() ? 'dark' : 'light';

function resolveTheme(): ResolvedTheme {
  return theme === 'auto' ? systemTheme : theme;
}

/** Find or create the `<meta name="color-scheme">` element in the document head. */
function ensureColorSchemeMeta(): HTMLMetaElement | undefined {
  if (typeof document === 'undefined' || !document.head) {
    return undefined;
  }
  const existing = document.head.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
  if (existing) {
    return existing;
  }
  const created = document.createElement('meta');
  created.setAttribute('name', 'color-scheme');
  document.head.append(created);
  return created;
}

/** Apply the resolved theme to `document.documentElement` and the synced `<meta>`. */
function applyTheme(): void {
  if (typeof document === 'undefined') {
    return;
  }
  const element = document.documentElement;
  if (theme === 'auto') {
    delete element.dataset.theme;
    element.style.colorScheme = 'light dark';
  } else {
    element.dataset.theme = theme;
    element.style.colorScheme = theme;
  }
  ensureColorSchemeMeta()?.setAttribute('content', theme === 'auto' ? 'light dark' : theme);
}

function persistTheme(): void {
  if (!persist || typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(storageKey, theme);
  } catch {
    /* Access to localStorage may be denied; ignore. */
  }
}

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

/** Lazily attach the `matchMedia` listener and apply the initial theme (client only). */
function ensureInitialised(): void {
  if (initialised || typeof globalThis.matchMedia !== 'function') {
    return;
  }
  initialised = true;
  const mediaQuery = globalThis.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', (event) => {
    systemTheme = event.matches ? 'dark' : 'light';
    applyTheme();
    notify();
  });
  applyTheme();
}

/** Read an immutable snapshot of the store's current state. */
export function getThemeSnapshot(): ThemeSnapshot {
  return { theme, resolvedTheme: resolveTheme(), systemTheme };
}

/** Subscribe to store changes; returns an unsubscribe function. */
export function subscribeTheme(listener: () => void): () => void {
  ensureInitialised();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Set the theme preference explicitly. */
export function setTheme(next: Theme): void {
  theme = next;
  applyTheme();
  persistTheme();
  notify();
}

/** Toggle between light and dark, based on the currently resolved theme. */
export function toggleTheme(): void {
  setTheme(resolveTheme() === 'dark' ? 'light' : 'dark');
}

/** Cycle through `light → dark → auto → light`. */
export function cycleTheme(): void {
  setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'auto' : 'light');
}

/**
 * (Re)configure the shared store from a `ForgeThemeProvider`'s props: switch the
 * storage key / persistence and, when nothing has been explicitly chosen yet,
 * adopt the provider's `defaultTheme`. Re-applies and notifies subscribers.
 */
export function configureTheme(config: ThemeConfig): void {
  if (config.storageKey !== undefined) {
    storageKey = config.storageKey;
  }
  if (config.persist !== undefined) {
    persist = config.persist;
  }
  const stored = persist ? readStoredTheme(storageKey) : undefined;
  theme = themeFromRootAttribute() ?? stored ?? config.defaultTheme ?? theme;
  applyTheme();
  persistTheme();
  notify();
}
