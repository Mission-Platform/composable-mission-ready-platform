import { createForgeStyle, type MpChild, type MpElement, type CSSStyleProperties } from '@mission-platform/forge-jsx';

import spacingStyles from '../../../styles/spacing.module.scss';

import styles from './forge-separator.module.scss';

/** Layout direction of the separator. */
export type SeparatorOrientation = 'horizontal' | 'vertical';
/** Line style. */
export type SeparatorVariant = 'solid' | 'dashed' | 'dotted';
/** Spacing applied as margin around the separator. */
export type SeparatorSpacing = 'none' | 'sm' | 'md' | 'lg' | 'xl';
/** Size token — canonical 2xs → 2xl scale (scales the optional label). */
export type SeparatorSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
/** Named `padding`/`margin` scale; each step maps to a named `--mp-spacing-*` design token. */
export type SpacingScale = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface SeparatorStyleProperties {
  readonly spacing?: string;
  readonly 'surface-separator-label'?: string;
  readonly 'surface-separator-label-font-family'?: string;
  readonly 'surface-separator-label-font-size'?: string;
  readonly 'surface-separator-label-gap'?: string;
  readonly 'surface-separator-label-line-height'?: string;
  readonly 'surface-separator-line'?: string;
  readonly 'surface-separator-line-width'?: string;
  readonly 'surface-separator-margin-lg'?: string;
  readonly 'surface-separator-margin-md'?: string;
  readonly 'surface-separator-margin-none'?: string;
  readonly 'surface-separator-margin-sm'?: string;
  readonly 'surface-separator-margin-xl'?: string;
}

export type SeparatorStyle = CSSStyleProperties & {
  readonly '--forge-separator-spacing'?: string | undefined;
  readonly '--forge-separator-surface-separator-label'?: string | undefined;
  readonly '--forge-separator-surface-separator-label-font-family'?: string | undefined;
  readonly '--forge-separator-surface-separator-label-font-size'?: string | undefined;
  readonly '--forge-separator-surface-separator-label-gap'?: string | undefined;
  readonly '--forge-separator-surface-separator-label-line-height'?: string | undefined;
  readonly '--forge-separator-surface-separator-line'?: string | undefined;
  readonly '--forge-separator-surface-separator-line-width'?: string | undefined;
  readonly '--forge-separator-surface-separator-margin-lg'?: string | undefined;
  readonly '--forge-separator-surface-separator-margin-md'?: string | undefined;
  readonly '--forge-separator-surface-separator-margin-none'?: string | undefined;
  readonly '--forge-separator-surface-separator-margin-sm'?: string | undefined;
  readonly '--forge-separator-surface-separator-margin-xl'?: string | undefined;
};

function createSeparatorStyle(properties: Readonly<SeparatorStyleProperties> | undefined): SeparatorStyle | undefined {
  return createForgeStyle({
    '--forge-separator-spacing': properties?.['spacing'],
    '--forge-separator-surface-separator-label': properties?.['surface-separator-label'],
    '--forge-separator-surface-separator-label-font-family': properties?.['surface-separator-label-font-family'],
    '--forge-separator-surface-separator-label-font-size': properties?.['surface-separator-label-font-size'],
    '--forge-separator-surface-separator-label-gap': properties?.['surface-separator-label-gap'],
    '--forge-separator-surface-separator-label-line-height': properties?.['surface-separator-label-line-height'],
    '--forge-separator-surface-separator-line': properties?.['surface-separator-line'],
    '--forge-separator-surface-separator-line-width': properties?.['surface-separator-line-width'],
    '--forge-separator-surface-separator-margin-lg': properties?.['surface-separator-margin-lg'],
    '--forge-separator-surface-separator-margin-md': properties?.['surface-separator-margin-md'],
    '--forge-separator-surface-separator-margin-none': properties?.['surface-separator-margin-none'],
    '--forge-separator-surface-separator-margin-sm': properties?.['surface-separator-margin-sm'],
    '--forge-separator-surface-separator-margin-xl': properties?.['surface-separator-margin-xl'],
  }) as SeparatorStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface SeparatorProperties {
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
  /** Layout direction. Defaults to `'horizontal'`. */
  orientation?: SeparatorOrientation;
  /** Line style. Defaults to `'solid'`. */
  variant?: SeparatorVariant;
  /** Margin applied along the main axis. Defaults to `'md'`. */
  spacing?: SeparatorSpacing;
  /** When `true`, removes the separator from the accessibility tree. */
  decorative?: boolean;
  /** Size token (scales the optional label). Defaults to `'md'`. */
  size?: SeparatorSize;
  /** Outer margin (named `2xs … 2xl` scale), mapped to a `--mp-spacing-*` token. Overrides `spacing` when set. */
  margin?: SpacingScale;
  /** Inner padding (named `2xs … 2xl` scale), mapped to a `--mp-spacing-*` token. */
  padding?: SpacingScale;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<SeparatorStyleProperties>;
}

/**
 * `ForgeSeparator` — a visual separator / divider authored once in the neutral
 * JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * Renders a horizontal or vertical rule (`<hr>`) used to separate groups of
 * content. When default-slot content is provided (horizontal only) it renders
 * a centred label between two lines instead. By default it exposes
 * `role="separator"` with the appropriate `aria-orientation`; set `decorative`
 * to mark it purely presentational (`role="none"`).
 *
 * It owns its styling through the co-located CSS Module
 * `forge-separator.module.scss` (carried onto every framework by the two-stage
 * compiler, so the component ships its own `@layer mp.components` CSS). The
 * hashed module class names are assembled with the framework-neutral
 * {@link classNames} helper.
 */
export function ForgeSeparator(properties: Readonly<SeparatorProperties>): MpElement {
  const style = createSeparatorStyle(properties.properties);

  const {
    orientation = 'horizontal',
    variant = 'solid',
    spacing = 'md',
    decorative = false,
    size = 'md',
    padding,
    margin,
  } = properties;
  const sizeClass = size ? `forge-size--${size}` : undefined;

  const role = decorative ? 'none' : 'separator';
  const hasLabel = orientation === 'horizontal' && properties.children !== undefined;
  // Optional `padding`/`margin` (named `2xs … 2xl` scale) resolve to the shared
  // token-driven spacing classes (a set `margin` overrides `spacing`).
  const paddingClass = padding ? spacingStyles[`forge-spacing--padding-${padding}`] : undefined;
  const marginClass = margin ? spacingStyles[`forge-spacing--margin-${margin}`] : undefined;

  return hasLabel ? (
    <div
      className={[
        styles['forge-separator'],
        styles['forge-separator--labelled'],
        styles[`forge-separator--${variant}`],
        styles[`forge-separator--spacing-${spacing}`],
        sizeClass,
        paddingClass,
        marginClass,
      ]}
      role={role}
      aria-orientation={decorative ? undefined : 'horizontal'}
      style={style}
    >
      <span className={styles['forge-separator__line']} />
      <span className={styles['forge-separator__label']}>{properties.children}</span>
      <span className={styles['forge-separator__line']} />
    </div>
  ) : (
    <hr
      className={[
        styles['forge-separator'],
        styles[`forge-separator--${orientation}`],
        styles[`forge-separator--${variant}`],
        styles[`forge-separator--spacing-${spacing}`],
        sizeClass,
        paddingClass,
        marginClass,
      ]}
      role={role}
      aria-orientation={decorative ? undefined : orientation}
      style={style}
    />
  );
}
