import {
  Slot,
  useEffect,
  useState,
  createForgeStyle,
  type MpChild,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge-jsx';

import { cycleTheme, getThemeSnapshot, subscribeTheme, type Theme } from '@/stores/theme-store/theme-store';

import styles from './forge-theme-toggle.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type ThemeToggleSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface ThemeToggleStyleProperties {
  readonly 'border-color-hover'?: string;
  readonly 'button-primary-gap'?: string;
  readonly 'button-primary-radius'?: string;
  readonly 'button-secondary-background-default'?: string;
  readonly 'button-secondary-background-hover'?: string;
  readonly 'button-secondary-border-default'?: string;
  readonly 'button-secondary-border-focus-visible'?: string;
  readonly 'button-secondary-border-width'?: string;
  readonly 'button-secondary-text-default'?: string;
  readonly 'button-secondary-transition-duration'?: string;
  readonly 'button-secondary-transition-easing'?: string;
  readonly 'focus-offset'?: string;
  readonly 'focus-width'?: string;
  readonly 'icon-color-default'?: string;
  readonly 'icon-size'?: string;
  readonly 'label-font-family'?: string;
  readonly 'label-font-size'?: string;
  readonly 'label-font-weight'?: string;
  readonly 'label-letter-spacing'?: string;
  readonly 'label-line-height'?: string;
  readonly 'padding-block'?: string;
  readonly 'padding-inline'?: string;
}

export type ThemeToggleStyle = CSSStyleProperties & {
  readonly '--forge-theme-toggle-border-color-hover'?: string | undefined;
  readonly '--forge-theme-toggle-button-primary-gap'?: string | undefined;
  readonly '--forge-theme-toggle-button-primary-radius'?: string | undefined;
  readonly '--forge-theme-toggle-button-secondary-background-default'?: string | undefined;
  readonly '--forge-theme-toggle-button-secondary-background-hover'?: string | undefined;
  readonly '--forge-theme-toggle-button-secondary-border-default'?: string | undefined;
  readonly '--forge-theme-toggle-button-secondary-border-focus-visible'?: string | undefined;
  readonly '--forge-theme-toggle-button-secondary-border-width'?: string | undefined;
  readonly '--forge-theme-toggle-button-secondary-text-default'?: string | undefined;
  readonly '--forge-theme-toggle-button-secondary-transition-duration'?: string | undefined;
  readonly '--forge-theme-toggle-button-secondary-transition-easing'?: string | undefined;
  readonly '--forge-theme-toggle-focus-offset'?: string | undefined;
  readonly '--forge-theme-toggle-focus-width'?: string | undefined;
  readonly '--forge-theme-toggle-icon-color-default'?: string | undefined;
  readonly '--forge-theme-toggle-icon-size'?: string | undefined;
  readonly '--forge-theme-toggle-label-font-family'?: string | undefined;
  readonly '--forge-theme-toggle-label-font-size'?: string | undefined;
  readonly '--forge-theme-toggle-label-font-weight'?: string | undefined;
  readonly '--forge-theme-toggle-label-letter-spacing'?: string | undefined;
  readonly '--forge-theme-toggle-label-line-height'?: string | undefined;
  readonly '--forge-theme-toggle-padding-block'?: string | undefined;
  readonly '--forge-theme-toggle-padding-inline'?: string | undefined;
};

function createThemeToggleStyle(
  properties: Readonly<ThemeToggleStyleProperties> | undefined,
): ThemeToggleStyle | undefined {
  return createForgeStyle({
    '--forge-theme-toggle-border-color-hover': properties?.['border-color-hover'],
    '--forge-theme-toggle-button-primary-gap': properties?.['button-primary-gap'],
    '--forge-theme-toggle-button-primary-radius': properties?.['button-primary-radius'],
    '--forge-theme-toggle-button-secondary-background-default': properties?.['button-secondary-background-default'],
    '--forge-theme-toggle-button-secondary-background-hover': properties?.['button-secondary-background-hover'],
    '--forge-theme-toggle-button-secondary-border-default': properties?.['button-secondary-border-default'],
    '--forge-theme-toggle-button-secondary-border-focus-visible': properties?.['button-secondary-border-focus-visible'],
    '--forge-theme-toggle-button-secondary-border-width': properties?.['button-secondary-border-width'],
    '--forge-theme-toggle-button-secondary-text-default': properties?.['button-secondary-text-default'],
    '--forge-theme-toggle-button-secondary-transition-duration': properties?.['button-secondary-transition-duration'],
    '--forge-theme-toggle-button-secondary-transition-easing': properties?.['button-secondary-transition-easing'],
    '--forge-theme-toggle-focus-offset': properties?.['focus-offset'],
    '--forge-theme-toggle-focus-width': properties?.['focus-width'],
    '--forge-theme-toggle-icon-color-default': properties?.['icon-color-default'],
    '--forge-theme-toggle-icon-size': properties?.['icon-size'],
    '--forge-theme-toggle-label-font-family': properties?.['label-font-family'],
    '--forge-theme-toggle-label-font-size': properties?.['label-font-size'],
    '--forge-theme-toggle-label-font-weight': properties?.['label-font-weight'],
    '--forge-theme-toggle-label-letter-spacing': properties?.['label-letter-spacing'],
    '--forge-theme-toggle-label-line-height': properties?.['label-line-height'],
    '--forge-theme-toggle-padding-block': properties?.['padding-block'],
    '--forge-theme-toggle-padding-inline': properties?.['padding-inline'],
  }) as ThemeToggleStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface ThemeToggleProperties {
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
  /** Size token controlling the toggle's scale. Defaults to `'md'`. */
  size?: ThemeToggleSize;
  /** Overrides the auto-generated `aria-label`. */
  ariaLabel?: string;
  /** Fired with the new theme after each toggle. */
  onChange?: (theme: Theme) => void;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<ThemeToggleStyleProperties>;
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
  const style = createThemeToggleStyle(properties.properties);

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
      className={[styles['theme-toggle'], size ? `forge-size--${size}` : undefined]}
      onClick={handleClick}
      style={style}
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
