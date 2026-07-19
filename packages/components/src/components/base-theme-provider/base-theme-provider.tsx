import { h, Slot, useEffect, useState, type MpElement, type MpProperties } from '@mission-platform/jsx';

import sizeStyles from '../size.module.scss';
import {
  configureTheme,
  cycleTheme,
  getThemeSnapshot,
  setTheme,
  subscribeTheme,
  toggleTheme,
  type Theme,
} from '../theme-store';

import styles from './base-theme-provider.module.scss';

/** Size token — canonical 2xs → 2xl scale (inherited through the renderless wrapper). */
export type ThemeProviderSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface ThemeProviderProperties extends MpProperties {
  /** Size token controlling the inherited font scale. Defaults to `'md'`. */
  size?: ThemeProviderSize;
  /** Initial theme when nothing is persisted / present in the DOM. Defaults to `'auto'`. */
  defaultTheme?: Theme;
  /** `localStorage` key used to persist the preference. Defaults to `'mp-theme'`. */
  storageKey?: string;
  /** Persist the preference to `localStorage`. Defaults to `true`. */
  persist?: boolean;
  /**
   * Theme the whole document. Retained for API parity with the original; the
   * neutral provider always drives the shared document-level store (per-subtree
   * scoping is not modelled by the neutral dialect). Defaults to `true`.
   */
  global?: boolean;
}

/**
 * `BaseThemeProvider` — configures the shared theme store from its props and
 * exposes the current theme state and mutators to its default (scoped) slot.
 * Authored once in the neutral JSX dialect and compiled straight to React or Vue
 * by `@mission-platform/vite-plugin-jsx`.
 *
 * The original Vue SFC created a reactive store and shared it with descendants
 * via `provide`/`inject` (with an opt-in subtree-scoped mode). The neutral
 * dialect has no provide/inject context primitive, so this version configures
 * the **shared observable singleton** store (`../theme-store`) that
 * `BaseThemeToggle` and any other consumer already read — clicking a toggle
 * anywhere reflects here, and vice versa. It is otherwise renderless: it renders
 * a `display: contents` wrapper (`<div>`) so it never introduces a box, and its
 * default slot receives `{ theme, resolvedTheme, systemTheme, setTheme,
 * toggleTheme, cycleTheme }` as scope.
 *
 * The per-subtree `global={false}` mode, the configurable wrapper tag (`as`), and
 * the standalone (non-singleton) store are intentionally reduced to the single
 * document-level store with a fixed `<div>` wrapper.
 */
export function BaseThemeProvider(properties: Readonly<ThemeProviderProperties>): MpElement {
  const { defaultTheme = 'auto', storageKey = 'mp-theme', persist = true, size = 'md' } = properties;

  useEffect(() => {
    configureTheme({ defaultTheme, storageKey, persist });
  }, [defaultTheme, storageKey, persist]);

  const [snapshot, setSnapshot] = useState(getThemeSnapshot());
  useEffect(() => {
    const update = (): void => setSnapshot(getThemeSnapshot());
    return subscribeTheme(update);
  }, []);

  const theme = snapshot.theme;
  const resolvedTheme = snapshot.resolvedTheme;
  const systemTheme = snapshot.systemTheme;

  return (
    <div classNames={[styles['base-theme-provider'], sizeStyles[`base-size--${size}`]]}>
      <Slot
        theme={theme}
        resolvedTheme={resolvedTheme}
        systemTheme={systemTheme}
        setTheme={setTheme}
        toggleTheme={toggleTheme}
        cycleTheme={cycleTheme}
      />
    </div>
  );
}
