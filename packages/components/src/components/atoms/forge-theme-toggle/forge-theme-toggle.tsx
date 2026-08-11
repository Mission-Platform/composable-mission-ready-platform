import { h, type MpChild, type MpElement, Slot, useEffect, useState } from '@mission-platform/forge';

import { cycleTheme, getThemeSnapshot, subscribeTheme, type Theme } from '@/stores/theme-store/theme-store';

import sizeStyles from '../../../styles/size.module.scss';

import styles from './forge-theme-toggle.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type ThemeToggleSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface ThemeToggleProperties {
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
  /** Size token controlling the toggle's scale. Defaults to `'md'`. */
  size?: ThemeToggleSize;
  /** Overrides the auto-generated `aria-label`. */
  ariaLabel?: string;
  /** Fired with the new theme after each toggle. */
  onChange?: (theme: Theme) => void;
}

/** The icon glyph shown for each theme (substituted for the original inline SVGs). */
function themeGlyph(theme: Theme): string {
  if (theme === 'light') {
    return '☀';
  }
  if (theme === 'dark') {
    return '☾';
  }
  return '◐';
}

/** Resolve the next theme in the `light → dark → auto → light` cycle. */
function nextTheme(theme: Theme): Theme {
  if (theme === 'light') {
    return 'dark';
  }
  if (theme === 'dark') {
    return 'auto';
  }
  return 'light';
}

/**
 * `ForgeThemeToggle` — cycles the active theme through `light → dark → auto`,
 * authored once in the neutral JSX dialect and compiled straight to React or Vue
 * by `@mission-platform/vite-plugin-forge`.
 *
 * It is backed by the shared observable theme store (`../theme-store`): clicking
 * it drives the same singleton that `ForgeThemeProvider` configures, so it
 * persists the preference, pins `data-theme`/`color-scheme` on the document root
 * (and the synced `<meta name="color-scheme">`), and stays in sync with the
 * system theme. The component subscribes to the store with the neutral
 * {@link useState}/{@link useEffect} hooks, so a single source stays reactive on
 * both frameworks.
 *
 * The original Vue SFC shared a reactive store via `provide`/`inject` and
 * rendered inline SVG icons; the neutral version uses the shared singleton store
 * (the substitute for provide/inject) and text glyphs (`☀`/`☾`/`◐`), and emits
 * `change` through the `onChange` callback prop. The label is overridable
 * through the default slot.
 */
export function ForgeThemeToggle(properties: Readonly<ThemeToggleProperties>): MpElement {
  const { ariaLabel, onChange, size = 'md' } = properties;

  const [snapshot, setSnapshot] = useState(getThemeSnapshot());
  useEffect(() => {
    const update = (): void => setSnapshot(getThemeSnapshot());
    return subscribeTheme(update);
  }, []);

  const theme = snapshot.theme;
  const upcoming = nextTheme(theme);
  const resolvedAriaLabel =
    ariaLabel ??
    (upcoming === 'light'
      ? 'Switch to light theme'
      : upcoming === 'dark'
        ? 'Switch to dark theme'
        : 'Switch to auto theme');
  const defaultLabel = theme === 'light' ? 'Light mode' : theme === 'dark' ? 'Dark mode' : 'Auto mode';

  const handleClick = (): void => {
    cycleTheme();
    onChange?.(getThemeSnapshot().theme);
  };

  return (
    <button
      type="button"
      aria-label={resolvedAriaLabel}
      aria-pressed={theme === 'dark'}
      className={[styles['theme-toggle'], sizeStyles[`forge-size--${size}`]]}
      onClick={handleClick}
    >
      <span
        aria-hidden="true"
        className={[styles['theme-toggle__icon']]}
      >
        {themeGlyph(theme)}
      </span>
      <span className={[styles['theme-toggle__label']]}>
        <Slot>{defaultLabel}</Slot>
      </span>
    </button>
  );
}
